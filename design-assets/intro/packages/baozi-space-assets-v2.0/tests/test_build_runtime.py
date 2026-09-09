import tempfile
import unittest
from pathlib import Path
import subprocess
import sys

from PIL import Image

from tools.build_runtime import build_sequence, save_webp_verified


class BuildRuntimeTests(unittest.TestCase):
    def test_verified_webp_save_removes_stale_partial_file(self):
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory) / "asset.webp"
            partial = destination.with_name(destination.name + ".partial")
            partial.write_bytes(b"stale")

            save_webp_verified(
                Image.new("RGBA", (4, 4), (12, 34, 56, 128)), destination
            )

            self.assertTrue(destination.is_file())
            self.assertFalse(partial.exists())
            with Image.open(destination) as image:
                image.load()
                self.assertEqual(image.mode, "RGBA")

    def test_build_script_can_be_invoked_directly_from_package_root(self):
        root = Path(__file__).resolve().parents[1]
        result = subprocess.run(
            [sys.executable, "tools/build_runtime.py", "--help"],
            cwd=root,
            text=True,
            capture_output=True,
        )

        self.assertEqual(result.returncode, 0, result.stderr)

    def test_build_sequence_writes_declared_frames_in_row_major_order(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            frame_dir = root / "frames"
            frame_dir.mkdir()
            colors = [(255, 0, 0, 255), (0, 255, 0, 255), (0, 0, 255, 255)]
            frames = []
            for index, color in enumerate(colors, start=1):
                path = frame_dir / f"{index}.png"
                Image.new("RGBA", (2, 2), color).save(path)
                frames.append(
                    {
                        "id": f"frame-{index}",
                        "file": str(path.relative_to(root)),
                        "description": f"frame {index}",
                    }
                )
            sequence = {
                "runtime": "runtime/test.webp",
                "columns": 2,
                "rows": 2,
                "frameSize": {"width": 2, "height": 2},
                "loop": False,
                "frames": frames,
            }

            built = build_sequence(root, "test-sequence", sequence)
            sheet = Image.open(root / "runtime/test.webp").convert("RGBA")

            self.assertEqual(built["frameCount"], 3)
            self.assertEqual(built["frameIds"], ["frame-1", "frame-2", "frame-3"])
            self.assertEqual(sheet.size, (4, 4))
            self.assertEqual(sheet.getpixel((1, 1))[:3], colors[0][:3])
            self.assertEqual(sheet.getpixel((3, 1))[:3], colors[1][:3])
            self.assertEqual(sheet.getpixel((1, 3))[:3], colors[2][:3])
            self.assertEqual(sheet.getpixel((3, 3))[3], 0)


if __name__ == "__main__":
    unittest.main()
