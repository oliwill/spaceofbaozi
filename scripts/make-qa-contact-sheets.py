"""视觉 QA 接触表：把每张 sprite 铺在中灰底上，便于检查抠图损伤。"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
INTRO = ROOT / "public" / "assets" / "intro"
OUT = ROOT / "design-assets" / "intro" / "qa"

SHEETS = [
    "ball/ball-bounce.webp",
    "dog/dog-run-right.webp",
    "dog/dog-circle-settle.webp",
    "person/summer-pulled-run-right.webp",
    "person/summer-trip-exit-right.webp",
    "person/summer-land-stand.webp",
]

OUT.mkdir(parents=True, exist_ok=True)
for rel in SHEETS:
    img = Image.open(INTRO / rel).convert("RGBA")
    cols, rows = 4, 2
    fw, fh = img.width // cols, img.height // rows
    bg = Image.new("RGBA", img.size, (128, 128, 128, 255))
    bg.alpha_composite(img)
    # 画单元格分割线，方便逐帧检查
    from PIL import ImageDraw

    draw = ImageDraw.Draw(bg)
    for c in range(1, cols):
        draw.line([(c * fw, 0), (c * fw, img.height)], fill=(255, 0, 0, 255), width=2)
    for r in range(1, rows):
        draw.line([(0, r * fh), (img.width, r * fh)], fill=(255, 0, 0, 255), width=2)
    name = rel.replace("/", "_").replace(".webp", ".png")
    bg.convert("RGB").save(OUT / name)
    print("wrote", OUT / name)
