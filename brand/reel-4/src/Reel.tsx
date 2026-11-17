import { AbsoluteFill, Html5Audio, Sequence, interpolate, staticFile } from 'remotion';
import { AddVisit, EndCard, Hook, Keypad, LogoReveal, Poster, Remind, Reward, Setup, WhatsAppCard, type Cues } from './scenes';
import { ShopContext, type ShopKey } from './theme';
import { Backdrop } from './ui';
import voice from './voice.json';

const FPS = 30;

// Each scene: its component, its shortest length, when its first phrase starts and the pause after each phrase
// (frames). Phrase lengths come from src/voice.json (audio/make-voice*.py), so scenes stretch to fit the voice.
const SCENES: { Scene: (p: Cues) => JSX.Element; min: number; lead: number; gaps: number[] }[] = [
  { Scene: Hook, min: 0, lead: 4, gaps: [6, 6] },
  { Scene: LogoReveal, min: 0, lead: 4, gaps: [6] },
  { Scene: Setup, min: 0, lead: 4, gaps: [6] },
  { Scene: Keypad, min: 100, lead: 6, gaps: [] },
  { Scene: AddVisit, min: 0, lead: 0, gaps: [3] },
  { Scene: WhatsAppCard, min: 0, lead: 6, gaps: [12] },
  { Scene: Reward, min: 0, lead: 10, gaps: [3] },
  { Scene: Remind, min: 0, lead: 6, gaps: [8] },
  { Scene: Poster, min: 0, lead: 10, gaps: [] },
  { Scene: EndCard, min: 0, lead: 12, gaps: [8] },
];
const TAIL = [30, 44, 40, 4, 12, 14, 34, 30, 34, 50];

const timeline = (() => {
  let start = 0;
  return SCENES.map(({ min, lead, gaps }, i) => {
    const cue: number[] = [];
    const ends: number[] = [];
    let at = lead;
    voice[i].forEach((secs, k) => {
      cue.push(at);
      ends.push(at + Math.ceil(secs * FPS));
      at = ends[k] + (gaps[k] ?? 0);
    });
    const duration = Math.max(min, ends[ends.length - 1] + TAIL[i]);
    const scene = { start, duration, cue, ends };
    start += duration;
    return scene;
  });
})();

export const REEL_FRAMES = timeline.reduce((sum, s) => sum + s.duration, 0);

// The music dips while the voice talks.
const spoken = timeline.flatMap((s) => s.cue.map((c, k) => [s.start + c, s.start + s.ends[k]]));
const talking = (f: number) => spoken.some(([a, b]) => f >= a - 3 && f <= b + 4);
const musicVolume = (f: number) => {
  let near = 0;
  for (let d = -5; d <= 5; d++) near += talking(f + d) ? 1 : 0;
  const level = interpolate(near / 11, [0, 1], [0.3, 0.12]);
  return level * interpolate(f, [REEL_FRAMES - 30, REEL_FRAMES], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
};

export const Reel = ({ shop }: { shop: ShopKey }) => (
  <ShopContext.Provider value={shop}>
    <AbsoluteFill>
      <Backdrop />
      <Html5Audio src={staticFile('music.wav')} volume={musicVolume} loop />
      {SCENES.map(({ Scene }, i) => {
        const { start, duration, cue } = timeline[i];
        return (
          <Sequence key={i} from={start} durationInFrames={duration}>
            <Scene cue={cue} />
            {cue.map((c, k) => (
              <Sequence key={k} from={c} layout="none">
                <Html5Audio src={staticFile(`vo/${String(i + 1).padStart(2, '0')}-${k + 1}.wav`)} volume={1} />
              </Sequence>
            ))}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  </ShopContext.Provider>
);

export const TIMELINE = timeline;
