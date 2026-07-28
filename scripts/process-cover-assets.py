"""一次性：封面麻布染整 + 手绣题字提取（assets pipeline 工序 1/3）。"""
import numpy as np
from PIL import Image

RAW = "assets-master/raw/home"
MASTER = "assets-master/master/home"
WEB = "public/assets/home"

# ---------- 1) cover-linen@A- : 浅蓝麻布 -> 深靛蓝（乘法染整，保留织纹） ----------
lin = Image.open(f"{RAW}/cover-linen@A-.png").convert("RGB")
arr = np.asarray(lin).astype(np.float32) / 255.0
mean = arr.reshape(-1, 3).mean(axis=0)
target = np.array([0x31, 0x49, 0x7A], dtype=np.float32) / 255.0  # #31497a
gain = target / mean
graded = np.clip(arr * gain, 0, 1) ** 1.08  # 轻微加深中间调
out = Image.fromarray((graded * 255).astype("uint8"))

# 裁到封面比例 627:800（中心裁切）
w, h = out.size
tr = 627 / 800
if w / h > tr:
    nw = int(h * tr)
    x = (w - nw) // 2
    out = out.crop((x, 0, x + nw, h))
else:
    nh = int(w / tr)
    y = (h - nh) // 2
    out = out.crop((0, y, w, y + nh))

master = out.resize((round(2048 * tr), 2048), Image.LANCZOS)
master.save(f"{MASTER}/cover-linen@A-.png")
web = out.resize((round(1200 * tr), 1200), Image.LANCZOS)
web.save(f"{WEB}/cover-linen@A-.webp", quality=84, method=6)

# ---------- 2) cover-hand@D : 白字黑底 -> 暖白绣字透明 PNG ----------
hand = Image.open(f"{RAW}/cover-hand.png").convert("L")
a = np.asarray(hand).astype(np.float32) / 255.0
alpha = np.clip((a - 0.08) / 0.92, 0, 1) ** 1.15  # 亮度即透明度，去噪底
h2, w2 = alpha.shape
rgba = np.zeros((h2, w2, 4), np.uint8)
rgba[..., 0], rgba[..., 1], rgba[..., 2] = (245, 242, 232)  # 暖白，对齐封面文字色
rgba[..., 3] = (alpha * 255).astype("uint8")
img = Image.fromarray(rgba, "RGBA").crop(Image.fromarray(rgba, "RGBA").getbbox())

m = 8
canvas = Image.new("RGBA", (img.width + 2 * m, img.height + 2 * m), (0, 0, 0, 0))
canvas.paste(img, (m, m))
mh = round(canvas.height * 2048 / canvas.width)
canvas.resize((2048, mh), Image.LANCZOS).save(f"{MASTER}/cover-hand@D.png")
wh = round(canvas.height * 880 / canvas.width)
canvas.resize((880, wh), Image.LANCZOS).save(f"{WEB}/cover-hand@D.webp", quality=88, method=6)

# ---------- 3) 合成预览：绣字压麻布，人工验收 ----------
preview = web.convert("RGBA")
hand_small = canvas.resize((720, round(canvas.height * 720 / canvas.width)), Image.LANCZOS)
preview.paste(hand_small, (110, 300), hand_small)
preview.convert("RGB").save("assets-master/cover-preview.jpg", quality=90)

import os
for f in [f"{WEB}/cover-linen@A-.webp", f"{WEB}/cover-hand@D.webp"]:
    print(f, round(os.path.getsize(f) / 1024, 1), "KB")
print("mean before", (mean * 255).round(1), "after target", (target * 255).round(1))
print("hand webp size", wh)
