import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, PHONE, REWARD, SHOP } from './theme';
import {
  ADD_VISIT,
  Confetti,
  GIVEN_BTN,
  Hl,
  KeypadScreen,
  Logo,
  Phone,
  RewardScreen,
  Rise,
  Scene,
  Sfx,
  Slam,
  Stamps,
  Touch,
  VisitScreen,
  fadeIn,
  keyCenter,
  phoneLabel,
  pop,
  shake,
} from './ui';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Each scene gets the frames (from its own start) at which the voice starts each of its phrases. */
export type Cues = { cue: number[] };

// ---- 1. Hook: 10 customers came, 3 came back ----

const Person = ({ color }: { color: string }) => (
  <svg width="150" height="170" viewBox="0 0 150 170">
    <circle cx="75" cy="48" r="34" fill={color} />
    <path d="M18 165 V140 a57 57 0 0 1 114 0 V165 Z" fill={color} />
  </svg>
);

const BACK = [1, 5, 8];

export const Hook = ({ cue }: Cues) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const DROP_AT = cue[1];
  return (
    <Scene>
      {Array.from({ length: 10 }, (_, i) => (
        <Sfx key={i} at={6 + i * 2} name="pop" volume={0.18} />
      ))}
      <Sfx at={DROP_AT} name="stamp" volume={0.5} />
      <Slam top={250} out={DROP_AT - 4}>
        <span style={{ color: C.amber }}>10</span> naye customer aaye…
      </Slam>
      <Slam top={250} delay={DROP_AT} size={84} style={{ whiteSpace: 'nowrap', left: 0, right: 0 }}>
        Wapas aaye <Hl color={C.red} ink="#fff">sirf 3</Hl> 😕
      </Slam>
      {Array.from({ length: 10 }, (_, i) => {
        const back = BACK.includes(i);
        const s = pop(f, fps, 6 + i * 2, 240);
        const d = interpolate(f, [DROP_AT, DROP_AT + 10], [0, 1], clamp);
        const x = 80 + (i % 5) * 186;
        const y = 820 + Math.floor(i / 5) * 270;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              opacity: back ? 1 : 1 - d * 0.85,
              transform: `translateY(${back ? -d * 20 : d * 60}px) scale(${s * (back ? 1 + d * 0.12 : 1 - d * 0.15)})`,
            }}
          >
            <Person color={back && d > 0 ? C.mint : C.soft} />
            {back && d > 0 && (
              <div style={{ position: 'absolute', left: 5, top: -20, width: 140, height: 140, borderRadius: '50%', border: `8px solid ${C.mint}`, opacity: d }} />
            )}
          </div>
        );
      })}
      <Rise top={1460} delay={cue[2]} size={60}>
        Baaki 7? <b style={{ color: '#fff' }}>Bhool gaye.</b>
      </Rise>
    </Scene>
  );
};

// ---- 2. Paper cards get lost ----

export const PaperCard = ({ cue }: Cues) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = pop(f, fps, 0, 140);
  const fly = interpolate(f, [cue[1] - 12, cue[1] + 10], [0, 1], { ...clamp, easing: (v) => v * v });
  return (
    <Scene>
      <Sfx at={cue[1] - 10} name="whoosh" volume={0.5} />
      <Slam top={280} delay={2}>Paper card?</Slam>
      <div
        style={{
          position: 'absolute',
          left: 160,
          top: 720,
          width: 760,
          height: 440,
          borderRadius: 34,
          border: `6px dashed rgba(207,233,221,.35)`,
          opacity: interpolate(f, [cue[1], cue[1] + 10], [0, 1], clamp),
          display: 'grid',
          placeItems: 'center',
          fontSize: 200,
          fontWeight: 800,
          color: 'rgba(207,233,221,.45)',
        }}
      >
        ?
      </div>
      <div
        style={{
          position: 'absolute',
          left: 160,
          top: 720,
          width: 760,
          height: 440,
          borderRadius: 34,
          background: 'linear-gradient(160deg,#fbf5e6,#efe3c4)',
          boxShadow: '0 50px 90px rgba(0,0,0,.45)',
          color: '#5a4420',
          opacity: 1 - interpolate(fly, [0.7, 1], [0, 1], clamp),
          transform: `translate(${fly * 900}px, ${interpolate(enter, [0, 1], [600, 0]) - fly * 380}px) rotate(${-5 + fly * 50}deg) scale(${1 - fly * 0.4})`,
        }}
      >
        <div style={{ position: 'absolute', left: 54, top: 44, fontSize: 46, fontWeight: 800, color: '#0b5e40' }}>{SHOP}</div>
        <div style={{ position: 'absolute', right: 54, top: 52, fontSize: 32, fontWeight: 700, color: '#a0742a' }}>Stamp card</div>
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 60 + i * 132,
              top: 190,
              width: 112,
              height: 112,
              borderRadius: '50%',
              border: i < 3 ? '10px solid #0b7a52' : '5px dashed #c8ad7a',
              color: '#0b7a52',
              display: 'grid',
              placeItems: 'center',
              fontSize: 54,
              fontWeight: 900,
              transform: `rotate(${(i - 2) * 7}deg)`,
            }}
          >
            {i < 3 ? '✓' : ''}
          </div>
        ))}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 40, textAlign: 'center', fontSize: 30, fontWeight: 600, color: '#8a6d3b' }}>
          5 stamps = 1 {REWARD.toLowerCase()}
        </div>
      </div>
      <Slam top={1300} delay={cue[1]} size={120} style={{ color: C.red }}>
        Kho gaya.
      </Slam>
      <Rise top={1470} delay={cue[2]}>Ghar pe reh gaya, jeb me phat gaya.</Rise>
    </Scene>
  );
};

