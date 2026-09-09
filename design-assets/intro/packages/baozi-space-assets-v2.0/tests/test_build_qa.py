import tempfile
import unittest
from pathlib import Path

from PIL import Image

from tools.build_qa import build_contact_sheet


class BuildQaTests(unittest.TestCase):
    def test_contact_sheet_preserves_declared_frame_order(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "frames").mkdir()
            Image.new("RGBA", (20, 10), (255, 0, 0, 255)).save(
                root / "frames/one.png"
            )
            Image.new("RGBA", (20, 10), (0, 255, 0, 255)).save(
                root / "frames/two.png"
            )
            sequence = {
                "columns": 2,
                "rows": 1,
                "frameSize": {"width": 20, "height": 10},
                "frames": [
                    {"id": "one", "file": "frames/one.png"},
                    {"id": "two", "file": "frames/two.png"},
                ],
            }

            sheet = build_contact_sheet(
                root,
                "demo",
                sequence,
                card_width=80,
                preview_height=50,
                label_height=20,
                header_height=20,
            )

            self.assertEqual(sheet.size, (160, 90))
            self.assertEqual(sheet.getpixel((40, 45))[:3], (255, 0, 0))
            self.assertEqual(sheet.getpixel((120, 45))[:3], (0, 255, 0))


if __name__ == "__main__":
    unittest.main()
