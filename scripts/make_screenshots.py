#!/usr/bin/env python3
"""Generate App Store screenshots (6.5-inch, 1284x2778) for Pulse."""
import os

from PIL import Image, ImageDraw

from shotkit import (
    CORAL,
    DIM,
    TEXT,
    draw_game,
    font,
    gradient_bg,
    tracked,
)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "store", "screenshots")
W, H = 1284, 2778
SS = 2  # supersample


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


if __name__ == "__main__":
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