// ---- 3. Logo reveal: a row of stamps → Regularhood ----

const FILLS = [4, 9, 14, 19, 25];

export const LogoReveal = ({ cue }: Cues) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = cue[1] - 4;
  const rise = interpolate(f, [at - 4, at + 8], [0, 1], { ...clamp, easing: (v) => 1 - Math.pow(1 - v, 3) });
  const logo = pop(f, fps, at, 180);
  const stampsOn = FILLS.filter((t) => f >= t).length;
  const landing = stampsOn - 1;
  const landP = pop(f, fps, FILLS[Math.max(0, landing)], 320);
  const word = 'Regularhood';
  return (
    <Scene>
      {FILLS.map((t, i) => (
        <Sfx key={i} at={t} name={i === 4 ? 'ding' : 'stamp'} volume={i === 4 ? 0.3 : 0.35} />
      ))}
      <Sfx at={at} name="chime" volume={0.45} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 860, transform: `translateY(${-rise * 520}px) scale(${1 - rise * 0.45})` }}>
        <div style={{ background: 'rgba(255,255,255,.96)', borderRadius: 40, padding: '30px 34px', width: 'fit-content', margin: '0 auto', boxShadow: '0 30px 60px rgba(0,0,0,.35)' }}>
          <Stamps on={stampsOn} land={landing} landP={landP} size={130} gap={24} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 390, top: 640, transform: `scale(${logo})`, opacity: fadeIn(f, at, 3) }}>
        <Logo size={300} style={{ borderRadius: 68, boxShadow: '0 30px 70px rgba(0,0,0,.4)' }} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 990, textAlign: 'center', fontSize: 140, fontWeight: 800, letterSpacing: -3 }}>
        {word.split('').map((ch, i) => {
          const s = pop(f, fps, at + 6 + i * 1.3, 260);
          return (
            <span key={i} style={{ display: 'inline-block', opacity: fadeIn(f, at + 6 + i * 1.3, 3), transform: `translateY(${interpolate(s, [0, 1], [60, 0])}px)`, color: i >= 7 ? C.mint : '#fff' }}>
              {ch}
            </span>
          );
        })}
      </div>
      <Rise top={1200} delay={cue[2]} size={54}>
        Har local dukaan ka <b style={{ color: C.amber }}>loyalty card</b>
      </Rise>
    </Scene>
  );
};

// ---- 4. Customer says their number, the shop types it ----

const TYPE_START = 26;
const TYPE_EVERY = 5;

