import { useId } from 'react';
import { createPortal } from 'react-dom';
import { LogoMark } from './ui';

// The counter poster, drawn as one SVG (A4, 1240 × 1754) so the screen, the printout and the downloaded PNG match.
// It says the shop's one rule ("Every 5 visits → Free chai") on a stamp card, and that customers only need to tell
// their phone number. It borrows the logo's striped awning on top. The share image (share.tsx) uses its pieces.

const W = 1240;
const H = 1754;

export const C = {
  green: '#0b7a52',
  deep: '#0a5e40',
  ink: '#0f2e24',
  paper: '#eef2ec',
  marigold: '#f0a202',
  marigoldInk: '#8a5a00',
  soft: '#5b7066',
  white: '#ffffff',
};

export const DISPLAY = "Archivo, Inter, 'Arial Black', 'Helvetica Neue', Arial, sans-serif";
export const HINDI = "'Noto Sans Devanagari', 'Nirmala UI', Mangal, Inter, sans-serif";

export type PosterTheme = 'green' | 'light';

export type PosterProps = {
  shop: string;
  visitsNeeded: number;
  rewardName: string;
  theme: PosterTheme;
  hindi: boolean;
};

/** Font size (and lines) that fit `text` into `width`, for a heavy display face. */
export function fit(text: string, width: number, max: number, min: number) {
  const em = 0.6; // average glyph width, as a share of the font size
  const one = Math.min(max, width / (text.length * em));
  if (one >= min || !text.includes(' ')) return { size: Math.max(one, min * 0.75), lines: [text] };
  const words = text.split(' ');
  let best = [text, ''];
  for (let i = 1; i < words.length; i++) {
    const pair = [words.slice(0, i).join(' '), words.slice(i).join(' ')];
    if (Math.max(...pair.map((p) => p.length)) < Math.max(...best.map((p) => p.length))) best = pair;
  }
  return { size: Math.min(max * 0.8, width / (Math.max(...best.map((p) => p.length)) * em)), lines: best };
}

/** The striped, scalloped awning from the logo, across the top of the poster. */
export function Awning({ y, h, stripes, second, width = W }: { y: number; h: number; stripes: number; second: string; width?: number }) {
  const w = width / stripes;
  return (
    <g>
      {Array.from({ length: stripes }, (_, i) => (
        <g key={i} fill={i % 2 ? second : C.marigold}>
          <rect x={i * w} y={y} width={w + 0.5} height={h} />
          <circle cx={i * w + w / 2} cy={y + h} r={w / 2} />
        </g>
      ))}
    </g>
  );
}

