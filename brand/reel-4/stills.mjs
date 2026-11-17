// Renders PNG stills of the reel at the given frames, from one bundle: node stills.mjs <outDir> 30 120 ...
// COMP=Reel-salon renders another shop's reel.
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import path from 'node:path';

const [outDir = 'stills', ...frames] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const composition = await selectComposition({ serveUrl, id: process.env.COMP ?? 'Reel', port: 3133 });
for (const frame of frames.map(Number)) {
  await renderStill({ composition, serveUrl, frame, output: path.join(outDir, `f${String(frame).padStart(4, '0')}.png`), scale: 0.5, port: 3133 });
  console.log('frame', frame);
}
