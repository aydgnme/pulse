#!/usr/bin/env python3
"""Shared drawing helpers for the App Store screenshot generators.

Both make_screenshots.py (iPhone) and make_watch_screenshots.py (Apple Watch)
draw the same game: one ring, one target, one needle, one score. Keeping that
drawing in one place is the point — two copies of it would drift, and the whole
value of a generated screenshot is that it matches what the app actually does.

Palette mirrors src/theme.ts.
"""
import math
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

BG_TOP = (10, 16, 32)
BG_BOTTOM = (7, 11, 20)
MINT = (94, 234, 212)
CORAL = (255, 92, 122)
TEXT = (234, 242, 255)
DIM = (139, 147, 167)

FONTS = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/System/Library/Fonts/SFNS.ttf",
]
FONTS_REG = [
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
]


def font(size, bold=True):
    for p in (FONTS if bold else FONTS_REG):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def tracked(d, xy, text, f, fill, tracking=0, anchor_center=True):
    """Draw text with letterspacing; xy is the center if anchor_center."""
    widths = [d.textlength(ch, font=f) for ch in text]
    total = sum(widths) + tracking * (len(text) - 1)
    x = xy[0] - total / 2 if anchor_center else xy[0]
    y = xy[1]
    for ch, w in zip(text, widths):
        d.text((x, y), ch, font=f, fill=fill)
        x += w + tracking


def gradient_bg(w, h):
    img = Image.new("RGB", (w, h), BG_BOTTOM)
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / h
        col = tuple(int(BG_TOP[c] + (BG_BOTTOM[c] - BG_TOP[c]) * t) for c in range(3))
        d.line([(0, y), (w, y)], fill=col)
    return img


def glow(img, center, radius, color, blur, alpha):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x, y = center
    d.ellipse([x - radius, y - radius, x + radius, y + radius], fill=color + (alpha,))
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    img.alpha_composite(layer)


def pos(cx, cy, R, deg):
    rad = math.radians(deg)
    return (cx + R * math.sin(rad), cy - R * math.cos(rad))


def draw_game(img, cx, cy, R, score, needle_deg, target_deg, dot,
              trail=None, dead=False, best=None):
    d = ImageDraw.Draw(img, "RGBA")
    ring_w = int(R * 0.028)
    d.ellipse([cx - R, cy - R, cx + R, cy + R],
              outline=(234, 242, 255, 30), width=ring_w)

    # motion trail: a smooth comet tail of fading, shrinking dots
    if trail:
        direction, length = trail
        layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        steps = 90
        for i in range(steps, 0, -1):
            t = i / steps
            a = needle_deg - direction * length * t
            x, y = pos(cx, cy, R, a)
            r = dot * (0.25 + 0.65 * (1 - t))
            alpha = int(70 * (1 - t) ** 1.5 + 6)
            ld.ellipse([x - r, y - r, x + r, y + r], fill=MINT + (alpha,))
        layer = layer.filter(ImageFilter.GaussianBlur(dot * 0.12))
        img.alpha_composite(layer)
        d = ImageDraw.Draw(img, "RGBA")

    for deg, color in [(target_deg, CORAL), (needle_deg, MINT)]:
        x, y = pos(cx, cy, R, deg)
        glow(img, (x, y), dot * 2.2, color, dot, 110)
        d = ImageDraw.Draw(img, "RGBA")
        d.ellipse([x - dot, y - dot, x + dot, y + dot], fill=color + (255,))

    # score
    f_score = font(int(R * 0.62))
    d.text((cx, cy - R * 0.06), str(score), font=f_score, fill=TEXT, anchor="mm")
    if dead:
        f_lab = font(int(R * 0.075))
        tracked(d, (cx, cy + R * 0.24), "GAME OVER" if not best else "NEW BEST",
                f_lab, CORAL, tracking=int(R * 0.035))
        f_hint = font(int(R * 0.062))
        tracked(d, (cx, cy + R * 0.38), "TAP TO RETRY", f_hint, DIM,
                tracking=int(R * 0.028))
