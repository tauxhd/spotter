# Prepares the deck's images from deck/shots: phone-framed screenshots, rounded close-up "component" cards, icon PNGs.
from PIL import Image, ImageDraw
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS, OUT, PUB = os.path.join(HERE, "shots"), os.path.join(HERE, "assets"), os.path.join(HERE, "..", "public")
os.makedirs(OUT, exist_ok=True)

def small(im, path):
    """save as a 256-colour PNG with transparency: a fifth of the size, and the dark UI art is indistinguishable"""
    im.convert("RGBA").quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG).save(path, optimize=True)

def rounded(im, r):
    im = im.convert("RGBA")
    m = Image.new("L", (im.width * 2, im.height * 2), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, m.width - 1, m.height - 1), r * 2, fill=255)
    im.putalpha(m.resize(im.size, Image.LANCZOS))
    return im

def phone(name, crop=None):
    """a screenshot inside a phone body (rounded dark bezel with a light edge)"""
    s = Image.open(os.path.join(SHOTS, name + ".png")).convert("RGB")
    if crop: s = s.crop(crop)
    B = 26
    w, h = s.width + 2 * B, s.height + 2 * B
    body = Image.new("RGBA", (w * 2, h * 2), (0, 0, 0, 0)); d = ImageDraw.Draw(body)
    d.rounded_rectangle((0, 0, w * 2 - 1, h * 2 - 1), 150 * 2, fill=(82, 82, 91, 255))             # edge light
    d.rounded_rectangle((4, 4, w * 2 - 5, h * 2 - 5), 146 * 2, fill=(39, 39, 42, 255))             # bezel
    body = body.resize((w, h), Image.LANCZOS)
    body.alpha_composite(rounded(s, 118), (B, B))
    body = body.resize((round(body.width * 1500 / body.height), 1500), Image.LANCZOS)  # 1500 px tall is plenty for a 5-6 inch phone
    small(body, os.path.join(OUT, "phone-" + name + ".png"))
    return body.size

def card(name, box, out=None, r=44, src=None):
    s = Image.open(os.path.join(SHOTS, (src or name) + ".png")).convert("RGB").crop(box)
    k = min(1, 1400 / max(s.size))
    s = s.resize((round(s.width * k), round(s.height * k)), Image.LANCZOS)
    small(rounded(s, round(r * k)), os.path.join(OUT, "card-" + (out or name) + ".png"))
    return s.size

CARDS = {  # name: (shot, box)
    "crowd": ("home", (24, 480, 836, 1020)),
    "muscles": ("muscles", (32, 388, 828, 1446)),
    "radar": ("radar", (32, 388, 828, 1446)),
    "podium": ("board", (0, 630, 860, 1180)),
    "macros": ("food", (30, 700, 830, 1380)),
    "poster": ("poster", (24, 24, 836, 1068)),
}
if __name__ == "__main__":
    for f in sorted(os.listdir(SHOTS)):
        n = f[:-4]
        if f.endswith(".png") and not n.startswith(("landing", "video")): phone(n)
    for out, (src, box) in CARDS.items(): print(out, card(out, box, src=src))
    for n in ["landing", "landing-hero", "landing-demo", "video-frame"]:
        s = Image.open(os.path.join(SHOTS, n + ".png")).convert("RGB"); s = s.resize((1800, round(1800 * s.height / s.width)), Image.LANCZOS); rounded(s, 26).save(os.path.join(OUT, "wide-" + n + ".png"), optimize=True); print(n, s.size)
    for n in os.listdir(os.path.join(PUB, "icons")):
        if n.endswith(".webp"):
            im = Image.open(os.path.join(PUB, "icons", n)).convert("RGBA"); im = im.resize((256, 256), Image.LANCZOS); im.save(os.path.join(OUT, "icon-" + n[:-5] + ".png"))
    print("ok")
