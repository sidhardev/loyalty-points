"""Makes the voiceover: one WAV per phrase in public/vo/, silence trimmed, and their lengths in src/voice.json.

Needs edge-tts and numpy (pip install edge-tts==7.3.1 numpy==2.3.4); the text goes to Microsoft's text-to-speech service.
Run from brand/reel-3: python audio/make-voice.py
"""
import asyncio, json, pathlib, subprocess, sys, wave

import edge_tts
import numpy as np

VOICE = 'hi-IN-MadhurNeural'
RATE = '+18%'

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from phrases import LINES  # noqa: E402

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


async def main():
    lengths = []
    for s, phrases in enumerate(LINES, 1):
        scene = []
        for p, text in enumerate(phrases, 1):
            raw = out / f'raw.mp3'
            wav = out / f'{s:02}-{p}.wav'
            await edge_tts.Communicate(text, VOICE, rate=RATE).save(str(raw))
            remotion('ffmpeg', '-y', '-loglevel', 'error', '-i', str(raw), '-ar', str(RATE_HZ), '-ac', '1', str(wav))
            scene.append(round(trim(wav), 3))
        raw.unlink()
        lengths.append(scene)
        print(s, scene)
    (root / 'src' / 'voice.json').write_text(json.dumps(lengths) + '\n')


asyncio.run(main())
