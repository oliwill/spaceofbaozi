"""A0 素材工程化：生成源稿 → 生产级透明 4×2 WebP sprite。

依赖：.venv-assets（requirements-assets.txt）
用法：.venv-assets\\Scripts\\python.exe scripts\\build-intro-sprites.py

不做颜色键抠图。若模型抠图损坏白色毛发、衬衫边缘、眼镜、手部或帽檐，
停止并用图像编辑器手工修复蒙版，不要削弱审计门槛。
"""
from io import BytesIO
from pathlib import Path

from PIL import Image
from rembg import new_session, remove

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "design-assets" / "intro" / "source"
OUTPUT = ROOT / "public" / "assets" / "intro"

SHEETS = {
    SOURCE / "ball" / "ball-bounce-source.png": OUTPUT / "ball" / "ball-bounce.webp",
    SOURCE / "dog" / "dog-run-right-source.png": OUTPUT / "dog" / "dog-run-right.webp",
    SOURCE / "dog" / "dog-circle-settle-source.png": OUTPUT / "dog" / "dog-circle-settle.webp",
    SOURCE / "person" / "summer-pulled-run-right-source.png": OUTPUT / "person" / "summer-pulled-run-right.webp",
    SOURCE / "person" / "summer-trip-exit-right-source.png": OUTPUT / "person" / "summer-trip-exit-right.webp",
    SOURCE / "person" / "summer-land-stand-source.png": OUTPUT / "person" / "summer-land-stand.webp",
}

session = new_session("isnet-general-use")

for source_path, output_path in SHEETS.items():
    raw = source_path.read_bytes()
    foreground = remove(
        raw,
        session=session,
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=10,
        alpha_matting_erode_size=5,
    )
    image = Image.open(BytesIO(foreground)).convert("RGBA")
    padded_width = image.width + (-image.width % 4)
    padded_height = image.height + (-image.height % 2)
    if padded_width != image.width or padded_height != image.height:
        padded = Image.new("RGBA", (padded_width, padded_height), (0, 0, 0, 0))
        padded.alpha_composite(image, (0, 0))
        image = padded
    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(output_path, "WEBP", lossless=True, method=6, exact=True)
    print(f"wrote {output_path.relative_to(ROOT)} {image.width}x{image.height}")