export const Keypad = (_: Cues) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const up = pop(f, fps, 0, 120);
  const typed = Math.max(0, Math.min(10, Math.floor((f - TYPE_START) / TYPE_EVERY) + 1));
  const digits = PHONE.slice(0, typed);
  const lastAt = TYPE_START + (typed - 1) * TYPE_EVERY;
  const pressed = typed > 0 && f - lastAt < 3 ? PHONE[typed - 1] : undefined;
  const tip = typed > 0 ? keyCenter(PHONE[Math.min(typed, 9)]) : keyCenter(PHONE[0]);
  const prev = typed > 0 ? keyCenter(PHONE[typed - 1]) : tip;
  const glow = typed === 10 ? (Math.sin((f - lastAt) / 4) + 1) / 2 : 0;
  const bubble = pop(f, fps, 12, 220);
  return (
    <Scene>
      <Sfx at={12} name="pop" volume={0.3} />
      {Array.from(PHONE, (_, i) => (
        <Sfx key={i} at={TYPE_START + i * TYPE_EVERY} name="key" volume={0.35} />
      ))}
      <Slam top={150} size={86}>
        Customer bas apna <span style={{ color: C.amber }}>number</span> bataye
      </Slam>
      <Phone y={interpolate(up, [0, 1], [1300, 0])}>
        <KeypadScreen digits={digits} pressed={pressed} glow={glow} />
        {typed > 0 && typed < 10 && <Touch from={prev} to={tip} start={TYPE_START - 6} arrive={lastAt + TYPE_EVERY - 1} press={lastAt + TYPE_EVERY} />}
      </Phone>
      <div
        style={{
          position: 'absolute',
          left: 300,
          top: 385,
          padding: '20px 34px',
          borderRadius: '40px 40px 40px 8px',
          background: '#fff',
          color: C.ink,
          fontSize: 48,
          fontWeight: 700,
          boxShadow: '0 20px 50px rgba(0,0,0,.4)',
          transform: `scale(${bubble}) rotate(-3deg)`,
          transformOrigin: 'left bottom',
          opacity: (1 - interpolate(f, [70, 78], [0, 1], clamp)) * fadeIn(f, 12, 3),
        }}
      >
        💬 “{phoneLabel(PHONE)}”
      </div>
    </Scene>
  );
};

// ---- 5. One tap, one stamp ----

export const AddVisit = ({ cue }: Cues) => {
  const f = useCurrentFrame();
  const TAP = cue[1] - 10;
  const RESULT = TAP + 6;
  const landAt = cue[1] + 14 - RESULT;
  const press = interpolate(f - TAP, [0, 3, 7], [1, 0.94, 1], clamp);
  const sx = shake(f, RESULT + landAt);
  return (
    <Scene cut={false}>
      <Sfx at={TAP} name="tap" volume={0.6} />
      <Sfx at={RESULT + landAt} name="stamp" volume={0.7} />
      <Slam top={170} size={110}>
        1 tap = <span style={{ color: C.mint }}>1 stamp</span>
      </Slam>
      <Phone x={sx}>
        {f < RESULT ? (
          <KeypadScreen digits={PHONE} press={press} />
        ) : (
          <AbsoluteFill style={{ opacity: fadeIn(f, RESULT, 4) }}>
            <VisitScreen t={f - RESULT} landAt={landAt} />
          </AbsoluteFill>
        )}
        <Touch from={[440, 1180]} to={ADD_VISIT} start={TAP - 14} arrive={TAP - 1} press={TAP} />
      </Phone>
    </Scene>
  );
};

// ---- 6. The card lands on the customer's WhatsApp ----

const MSG_AT = 26;

const WhatsAppChat = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const msg = pop(f, fps, MSG_AT, 220);
  const typing = f >= 10 && f < MSG_AT;
  return (
    <AbsoluteFill style={{ background: '#efeae2' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 190, background: '#008069', color: '#fff', display: 'flex', alignItems: 'flex-end', gap: 18, padding: '0 28px 24px' }}>
        <div style={{ fontSize: 44, lineHeight: 1 }}>‹</div>
        <Logo size={70} style={{ borderRadius: 35 }} />
        <div>
          <div style={{ fontSize: 34, fontWeight: 700 }}>{SHOP}</div>
          <div style={{ fontSize: 24, opacity: 0.85 }}>online</div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 222, textAlign: 'center' }}>
        <span style={{ background: '#fff', borderRadius: 14, padding: '6px 20px', fontSize: 22, color: C.muted }}>Today</span>
      </div>
      {typing && (
        <div style={{ position: 'absolute', left: 28, top: 296, background: '#fff', borderRadius: '6px 26px 26px 26px', padding: '22px 28px', display: 'flex', gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 16, height: 16, borderRadius: 8, background: C.muted, opacity: 0.4 + 0.6 * Math.abs(Math.sin((f + i * 4) / 5)) }} />
          ))}
        </div>
      )}
      {f >= MSG_AT && (
        <div
          style={{
            position: 'absolute',
            left: 28,
            top: 296,
            width: 560,
            background: '#fff',
            borderRadius: '6px 26px 26px 26px',
            padding: '22px 26px 16px',
            fontSize: 31,
            lineHeight: 1.5,
            boxShadow: '0 2px 4px rgba(0,0,0,.08)',
            transformOrigin: 'left top',
            transform: `scale(${msg})`,
          }}
        >
          <b>{SHOP}</b>: विज़िट 4/5 ✓ बस 1 और विज़िट, फिर {REWARD}! 🎁
          <br />
          आपका कार्ड: <span style={{ color: '#027eb5', textDecoration: 'underline' }}>regularhood.in/w/k3x9p</span>
          <div style={{ textAlign: 'right', fontSize: 22, color: C.muted }}>10:42</div>
        </div>
      )}
      <div style={{ position: 'absolute', left: 20, right: 20, bottom: 30, display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{ flex: 1, height: 90, borderRadius: 45, background: '#fff', fontSize: 30, color: C.muted, display: 'flex', alignItems: 'center', padding: '0 32px' }}>Message</div>
        <div style={{ width: 90, height: 90, borderRadius: 45, background: '#00a884' }} />
      </div>
    </AbsoluteFill>
  );
};

