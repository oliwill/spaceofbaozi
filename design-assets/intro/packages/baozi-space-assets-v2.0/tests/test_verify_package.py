import unittest

from PIL import Image

from tools.asset_pipeline import assemble_sheet
from tools.verify_package import compare_sheet_to_frames


class VerifyPackageTests(unittest.TestCase):
    def test_compare_sheet_to_frames_detects_swapped_cells(self):
        red = Image.new("RGBA", (2, 2), (255, 0, 0, 255))
        green = Image.new("RGBA", (2, 2), (0, 255, 0, 255))
        sheet = assemble_sheet([red, green], columns=2, rows=1)

        self.assertEqual(
            compare_sheet_to_frames(sheet, [red, green], columns=2, rows=1), []
        )
        self.assertEqual(
            compare_sheet_to_frames(sheet, [green, red], columns=2, rows=1),
            ["frame 0 pixels do not match", "frame 1 pixels do not match"],
        )


if __name__ == "__main__":
    unittest.main()
