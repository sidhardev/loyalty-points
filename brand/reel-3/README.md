# reel-3 source (Remotion)

The whole reel is React code in `src/` (scenes in `src/scenes.tsx`, the app screens and stamps in `src/ui.tsx`,
timing and audio in `src/Reel.tsx`). 1080×1920, 30 fps, Hindi voiceover, music and sound effects. Needs Node 22.

    npm install
    npm run studio                           # live preview at localhost:3123
    node stills.mjs <dir> 75 295 580         # PNG stills of those frames
    npm run render                           # writes ../instagram/reel-3.mp4

The published MP4 then had its audio raised 4 dB (peak −0.6 dB, no clipping), from brand/instagram:

    npx --prefix ../reel-3 remotion ffmpeg -i reel-3.mp4 -c:v copy -af volume=4dB -c:a aac -b:a 192k out.mp4

Ports are 3123/3124 because the app's API server uses 3000.

## Audio

Scenes stretch to fit the voice and time their animations to each phrase, so after changing the voice, re-run one
of the voice scripts (they write `public/vo/` and `src/voice.json`) and render again. The phrases are in
`audio/phrases.py`. The Python scripts need `pip install edge-tts==7.3.1 numpy==2.3.4`.

- **ElevenLabs (current):** `audio/voiceover.mp3` is one take of all the phrases, one per line (voice "Reyaansh -
  Deep Premium Brand Ad", Eleven v4). `python audio/split-voice.py` cuts it into the phrases.
- **Microsoft voice:** `python audio/make-voice.py` reads each phrase with hi-IN-MadhurNeural.
- **Music and sound effects:** `python audio/make-sounds.py` synthesises `public/music.wav` and `public/sfx/`.