/** The customer card page, /w/<link>, sliding up over the chat. */
const CardPage = ({ t }: { t: number }) => {
  const { fps } = useVideoConfig();
  const up = pop(t, fps, 0, 140);
  return (
    <AbsoluteFill style={{ background: '#fff', transform: `translateY(${interpolate(up, [0, 1], [1300, 0])}px)` }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 110, textAlign: 'center' }}>
        <Logo size={110} style={{ borderRadius: 28 }} />
        <div style={{ fontSize: 46, fontWeight: 800, marginTop: 16 }}>{SHOP}</div>
        <div style={{ fontSize: 28, color: C.muted }}>आपका स्टैम्प कार्ड</div>
      </div>
      <div style={{ position: 'absolute', left: 36, right: 36, top: 450, borderRadius: 34, background: C.appBg, border: `2px solid ${C.line}`, padding: '44px 0' }}>
        <Stamps on={4} size={96} gap={14} />
        <div style={{ textAlign: 'center', marginTop: 34, fontSize: 34, fontWeight: 800, color: C.brand }}>बस 1 और विज़िट, फिर {REWARD} 🎁</div>
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 28, color: C.muted }}>हर 5 विज़िट पर {REWARD}</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 900, textAlign: 'center', fontSize: 26, color: C.muted }}>
        <span style={{ border: `2px solid ${C.line}`, borderRadius: 30, padding: '8px 22px' }}>English · <b style={{ color: C.ink }}>हिंदी</b></span>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1000, textAlign: 'center', fontSize: 26, color: C.muted }}>No app · No login</div>
    </AbsoluteFill>
  );
};

export const WhatsAppCard = ({ cue }: Cues) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slide = pop(f, fps, 0, 140);
  const LINK_TAP = cue[1] - 6;
  const CARD_AT = cue[1];
  return (
    <Scene>
      <Sfx at={MSG_AT} name="pop" volume={0.5} />
      <Sfx at={LINK_TAP} name="tap" volume={0.6} />
      <Sfx at={CARD_AT} name="whoosh" volume={0.3} />
      <Slam top={150} size={86}>
        Card seedha <span style={{ color: C.mint }}>WhatsApp</span> pe
      </Slam>
      <Phone x={interpolate(slide, [0, 1], [1100, 0])} rot={interpolate(slide, [0, 1], [8, 0])}>
        <WhatsAppChat />
        <Touch from={[420, 900]} to={[250, 478]} start={LINK_TAP - 12} arrive={LINK_TAP - 1} press={LINK_TAP} />
        {f >= CARD_AT && <CardPage t={f - CARD_AT} />}
      </Phone>
      <Rise top={380} delay={CARD_AT + 4} size={46} style={{ color: '#fff', fontWeight: 700 }}>
        Na app · Na QR · Na password
      </Rise>
    </Scene>
  );
};

// ---- 7. The 5th visit: give the reward ----

const LAND = 22;

