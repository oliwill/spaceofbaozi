import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

from tools.asset_pipeline import (
    assemble_sheet,
    extract_frame,
    extract_subject_from_neutral_background,
    normalize_cutout,
    validate_manifest,
)


class AssetPipelineTests(unittest.TestCase):
    def test_extract_frame_uses_row_major_order(self):
        sheet = Image.new("RGBA", (4, 2), (0, 0, 0, 0))
        sheet.paste((255, 0, 0, 255), (0, 0, 2, 2))
        sheet.paste((0, 255, 0, 255), (2, 0, 4, 2))

        first = extract_frame(sheet, columns=2, rows=1, index=0)
        second = extract_frame(sheet, columns=2, rows=1, index=1)

        self.assertEqual(first.size, (2, 2))
        self.assertEqual(first.getpixel((1, 1)), (255, 0, 0, 255))
        self.assertEqual(second.getpixel((1, 1)), (0, 255, 0, 255))

    def test_assemble_sheet_places_frames_in_exact_cells(self):
        colors = [
            (255, 0, 0, 255),
            (0, 255, 0, 255),
            (0, 0, 255, 255),
        ]
        frames = [Image.new("RGBA", (2, 2), color) for color in colors]

        sheet = assemble_sheet(frames, columns=2, rows=2)

        self.assertEqual(sheet.size, (4, 4))
        self.assertEqual(sheet.getpixel((1, 1)), colors[0])
        self.assertEqual(sheet.getpixel((3, 1)), colors[1])
        self.assertEqual(sheet.getpixel((1, 3)), colors[2])
        self.assertEqual(sheet.getpixel((3, 3)), (0, 0, 0, 0))

    def test_normalize_cutout_preserves_aspect_ratio_and_bottom_alignment(self):
        source = Image.new("RGBA", (100, 50), (0, 0, 0, 0))
        ImageDraw.Draw(source).rectangle((10, 5, 89, 44), fill=(12, 34, 56, 255))

        normalized = normalize_cutout(source, (100, 100), margin=10, align="bottom")
        bbox = normalized.getchannel("A").getbbox()

        self.assertEqual(normalized.size, (100, 100))
        self.assertEqual(bbox, (10, 50, 90, 90))

    def test_extract_subject_removes_neutral_checkerboard_and_keeps_warm_border(self):
        image = Image.new("RGB", (80, 60), (205, 205, 205))
        draw = ImageDraw.Draw(image)
        for y in range(0, 60, 8):
            for x in range(0, 80, 8):
                if (x // 8 + y // 8) % 2:
                    draw.rectangle((x, y, x + 7, y + 7), fill=(150, 150, 150))
        draw.ellipse((18, 10, 61, 53), fill=(255, 245, 222))
        draw.ellipse((25, 17, 54, 46), fill=(36, 55, 82))

        result = extract_subject_from_neutral_background(image)

        self.assertEqual(result.mode, "RGBA")
        self.assertEqual(result.getpixel((0, 0))[3], 0)
        self.assertGreater(result.getpixel((20, 30))[3], 200)
        self.assertEqual(result.getpixel((40, 30))[:3], (36, 55, 82))

    def test_extract_subject_closes_small_gaps_before_filling_neutral_interior(self):
        image = Image.new("RGB", (100, 80), (180, 180, 180))
        draw = ImageDraw.Draw(image)
        draw.rectangle((20, 15, 79, 64), outline=(255, 245, 222), width=4)
        draw.rectangle((47, 15, 53, 19), fill=(180, 180, 180))
        draw.rectangle((24, 20, 75, 60), fill=(205, 205, 205))

        result = extract_subject_from_neutral_background(image)

        self.assertEqual(result.getpixel((0, 0))[3], 0)
        self.assertGreater(result.getpixel((50, 40))[3], 200)

    def test_extract_subject_drops_disconnected_chromatic_specks(self):
        image = Image.new("RGB", (80, 60), (180, 180, 180))
        draw = ImageDraw.Draw(image)
        draw.ellipse((20, 10, 59, 49), fill=(255, 245, 222))
        draw.ellipse((26, 16, 53, 43), fill=(36, 55, 82))
        draw.point((4, 55), fill=(255, 245, 222))

        result = extract_subject_from_neutral_background(image)

        self.assertGreater(result.getpixel((40, 30))[3], 200)
        self.assertEqual(result.getpixel((4, 55))[3], 0)

    def test_validate_manifest_rejects_ambiguous_or_mismatched_frames(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            frame = root / "frame.png"
            Image.new("RGBA", (2, 2), (255, 0, 0, 255)).save(frame)
            manifest = {
                "version": 2,
                "sequences": {
                    "person-fall": {
                        "frameCount": 2,
                        "columns": 2,
                        "rows": 1,
                        "frameSize": {"width": 2, "height": 2},
                        "frames": [
                            {"id": "same", "file": "frame.png"},
                            {"id": "same", "file": "frame.png"},
                        ],
                    }
                },
            }

            errors = validate_manifest(manifest, root)

            self.assertIn("person-fall: duplicate frame id same", errors)

            manifest["sequences"]["person-fall"]["frameCount"] = 3
            errors = validate_manifest(manifest, root)
            self.assertIn(
                "person-fall: frameCount 3 does not match frames length 2", errors
            )


if __name__ == "__main__":
    unittest.main()
