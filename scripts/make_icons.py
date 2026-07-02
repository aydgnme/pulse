#!/usr/bin/env python3
"""Generate the Pulse app icon set (iOS, Android adaptive, splash, favicon)."""
import math
import os
from PIL import Image, ImageDraw, ImageFilter

ASSETS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets")

BG_TOP = (10, 16, 32)
BG_BOTTOM = (7, 11, 20)
RING = (234, 242, 255, 46)
MINT = (94, 234, 212)
CORAL = (255, 92, 122)
SS = 4  # supersampling factor


def radial_bg(size):
    """Dark navy background with a subtle radial lift in the center."""
    img = Image.new("RGB", (size, size), BG_BOTTOM)
    d = ImageDraw.Draw(img)
    cx = cy = size / 2
    maxr = size * 0.75
    steps = 120
    for i in range(steps, 0, -1):
        t = i / steps
        r = maxr * t
        col = tuple(
            int(BG_BOTTOM[c] + (BG_TOP[c] - BG_BOTTOM[c]) * (1 - t))
            for c in range(3)
        )
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
    return img


def glow_dot(layer_size, center, radius, color, blur, alpha=255):
    """Return an RGBA layer containing one blurred glow dot."""
    layer = Image.new("RGBA", (layer_size, layer_size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x, y = center
    d.ellipse([x - radius, y - radius, x + radius, y + radius],
              fill=color + (alpha,))
    return layer.filter(ImageFilter.GaussianBlur(blur))


def draw_mark(img, cx, cy, R, dot, ring_width, needle_deg=318, target_deg=32,
              ring_alpha=46):
    """Draw the Pulse mark (ring + needle dot + target dot) onto an RGBA/RGB image."""
    d = ImageDraw.Draw(img, "RGBA")
    d.ellipse([cx - R, cy - R, cx + R, cy + R],
              outline=(234, 242, 255, ring_alpha), width=ring_width)

    def pos(deg):
        rad = math.radians(deg)
        return (cx + R * math.sin(rad), cy - R * math.cos(rad))

    for deg, color in [(target_deg, CORAL), (needle_deg, MINT)]:
        x, y = pos(deg)
        # halo
        halo = glow_dot(img.width, (x, y), dot * 2.1, color, dot * 0.9, alpha=110)
        img.paste(Image.alpha_composite(img.convert("RGBA"), halo).convert(img.mode), (0, 0))
        d = ImageDraw.Draw(img, "RGBA")
        d.ellipse([x - dot, y - dot, x + dot, y + dot], fill=color + (255,))


def make_icon():
    """1024 iOS icon: full-bleed background + mark."""
    s = 1024 * SS
    img = radial_bg(s)
    draw_mark(img, s / 2, s / 2, R=s * 0.30, dot=s * 0.052,
              ring_width=int(s * 0.018), ring_alpha=70)
    img = img.resize((1024, 1024), Image.LANCZOS)
    img.save(f"{ASSETS}/icon.png")


def make_transparent_mark(fname, scale=1.0, mono=False):
    """1024 transparent-bg mark for splash / android foreground / monochrome."""
    s = 1024 * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    global MINT, CORAL
    saved = (MINT, CORAL)
    if mono:
        MINT = CORAL = (255, 255, 255)
    draw_mark(img, s / 2, s / 2, R=s * 0.30 * scale, dot=s * 0.052 * scale,
              ring_width=int(s * 0.018 * scale),
              ring_alpha=110 if not mono else 200)
    MINT, CORAL = saved
    img = img.resize((1024, 1024), Image.LANCZOS)
    img.save(f"{ASSETS}/{fname}")


def make_android_bg():
    radial_bg(1024).save(f"{ASSETS}/android-icon-background.png")


def make_favicon():
    s = 256 * SS
    img = radial_bg(s)
    draw_mark(img, s / 2, s / 2, R=s * 0.34, dot=s * 0.085,
              ring_width=int(s * 0.03), ring_alpha=80)
    img = img.resize((48, 48), Image.LANCZOS)
    img.save(f"{ASSETS}/favicon.png")


make_icon()
make_transparent_mark("splash-icon.png")
make_transparent_mark("android-icon-foreground.png", scale=0.6)  # adaptive safe zone
make_transparent_mark("android-icon-monochrome.png", scale=0.6, mono=True)
make_android_bg()
make_favicon()
print("icons done")
