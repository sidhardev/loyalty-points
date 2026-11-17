"""Synthesises the reel's background music and sound effects into public/ (no samples, nothing downloaded).

Needs numpy (pip install numpy==2.3.4). Run from brand/reel-3: python audio/make-sounds.py
"""
import pathlib, wave

import numpy as np

SR = 48000
root = pathlib.Path(__file__).resolve().parent.parent
rng = np.random.default_rng(7)


def save(name, x, peak=0.9):
    x = x / max(1e-9, np.max(np.abs(x))) * peak
    path = root / 'public' / name
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1), w.setsampwidth(2), w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())
    print(name, round(len(x) / SR, 2), 's')


def t(sec):
    return np.arange(int(sec * SR)) / SR


def sweep(f0, f1, sec, curve=1.0):
    """A sine whose pitch glides from f0 to f1."""
    tt = t(sec)
    f = f0 + (f1 - f0) * (tt / sec) ** curve
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def env(sec, attack, decay):
    tt = t(sec)
    return np.minimum(1, tt / max(attack, 1e-4)) * np.exp(-tt / decay)


def lowpass(x, a):
    """One-pole low-pass; `a` (0..1, per sample or scalar) is how much of the new sample passes."""
    a = np.broadcast_to(a, x.shape)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    return y


def place(track, x, at):
    i = int(at * SR)
    n = min(len(x), len(track) - i)
    if n > 0:
        track[i:i + n] += x[:n]


def noise(sec):
    return rng.uniform(-1, 1, int(sec * SR))


# ---- Sound effects ----

def whoosh():
    sec = 0.45
    tt = t(sec)
    cutoff = 0.02 + 0.35 * np.sin(np.pi * tt / sec) ** 2
    x = lowpass(noise(sec), cutoff)
    return x * np.sin(np.pi * tt / sec) ** 1.5


def pop():
    sec = 0.12
    return sweep(500, 1400, sec, 0.5) * env(sec, 0.002, 0.03)


def stamp():
    sec = 0.4
    thud = sweep(140, 45, sec, 0.3) * env(sec, 0.001, 0.09)
    click = lowpass(noise(sec), 0.5) * env(sec, 0.0005, 0.008)
    return thud + 0.5 * click


def tap():
    sec = 0.06
    return (0.6 * lowpass(noise(sec), 0.6) + np.sin(2 * np.pi * 1700 * t(sec))) * env(sec, 0.0005, 0.008)


def key():
    sec = 0.05
    return (0.5 * lowpass(noise(sec), 0.4) + 0.6 * np.sin(2 * np.pi * 1100 * t(sec))) * env(sec, 0.0005, 0.006)


def bell(freq, sec, decay):
    tt = t(sec)
    partials = [(1, 1), (2.0, 0.5), (2.76, 0.35), (5.4, 0.15)]
    return sum(a * np.sin(2 * np.pi * freq * r * tt) * np.exp(-tt * r / decay) for r, a in partials)


def ding():
    sec = 1.4
    x = bell(1318.5, sec, 0.5)
    place(x, bell(1975.5, sec - 0.12, 0.6), 0.12)
    return x * env(sec, 0.002, 0.7)


def sparkle():
    sec = 1.0
    x = np.zeros(int(sec * SR))
    for _ in range(14):
        start = rng.uniform(0, 0.7)
        f = rng.uniform(2500, 5000)
        b = bell(f, 0.25, 0.08) * rng.uniform(0.3, 1)
        place(x, b, start)
    return x


def chime():
    """A soft rising two-note for the logo and the end card."""
    sec = 1.6
    x = bell(784, sec, 0.6) * 0.8
    place(x, bell(1046.5, sec - 0.14, 0.7), 0.14)
    return x


# ---- Music: an upbeat I-V-vi-IV loop at 100 BPM ----

BPM = 100
BEAT = 60 / BPM
BAR = 4 * BEAT
NOTE = {'C': 261.63, 'D': 293.66, 'E': 329.63, 'F': 349.23, 'G': 392.0, 'A': 440.0, 'B': 493.88}
CHORDS = [('C', 'E', 'G'), ('G', 'B', 'D'), ('A', 'C', 'E'), ('F', 'A', 'C')]


def pluck(freq, sec=0.5):
    tt = t(sec)
    tone = np.sin(2 * np.pi * freq * tt) + 0.35 * np.sin(4 * np.pi * freq * tt) + 0.12 * np.sin(6 * np.pi * freq * tt)
    return tone * env(sec, 0.003, 0.16)


def kick():
    sec = 0.35
    return np.tanh(2.2 * sweep(130, 42, sec, 0.25) * env(sec, 0.001, 0.12))


def clap():
    sec = 0.2
    n = noise(sec)
    band = lowpass(n, 0.5) - lowpass(n, 0.08)
    return band * env(sec, 0.001, 0.05)


def hat():
    sec = 0.05
    n = noise(sec)
    return (n - lowpass(n, 0.3)) * env(sec, 0.0005, 0.012)


def bass(freq, sec):
    tt = t(sec)
    return np.tanh(1.5 * np.sin(2 * np.pi * freq * tt)) * env(sec, 0.005, 0.35)


def pad(freqs, sec):
    tt = t(sec)
    x = sum(np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * f * 1.003 * tt) for f in freqs)
    fade = np.minimum(1, np.minimum(tt / 0.3, (sec - tt) / 0.3))
    return x * fade


def music(sec=48):
    drums = np.zeros(int(sec * SR))
    keys = np.zeros_like(drums)
    low = np.zeros_like(drums)
    bars = int(sec / BAR) + 1
    k, c, h = kick(), clap(), hat()
    for b in range(bars):
        chord = CHORDS[b % 4]
        start = b * BAR
        root_f = NOTE[chord[0]] / 4
        place(low, bass(root_f, BEAT * 1.5), start)
        place(low, bass(root_f, BEAT * 1.5), start + 2 * BEAT)
        place(low, bass(root_f * 2, BEAT * 0.5) * 0.6, start + 3.5 * BEAT)
        place(keys, pad([NOTE[n] / 2 for n in chord], BAR) * 0.12, start)
        for beat in (0, 0.75, 1.5, 2, 2.75, 3.5):
            for n in chord:
                place(keys, pluck(NOTE[n]) * 0.33, start + beat * BEAT)
        for beat in range(4):
            place(drums, k, start + beat * BEAT)
            if beat in (1, 3):
                place(drums, c * 0.5, start + beat * BEAT)
            if b > 0:
                place(drums, h * 0.35, start + (beat + 0.5) * BEAT)
    x = 0.55 * drums + 0.45 * keys + 0.5 * low
    tt = np.arange(len(x)) / SR
    return x * np.minimum(1, tt / 0.4)


for name, make in [('whoosh', whoosh), ('pop', pop), ('stamp', stamp), ('tap', tap), ('key', key), ('ding', ding), ('sparkle', sparkle), ('chime', chime)]:
    save(f'sfx/{name}.wav', make())
save('music.wav', music(), peak=0.8)
