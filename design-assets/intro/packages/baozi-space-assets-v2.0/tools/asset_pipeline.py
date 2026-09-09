from __future__ import annotations

from pathlib import Path
from typing import Iterable

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage


def extract_frame(
    sheet: Image.Image, *, columns: int, rows: int, index: int
) -> Image.Image:
    if columns <= 0 or rows <= 0:
        raise ValueError("columns and rows must be positive")
    if sheet.width % columns or sheet.height % rows:
        raise ValueError("sheet dimensions must be divisible by its grid")
    if index < 0 or index >= columns * rows:
        raise IndexError("frame index is outside the sheet grid")
    frame_width = sheet.width // columns
    frame_height = sheet.height // rows
    column = index % columns
    row = index // columns
    return sheet.crop(
        (
            column * frame_width,
            row * frame_height,
            (column + 1) * frame_width,
            (row + 1) * frame_height,
        )
    ).convert("RGBA")


def normalize_cutout(
    source: Image.Image,
    size: tuple[int, int],
    *,
    margin: int,
    align: str = "bottom",
) -> Image.Image:
    source = source.convert("RGBA")
    bbox = source.getchannel("A").getbbox()
    canvas_width, canvas_height = size
    if bbox is None:
        return Image.new("RGBA", size, (0, 0, 0, 0))
    if margin < 0 or margin * 2 >= min(size):
        raise ValueError("margin must leave a positive inner canvas")
    cutout = source.crop(bbox)
    inner_width = canvas_width - margin * 2
    inner_height = canvas_height - margin * 2
    scale = min(inner_width / cutout.width, inner_height / cutout.height)
    resized_size = (
        max(1, round(cutout.width * scale)),
        max(1, round(cutout.height * scale)),
    )
    if resized_size != cutout.size:
        cutout = cutout.resize(resized_size, Image.Resampling.LANCZOS)
    x = (canvas_width - cutout.width) // 2
    if align == "bottom":
        y = canvas_height - margin - cutout.height
    elif align == "center":
        y = (canvas_height - cutout.height) // 2
    else:
        raise ValueError("align must be 'bottom' or 'center'")
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    canvas.alpha_composite(cutout, (x, y))
    return canvas


def assemble_sheet(
    frames: Iterable[Image.Image], *, columns: int, rows: int
) -> Image.Image:
    frames = [frame.convert("RGBA") for frame in frames]
    if not frames:
        raise ValueError("at least one frame is required")
    if len(frames) > columns * rows:
        raise ValueError("frames exceed sheet capacity")
    frame_size = frames[0].size
    if any(frame.size != frame_size for frame in frames):
        raise ValueError("all frames must have the same size")
    sheet = Image.new(
        "RGBA", (frame_size[0] * columns, frame_size[1] * rows), (0, 0, 0, 0)
    )
    for index, frame in enumerate(frames):
        x = (index % columns) * frame_size[0]
        y = (index // columns) * frame_size[1]
        sheet.alpha_composite(frame, (x, y))
    return sheet


def extract_subject_from_neutral_background(
    source: Image.Image, *, chroma_threshold: int = 8
) -> Image.Image:
    rgb = np.asarray(source.convert("RGB"), dtype=np.int16)
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    seed = chroma >= chroma_threshold
    # Generated transparency previews often contain 3–7 px neutral gaps in the
    # otherwise warm paper border. Temporarily expand the chromatic edge to
    # bridge those gaps; large spaces between limbs remain open.
    expanded = ndimage.binary_dilation(seed, iterations=4)
    labels, count = ndimage.label(expanded)
    if count == 0:
        raise ValueError("no chromatic foreground was found")
    sizes = ndimage.sum(expanded, labels, range(1, count + 1))
    largest_label = int(np.argmax(sizes)) + 1
    mask = labels == largest_label
    mask = ndimage.binary_fill_holes(mask)
    mask = ndimage.binary_erosion(mask, iterations=3)
    mask = np.logical_or(mask, seed)
    final_labels, final_count = ndimage.label(mask)
    final_sizes = ndimage.sum(mask, final_labels, range(1, final_count + 1))
    mask = final_labels == (int(np.argmax(final_sizes)) + 1)
    mask = ndimage.binary_dilation(mask, iterations=1)
    alpha = Image.fromarray((mask.astype(np.uint8) * 255), mode="L")
    alpha = alpha.filter(ImageFilter.GaussianBlur(radius=0.6))
    result = source.convert("RGBA")
    result.putalpha(alpha)
    return result


def validate_manifest(manifest: dict, root: Path) -> list[str]:
    errors: list[str] = []
    if manifest.get("version") != 2:
        errors.append("manifest version must be 2")
    sequences = manifest.get("sequences")
    if not isinstance(sequences, dict):
        return errors + ["manifest sequences must be an object"]
    for sequence_id, sequence in sequences.items():
        frames = sequence.get("frames", [])
        frame_count = sequence.get("frameCount")
        if frame_count != len(frames):
            errors.append(
                f"{sequence_id}: frameCount {frame_count} does not match "
                f"frames length {len(frames)}"
            )
        ids: set[str] = set()
        for frame in frames:
            frame_id = frame.get("id")
            if frame_id in ids:
                errors.append(f"{sequence_id}: duplicate frame id {frame_id}")
            ids.add(frame_id)
            file_name = frame.get("file")
            if file_name and not (root / file_name).is_file():
                errors.append(f"{sequence_id}: missing frame file {file_name}")
        columns = sequence.get("columns", 0)
        rows = sequence.get("rows", 0)
        if isinstance(frame_count, int) and columns * rows < frame_count:
            errors.append(f"{sequence_id}: sheet grid is smaller than frameCount")
    return errors
