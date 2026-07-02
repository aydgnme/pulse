#!/usr/bin/env python3
"""Synthesize Pulse's looping background track (original composition, no samples).

Dark minimal electronic loop in A minor, 104 BPM, 8 bars (~18.5 s).
Layers: detuned sine pad (Am-F-Dm-E), plucked bass on quarters, echoing
eighth-note arpeggio, and a faint offbeat noise tick. All note tails wrap
around the loop boundary so the loop is seamless.
"""
import array
import math
import os
import random
import wave

SR = 32000
BPM = 104
BEAT = 60 / BPM
BARS = 8
BEATS = BARS * 4
N = int(SR * BEATS * BEAT)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets",
                   "audio", "theme.wav")

buf = [0.0] * N


def add(start_s, samples):
    """Mix samples into the loop buffer, wrapping past the end."""
    s0 = int(start_s * SR)
    for i, v in enumerate(samples):
        buf[(s0 + i) % N] += v


def note(freq):
    return freq


A2, C3, D3, E3, F3, G3, A3, B3 = 110.0, 130.81, 146.83, 164.81, 174.61, 196.0, 220.0, 246.94
C4, D4, E4, F4, A4 = 261.63, 293.66, 329.63, 349.23, 440.0

# i - VI - iv - V in A minor, two bars each
CHORDS = [
    ("Am", A2, [A3, C4, E4]),
    ("F", F3 / 2, [F3, A3, C4]),
    ("Dm", D3 / 2, [D3, F3, A3]),
    ("E", E3 / 2, [E3, G3 * 1.02930223664, B3]),  # G# = G * 2^(1/12)
]


def pad(freqs, dur):
    n = int(dur * SR)
    out = [0.0] * n
    for f in freqs:
        for detune in (0.9985, 1.0015):
            ph = random.random() * math.tau
            w = math.tau * f * detune / SR
            for i in range(n):
                t = i / n
                env = min(t / 0.12, 1.0) * min((1 - t) / 0.18, 1.0)
                trem = 1 + 0.12 * math.sin(math.tau * 0.9 * i / SR)
                out[i] += 0.030 * env * trem * math.sin(w * i + ph)
    return out


def pluck(f, dur, gain, bright=0.0):
    n = int(dur * SR)
    w = math.tau * f / SR
    out = [0.0] * n
    for i in range(n):
        env = math.exp(-i / (SR * dur * 0.22))
        s = math.sin(w * i) + bright * 0.4 * math.sin(2 * w * i)
        out[i] = gain * env * s
    return out


def tick(dur=0.02, gain=0.05):
    n = int(dur * SR)
    prev = 0.0
    out = [0.0] * n
    for i in range(n):
        white = random.uniform(-1, 1)
        hp = white - prev  # crude highpass
        prev = white
        out[i] = gain * hp * (1 - i / n)
    return out


random.seed(7)

for ci, (_, bass_f, chord) in enumerate(CHORDS):
    chord_start = ci * 2 * 4 * BEAT  # two bars per chord

    # pad held for the two bars
    add(chord_start, pad(chord, 2 * 4 * BEAT))

    # bass pluck on every quarter, ghost octave on beat 3
    for b in range(8):
        t = chord_start + b * BEAT
        add(t, pluck(bass_f, BEAT * 1.6, 0.16))
        if b % 4 == 2:
            add(t, pluck(bass_f * 2, BEAT * 0.8, 0.05))

    # eighth-note arpeggio with a dotted-eighth echo
    seq = [chord[0], chord[2], chord[1], chord[2] * 2,
           chord[0] * 2, chord[2], chord[1] * 2, chord[2]]
    for e in range(16):
        t = chord_start + e * BEAT / 2
        f = seq[e % 8]
        p = pluck(f, 0.30, 0.075, bright=1.0)
        add(t, p)
        add(t + BEAT * 1.5, [v * 0.38 for v in p])   # echo 1 (wraps at loop end)
        add(t + BEAT * 3.0, [v * 0.16 for v in p])   # echo 2

    # offbeat ticks
    for b in range(8):
        add(chord_start + (b + 0.5) * BEAT, tick())

# normalize to -1.5 dB
peak = max(abs(v) for v in buf)
scale = 0.84 / peak
pcm = array.array("h", (int(max(-1, min(1, v * scale)) * 32767) for v in buf))

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with wave.open(OUT, "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())

print(f"wrote {OUT}: {N/SR:.2f}s, {os.path.getsize(OUT)/1e6:.2f} MB")