export const Reward = ({ cue }: Cues) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slide = pop(f, fps, 0, 140);
  const GIVE_TAP = cue[2] - 2;
  const GIVEN = GIVE_TAP + 6;
  const press = interpolate(f - GIVE_TAP, [0, 3, 7], [1, 0.94, 1], clamp);
  return (
    <Scene>
      <Sfx at={LAND} name="stamp" volume={0.7} />
      <Sfx at={LAND + 2} name="ding" volume={0.45} />
      <Sfx at={GIVE_TAP} name="tap" volume={0.6} />
      <Sfx at={GIVEN} name="sparkle" volume={0.5} />
      <Slam top={170} size={90} style={{ whiteSpace: 'nowrap', left: 0, right: 0 }}>
        5th visit = <span style={{ color: C.amber }}>{REWARD.toLowerCase()}</span> 🎁
      </Slam>
      <Phone x={interpolate(slide, [0, 1], [-1100, 0]) + shake(f, LAND, 18)} rot={interpolate(slide, [0, 1], [-8, 0])}>
        <RewardScreen t={f} landAt={LAND} givenAt={GIVEN} press={press} />
        <Touch from={[460, 1180]} to={GIVEN_BTN} start={GIVE_TAP - 14} arrive={GIVE_TAP - 1} press={GIVE_TAP} />
      </Phone>
      <Confetti at={GIVEN} />
    </Scene>
  );
};

// ---- 8. Every kind of shop ----

const SHOPS = [
  ['🧁', 'Café'],
  ['✂️', 'Salon'],
  ['🥐', 'Bakery'],
  ['🛒', 'Kirana'],
  ['🏋️', 'Gym'],
  ['🍬', 'Mithai'],
];

const CHIP = (i: number) => 4 + i * 6;

export const Shops = ({ cue }: Cues) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Scene>
      {SHOPS.map((_, i) => (
        <Sfx key={i} at={CHIP(i)} name="pop" volume={0.25} />
      ))}
      <Sfx at={cue[1] + 50} name="ding" volume={0.3} />
      <Slam top={300} size={90} delay={cue[1]}>
        Jahaan log <span style={{ color: C.amber }}>baar‑baar</span> aate hain
      </Slam>
      {SHOPS.map(([emoji, name], i) => {
        const s = pop(f, fps, CHIP(i), 240);
        return (
          <div
            key={name}
            style={{
              position: 'absolute',
              left: i % 2 ? 560 : 90,
              top: 720 + Math.floor(i / 2) * 200,
              width: 430,
              height: 160,
              borderRadius: 80,
              background: 'rgba(255,255,255,.1)',
              border: '3px solid rgba(255,255,255,.22)',
              display: 'flex',
              alignItems: 'center',
              gap: 26,
              padding: '0 40px',
              fontSize: 58,
              fontWeight: 700,
              opacity: fadeIn(f, CHIP(i), 3),
              transform: `scale(${s}) rotate(${(i % 2 ? 2 : -2) * (1 - s)}deg)`,
            }}
          >
            <span style={{ fontSize: 80 }}>{emoji}</span> {name}
          </div>
        );
      })}
      <Slam top={1380} delay={cue[1] + 50} size={86} style={{ color: C.mint, whiteSpace: 'nowrap', left: 0, right: 0 }}>
        Wahaan chalta hai ✅
      </Slam>
    </Scene>
  );
};

// ---- 9. End card ----

export const EndCard = ({ cue }: Cues) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const PILL = cue[1] + 20;
  const logo = pop(f, fps, 0, 180);
  const pill = pop(f, fps, PILL, 200);
  const pulse = 1 + Math.max(0, Math.sin((f - PILL - 14) / 7)) * 0.035 * (f > PILL + 14 ? 1 : 0);
  return (
    <Scene>
      <Sfx at={2} name="chime" volume={0.4} />
      <Sfx at={PILL} name="pop" volume={0.5} />
      <div style={{ position: 'absolute', left: 390, top: 470, transform: `scale(${logo})` }}>
        <Logo size={300} style={{ borderRadius: 68, boxShadow: '0 30px 70px rgba(0,0,0,.4)' }} />
      </div>
      <Slam top={820} delay={6} size={130}>
        Regular<span style={{ color: C.mint }}>hood</span>
      </Slam>
      <Rise top={1000} delay={10} size={54}>
        Har customer ko <b style={{ color: C.amber }}>regular</b> banao
      </Rise>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1190, textAlign: 'center', transform: `scale(${pill * pulse})`, opacity: fadeIn(f, PILL, 3) }}>
        <span style={{ display: 'inline-block', background: C.amber, color: C.bgBottom, fontSize: 76, fontWeight: 800, padding: '30px 70px', borderRadius: 100, boxShadow: '0 20px 60px rgba(240,162,2,.35)' }}>
          regularhood.in
        </span>
      </div>
      <Rise top={1420} delay={cue[0]} size={52} style={{ color: '#fff', fontWeight: 700 }}>
        Free · 1 minute me setup
      </Rise>
      <Rise top={1560} delay={PILL + 16} size={44}>
        Link bio me 👆
      </Rise>
    </Scene>
  );
};
