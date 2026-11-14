# Builds every app icon from one square logo render (lime mark on near-black): python tools/make_icons.py <logo.png>
# The mark is lifted off its background by its green channel, recoloured to the brand lime, then centred at the width
# each icon used before (full icons ~74% wide; maskable / adaptive foreground ~58%, inside the safe zone).
import sys
import numpy as np
from PIL import Image

LIME, BG = (174, 233, 62), (9, 9, 11)
src = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(np.float32)
a = np.clip((src[..., 1] - 25) / (225 - 25), 0, 1)
ys, xs = np.where(a > 0.5)
a = a[ys.min() - 4:ys.max() + 5, xs.min() - 4:xs.max() + 5]
mark = Image.fromarray(np.dstack([np.full(a.shape + (3,), LIME, np.uint8), (a * 255).astype(np.uint8)]), "RGBA")

def icon(size, width, bg=BG):
    w = round(size * width); h = round(mark.height * w / mark.width)
    m = mark.resize((w, h), Image.LANCZOS)
    out = Image.new("RGBA", (size, size), (*bg, 255) if bg else (0, 0, 0, 0))
    out.alpha_composite(m, ((size - w) // 2, (size - h) // 2))
    return out if not bg else out.convert("RGB")

for path, size, width, bg in [
    ("public/icon-512.png", 512, 0.74, BG), ("public/icon-192.png", 192, 0.74, BG), ("src/app/icon.png", 512, 0.74, BG),
    ("src/app/apple-icon.png", 180, 0.74, BG), ("mobile/assets/images/spotter-icon.png", 512, 0.74, BG),
    ("mobile/assets/web/icon-512.png", 512, 0.74, BG), ("public/icon-maskable.png", 512, 0.58, BG),
    ("mobile/assets/images/android-icon-foreground.png", 1024, 0.58, None),
]:
    icon(size, width, bg).save(path, optimize=True)
    print("wrote", path)
