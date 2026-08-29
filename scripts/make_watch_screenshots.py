#!/usr/bin/env python3
"""Generate App Store screenshots (Apple Watch, 416x496) for Pulse.

416x496 is the size App Store Connect lists for Apple Watch Series 10 and 11.
The canvas is roughly square and tiny next to the iPhone's 1284x2778, so this
is not the iPhone layout scaled down: the headline is short and the ring sits
lower and larger, because a watch screenshot is viewed small and the ring is
the thing that has to read at a glance.

Shares its drawing with the iPhone generator via shotkit, so the ring, needle,
target and score are the same game in both sets.
"""
import os

from PIL import Image, ImageDraw

from shotkit import (
    DIM,
    TEXT,
    draw_game,
    font,
    gradient_bg,
    tracked,
)

OUT = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "store", "screenshots-watch"
)
W, H = 416, 496
SS = 3  # supersample; higher than the iPhone's because the canvas is small

RING_CY = 336
RING_R = 112


def shot(fname, headline, sub, score, needle_deg, target_deg,
         trail=None, dead=False, best_label=False):
    w, h = W * SS, H * SS
    img = gradient_bg(w, h).convert("RGBA")
    d = ImageDraw.Draw(img, "RGBA")

    # wordmark
    tracked(d, (w / 2, 24 * SS), "PULSE", font(int(13 * SS)), DIM,
            tracking=int(7 * SS))

    # headline (up to 2 lines), then the supporting line
    f_head = font(int(30 * SS))
    y = 78 * SS
    for line in headline.split("\n"):
        d.text((w / 2, y), line, font=f_head, fill=TEXT, anchor="mm")
        y += int(34 * SS)
    d.text((w / 2, y + int(6 * SS)), sub, font=font(int(14 * SS), bold=False),
           fill=DIM, anchor="mm")

    draw_game(img, w / 2, RING_CY * SS, RING_R * SS, score,
              needle_deg, target_deg, dot=int(RING_R * 0.096 * SS),
              trail=trail, dead=dead, best=best_label)

    img = img.convert("RGB").resize((W, H), Image.LANCZOS)
    img.save(f"{OUT}/{fname}", quality=95)
    print(fname)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)

    # Every headline is two lines on purpose: a one-line headline leaves the
    # band between the supporting line and the ring visibly empty, and the set
    # should sit the same way in all four.
    shot("1-one-tap.png",
         "One tap.\nPerfect timing.",
         "Tap when the pulse meets the mark",
         9, needle_deg=8, target_deg=36, trail=(1, 120))

    shot("2-faster.png",
         "Faster\nevery hit.",
         "The window keeps shrinking",
         28, needle_deg=205, target_deg=232, trail=(1, 160))

    shot("3-one-miss.png",
         "One miss\nends it.",
         "No lives. No second chances.",
         21, needle_deg=262, target_deg=224, dead=True)

    shot("4-best.png",
         "Chase\nyour best.",
         "On your wrist, any moment",
         37, needle_deg=118, target_deg=90, dead=True, best_label=True)

    print("watch screenshots done")
