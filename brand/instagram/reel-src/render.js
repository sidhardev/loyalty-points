const { chromium } = require('playwright-core');
const path = require('path'), fs = require('fs');
const { spawn } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const [mode, out, ...rest] = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto(require('url').pathToFileURL(path.join(__dirname, process.env.REEL || 'reel.html')).href);
  await page.evaluate(() => document.fonts.ready);
  if (mode === 'stills') {
    for (const t of rest) { await page.evaluate(t => render(t), +t); await page.screenshot({ path: path.join(out, `t${t}.png`) }); }
  } else {
    const fps = 30, dur = +rest[0];
    const ff = spawn(ffmpeg, ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
      '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-shortest',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.1',
      '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = 0; i < Math.round(dur * fps); i++) {
      await page.evaluate(t => render(t), i / fps);
      const buf = await page.screenshot({ type: 'png' });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await browser.close();
})();
