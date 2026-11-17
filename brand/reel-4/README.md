# reel-4 source (Remotion): the demo reel for shop owners

A ~50 s Hindi demo to send any shop owner (DMs, WhatsApp): setup, Add visit, the WhatsApp card, the reward, reminders
and the counter poster. Built from reel-3's code (scenes in `src/scenes.tsx`, app screens in `src/ui.tsx`, timing and
audio in `src/Reel.tsx`). 1080×1920, 30 fps. Needs Node 22.

There is one reel for every shop (`Reel`, shop name "Aapki Dukaan") and one per kind of shop (`Reel-cafe`,
`Reel-salon`, `Reel-kirana`, `Reel-bakery`, `Reel-gym`, `Reel-mithai`) with that shop's name on the app screens and
its kind lit in the opening. Shops are in `SHOPS` in `src/theme.ts`. The voice is the same in all of them.

    npm install
    npm run studio                    # live preview at localhost:3123
    node stills.mjs <dir> 60 454      # PNG stills of those frames (COMP=Reel-salon for another shop)
    node render-all.mjs               # every reel into ../instagram/reel-4/ (demo.mp4, demo-cafe.mp4, …)
    node render-all.mjs all salon     # only these

## Voice

The phrases are in `audio/phrases.py`. Scenes stretch to fit the voice, so after changing it, re-run a voice script
(they write `public/vo/` and `src/voice.json`) and render again.

- **ElevenLabs:** put `ELEVENLABS_API_KEY=...` in `brand/reel-4/.env` (git ignores it), then
  `python audio/make-voice-elevenlabs.py`. `ELEVENLABS_VOICE` picks the voice by id or name (default: the
  "Reyaansh" voice reel-3 used, from your ElevenLabs library); `ELEVENLABS_MODEL` the model (default
  `eleven_multilingual_v2`).
- **One take from the ElevenLabs website (current):** read the phrases one per line, save as `audio/voiceover.mp3`,
  then `python audio/split-voice.py`. `audio/voiceover.mp3` is Generation 1 of "Reyaansh - Deep Premium Brand Ad",
  Eleven v4, with a few audio tags ([curious], [excited], [cheerful], [warm]); `audio/voiceover-take-2.mp3` is the
  second generation of the same text.
- **Microsoft voice (stand-in):** `python audio/make-voice.py` reads each phrase with hi-IN-MadhurNeural.

The Python scripts need `pip install numpy` (and `edge-tts==7.3.1` for the Microsoft voice). Music and sound effects
are reel-3's (`audio/make-sounds.py`).
