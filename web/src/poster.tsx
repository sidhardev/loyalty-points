import { useId, useMemo, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { LogoMark } from './ui';

// The counter poster, drawn as one SVG (A4, 1240 × 1754) so the screen, the printout and the downloaded PNG match.
// It borrows the logo's shopfront: the striped awning on top, QR finder squares drawn like the logo's windows,
// and the logo itself in the middle of the code. The code uses the highest error correction (H), so it still
// scans with the logo covering its centre.

const W = 1240;
const H = 1754;

const C = {
  green: '#0b7a52',
  deep: '#0a5e40',
  ink: '#0f2e24',
  paper: '#eef2ec',
  marigold: '#f0a202',
  marigoldInk: '#8a5a00',
  soft: '#5b7066',
  white: '#ffffff',
};

const DISPLAY = "Archivo, Inter, 'Arial Black', 'Helvetica Neue', Arial, sans-serif";
const HINDI = "'Noto Sans Devanagari', 'Nirmala UI', Mangal, Inter, sans-serif";

export type PosterTheme = 'green' | 'light';

export type PosterProps = {
  shop: string;
  url: string;
  pointsPer100: number;
  welcomeBonus: number;
  theme: PosterTheme;
  hindi: boolean;
};

/** Font size (and lines) that fit `text` into `width`, for a heavy display face. */
function fit(text: string, width: number, max: number, min: number) {
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

/** The QR code as rounded modules, with logo-style finder squares and the logo in a tile in the middle. */
function StyledQr({ url, x, y, size }: { url: string; x: number; y: number; size: number }) {
  const { n, cells } = useMemo(() => {
    const qr = QRCode.create(url, { errorCorrectionLevel: 'H' });
    const n = qr.modules.size;
    const cells: [number, number][] = [];
    const finder = (r: number, c: number) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
    // Room for the logo: a square of about 22% of the code, kept on whole modules and centred.
    const hole = Math.floor(n * 0.22) | 1;
    const lo = (n - hole) / 2;
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        if (!qr.modules.get(r, c) || finder(r, c)) continue;
        if (r >= lo - 1 && r < lo + hole + 1 && c >= lo - 1 && c < lo + hole + 1) continue;
        cells.push([r, c]);
      }
    return { n, cells };
  }, [url]);

  const m = size / n;
  const logo = Math.floor(n * 0.22) * m;
  const finders = [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ];
  return (
    <g transform={`translate(${x} ${y})`}>
      <g fill={C.ink}>
        {cells.map(([r, c]) => (
          <rect key={`${r}-${c}`} x={c * m + m * 0.06} y={r * m + m * 0.06} width={m * 0.88} height={m * 0.88} rx={m * 0.32} />
        ))}
      </g>
      {finders.map(([r, c]) => (
        <g key={`${r}-${c}`} transform={`translate(${c * m} ${r * m})`}>
          <rect x={m * 0.5} y={m * 0.5} width={m * 6} height={m * 6} rx={m * 1.6} fill="none" stroke={C.ink} strokeWidth={m} />
          <rect x={m * 2} y={m * 2} width={m * 3} height={m * 3} rx={m * 0.8} fill={C.green} />
        </g>
      ))}
      <g transform={`translate(${(size - logo) / 2} ${(size - logo) / 2})`}>
        <rect x={-m * 0.6} y={-m * 0.6} width={logo + m * 1.2} height={logo + m * 1.2} rx={logo * 0.3} fill={C.white} />
        <LogoMark size={logo} />
      </g>
    </g>
  );
}

/** The striped, scalloped awning from the logo, across the top of the poster. */
function Awning({ y, h, stripes, second }: { y: number; h: number; stripes: number; second: string }) {
  const w = W / stripes;
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

function Star({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`;
  }).join(' ');
  return <polygon points={pts} fill={fill} />;
}

/** A sticker-style starburst for the welcome bonus. */
function Burst({ cx, cy, r, children }: { cx: number; cy: number; r: number; children: ReactNode }) {
  const spikes = 18;
  const pts = Array.from({ length: spikes * 2 }, (_, i) => {
    const a = (Math.PI / spikes) * i;
    const rr = i % 2 ? r * 0.88 : r;
    return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`;
  }).join(' ');
  return (
    <g transform={`rotate(-10 ${cx} ${cy})`}>
      <polygon points={pts} fill={C.marigold} />
      <circle cx={cx} cy={cy} r={r * 0.78} fill="none" stroke={C.ink} strokeWidth={3} strokeDasharray="2 9" strokeLinecap="round" opacity={0.5} />
      {children}
    </g>
  );
}

export function PosterSvg({ shop, url, pointsPer100, welcomeBonus, theme, hindi }: PosterProps) {
  // The preview and the print copy are both on the page, so each needs its own ids for gradients and filters.
  const uid = useId().replace(/:/g, '');
  const id = (name: string) => `${name}-${uid}`;
  const green = theme === 'green';
  const onBg = green ? C.paper : C.ink;
  const accent = green ? C.marigold : C.green;
  const name = fit(shop.trim() || 'Your shop', 1000, 118, 64);

  const awningH = 92;
  const headTop = awningH + 62 + 70;
  const nameTop = headTop + 50 + name.size * 0.78;
  const nameBottom = nameTop + name.size * 1.04 * (name.lines.length - 1);
  const cardTop = nameBottom + (hindi ? 150 : 100);
  const card = name.lines.length > 1 ? 680 : 760;
  const cardX = (W - card) / 2;
  const qr = card - 160;
  const steps = [
    { n: '1', title: 'Scan', text: 'with your phone camera', hi: 'फ़ोन कैमरा से स्कैन करें' },
    { n: '2', title: 'Earn', text: `${pointsPer100} points on every ₹100`, hi: `हर ₹100 पर ${pointsPer100} पॉइंट्स` },
    { n: '3', title: 'Enjoy', text: 'free rewards', hi: 'मुफ़्त इनाम पाएँ' },
  ];
  const stepsTop = cardTop + card + 96;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label={`${shop} rewards poster: scan the QR code to join`}>
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

      {/* Eyebrow, shop name, tagline */}
      <g textAnchor="middle">
        <g transform={`translate(${W / 2} ${headTop})`}>
          <rect x={-235} y={-46} width={470} height={64} rx={32} fill={green ? 'rgba(238,242,236,0.12)' : C.paper} stroke={accent} strokeWidth={2} />
          <Star cx={-200} cy={-14} r={14} fill={accent} />
          <Star cx={200} cy={-14} r={14} fill={accent} />
          <text y={-2} fontFamily={DISPLAY} fontWeight={800} fontSize={30} letterSpacing={6} fill={onBg}>
            REWARDS CLUB
          </text>
        </g>
        {name.lines.map((line, i) => (
          <text key={i} x={W / 2} y={nameTop + i * name.size * 1.04} fontFamily={DISPLAY} fontWeight={900} fontSize={name.size} letterSpacing={-1} fill={onBg}>
            {line}
          </text>
        ))}
        {hindi && (
          <text x={W / 2} y={nameBottom + 78} fontFamily={HINDI} fontWeight={700} fontSize={46} fill={accent}>
            हर बिल पर पॉइंट्स, हर बार इनाम
          </text>
        )}
      </g>

      {/* The QR card */}
      <g filter={`url(#${id('shadow')})`}>
        <rect x={cardX} y={cardTop} width={card} height={card} rx={56} fill={C.white} />
      </g>
      {!green && <rect x={cardX} y={cardTop} width={card} height={card} rx={56} fill="none" stroke={C.green} strokeOpacity={0.25} strokeWidth={3} />}
      {/* "Scan me" tab */}
      <g transform={`translate(${W / 2} ${cardTop})`}>
        <rect x={-150} y={-36} width={300} height={72} rx={36} fill={C.ink} />
        <text y={13} textAnchor="middle" fontFamily={DISPLAY} fontWeight={900} fontSize={34} letterSpacing={5} fill={C.paper}>
          SCAN ME
        </text>
      </g>
      <StyledQr url={url} x={cardX + (card - qr) / 2} y={cardTop + (card - qr) / 2 + 12} size={qr} />

      {welcomeBonus > 0 && (
        <Burst cx={cardX + card + 80} cy={cardTop + 96} r={120}>
          <text x={cardX + card + 80} y={cardTop + 62} textAnchor="middle" fontFamily={DISPLAY} fontWeight={800} fontSize={24} fill={C.ink} letterSpacing={2}>
            JOIN &amp; GET
          </text>
          <text x={cardX + card + 80} y={cardTop + 122} textAnchor="middle" fontFamily={DISPLAY} fontWeight={900} fontSize={welcomeBonus >= 1000 ? 50 : 64} fill={C.ink}>
            +{welcomeBonus.toLocaleString('en-IN')}
          </text>
          <text x={cardX + card + 80} y={cardTop + 154} textAnchor="middle" fontFamily={DISPLAY} fontWeight={800} fontSize={24} fill={C.ink} letterSpacing={2}>
            FREE POINTS
          </text>
        </Burst>
      )}

      {/* Three steps */}
      {steps.map((s, i) => {
        const cx = W / 2 + (i - 1) * 390;
        return (
          <g key={s.n} textAnchor="middle">
            {i > 0 && (
              <path
                d={`M${cx - 390 + 92} ${stepsTop} H${cx - 92}`}
                stroke={onBg}
                strokeOpacity={0.35}
                strokeWidth={4}
                strokeDasharray="2 14"
                strokeLinecap="round"
              />
            )}
            <circle cx={cx} cy={stepsTop} r={50} fill={accent} />
            <text x={cx} y={stepsTop + 19} fontFamily={DISPLAY} fontWeight={900} fontSize={54} fill={green ? C.ink : C.white}>
              {s.n}
            </text>
            <text x={cx} y={stepsTop + 118} fontFamily={DISPLAY} fontWeight={900} fontSize={50} fill={onBg}>
              {s.title}
            </text>
            <text x={cx} y={stepsTop + 164} fontFamily={DISPLAY} fontWeight={500} fontSize={25} fill={onBg} opacity={0.85}>
              {s.text}
            </text>
            {hindi && (
              <text x={cx} y={stepsTop + 208} fontFamily={HINDI} fontWeight={600} fontSize={25} fill={onBg} opacity={0.7}>
                {s.hi}
              </text>
            )}
          </g>
        );
      })}

      {/* Footer */}
      <g>
        <rect x={0} y={H - 118} width={W} height={118} fill={green ? 'rgba(4,38,26,0.35)' : C.paper} />
        <text x={70} y={H - 48} fontFamily={DISPLAY} fontWeight={700} fontSize={30} fill={onBg}>
          No app to download · works on any phone
        </text>
        <g transform={`translate(${W - 70 - 300} ${H - 92})`}>
          <g transform="translate(0 0)">
            <LogoMark size={64} />
          </g>
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

/** Saves the poster as a print-quality PNG (2480 × 3508, A4 at 300 dpi). */
export async function downloadPoster(svg: SVGSVGElement, file: string) {
  const markup = new XMLSerializer().serializeToString(svg);
  const src = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Could not draw the poster'));
      img.src = src;
    });
    const canvas = Object.assign(document.createElement('canvas'), { width: W * 2, height: H * 2 });
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not save the poster'))), 'image/png'));
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(png), download: file });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  } finally {
    URL.revokeObjectURL(src);
  }
}