export function Star({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`;
  }).join(' ');
  return <polygon points={pts} fill={fill} />;
}

/** A row of stamp circles: filled ones with a tick, the last one the reward (a star). Centred on `cx`. */
export function StampRow({ cx, y, n, filled, r, gap, on, off, reward }: { cx: number; y: number; n: number; filled: number; r: number; gap: number; on: string; off: string; reward: string }) {
  const step = r * 2 + gap;
  const x0 = cx - ((n - 1) * step) / 2;
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const x = x0 + i * step;
        const last = i === n - 1;
        const isOn = i < filled;
        return (
          <g key={i}>
            <circle
              cx={x}
              cy={y}
              r={r - 3}
              fill={isOn ? (last ? reward : on) : 'none'}
              stroke={last ? reward : isOn ? on : off}
              strokeWidth={5}
              strokeDasharray={isOn ? undefined : '10 8'}
            />
            {last ? (
              <Star cx={x} cy={y} r={r * 0.5} fill={isOn ? C.white : reward} />
            ) : isOn ? (
              <path d={`M${x - r * 0.38} ${y} l${r * 0.26} ${r * 0.28} l${r * 0.5} ${-r * 0.56}`} fill="none" stroke={C.white} strokeWidth={r * 0.17} strokeLinecap="round" strokeLinejoin="round" />
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

export function PosterSvg({ shop, visitsNeeded, rewardName, theme, hindi }: PosterProps) {
  // The preview and the print copy are both on the page, so each needs its own ids for gradients and filters.
  const uid = useId().replace(/:/g, '');
  const id = (name: string) => `${name}-${uid}`;
  const green = theme === 'green';
  const onBg = green ? C.paper : C.ink;
  const accent = green ? C.marigold : C.green;
  const name = fit(shop.trim() || 'Your shop', 1000, 110, 60);
  const reward = fit(rewardName.trim() || 'A free treat', 860, 112, 56);
  const stamps = Math.min(visitsNeeded, 10);

  const awningH = 92;
  const nameTop = awningH + 110 + name.size * 0.78;
  const nameBottom = nameTop + name.size * 1.04 * (name.lines.length - 1);
  const ruleY = nameBottom + 150;
  const cardTop = ruleY + (hindi ? 110 : 60);
  const cardH = 300 + reward.size * 1.04 * reward.lines.length;
  const cardX = 90;
  const cardW = W - 180;
  const stampsY = cardTop + 120;
  const rewardTop = stampsY + 110 + reward.size * 0.78;
  const askY = cardTop + cardH + 150;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label={`${shop}: every ${visitsNeeded} visits, ${rewardName}`}>
      <defs>
        <linearGradient id={id('bg')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={green ? C.green : C.white} />
          <stop offset="1" stopColor={green ? C.deep : C.paper} />
        </linearGradient>
        <pattern id={id('dots')} width="28" height="28" patternUnits="userSpaceOnUse">
          <rect x="11" y="11" width="6" height="6" rx="2" fill={green ? C.paper : C.green} opacity={green ? 0.07 : 0.06} />
        </pattern>
        <filter id={id('shadow')} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="22" floodColor="#04261a" floodOpacity={green ? 0.35 : 0.14} />
        </filter>
      </defs>

      <rect width={W} height={H} fill={`url(#${id('bg')})`} />
      <rect width={W} height={H} fill={`url(#${id('dots')})`} />
      <Awning y={0} h={awningH} stripes={12} second={green ? C.paper : C.green} />

      <g textAnchor="middle">
        {name.lines.map((line, i) => (
          <text key={i} x={W / 2} y={nameTop + i * name.size * 1.04} fontFamily={DISPLAY} fontWeight={900} fontSize={name.size} letterSpacing={-1} fill={onBg}>
            {line}
          </text>
        ))}
        <text x={W / 2} y={ruleY} fontFamily={DISPLAY} fontWeight={900} fontSize={84} fill={accent}>
          Every {visitsNeeded} visits
        </text>
        {hindi && (
          <text x={W / 2} y={ruleY + 76} fontFamily={HINDI} fontWeight={800} fontSize={54} fill={accent}>
            हर {visitsNeeded} विज़िट पर
          </text>
        )}
      </g>

      {/* The card: stamps and the reward */}
      <g filter={`url(#${id('shadow')})`}>
        <rect x={cardX} y={cardTop} width={cardW} height={cardH} rx={56} fill={C.white} />
      </g>
      {!green && <rect x={cardX} y={cardTop} width={cardW} height={cardH} rx={56} fill="none" stroke={C.green} strokeOpacity={0.25} strokeWidth={3} />}
      <StampRow cx={W / 2} y={stampsY} n={stamps} filled={stamps - 1} r={stamps > 6 ? 40 : 52} gap={stamps > 6 ? 18 : 26} on={C.green} off={C.soft} reward={C.marigold} />
      <g textAnchor="middle">
        {reward.lines.map((line, i) => (
          <text key={i} x={W / 2} y={rewardTop + i * reward.size * 1.04} fontFamily={DISPLAY} fontWeight={900} fontSize={reward.size} fill={C.ink}>
            {line}
          </text>
        ))}
      </g>

      {/* What to do: nothing but say your number */}
      <g textAnchor="middle">
        <text x={W / 2} y={askY} fontFamily={DISPLAY} fontWeight={800} fontSize={56} fill={onBg}>
          Just tell your phone number
        </text>
        <text x={W / 2} y={askY + 64} fontFamily={DISPLAY} fontWeight={600} fontSize={40} fill={onBg} opacity={0.85}>
          at the counter
        </text>
        {hindi && (
          <text x={W / 2} y={askY + 144} fontFamily={HINDI} fontWeight={700} fontSize={50} fill={onBg}>
            काउंटर पर बस अपना फ़ोन नंबर बताएँ
          </text>
        )}
      </g>

      {/* Footer */}
      <g>
        <rect x={0} y={H - 118} width={W} height={118} fill={green ? 'rgba(4,38,26,0.35)' : C.paper} />
        <text x={70} y={H - 48} fontFamily={DISPLAY} fontWeight={700} fontSize={30} fill={onBg}>
          No app · No sign-up · Card on WhatsApp
        </text>
        <g transform={`translate(${W - 70 - 300} ${H - 92})`}>
          <LogoMark size={64} />
          <text x={84} y={28} fontFamily={DISPLAY} fontWeight={600} fontSize={20} letterSpacing={2} fill={onBg} opacity={0.75}>
            POWERED BY
          </text>
          <text x={84} y={60} fontFamily={DISPLAY} fontWeight={900} fontSize={34} fill={onBg}>
            Regularhood
          </text>
        </g>
      </g>
      {!green && <rect x="10" y="10" width={W - 20} height={H - 20} rx="28" fill="none" stroke={C.green} strokeWidth="4" />}
    </svg>
  );
}

/** The copy that gets printed: placed straight under <body> so print CSS (poster.css) can show it alone on one A4 sheet. */
export function PosterPrint(props: PosterProps) {
  return createPortal(
    <div className="poster-print">
      <PosterSvg {...props} />
    </div>,
    document.body,
  );
}

/** Draws an SVG (its viewBox is `width` × `height`) into a PNG at `scale` times that size. */
export async function svgToPng(svg: SVGSVGElement, width: number, height: number, scale = 1) {
  const markup = new XMLSerializer().serializeToString(svg);
  const src = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Could not draw the image'));
      img.src = src;
    });
    const canvas = Object.assign(document.createElement('canvas'), { width: width * scale, height: height * scale });
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not save the image'))), 'image/png'));
  } finally {
    URL.revokeObjectURL(src);
  }
}

/** Saves a file from the browser. */
export function saveFile(blob: Blob, file: string) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: file });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

/** Saves the poster as a print-quality PNG (2480 × 3508, A4 at 300 dpi). */
export async function downloadPoster(svg: SVGSVGElement, file: string) {
  saveFile(await svgToPng(svg, W, H, 2), file);
}
