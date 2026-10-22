# reel-1 source

`reel.html` is the whole reel as one 1080×1920 page; `render(t)` draws second `t`.
To re-render (needs Node, Chrome installed):

    npm i playwright-core@1.48.2 ffmpeg-static@5.2.0
    node render.js stills <dir> 2.5 14.5 27.5      # PNG stills at those seconds
    node render.js video ../reel-1.mp4 28           # 28 s, 30 fps, H.264 + silent AAC

# reel-2 source

`reel-2.html` (same `render(t)` idea). Pick the page with the `REEL` env var:

    REEL=reel-2.html node render.js video ../reel-2.mp4 27
