import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Html5Audio, Img, Sequence, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, font, PHONE, REWARD, useShop } from './theme';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const pop = (frame: number, fps: number, delay = 0, stiff = 200) =>
  spring({ frame: frame - delay, fps, config: { damping: 13, stiffness: stiff, mass: 0.8 } });

export const fadeIn = (frame: number, delay = 0, len = 5) => interpolate(frame - delay, [0, len], [0, 1], clamp);

export const phoneLabel = (d: string) => `${d.slice(0, 5)} ${d.slice(5)}`;

/** The dark green backdrop with two slowly drifting glows, shared by every scene. */
export const Backdrop = () => {
  const f = useCurrentFrame();
  const gx = 30 + Math.sin(f / 60) * 12;
  const gy = 22 + Math.cos(f / 75) * 8;
  const ax = 78 + Math.cos(f / 50) * 10;
  const ay = 80 + Math.sin(f / 70) * 8;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(900px 900px at ${gx}% ${gy}%, rgba(16,185,129,.33), transparent 70%),
          radial-gradient(800px 800px at ${ax}% ${ay}%, rgba(240,162,2,.2), transparent 70%),
          linear-gradient(180deg, ${C.bgTop}, ${C.bgBottom})`,
      }}
    >
      {Array.from({ length: 16 }, (_, i) => {
        const size = 40 + random(`s${i}`) * 110;
        const x = random(`x${i}`) * 1080;
        const y = ((random(`y${i}`) * 2200 - f * (0.6 + random(`v${i}`) * 1.2)) % 2200 + 2200) % 2200 - 140;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: '50%',
              border: `${Math.max(3, size / 14)}px ${i % 3 ? 'dashed' : 'solid'} ${i % 4 ? 'rgba(52,211,153,.09)' : 'rgba(240,162,2,.1)'}`,
              transform: `rotate(${f * (i % 2 ? 0.4 : -0.3)}deg)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// All sound effects play at this share of their own volume, so they stay well under the voice.
const SFX_LEVEL = 0.15;

/** A sound effect from public/sfx at frame `at` of the current scene. */
export const Sfx = ({ at, name, volume = 0.6 }: { at: number; name: string; volume?: number }) => (
  <Sequence from={Math.round(at)} layout="none">
    <Html5Audio src={staticFile(`sfx/${name}.wav`)} volume={volume * SFX_LEVEL} />
  </Sequence>
);

/**
 * A scene's content. It cuts in with a quick zoom-blur and a whoosh, then slowly pushes in; `cut={false}` is for a
 * scene that continues the previous shot.
 */
export const Scene = ({ children, cut = true }: { children: ReactNode; cut?: boolean }) => {
  const f = useCurrentFrame();
  const enter = cut ? interpolate(f, [0, 8], [1, 0], { ...clamp, easing: (v) => 1 - Math.pow(1 - v, 3) }) : 0;
  const push = cut ? 1 + Math.min(f, 150) * 0.0002 : 1;
  return (
    <AbsoluteFill
      style={{
        fontFamily: font,
        color: '#fff',
        opacity: 1 - enter,
        filter: enter > 0.01 ? `blur(${enter * 14}px)` : undefined,
        transform: `scale(${push + enter * 0.08})`,
      }}
    >
      {children}
      {cut && <Sfx at={0} name="whoosh" volume={0.35} />}
    </AbsoluteFill>
  );
};

/** Big headline that slams in (scales down from large) at `delay`, optionally leaving at `out`. */
export const Slam = ({
  delay = 0,
  out,
  top,
  size = 92,
  style,
  children,
}: {
  delay?: number;
  out?: number;
  top: number;
  size?: number;
  style?: CSSProperties;
  children: ReactNode;
}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = pop(f, fps, delay, 260);
  const gone = out === undefined ? 0 : interpolate(f - out, [0, 5], [0, 1], clamp);
  return (
    <div
      style={{
        position: 'absolute',
        left: 60,
        right: 60,
        top,
        textAlign: 'center',
        fontSize: size,
        fontWeight: 800,
        lineHeight: 1.08,
        letterSpacing: -1.5,
        textShadow: '0 6px 30px rgba(0,0,0,.35)',
        opacity: fadeIn(f, delay, 4) * (1 - gone),
        transform: `scale(${interpolate(s, [0, 1], [1.5, 1]) - gone * 0.1})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Smaller line that rises into place. */
export const Rise = ({ delay = 0, top, size = 50, style, children }: { delay?: number; top: number; size?: number; style?: CSSProperties; children: ReactNode }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = pop(f, fps, delay, 160);
  return (
    <div
      style={{
        position: 'absolute',
        left: 60,
        right: 60,
        top,
        textAlign: 'center',
        fontSize: size,
        fontWeight: 600,
        lineHeight: 1.3,
        color: C.soft,
        opacity: fadeIn(f, delay, 6),
        transform: `translateY(${interpolate(s, [0, 1], [50, 0])}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Hl = ({ children, color = C.amber, ink = C.bgBottom }: { children: ReactNode; color?: string; ink?: string }) => (
  <span style={{ background: color, color: ink, padding: '0 22px', borderRadius: 18, display: 'inline-block' }}>{children}</span>
);

export const Logo = ({ size, style }: { size: number; style?: CSSProperties }) => (
  <Img src={staticFile('logo.svg')} style={{ width: size, height: size, ...style }} />
);

// ---- Icons (lucide shapes, as the app uses) ----

const Svg = ({ size, color, width = 2.5, children }: { size: number; color: string; width?: number; children: ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

export const CheckIcon = ({ size, color = '#fff', width = 3 }: { size: number; color?: string; width?: number }) => (
  <Svg size={size} color={color} width={width}>
    <polyline points="20 6 9 17 4 12" />
  </Svg>
);

export const GiftIcon = ({ size, color = '#fff' }: { size: number; color?: string }) => (
  <Svg size={size} color={color} width={2}>
    <rect x="3" y="8" width="18" height="4" rx="1" />
    <path d="M12 8v13" />
    <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
    <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
  </Svg>
);

export const ChatIcon = ({ size, color = '#fff' }: { size: number; color?: string }) => (
  <Svg size={size} color={color} width={2.2}>
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
  </Svg>
);

// ---- Stamp row, like the app's .stamps ----

/** `on` stamps filled; the one at index `land` slams in with progress `landP` (0..1). The last slot is the reward. */
export const Stamps = ({ n = 5, on, land, landP = 1, size = 92, gap = 16 }: { n?: number; on: number; land?: number; landP?: number; size?: number; gap?: number }) => (
  <div style={{ display: 'flex', gap, justifyContent: 'center' }}>
    {Array.from({ length: n }, (_, i) => {
      const last = i === n - 1;
      const filled = i < on;
      const landing = i === land;
      const tone = last ? C.reward : C.brand;
      const s = landing ? landP : 1;
      return (
        <div key={i} style={{ position: 'relative', width: size, height: size }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: last ? `4px solid ${C.reward}` : `4px dashed ${C.lineStrong}`,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {last && !filled && <GiftIcon size={size * 0.48} color={C.reward} />}
          </div>
          {filled && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: tone,
                display: 'grid',
                placeItems: 'center',
                opacity: landing ? Math.min(1, s * 3) : 1,
                transform: `scale(${landing ? interpolate(s, [0, 1], [2.6, 1]) : 1}) rotate(${landing ? interpolate(s, [0, 1], [-25, 0]) : 0}deg)`,
                boxShadow: landing ? `0 0 ${interpolate(s, [0, 1], [0, 30])}px ${tone}` : 'none',
              }}
            >
              {last ? <GiftIcon size={size * 0.5} /> : <CheckIcon size={size * 0.5} />}
            </div>
          )}
        </div>
      );
    })}
  </div>
);

// ---- Phone ----

export const SCREEN_W = 664;
export const SCREEN_H = 1284;

/** A phone at the standard spot; `x`/`y` offset it (slide-ins, shakes). */
export const Phone = ({ children, x = 0, y = 0, rot = 0 }: { children: ReactNode; x?: number; y?: number; rot?: number }) => (
  <div
    style={{
      position: 'absolute',
      left: 190,
      top: 540,
      width: 700,
      height: 1320,
      borderRadius: 92,
      background: '#0b0f0d',
      padding: 18,
      boxShadow: '0 60px 120px rgba(0,0,0,.55), inset 0 0 0 4px #1f2a25',
      transform: `translate(${x}px, ${y}px) rotate(${rot}deg)`,
    }}
  >
    <div style={{ position: 'relative', width: SCREEN_W, height: SCREEN_H, borderRadius: 74, overflow: 'hidden', background: C.appBg, color: C.ink, fontFamily: font }}>
      {children}
      <div style={{ position: 'absolute', left: 262, top: 18, width: 140, height: 38, borderRadius: 20, background: '#0b0f0d' }} />
    </div>
  </div>
);

/** A shake offset after `at`, for stamps landing. */
export const shake = (frame: number, at: number, amp = 14) => {
  const t = frame - at;
  if (t < 0 || t > 10) return 0;
  return Math.sin(t * 2.6) * amp * (1 - t / 10);
};

/** A fingertip: a soft white dot that moves to (x, y) by `arrive` and presses at `press`, with a ripple. */
export const Touch = ({ from, to, start, arrive, press }: { from: [number, number]; to: [number, number]; start: number; arrive: number; press: number }) => {
  const f = useCurrentFrame();
  if (f < start) return null;
  const t = interpolate(f, [start, arrive], [0, 1], { ...clamp, easing: (v) => 1 - Math.pow(1 - v, 3) });
  const x = from[0] + (to[0] - from[0]) * t;
  const y = from[1] + (to[1] - from[1]) * t;
  const down = interpolate(f - press, [0, 3, 8], [1, 0.75, 1], clamp);
  const ripple = interpolate(f - press, [0, 14], [0, 1], clamp);
  const gone = interpolate(f - press, [10, 18], [1, 0], clamp);
  return (
    <>
      {f >= press && (
        <div
          style={{
            position: 'absolute',
            left: x - 90,
            top: y - 90,
            width: 180,
            height: 180,
            borderRadius: '50%',
            border: '6px solid rgba(255,255,255,.9)',
            transform: `scale(${0.3 + ripple})`,
            opacity: 1 - ripple,
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          left: x - 42,
          top: y - 42,
          width: 84,
          height: 84,
          borderRadius: '50%',
          background: 'rgba(255,255,255,.55)',
          border: '4px solid rgba(255,255,255,.95)',
          boxShadow: '0 8px 24px rgba(0,0,0,.3)',
          transform: `scale(${down})`,
          opacity: fadeIn(f, start, 4) * gone,
        }}
      />
    </>
  );
};

// ---- The shop app's screens ----

export const TopBar = () => (
  <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 150, background: '#fff', borderBottom: `2px solid ${C.line}`, display: 'flex', alignItems: 'flex-end', padding: '0 36px 22px', gap: 16 }}>
    <Logo size={56} style={{ borderRadius: 14 }} />
    <div style={{ fontSize: 32, fontWeight: 700 }}>{useShop().name}</div>
    <div style={{ marginLeft: 'auto', fontSize: 24, fontWeight: 600, color: C.muted, border: `2px solid ${C.line}`, borderRadius: 30, padding: '4px 16px' }}>EN · हिं</div>
  </div>
);

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clear', '0', '⌫'];
const KEY_W = (592 - 32) / 3;
export const keyCenter = (k: string): [number, number] => {
  const i = KEYS.indexOf(k);
  return [36 + (i % 3) * (KEY_W + 16) + KEY_W / 2, 400 + Math.floor(i / 3) * 136 + 60];
};
export const ADD_VISIT: [number, number] = [332, 1035];

/** The counter keypad screen: `digits` typed so far, `pressed` key lit. */
export const KeypadScreen = ({ digits, pressed, glow = 0, press = 1 }: { digits: string; pressed?: string; glow?: number; press?: number }) => {
  const ready = digits.length === 10;
  const shown = digits ? phoneLabel(digits.padEnd(10, '_')) : '';
  return (
    <AbsoluteFill>
      <TopBar />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 182, textAlign: 'center', fontSize: 30, color: C.muted }}>
        Every 5 visits → <b style={{ color: C.ink }}>{REWARD}</b>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 36,
          right: 36,
          top: 240,
          height: 120,
          borderRadius: 24,
          background: '#fff',
          border: `3px solid ${digits ? C.brand : C.lineStrong}`,
          display: 'grid',
          placeItems: 'center',
          fontSize: digits ? 64 : 34,
          fontWeight: digits ? 700 : 500,
          letterSpacing: digits ? 3 : 0,
          color: digits ? C.ink : C.muted,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {shown || 'Customer’s phone number'}
      </div>
      {KEYS.map((k) => {
        const [cx, cy] = keyCenter(k);
        const on = pressed === k;
        const soft = k === 'Clear' || k === '⌫';
        return (
          <div
            key={k}
            style={{
              position: 'absolute',
              left: cx - KEY_W / 2,
              top: cy - 60,
              width: KEY_W,
              height: 120,
              borderRadius: 24,
              background: on ? C.brandSoft : soft ? 'transparent' : '#fff',
              border: `2px solid ${on ? C.brand : C.line}`,
              display: 'grid',
              placeItems: 'center',
              fontSize: soft ? 30 : 54,
              fontWeight: soft ? 600 : 600,
              color: soft ? C.muted : C.ink,
              transform: `scale(${on ? 0.94 : 1})`,
            }}
          >
            {k}
          </div>
        );
      })}
      <div
        style={{
          position: 'absolute',
          left: 36,
          right: 36,
          top: ADD_VISIT[1] - 68,
          height: 136,
          borderRadius: 30,
          background: C.brand,
          opacity: ready ? 1 : 0.4,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          fontSize: 46,
          fontWeight: 700,
          transform: `scale(${press})`,
          boxShadow: glow ? `0 0 0 ${glow * 14}px rgba(16,185,129,${0.35 * (1 - glow * 0.4)})` : 'none',
        }}
      >
        <CheckIcon size={44} /> Add visit
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1150, textAlign: 'center', fontSize: 28, color: C.muted }}>
        Today: <b style={{ color: C.ink }}>12</b> visits
      </div>
    </AbsoluteFill>
  );
};

export const Center = ({ top, size, weight = 500, color = C.ink, children, style }: { top: number; size: number; weight?: number; color?: string; children: ReactNode; style?: CSSProperties }) => (
  <div style={{ position: 'absolute', left: 40, right: 40, top, textAlign: 'center', fontSize: size, fontWeight: weight, color, lineHeight: 1.25, ...style }}>{children}</div>
);

export const Btn = ({ top, bg, children, scale = 1, h = 120, size = 38 }: { top: number; bg: string; children: ReactNode; scale?: number; h?: number; size?: number }) => (
  <div style={{ position: 'absolute', left: 36, right: 36, top, height: h, borderRadius: 28, background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, fontSize: size, fontWeight: 700, transform: `scale(${scale})` }}>
    {children}
  </div>
);

/** Shows `children` from `at`, popping in. */
export const In = ({ at, children }: { at: number; children: ReactNode }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (f < at) return null;
  const s = pop(f, fps, at, 220);
  return <AbsoluteFill style={{ opacity: fadeIn(f, at, 4), transform: `translateY(${interpolate(s, [0, 1], [30, 0])}px)` }}>{children}</AbsoluteFill>;
};

/** "Visit 4 of 5": the result after Add visit. Times are relative to the screen's start. */
export const VisitScreen = ({ t, landAt }: { t: number; landAt: number }) => {
  const { fps } = useVideoConfig();
  const icon = pop(t, fps, 0, 220);
  return (
    <AbsoluteFill>
      <TopBar />
      <div style={{ position: 'absolute', left: 257, top: 200, width: 150, height: 150, borderRadius: '50%', background: C.brand, display: 'grid', placeItems: 'center', transform: `scale(${icon})` }}>
        <CheckIcon size={80} />
      </div>
      <Center top={380} size={32} color={C.muted}>{phoneLabel(PHONE)}</Center>
      <Center top={430} size={64} weight={800}>Visit 4 of 5</Center>
      <Center top={530} size={34} color={C.muted}>1 more for {REWARD}.</Center>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 620 }}>
        <Stamps on={t >= landAt ? 4 : 3} land={3} landP={pop(t, fps, landAt, 300)} />
      </div>
      <In at={landAt + 10}>
        <Btn top={790} bg={C.whatsapp} h={110} size={34}>
          <ChatIcon size={38} /> Send card on WhatsApp
        </Btn>
        <Btn top={925} bg={C.brand}>Next customer</Btn>
      </In>
    </AbsoluteFill>
  );
};

