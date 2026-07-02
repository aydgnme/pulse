#!/usr/bin/env python3
"""Generate Pulse branding assets: logo lockup, wordmark, social banner,
and the iOS 18 dark/tinted icon variants."""
import math
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
BRAND = os.path.join(ROOT, "store", "branding")
ASSETS = os.path.join(ROOT, "assets")

BG_TOP = (10, 16, 32)
BG_BOTTOM = (7, 11, 20)
MINT = (94, 234, 212)
CORAL = (255, 92, 122)
TEXT = (234, 242, 255)
DIM = (139, 147, 167)
SS = 4

FONTS = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
]


def font(size):
    for p in FONTS:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def tracked(d, xy, text, f, fill, tracking, anchor_center=True):
    widths = [d.textlength(ch, font=f) for ch in text]
    total = sum(widths) + tracking * (len(text) - 1)
    x = xy[0] - total / 2 if anchor_center else xy[0]
    for ch, w in zip(text, widths):
        d.text((x, xy[1]), ch, font=f, fill=fill)
        x += w + tracking
    return total


def glow(img, center, color, outer, alpha0=130):
    """Radial glow via replace-drawn concentric rings — safe on transparent
    backgrounds (no black fringing from blurring straight alpha)."""
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
    img.alpha_composite(layer)


def draw_mark(img, cx, cy, R, dot, ring_w, ring_alpha=80,
              mint=MINT, coral=CORAL, with_glow=True):
    d = ImageDraw.Draw(img, "RGBA")
    d.ellipse([cx - R, cy - R, cx + R, cy + R],
              outline=(234, 242, 255, ring_alpha), width=ring_w)
    for deg, color in [(32, coral), (318, mint)]:
        rad = math.radians(deg)
        x, y = cx + R * math.sin(rad), cy - R * math.cos(rad)
        if with_glow:
            glow(img, (x, y), color, dot * 2.6)
        d = ImageDraw.Draw(img, "RGBA")
        d.ellipse([x - dot, y - dot, x + dot, y + dot], fill=color + (255,))


def gradient_bg(w, h):
    img = Image.new("RGB", (w, h), BG_BOTTOM)
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / h
        col = tuple(int(BG_TOP[c] + (BG_BOTTOM[c] - BG_TOP[c]) * t) for c in range(3))
        d.line([(0, y), (w, y)], fill=col)
    return img


def wordmark(fname, color=TEXT, size=(2000, 520)):
    """PULSE wordmark with the mark as the U's counter — transparent bg."""
    w, h = size[0] * 2, size[1] * 2
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    f = font(int(h * 0.52))
    total = tracked(d, (w / 2, h * 0.18), "PULSE", f, color, int(h * 0.09))
    img = img.resize(size, Image.LANCZOS)
    img.save(f"{BRAND}/{fname}")


def logo_lockup():
    """Mark + PULSE side by side, transparent bg, for docs and web."""
    w, h = 2400 * 2, 800 * 2
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    R = int(h * 0.30)
    cx, cy = int(h * 0.42), h // 2
    draw_mark(img, cx, cy, R, dot=int(R * 0.17), ring_w=int(R * 0.06))
    d = ImageDraw.Draw(img)
    f = font(int(h * 0.34))
    tracked(d, (cx + R + int(h * 0.14), cy - int(h * 0.19)), "PULSE", f, TEXT,
            int(h * 0.055), anchor_center=False)
    img = img.resize((2400, 800), Image.LANCZOS)
    img.save(f"{BRAND}/logo-lockup.png")


def logo_mark():
    """Standalone mark, transparent bg, 1024."""
    s = 1024 * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw_mark(img, s / 2, s / 2, int(s * 0.34), dot=int(s * 0.058),
              ring_w=int(s * 0.020), ring_alpha=110)
    img.resize((1024, 1024), Image.LANCZOS).save(f"{BRAND}/logo-mark.png")


def social_banner():
    """1280x640 banner (GitHub social preview / web)."""
    w, h = 1280 * 2, 640 * 2
    img = gradient_bg(w, h).convert("RGBA")
    R = int(h * 0.30)
    cx, cy = int(w * 0.26), h // 2
    draw_mark(img, cx, cy, R, dot=int(R * 0.16), ring_w=int(R * 0.055))
    d = ImageDraw.Draw(img)
    f = font(int(h * 0.19))
    x0 = cx + R + int(h * 0.16)
    tracked(d, (x0, cy - int(h * 0.235)), "PULSE", f, TEXT, int(h * 0.04),
            anchor_center=False)
    f2 = font(int(h * 0.055))
    d.text((x0 + int(h * 0.012), cy + int(h * 0.06)),
           "One tap. Perfect timing.", font=f2, fill=DIM)
    img.convert("RGB").resize((1280, 640), Image.LANCZOS).save(
        f"{BRAND}/social-banner.png")


def ios_icon_variants():
    """iOS 18 dark and tinted icon variants (transparent background)."""
    s = 1024 * SS
    # dark: same colours, transparent bg (system supplies the dark plate)
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw_mark(img, s / 2, s / 2, int(s * 0.30), dot=int(s * 0.052),
              ring_w=int(s * 0.018), ring_alpha=120)
    img.resize((1024, 1024), Image.LANCZOS).save(f"{ASSETS}/icon-dark.png")
    # tinted: grayscale alpha mask (system tints it)
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    white = (255, 255, 255)
    draw_mark(img, s / 2, s / 2, int(s * 0.30), dot=int(s * 0.052),
              ring_w=int(s * 0.018), ring_alpha=200,
              mint=white, coral=white, with_glow=False)
    img.resize((1024, 1024), Image.LANCZOS).save(f"{ASSETS}/icon-tinted.png")


os.makedirs(BRAND, exist_ok=True)
logo_mark()
logo_lockup()
wordmark("wordmark-light.png")
wordmark("wordmark-dim.png", color=DIM)
social_banner()
ios_icon_variants()
print("branding done")
