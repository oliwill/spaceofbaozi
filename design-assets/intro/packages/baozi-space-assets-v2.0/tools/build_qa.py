from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import sys

from PIL import Image, ImageDraw, ImageFont

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from tools.build_runtime import expand_frames


BACKGROUND = (238, 240, 234, 255)
CARD = (255, 253, 247, 255)
INK = (31, 47, 73, 255)


def _font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    path = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
    return ImageFont.truetype(str(path), size) if path.is_file() else ImageFont.load_default()


def build_contact_sheet(
    root: Path,
    sequence_id: str,
    sequence: dict,
    *,
    card_width: int = 320,
    preview_height: int = 260,
    label_height: int = 74,
    header_height: int = 72,
) -> Image.Image:
    frames = expand_frames(sequence)
    columns = sequence["columns"]
    rows = math.ceil(len(frames) / columns)
    card_height = preview_height + label_height
    sheet = Image.new(
        "RGBA", (columns * card_width, header_height + rows * card_height), BACKGROUND
    )
    draw = ImageDraw.Draw(sheet)
    draw.rectangle((0, 0, sheet.width, header_height - 1), fill=CARD)
    draw.text((20, max(1, header_height // 4)), sequence_id, fill=INK, font=_font(24))
    for index, frame in enumerate(frames):
        column = index % columns
        row = index // columns
        x0 = column * card_width
        y0 = header_height + row * card_height
        draw.rectangle(
            (x0 + 4, y0 + 4, x0 + card_width - 5, y0 + card_height - 5),
            fill=CARD,
        )
        with Image.open(root / frame["file"]) as source:
            source = source.convert("RGBA")
            scale = min(
                (card_width - 16) / source.width,
                (preview_height - 16) / source.height,
            )
            size = (
                max(1, round(source.width * scale)),
                max(1, round(source.height * scale)),
            )
            preview = source.resize(size, Image.Resampling.LANCZOS)
        px = x0 + (card_width - preview.width) // 2
        py = y0 + (preview_height - preview.height) // 2
        sheet.alpha_composite(preview, (px, py))
        label = f"{index + 1:02d} · {frame['id']}"
        draw.text(
            (x0 + 12, y0 + preview_height + 8), fill=INK, text=label, font=_font(16)
        )
    return sheet


def build_all(root: Path) -> None:
    catalog = json.loads((root / "spec/sequence-catalog.json").read_text("utf-8"))
    output = root / "qa/contact-sheets"
    output.mkdir(parents=True, exist_ok=True)
    for sequence_id, sequence in catalog["sequences"].items():
        sheet = build_contact_sheet(root, sequence_id, sequence)
        sheet.save(output / f"{sequence_id}.png", optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "root", nargs="?", default=Path(__file__).resolve().parents[1], type=Path
    )
    args = parser.parse_args()
    build_all(args.root.resolve())


if __name__ == "__main__":
    main()
