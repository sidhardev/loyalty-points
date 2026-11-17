"""Makes the voiceover with ElevenLabs: one WAV per phrase in public/vo/, silence trimmed, lengths in src/voice.json.

Each phrase is its own request, with the phrases around it sent as context (previous_text / next_text) so the
reading flows like one take. Needs numpy and an API key in the environment:

    ELEVENLABS_API_KEY=...                 (required; or a line in brand/reel-4/.env)
    ELEVENLABS_VOICE=Reyaansh              (a voice id, or part of a voice name in your ElevenLabs library)
    ELEVENLABS_MODEL=eleven_multilingual_v2

Run from brand/reel-4: python audio/make-voice-elevenlabs.py
"""
import json, os, pathlib, sys, urllib.request

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from phrases import LINES  # noqa: E402
from make_voice_common import RATE_HZ, out, remotion, root, trim  # noqa: E402

env = root / '.env'  # KEY=value lines, kept out of git
if env.exists():
    for line in env.read_text().splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            k, v = line.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"\''))
KEY = os.environ.get('ELEVENLABS_API_KEY') or sys.exit('Set ELEVENLABS_API_KEY (or put it in brand/reel-4/.env) first.')
VOICE = os.environ.get('ELEVENLABS_VOICE', 'Reyaansh')
MODEL = os.environ.get('ELEVENLABS_MODEL', 'eleven_multilingual_v2')
API = 'https://api.elevenlabs.io/v1'


def call(path, body=None):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body else None,
                                 headers={'xi-api-key': KEY, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as r:
        return r.read()


def voice_id():
    voices = json.loads(call('/voices'))['voices']
    for v in voices:
        if VOICE in (v['voice_id'], v['name']) or VOICE.lower() in v['name'].lower():
            print('voice:', v['name'])
            return v['voice_id']
    sys.exit(f'No voice matching {VOICE!r}. Your voices: ' + ', '.join(v['name'] for v in voices))


vid = voice_id()
flat = [p for scene in LINES for p in scene]
lengths, k = [], 0
for s, phrases in enumerate(LINES, 1):
    scene = []
    for p, text in enumerate(phrases, 1):
        audio = call(f'/text-to-speech/{vid}?output_format=mp3_44100_128', {
            'text': text,
            'model_id': MODEL,
            'previous_text': ' '.join(flat[max(0, k - 2):k]) or None,
            'next_text': ' '.join(flat[k + 1:k + 3]) or None,
            'voice_settings': {'stability': 0.45, 'similarity_boost': 0.8, 'style': 0.35, 'use_speaker_boost': True},
        })
        k += 1
        raw = out / 'raw.mp3'
        raw.write_bytes(audio)
        wav = out / f'{s:02}-{p}.wav'
        remotion('ffmpeg', '-y', '-loglevel', 'error', '-i', str(raw), '-ar', str(RATE_HZ), '-ac', '1', str(wav))
        scene.append(round(trim(wav), 3))
    raw.unlink()
    lengths.append(scene)
    print(s, scene)
(root / 'src' / 'voice.json').write_text(json.dumps(lengths) + '\n')
