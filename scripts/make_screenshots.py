#!/usr/bin/env python3
"""Generate App Store screenshots (6.9-inch, 1320x2868) for Pulse."""
import math
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "store", "screenshots")
W, H = 1284, 2778
SS = 2  # supersample
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


def shot(fname, headline, sub, score, needle_deg, target_deg,
         trail=None, dead=False, best_label=False, best_value="12"):
    w, h = W * SS, H * SS
    img = gradient_bg(w, h).convert("RGBA")
    d = ImageDraw.Draw(img, "RGBA")

    # wordmark
    f_mark = font(int(56 * SS))
    tracked(d, (w / 2, 150 * SS), "PULSE", f_mark, DIM, tracking=int(30 * SS))

    # headline (up to 2 lines)
    f_head = font(int(128 * SS))
    lines = headline.split("\n")
    y = 360 * SS
    for line in lines:
        d.text((w / 2, y), line, font=f_head, fill=TEXT, anchor="mm")
        y += int(150 * SS)
    f_sub = font(int(58 * SS), bold=False)
    d.text((w / 2, y + int(40 * SS)), sub, font=f_sub, fill=DIM, anchor="mm")

    # BEST header above the ring
    f_bl = font(int(40 * SS))
    tracked(d, (w / 2, 1080 * SS), "BEST", f_bl, DIM, tracking=int(16 * SS))
    f_bv = font(int(72 * SS))
    d.text((w / 2, (1080 + 95) * SS), best_value, font=f_bv, fill=TEXT, anchor="mm")

    # game ring
    draw_game(img, w / 2, 1900 * SS, 460 * SS, score, needle_deg, target_deg,
              dot=44 * SS, trail=trail, dead=dead, best=best_label)

    # death flash tint
    if dead and not best_label:
        tint = Image.new("RGBA", img.size, CORAL + (14,))
        img.alpha_composite(tint)

    img = img.convert("RGB").resize((W, H), Image.LANCZOS)
    img.save(f"{OUT}/{fname}", quality=95)
    print(fname)


os.makedirs(OUT, exist_ok=True)

shot("1-one-tap.png",
     "One tap.\nPerfect timing.",
     "Tap when the pulse meets the mark",
     12, needle_deg=8, target_deg=36, trail=(1, 120), best_value="27")

shot("2-faster.png",
     "Every hit\ngets faster.",
     "The window shrinks as your streak grows",
     34, needle_deg=205, target_deg=232, trail=(1, 160), best_value="34")

shot("3-one-miss.png",
     "One miss\nends the run.",
     "No lives. No second chances.",
     27, needle_deg=262, target_deg=224, dead=True, best_value="34")

shot("4-best.png",
     "Chase\nyour best.",
     "Your record is always on screen",
     41, needle_deg=118, target_deg=90, dead=True, best_label=True,
     best_value="41")

print("screenshots done")
