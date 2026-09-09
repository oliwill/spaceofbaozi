from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys

import numpy as np
from PIL import Image

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from tools.asset_pipeline import extract_frame, validate_manifest
from tools.build_runtime import expand_frames


INTRO_LIMIT_BYTES = 6 * 1024 * 1024


def _visible_rgba(image: Image.Image) -> np.ndarray:
    pixels = np.asarray(image.convert("RGBA")).copy()
    pixels[pixels[:, :, 3] == 0, :3] = 0
    return pixels


def compare_sheet_to_frames(
    sheet: Image.Image,
    frames: list[Image.Image],
    *,
    columns: int,
    rows: int,
) -> list[str]:
    errors: list[str] = []
    for index, expected in enumerate(frames):
        actual = extract_frame(sheet, columns=columns, rows=rows, index=index)
        if not np.array_equal(_visible_rgba(actual), _visible_rgba(expected)):
            errors.append(f"frame {index} pixels do not match")
    return errors


def verify_package(root: Path) -> dict:
    errors: list[str] = []
    checks: dict[str, bool] = {}
    catalog = json.loads((root / "spec/sequence-catalog.json").read_text("utf-8"))
    manifest = json.loads(
        (root / "manifest/asset-manifest.v2.json").read_text("utf-8")
    )

    manifest_errors = validate_manifest(manifest, root)
    errors.extend(manifest_errors)
    checks["manifestStructure"] = not manifest_errors

    source_frame_count = 0
    runtime_bytes = 0
    for sequence_id, catalog_sequence in catalog["sequences"].items():
        manifest_sequence = manifest["sequences"].get(sequence_id)
        if manifest_sequence is None:
            errors.append(f"missing manifest sequence {sequence_id}")
            continue
        frames = expand_frames(catalog_sequence)
        source_frame_count += len(frames)
        expected_size = (
            catalog_sequence["frameSize"]["width"],
            catalog_sequence["frameSize"]["height"],
        )
        source_images: list[Image.Image] = []
        for frame in frames:
            path = root / frame["file"]
            with Image.open(path) as image:
                image.load()
                if image.mode != "RGBA":
                    errors.append(f"{frame['file']}: mode {image.mode}, expected RGBA")
                if image.size != expected_size:
                    errors.append(
                        f"{frame['file']}: size {image.size}, expected {expected_size}"
                    )
                alpha = image.getchannel("A")
                if alpha.getbbox() is None:
                    errors.append(f"{frame['file']}: empty alpha")
                corners = [
                    alpha.getpixel((0, 0)),
                    alpha.getpixel((image.width - 1, 0)),
                    alpha.getpixel((0, image.height - 1)),
                    alpha.getpixel((image.width - 1, image.height - 1)),
                ]
                if any(corners):
                    errors.append(f"{frame['file']}: corner alpha is not transparent")
                source_images.append(image.copy())

        runtime = root / catalog_sequence["runtime"]
        runtime_bytes += runtime.stat().st_size if runtime.is_file() else 0
        if not runtime.is_file():
            errors.append(f"missing runtime sheet {catalog_sequence['runtime']}")
            continue
        with Image.open(runtime) as sheet:
            sheet.load()
            expected_sheet_size = (
                expected_size[0] * catalog_sequence["columns"],
                expected_size[1] * catalog_sequence["rows"],
            )
            if sheet.mode != "RGBA":
                errors.append(f"{catalog_sequence['runtime']}: mode {sheet.mode}")
            if sheet.size != expected_sheet_size:
                errors.append(
                    f"{catalog_sequence['runtime']}: size {sheet.size}, "
                    f"expected {expected_sheet_size}"
                )
            for mismatch in compare_sheet_to_frames(
                sheet,
                source_images,
                columns=catalog_sequence["columns"],
                rows=catalog_sequence["rows"],
            ):
                errors.append(f"{sequence_id}: {mismatch}")
        if manifest_sequence.get("frameIds") != [frame["id"] for frame in frames]:
            errors.append(f"{sequence_id}: manifest frameIds do not match catalog")

    checks["canonicalFrames"] = not any(
        "expected RGBA" in error
        or "empty alpha" in error
        or "corner alpha" in error
        for error in errors
    )
    checks["runtimeSheetsMatchFrames"] = not any(
        "pixels do not match" in error for error in errors
    )

    intro_runtime_paths = [
        root / sequence["runtime"]
        for sequence in catalog["sequences"].values()
        if sequence["scope"] == "intro"
    ]
    intro_runtime_paths.extend(
        [
            root / catalog["environment"]["intro-grass"]["runtime"],
            root / catalog["fallback"]["runtime"],
        ]
    )
    intro_runtime_bytes = sum(path.stat().st_size for path in intro_runtime_paths)
    if intro_runtime_bytes > INTRO_LIMIT_BYTES:
        errors.append(
            f"intro runtime payload {intro_runtime_bytes} exceeds {INTRO_LIMIT_BYTES}"
        )
    checks["introPayloadWithinLimit"] = intro_runtime_bytes <= INTRO_LIMIT_BYTES

    alias_errors = []
    for old_path, expected_id in catalog["legacyAliases"].items():
        alias = manifest["legacyAliases"].get(old_path)
        if not alias or alias.get("assetId") != expected_id or not alias.get("newPath"):
            alias_errors.append(old_path)
    if alias_errors:
        errors.append(f"invalid legacy aliases: {', '.join(alias_errors)}")
    checks["legacyAliases"] = not alias_errors

    temporary_files = sorted(
        str(path.relative_to(root))
        for pattern in ("*.partial", "*.tmp.webp")
        for path in root.glob(f"assets/**/{pattern}")
    )
    if temporary_files:
        errors.append(f"temporary files present: {', '.join(temporary_files)}")
    checks["noTemporaryFiles"] = not temporary_files

    return {
        "version": 2,
        "verifiedAt": datetime.now(timezone.utc).isoformat(),
        "pass": not errors,
        "sourceFrameCount": source_frame_count,
        "sequenceCount": len(catalog["sequences"]),
        "introRuntimeBytes": intro_runtime_bytes,
        "introRuntimeLimitBytes": INTRO_LIMIT_BYTES,
        "checks": checks,
        "errors": errors,
    }


def write_checksums(root: Path) -> None:
    excluded_names = {"checksums.sha256"}
    files = [
        path
        for path in root.rglob("*")
        if path.is_file()
        and path.name not in excluded_names
        and "__pycache__" not in path.parts
        and path.suffix != ".pyc"
        and not path.name.endswith(".zip")
    ]
    lines = []
    for path in sorted(files, key=lambda item: str(item.relative_to(root))):
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        lines.append(f"{digest}  {path.relative_to(root)}")
    (root / "checksums.sha256").write_text("\n".join(lines) + "\n", "utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "root", nargs="?", default=Path(__file__).resolve().parents[1], type=Path
    )
    args = parser.parse_args()
    root = args.root.resolve()
    report = verify_package(root)
    report_path = root / "qa/verification-report.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    write_checksums(root)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    raise SystemExit(0 if report["pass"] else 1)


if __name__ == "__main__":
    main()
