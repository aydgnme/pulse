#!/usr/bin/env python3
"""Generate the Pulse app icon set (iOS, Android adaptive, splash, favicon)."""
import math
import os
from PIL import Image, ImageDraw

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


def radial_glow(img, center, color, outer, alpha0=110):
    """Composite a soft radial glow. Rings are replace-drawn from faint outer
    to strong inner on a fresh layer, so transparent pixels never mix black
    into the gradient (the classic blur-on-straight-alpha artifact)."""
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x, y = center
    steps = 48
    for i in range(steps, 0, -1):
        t = i / steps
        r = outer * t
        a = int(alpha0 * (1 - t) ** 2)
        if a <= 0:
            continue
        d.ellipse([x - r, y - r, x + r, y + r], fill=color + (a,))
    base = img.convert("RGBA")
    base.alpha_composite(layer)
    return base


def draw_mark(img, cx, cy, R, dot, ring_width, needle_deg=318, target_deg=32,
              ring_alpha=46):
    """Draw the Pulse mark (ring + needle dot + target dot); returns the image
    (glow compositing may need a mode conversion)."""
    d = ImageDraw.Draw(img, "RGBA")
    d.ellipse([cx - R, cy - R, cx + R, cy + R],
              outline=(234, 242, 255, ring_alpha), width=ring_width)

    def pos(deg):
        rad = math.radians(deg)
        return (cx + R * math.sin(rad), cy - R * math.cos(rad))

    for deg, color in [(target_deg, CORAL), (needle_deg, MINT)]:
        x, y = pos(deg)
        img = radial_glow(img, (x, y), color, dot * 2.6, alpha0=130)
        d = ImageDraw.Draw(img, "RGBA")
        d.ellipse([x - dot, y - dot, x + dot, y + dot], fill=color + (255,))
    return img


def make_icon():
    """1024 iOS icon: full-bleed background + mark."""
    s = 1024 * SS
    img = radial_bg(s)
    img = draw_mark(img, s / 2, s / 2, R=s * 0.30, dot=s * 0.052,
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
    img = draw_mark(img, s / 2, s / 2, R=s * 0.30 * scale, dot=s * 0.052 * scale,
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
    img = draw_mark(img, s / 2, s / 2, R=s * 0.34, dot=s * 0.085,
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
