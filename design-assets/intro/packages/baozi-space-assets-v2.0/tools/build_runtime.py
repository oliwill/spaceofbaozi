from __future__ import annotations

import argparse
import copy
from io import BytesIO
import json
from pathlib import Path
import sys

from PIL import Image

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from tools.asset_pipeline import assemble_sheet


def save_webp_verified(image: Image.Image, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_name(destination.name + ".partial")
    temporary.unlink(missing_ok=True)
    encoded = BytesIO()
    image.save(encoded, "WEBP", lossless=True, method=6)
    data = encoded.getvalue()
    with Image.open(BytesIO(data)) as decoded:
        decoded.load()
        if decoded.size != image.size or decoded.mode != "RGBA":
            raise ValueError(f"encoded WebP failed verification: {destination}")
    destination.write_bytes(data)
    with Image.open(destination) as decoded:
        decoded.load()
        if decoded.size != image.size or decoded.mode != "RGBA":
            raise ValueError(f"written WebP failed verification: {destination}")


def expand_frames(sequence: dict) -> list[dict]:
    if "frames" in sequence:
        return copy.deepcopy(sequence["frames"])
    directions = sequence.get("directions", [])
    steps = sequence.get("stepsPerDirection", 0)
    directory = sequence.get("frameDirectory")
    frames: list[dict] = []
    for direction_index, direction in enumerate(directions, start=1):
        for step in range(1, steps + 1):
            frame_id = f"{direction['id']}-step-{step:02d}"
            frames.append(
                {
                    "id": frame_id,
                    "file": (
                        f"{directory}/{direction_index:02d}-{direction['id']}"
                        f"-step-{step:02d}.png"
                    ),
                    "description": f"{direction['description']}，步态 {step}/4",
                    "direction": direction["id"],
                    "angleDeg": direction["angleDeg"],
                    "gaitFrame": step,
                }
            )
    return frames


def build_sequence(root: Path, sequence_id: str, sequence: dict) -> dict:
    frames = expand_frames(sequence)
    frame_size = (
        sequence["frameSize"]["width"],
        sequence["frameSize"]["height"],
    )
    images: list[Image.Image] = []
    for frame in frames:
        path = root / frame["file"]
        image = Image.open(path).convert("RGBA")
        if image.size != frame_size:
            raise ValueError(
                f"{sequence_id}: {frame['file']} is {image.size}, expected {frame_size}"
            )
        images.append(image)
    sheet = assemble_sheet(
        images, columns=sequence["columns"], rows=sequence["rows"]
    )
    runtime_path = root / sequence["runtime"]
    save_webp_verified(sheet, runtime_path)
    result = {
        "src": f"/{sequence['runtime']}",
        "frameCount": len(frames),
        "columns": sequence["columns"],
        "rows": sequence["rows"],
        "frameSize": sequence["frameSize"],
        "loop": sequence.get("loop", False),
        "frameIds": [frame["id"] for frame in frames],
        "frames": frames,
    }
    for key in ("scope", "displayWidthVh", "directions", "stepsPerDirection"):
        if key in sequence:
            result[key] = copy.deepcopy(sequence[key])
    return result


def build_auxiliary_image(root: Path, source: str, runtime: str) -> dict:
    source_path = root / source
    runtime_path = root / runtime
    image = Image.open(source_path).convert("RGBA")
    save_webp_verified(image, runtime_path)
    return {
        "src": f"/{runtime}",
        "source": source,
        "intrinsicSize": {"width": image.width, "height": image.height},
    }


def build_package(root: Path) -> dict:
    catalog_path = root / "spec/sequence-catalog.json"
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    sequences = {
        sequence_id: build_sequence(root, sequence_id, sequence)
        for sequence_id, sequence in catalog["sequences"].items()
    }
    grass_catalog = catalog["environment"]["intro-grass"]
    grass = build_auxiliary_image(
        root, grass_catalog["source"], grass_catalog["runtime"]
    )
    for key in ("visibleBounds", "align", "transitionOut"):
        grass[key] = copy.deepcopy(grass_catalog[key])
    fallback_catalog = catalog["fallback"]
    fallback = build_auxiliary_image(
        root, fallback_catalog["source"], fallback_catalog["runtime"]
    )
    aliases = {
        old_path: {
            "assetId": asset_id,
            "newPath": (
                sequences[asset_id]["src"]
                if asset_id in sequences
                else grass["src"]
                if asset_id == "intro-grass"
                else fallback["src"]
            ),
        }
        for old_path, asset_id in catalog["legacyAliases"].items()
    }
    manifest = {
        "version": 2,
        "mode": "production",
        "style": catalog["style"],
        "fps": catalog["fps"],
        "sequences": sequences,
        "environment": {"intro-grass": grass},
        "fallback": fallback,
        "homePerspective": catalog["homePerspective"],
        "legacyAliases": aliases,
        "introTimeline": [
            {"progress": [0.00, 0.08], "layers": ["ball-bounce"]},
            {"progress": [0.08, 0.25], "layers": ["ball-bounce", "dog-chase-right"]},
            {"progress": [0.25, 0.65], "layers": ["dog-chase-right", "person-pulled-run-right"]},
            {"progress": [0.65, 0.82], "layers": ["dog-chase-right", "person-stumble-fall-exit-right"]},
            {"progress": [0.82, 0.94], "layers": ["person-slide-in-rise-stand", "dog-chase-right"]},
            {"progress": [0.94, 1.00], "layers": ["person-slide-in-rise-stand", "dog-look-up-settle"]}
        ]
    }
    manifest_path = root / "manifest/asset-manifest.v2.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "root", nargs="?", default=Path(__file__).resolve().parents[1], type=Path
    )
    args = parser.parse_args()
    build_package(args.root.resolve())


if __name__ == "__main__":
    main()
