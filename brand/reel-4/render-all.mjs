// Renders every shop's reel from one bundle into ../instagram/reel-4/: demo.mp4 (every shop), demo-cafe.mp4, …
// node render-all.mjs            all of them
// node render-all.mjs salon gym  only these
import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia } from '@remotion/renderer';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const only = process.argv.slice(2);
mkdirSync('../instagram/reel-4', { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const comps = (await getCompositions(serveUrl, { port: 3133 })).filter((c) => !only.length || only.includes(c.id.replace(/^Reel-?/, '') || 'all'));
for (const composition of comps) {
  const outputLocation = path.resolve('../instagram/reel-4', `${composition.id.replace('Reel', 'demo')}.mp4`);
  await renderMedia({ composition, serveUrl, codec: 'h264', audioBitrate: '192k', outputLocation, port: 3133 });
  console.log(outputLocation);
}
