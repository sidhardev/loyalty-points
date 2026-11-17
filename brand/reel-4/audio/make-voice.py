"""Makes a stand-in voiceover with Microsoft's hi-IN-MadhurNeural: one WAV per phrase in public/vo/, silence trimmed,
and their lengths in src/voice.json. The reel's real voice is ElevenLabs (make-voice-elevenlabs.py).

Needs edge-tts and numpy (pip install edge-tts==7.3.1 numpy); the text goes to Microsoft's text-to-speech service.
Run from brand/reel-4: python audio/make-voice.py
"""
import asyncio, json, pathlib, sys

import edge_tts

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from phrases import LINES  # noqa: E402
from make_voice_common import RATE_HZ, out, remotion, root, trim  # noqa: E402

VOICE = 'hi-IN-MadhurNeural'
RATE = '+18%'


async def main():
    lengths = []
    for s, phrases in enumerate(LINES, 1):
        scene = []
        for p, text in enumerate(phrases, 1):
            raw = out / 'raw.mp3'
            wav = out / f'{s:02}-{p}.wav'
            await edge_tts.Communicate(text, VOICE, rate=RATE).save(str(raw))
            remotion('ffmpeg', '-y', '-loglevel', 'error', '-i', str(raw), '-ar', str(RATE_HZ), '-ac', '1', str(wav))
            scene.append(round(trim(wav), 3))
        raw.unlink()
        lengths.append(scene)
        print(s, scene)
    (root / 'src' / 'voice.json').write_text(json.dumps(lengths) + '\n')


asyncio.run(main())
