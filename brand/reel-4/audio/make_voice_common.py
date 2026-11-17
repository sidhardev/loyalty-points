"""What make-voice.py and make-voice-elevenlabs.py share: where the phrases go, trimming, and Remotion's ffmpeg."""
import pathlib, subprocess, wave

import numpy as np

root = pathlib.Path(__file__).resolve().parent.parent
out = root / 'public' / 'vo'
out.mkdir(parents=True, exist_ok=True)
RATE_HZ = 48000


def trim(path):
    """Cuts the silence the voice leaves before and after the phrase, keeping 40 ms either side."""
    with wave.open(str(path)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
    loud = np.flatnonzero(np.abs(x) > 32768 * 10 ** (-40 / 20))
    pad = int(0.04 * RATE_HZ)
    x = x[max(0, loud[0] - pad):loud[-1] + pad]
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1), w.setsampwidth(2), w.setframerate(RATE_HZ)
        w.writeframes(x.tobytes())
    return len(x) / RATE_HZ


def remotion(*args):
    return subprocess.run(['npx', 'remotion', *args], capture_output=True, text=True, cwd=root, shell=True, check=True).stdout
