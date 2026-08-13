"""冒烟测试：只对球做一次抠图，验证管线可用再全量跑。"""
from io import BytesIO
from pathlib import Path

from PIL import Image
from rembg import new_session, remove

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / "design-assets" / "intro" / "source" / "ball" / "ball-bounce-source.png"
out = ROOT / "public" / "assets" / "intro" / "ball" / "ball-bounce.webp"

session = new_session("isnet-general-use")
foreground = remove(
    source.read_bytes(),
    session=session,
    alpha_matting=True,
    alpha_matting_foreground_threshold=240,
    alpha_matting_background_threshold=10,
    alpha_matting_erode_size=5,
)
image = Image.open(BytesIO(foreground)).convert("RGBA")
print("size:", image.size, "mode:", image.mode)
# alpha 通道统计：min 应为 0（存在完全透明的背景像素）
alpha = image.getchannel("A")
lo, hi = alpha.getextrema()
print("alpha extrema:", lo, hi)
out.parent.mkdir(parents=True, exist_ok=True)
image.save(out, "WEBP", lossless=True, method=6, exact=True)
print("wrote", out, out.stat().st_size, "bytes")
