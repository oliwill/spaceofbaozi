from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np

RAW = Path('assets-master/raw/home')
MASTER = Path('assets-master/master/home')
WEB = Path('public/assets/home')
MASTER.mkdir(parents=True, exist_ok=True)
WEB.mkdir(parents=True, exist_ok=True)

# 1) Central stripe fabric: crop a representative vertical band and compress for CSS background.
stripe = Image.open(RAW / 'cover-B.png').convert('RGB')
w, h = stripe.size
# keep center portion; source is already vertical fabric stripes, this preserves actual thread detail.
# output is taller than needed so high-DPI cover/spine keeps textile detail without shipping full photo.
target_h = 1200
ratio = target_h / h
resized = stripe.resize((round(w * ratio), target_h), Image.Resampling.LANCZOS)
rw, rh = resized.size
# 360px is plenty for 62px spine at 1.35-1.8x scale and lets background-size cover choose a natural slice.
crop_w = min(360, rw)
left = max(0, (rw - crop_w) // 2)
stripe_out = resized.crop((left, 0, left + crop_w, rh))
stripe_out.save(MASTER / 'cover-B.png')
stripe_out.save(WEB / 'cover-B.webp', quality=78, method=6)

# 2) Bookmark: source is JPEG-like with black/gold glow background. Build alpha from luminance,
# keep bright object + controlled edge glow, drop nearly-black backdrop.
bm = Image.open(RAW / 'cover-bookmark.png').convert('RGB')
arr = np.asarray(bm).astype(np.float32)
# perceived luminance; object and golden clip are bright, background mostly dark.
lum = arr[..., 0] * 0.2126 + arr[..., 1] * 0.7152 + arr[..., 2] * 0.0722
# Smooth alpha: below 34 gone, above 92 solid. Keeps metal/dog edges, removes black square.
alpha = np.clip((lum - 34) / (92 - 34), 0, 1)
# Suppress low-saturation dark haze so the old black vignette doesn't become a muddy halo on paper.
maxc = arr.max(axis=2)
minc = arr.min(axis=2)
sat = (maxc - minc) / np.maximum(maxc, 1)
alpha *= np.where((lum < 120) & (sat < 0.22), 0.35, 1.0)
alpha = Image.fromarray((alpha * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.6))
rgba = Image.merge('RGBA', (*bm.split(), alpha))
# Crop to visible content with margin.
bbox = alpha.point(lambda p: 255 if p > 12 else 0).getbbox()
if bbox:
    margin = 18
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - margin); y0 = max(0, y0 - margin)
    x1 = min(bm.width, x1 + margin); y1 = min(bm.height, y1 + margin)
    rgba = rgba.crop((x0, y0, x1, y1))
# master keeps higher fidelity PNG; production caps long side around 560px.
rgba.save(MASTER / 'cover-bookmark.png')
long = 560
scale = long / max(rgba.size)
web_size = (round(rgba.width * scale), round(rgba.height * scale))
web_bm = rgba.resize(web_size, Image.Resampling.LANCZOS)
web_bm.save(WEB / 'cover-bookmark.webp', quality=82, method=6)

for p in [MASTER / 'cover-B.png', WEB / 'cover-B.webp', MASTER / 'cover-bookmark.png', WEB / 'cover-bookmark.webp']:
    print(p, Image.open(p).size, round(p.stat().st_size / 1024, 1), 'KB')