export const GIVEN_BTN: [number, number] = [332, 905];

/** "Give Free gift now", then "Reward given 🎉" from `givenAt`. */
export const RewardScreen = ({ t, landAt, givenAt, press = 1 }: { t: number; landAt: number; givenAt: number; press?: number }) => {
  const { fps } = useVideoConfig();
  const given = t >= givenAt;
  const icon = pop(t, fps, given ? givenAt : 0, 220);
  const tint = interpolate(t, [0, 8], [0, 1], clamp) * (given ? interpolate(t - givenAt, [0, 8], [1, 0], clamp) : 1);
  const wobble = given ? 0 : Math.sin(t / 3) * 6 * interpolate(t, [landAt, landAt + 30], [1, 0.3], clamp);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: C.rewardSoft, opacity: tint }} />
      <TopBar />
      <div
        style={{
          position: 'absolute',
          left: 257,
          top: 200,
          width: 150,
          height: 150,
          borderRadius: '50%',
          background: given ? C.brand : C.reward,
          display: 'grid',
          placeItems: 'center',
          transform: `scale(${icon}) rotate(${wobble}deg)`,
        }}
      >
        <GiftIcon size={78} />
      </div>
      <Center top={380} size={32} color={C.muted}>{phoneLabel(PHONE)}</Center>
      {given ? (
        <In at={givenAt + 2}>
          <Center top={430} size={60} weight={800}>Reward given 🎉</Center>
          <Center top={525} size={34} color={C.muted}>Their card starts again.</Center>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 620 }}>
            <Stamps on={0} />
          </div>
          <Btn top={790} bg={C.whatsapp} h={110} size={34}>
            <ChatIcon size={38} /> Send card on WhatsApp
          </Btn>
          <Btn top={925} bg={C.brand}>Next customer</Btn>
        </In>
      ) : (
        <>
          <Center top={430} size={56} weight={800} color={C.reward}>Give {REWARD} now</Center>
          <Center top={520} size={30} color={C.muted}>This is visit 5. Their card is full.</Center>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 620 }}>
            <Stamps on={t >= landAt ? 5 : 4} land={4} landP={pop(t, fps, landAt, 300)} />
          </div>
          <In at={landAt + 8}>
            <Btn top={GIVEN_BTN[1] - 68} bg={C.reward} h={136} size={46} scale={press}>
              <CheckIcon size={44} /> Given
            </Btn>
            <Center top={1010} size={28} color={C.muted}>Not now — give it next time</Center>
          </In>
        </>
      )}
    </AbsoluteFill>
  );
};

// ---- Confetti ----

const CONFETTI = [C.amber, C.mint, '#fff', C.reward, C.brandFill];

export const Confetti = ({ at, originX = 540, originY = 1150, count = 90 }: { at: number; originX?: number; originY?: number; count?: number }) => {
  const f = useCurrentFrame();
  const t = (f - at) / 30;
  if (t < 0) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {Array.from({ length: count }, (_, i) => {
        const a = -Math.PI / 2 + (random(`a${i}`) - 0.5) * 2.4;
        const v = 900 + random(`v${i}`) * 1300;
        const x = originX + Math.cos(a) * v * t;
        const y = originY + Math.sin(a) * v * t + 1500 * t * t;
        const w = 16 + random(`w${i}`) * 18;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: w,
              height: w * 0.55,
              borderRadius: 4,
              background: CONFETTI[i % CONFETTI.length],
              transform: `rotate(${t * (300 + random(`r${i}`) * 700)}deg)`,
              opacity: interpolate(t, [1.4, 2], [1, 0], clamp),
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
