"""Cuts one full voiceover take (audio/voiceover.mp3, e.g. from ElevenLabs) into the reel's phrases.

The take reads the phrases of make-voice.py's LINES in order, one per line. The longest pauses are taken as the
breaks between phrases. Writes public/vo/<scene>-<phrase>.wav and src/voice.json, like make-voice.py.
Needs numpy. Run from brand/reel-4: python audio/split-voice.py
"""
import json, pathlib, subprocess, sys, wave

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from phrases import EXPECTED, LINES  # noqa: E402

SR = 48000
root = pathlib.Path(__file__).resolve().parent.parent
out = root / 'public' / 'vo'
out.mkdir(parents=True, exist_ok=True)
take = root / 'audio' / 'voiceover.wav'
subprocess.run(['npx', 'remotion', 'ffmpeg', '-y', '-loglevel', 'error', '-i', str(root / 'audio' / 'voiceover.mp3'), '-ar', str(SR), '-ac', '1', str(take)],
               cwd=root, shell=True, check=True)
with wave.open(str(take)) as w:
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
take.unlink()

# Loudness per 10 ms; quiet runs are pauses.
hop = SR // 100
rms = np.sqrt(np.mean(x[: len(x) // hop * hop].reshape(-1, hop) ** 2, axis=1))
quiet = rms < 10 ** (-38 / 20)
runs, start = [], None
for i, q in enumerate(np.append(quiet, False)):
    if q and start is None:
        start = i
    elif not q and start is not None:
        runs.append((start, i))
        start = None
inner = [r for r in runs if r[0] > 0 and r[1] < len(rms) and r[1] - r[0] >= 12]
first = runs[0][1] if runs and runs[0][0] == 0 else 0
last = runs[-1][0] if runs and runs[-1][1] == len(rms) else len(rms)

# Pick the breaks so each phrase's length best matches its expected share of the take (EXPECTED: the same
# phrases read by the Microsoft voice), preferring longer pauses: a small dynamic programme over the pauses.
flat = [e for scene in EXPECTED for e in scene]
n = len(flat)
spoken = last - first - 0  # 10 ms units, pauses included
scale = spoken / sum(flat)
cost = lambda a, b, e: np.log(max(b - a, 1) / (e * scale)) ** 2
INF = float('inf')
# best[j][c]: phrases 0..j placed, phrase j ending at pause c
best = [[INF] * len(inner) for _ in range(n - 1)]
back = [[-1] * len(inner) for _ in range(n - 1)]
for c, (a, _) in enumerate(inner):
    best[0][c] = cost(first, a, flat[0]) - 0.3 * np.log(inner[c][1] - inner[c][0])
for j in range(1, n - 1):
    for c, (a, _) in enumerate(inner):
        for d in range(c):
            if best[j - 1][d] == INF:
                continue
            v = best[j - 1][d] + cost(inner[d][1], a, flat[j]) - 0.3 * np.log(inner[c][1] - inner[c][0])
            if v < best[j][c]:
                best[j][c], back[j][c] = v, d
end = min(range(len(inner)), key=lambda c: best[n - 2][c] + cost(inner[c][1], last, flat[-1]))
chosen = [end]
for j in range(n - 2, 0, -1):
    chosen.append(back[j][chosen[-1]])
breaks = [inner[c] for c in reversed(chosen)]

edges = [first]
for a, b in breaks:
    edges += [a, b]
edges.append(last)
spans = list(zip(edges[::2], edges[1::2]))

pad = 4  # 40 ms either side
lengths, k = [], 0
for s, phrases in enumerate(LINES, 1):
    scene = []
    for p in range(1, len(phrases) + 1):
        a, b = spans[k]
        k += 1
        clip = x[max(0, (a - pad) * hop):(b + pad) * hop]
        with wave.open(str(out / f'{s:02}-{p}.wav'), 'wb') as w:
            w.setnchannels(1), w.setsampwidth(2), w.setframerate(SR)
            w.writeframes((np.clip(clip, -1, 1) * 32767).astype(np.int16).tobytes())
        scene.append(round(len(clip) / SR, 3))
    lengths.append(scene)
    print(s, scene, [round((b - a) / 100, 2) for a, b in breaks[k - len(phrases):k - 1]] if len(phrases) > 1 else '')
print('shortest break kept:', min(b - a for a, b in breaks) * 10, 'ms')
(root / 'src' / 'voice.json').write_text(json.dumps(lengths) + '\n')
