import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, PHONE, REWARD, useShop } from './theme';
import {
  ADD_VISIT,
  Btn,
  Center,
  ChatIcon,
  CheckIcon,
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
  TopBar,
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

// ---- 1. Hook: every kind of shop gets new customers. How many come back? ----

const KINDS = [
  ['🧁', 'Café'],
  ['✂️', 'Salon'],
  ['🛒', 'Kirana'],
  ['🥐', 'Bakery'],
  ['🏋️', 'Gym'],
  ['🍬', 'Mithai'],
];

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
  const shop = useShop();
  const chip = (i: number) => cue[0] + 2 + i * 8;
  const CROWD = cue[1];
  const DROP = cue[2] + 6;
  const away = interpolate(f, [CROWD - 6, CROWD + 4], [0, 1], { ...clamp, easing: (v) => v * v });
  return (
    <Scene>
      {KINDS.map((_, i) => (
        <Sfx key={i} at={chip(i)} name="pop" volume={0.25} />
      ))}
      {Array.from({ length: 10 }, (_, i) => (
        <Sfx key={i} at={CROWD + 2 + i * 2} name="pop" volume={0.15} />
      ))}
      <Sfx at={DROP} name="stamp" volume={0.5} />
      <Slam top={300} delay={2} out={CROWD - 6} size={96}>
        Aapki dukaan <span style={{ color: C.amber }}>koi bhi</span> ho…
      </Slam>
      {KINDS.map(([emoji, name], i) => {
        const s = pop(f, fps, chip(i), 240);
        const mine = name === shop.kind;
        return (
          <div
            key={name}
            style={{
              position: 'absolute',
              left: i % 2 ? 560 : 90,
              top: 640 + Math.floor(i / 2) * 200,
              width: 430,
              height: 160,
              borderRadius: 80,
              background: mine ? C.amber : 'rgba(255,255,255,.1)',
              color: mine ? C.bgBottom : '#fff',
              border: `3px solid ${mine ? C.amber : 'rgba(255,255,255,.22)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: 26,
              padding: '0 40px',
              fontSize: 58,
              fontWeight: 700,
              opacity: fadeIn(f, chip(i), 3) * (1 - away),
              transform: `translateY(${-away * 120}px) scale(${s * (1 - away * 0.2)}) rotate(${(i % 2 ? 2 : -2) * (1 - s)}deg)`,
            }}
          >
            <span style={{ fontSize: 80 }}>{emoji}</span> {name}
          </div>
        );
      })}
      <Slam top={250} delay={CROWD} out={DROP - 4}>
        Roz <span style={{ color: C.amber }}>naye</span> customer aate hain 🙂
      </Slam>
      <Slam top={250} delay={DROP} size={96}>
        Wapas kitne aate hain? <span style={{ display: 'inline-block' }}>🤔</span>
      </Slam>
      {f >= CROWD &&
        Array.from({ length: 10 }, (_, i) => {
          const back = BACK.includes(i);
          const s = pop(f, fps, CROWD + 2 + i * 2, 240);
          const d = interpolate(f, [DROP, DROP + 10], [0, 1], clamp);
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: 80 + (i % 5) * 186,
                top: 820 + Math.floor(i / 5) * 270,
                opacity: back ? 1 : 1 - d * 0.85,
                transform: `translateY(${back ? -d * 20 : d * 60}px) scale(${s * (back ? 1 + d * 0.12 : 1 - d * 0.15)})`,
              }}
            >
              <Person color={back && d > 0 ? C.mint : C.soft} />
            </div>
          );
        })}
      <Rise top={1460} delay={DROP + 8} size={54}>
        10 me se <b style={{ color: C.red }}>sirf 3</b>. Baaki bhool gaye.
      </Rise>
    </Scene>
  );
};

// ---- 2. Logo reveal: a row of stamps → Regularhood ----

export const LogoReveal = ({ cue }: Cues) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = cue[1] - 4;
  const fills = [0, 1, 2, 3, 4].map((i) => cue[0] + 6 + Math.round(((at - cue[0] - 14) * i) / 4));
  const rise = interpolate(f, [at - 4, at + 8], [0, 1], { ...clamp, easing: (v) => 1 - Math.pow(1 - v, 3) });
  const logo = pop(f, fps, at, 180);
  const stampsOn = fills.filter((t) => f >= t).length;
  const landing = stampsOn - 1;
  const landP = pop(f, fps, fills[Math.max(0, landing)], 320);
  const word = 'Regularhood';
  return (
    <Scene>
      {fills.map((t, i) => (
        <Sfx key={i} at={t} name={i === 4 ? 'ding' : 'stamp'} volume={i === 4 ? 0.3 : 0.35} />
      ))}
      <Sfx at={at} name="chime" volume={0.45} />
      <Slam top={300} delay={2} out={at - 4} size={88}>
        Unhe <span style={{ color: C.mint }}>regular</span> banane ka aasaan tareeka
      </Slam>
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
      <Rise top={1200} delay={at + 24} size={48}>
        Digital <b style={{ color: C.amber }}>stamp card</b>, har dukaan ke liye
      </Rise>
    </Scene>
  );
};

// ---- 3. Setup: the shop's name and the reward, and it's ready ----

const Field = ({ top, label, value, active, cursor }: { top: number; label: string; value: string; active: boolean; cursor: boolean }) => (
  <>
    <div style={{ position: 'absolute', left: 40, top, fontSize: 28, fontWeight: 600, color: C.muted }}>{label}</div>
    <div
      style={{
        position: 'absolute',
        left: 36,
        right: 36,
        top: top + 46,
        height: 104,
        borderRadius: 22,
        background: '#fff',
        border: `3px solid ${active ? C.brand : C.lineStrong}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 28px',
        fontSize: 42,
        fontWeight: 700,
      }}
    >
      {value}
      {cursor && <span style={{ width: 4, height: 50, background: C.brand, marginLeft: 4 }} />}
    </div>
  </>
);

const START_BTN: [number, number] = [332, 905];

const SetupScreen = ({ name, reward, typingName, typingReward, press, done, t }: { name: string; reward: string; typingName: boolean; typingReward: boolean; press: number; done: number; t: number }) => {
  const { fps } = useVideoConfig();
  const blink = Math.floor(t / 8) % 2 === 0;
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 150, background: '#fff', borderBottom: `2px solid ${C.line}`, display: 'flex', alignItems: 'flex-end', padding: '0 36px 22px', gap: 16 }}>
        <Logo size={56} style={{ borderRadius: 14 }} />
        <div style={{ fontSize: 32, fontWeight: 700 }}>Regularhood</div>
      </div>
      <Center top={190} size={44} weight={800}>Set up your shop</Center>
      <Field top={280} label="Shop name" value={name} active={typingName} cursor={typingName && blink} />
      <Field top={470} label="Reward" value={reward} active={typingReward} cursor={typingReward && blink} />
      <div style={{ position: 'absolute', left: 40, top: 680, fontSize: 32, fontWeight: 600, color: C.muted }}>
        Every <b style={{ color: C.ink, border: `3px solid ${C.lineStrong}`, borderRadius: 14, padding: '2px 18px', margin: '0 8px' }}>5</b> visits
      </div>
      <Btn top={START_BTN[1] - 68} bg={C.brand} h={136} size={46} scale={press}>
        Start
      </Btn>
      {done > 0 && (
        <AbsoluteFill style={{ background: C.appBg, opacity: done }}>
          <div style={{ position: 'absolute', left: 257, top: 380, width: 150, height: 150, borderRadius: '50%', background: C.brand, display: 'grid', placeItems: 'center', transform: `scale(${pop(t, fps, 0, 220)})` }}>
            <CheckIcon size={80} />
          </div>
          <Center top={570} size={56} weight={800}>Ready!</Center>
          <Center top={660} size={34} color={C.muted}>Every 5 visits → {reward}</Center>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

export const Setup = ({ cue }: Cues) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const shop = useShop();
  const up = pop(f, fps, 0, 120);
  const NAME_AT = cue[1] - 2;
  const NAME_EVERY = Math.max(1, Math.min(2, 26 / shop.name.length));
  const nameDone = NAME_AT + shop.name.length * NAME_EVERY;
  const REWARD_AT = Math.max(nameDone + 6, cue[1] + 40);
  const rewardDone = REWARD_AT + REWARD.length * 2;
  const TAP = rewardDone + 10;
  const DONE = TAP + 6;
  const name = shop.name.slice(0, Math.max(0, Math.floor((f - NAME_AT) / NAME_EVERY)));
  const reward = REWARD.slice(0, Math.max(0, Math.floor((f - REWARD_AT) / 2)));
  const press = interpolate(f - TAP, [0, 3, 7], [1, 0.94, 1], clamp);
  return (
    <Scene>
      {Array.from({ length: Math.ceil(shop.name.length / 2) }, (_, i) => (
        <Sfx key={i} at={NAME_AT + i * 2 * NAME_EVERY} name="key" volume={0.3} />
      ))}
      {Array.from({ length: Math.ceil(REWARD.length / 2) }, (_, i) => (
        <Sfx key={`r${i}`} at={REWARD_AT + i * 4} name="key" volume={0.3} />
      ))}
      <Sfx at={TAP} name="tap" volume={0.6} />
      <Sfx at={DONE} name="ding" volume={0.4} />
      <Slam top={150} size={92}>
        Setup = <span style={{ color: C.mint }}>1 minute</span> ⏱️
      </Slam>
      <Phone y={interpolate(up, [0, 1], [1300, 0])}>
        <SetupScreen
          name={name}
          reward={reward}
          typingName={f < REWARD_AT}
          typingReward={f >= REWARD_AT && f < TAP}
          press={press}
          done={fadeIn(f, DONE, 4)}
          t={f - DONE}
        />
        <Touch from={[460, 1150]} to={START_BTN} start={TAP - 14} arrive={TAP - 1} press={TAP} />
      </Phone>
      <Rise top={380} delay={cue[1] + 10} size={46} style={{ color: '#fff', fontWeight: 700 }}>
        Dukaan ka naam + reward. <span style={{ color: C.amber }}>Bas!</span>
      </Rise>
    </Scene>
  );
};

// ---- 4. Customer comes, type their number ----

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
        Customer aaye? Bas <span style={{ color: C.amber }}>number</span> daalo
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
  const TAP = Math.max(14, cue[0] + 22);
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

const ChatHeader = () => (
  <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 190, background: '#008069', color: '#fff', display: 'flex', alignItems: 'flex-end', gap: 18, padding: '0 28px 24px' }}>
    <div style={{ fontSize: 44, lineHeight: 1 }}>‹</div>
    <Logo size={70} style={{ borderRadius: 35 }} />
    <div>
      <div style={{ fontSize: 34, fontWeight: 700 }}>{useShop().name}</div>
      <div style={{ fontSize: 24, opacity: 0.85 }}>online</div>
    </div>
  </div>
);

const ChatInput = () => (
  <div style={{ position: 'absolute', left: 20, right: 20, bottom: 30, display: 'flex', gap: 14, alignItems: 'center' }}>
    <div style={{ flex: 1, height: 90, borderRadius: 45, background: '#fff', fontSize: 30, color: C.muted, display: 'flex', alignItems: 'center', padding: '0 32px' }}>Message</div>
    <div style={{ width: 90, height: 90, borderRadius: 45, background: '#00a884' }} />
  </div>
);

const WhatsAppChat = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const shop = useShop();
  const msg = pop(f, fps, MSG_AT, 220);
  const typing = f >= 10 && f < MSG_AT;
  return (
    <AbsoluteFill style={{ background: '#efeae2' }}>
      <ChatHeader />
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
          <b>{shop.name}</b>: विज़िट 4/5 ✓ बस 1 और विज़िट, फिर {REWARD}! 🎁
          <br />
          आपका कार्ड: <span style={{ color: '#027eb5', textDecoration: 'underline' }}>regularhood.in/w/k3x9p</span>
          <div style={{ textAlign: 'right', fontSize: 22, color: C.muted }}>10:42</div>
        </div>
      )}
      <ChatInput />
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
        <div style={{ fontSize: 46, fontWeight: 800, marginTop: 16 }}>{useShop().name}</div>
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
  const GIVE_TAP = cue[1] + 16;
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
      <Rise top={380} delay={cue[0] + 20} size={46} style={{ color: '#fff', fontWeight: 700 }}>
        Yaad rakhne ki tension <span style={{ color: C.amber }}>khatam</span>
      </Rise>
      <Confetti at={GIVEN} />
    </Scene>
  );
};

// ---- 8. A customer stopped coming: one tap, a WhatsApp reminder ----

const AWAY = [
  { phone: '98765 43210', stamps: 4, days: 34 },
  { phone: '99110 27384', stamps: 2, days: 41 },
  { phone: '90041 66518', stamps: 3, days: 52 },
];
const REMIND_BTN: [number, number] = [514, 424];

const CustomersScreen = ({ press }: { press: number }) => (
  <AbsoluteFill>
    <TopBar />
    <div style={{ position: 'absolute', left: 36, top: 180, fontSize: 44, fontWeight: 800 }}>Customers</div>
    <div style={{ position: 'absolute', left: 36, top: 250, display: 'flex', gap: 12, fontSize: 24, fontWeight: 600 }}>
      <span style={{ border: `2px solid ${C.line}`, borderRadius: 30, padding: '6px 18px', color: C.muted }}>All</span>
      <span style={{ background: C.ink, color: '#fff', borderRadius: 30, padding: '6px 18px' }}>Not seen 30 days</span>
    </div>
    {AWAY.map((c, i) => (
      <div
        key={c.phone}
        style={{ position: 'absolute', left: 36, right: 36, top: 340 + i * 190, height: 170, borderRadius: 26, background: '#fff', border: `2px solid ${C.line}`, padding: '26px 28px' }}
      >
        <div style={{ fontSize: 34, fontWeight: 700 }}>{c.phone}</div>
        <div style={{ fontSize: 26, color: C.muted, marginTop: 6 }}>
          {c.stamps}/5 stamps · <span style={{ color: C.red }}>{c.days} days ago</span>
        </div>
        <div
          style={{
            position: 'absolute',
            right: 24,
            top: 46,
            height: 76,
            borderRadius: 20,
            background: C.whatsapp,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 24px',
            fontSize: 28,
            fontWeight: 700,
            transform: `scale(${i === 0 ? press : 1})`,
          }}
        >
          <ChatIcon size={30} /> Remind
        </div>
      </div>
    ))}
  </AbsoluteFill>
);

const ReminderChat = ({ t, sent }: { t: number; sent: boolean }) => {
  const { fps } = useVideoConfig();
  const up = pop(t, fps, 0, 140);
  const shop = useShop();
  return (
    <AbsoluteFill style={{ background: '#efeae2', transform: `translateY(${interpolate(up, [0, 1], [1300, 0])}px)` }}>
      <ChatHeader />
      <div
        style={{
          position: 'absolute',
          right: 28,
          top: sent ? 296 : 'auto',
          bottom: sent ? 'auto' : 140,
          width: 560,
          background: sent ? '#d9fdd3' : '#fff',
          borderRadius: sent ? '26px 6px 26px 26px' : 26,
          padding: '22px 26px 16px',
          fontSize: 30,
          lineHeight: 1.5,
          boxShadow: '0 2px 4px rgba(0,0,0,.08)',
        }}
      >
        We miss you at {shop.name}! 👋 Only 1 more visit for {REWARD}!
        <br />
        Your card: <span style={{ color: '#027eb5', textDecoration: 'underline' }}>regularhood.in/w/k3x9p</span>
        {sent && <div style={{ textAlign: 'right', fontSize: 22, color: C.muted }}>10:45 ✓✓</div>}
      </div>
      <ChatInput />
    </AbsoluteFill>
  );
};

export const Remind = ({ cue }: Cues) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slide = pop(f, fps, 0, 140);
  const TAP = cue[1] + 4;
  const CHAT = TAP + 6;
  const SEND = cue[1] + 40;
  const SENT = SEND + 4;
  const press = interpolate(f - TAP, [0, 3, 7], [1, 0.94, 1], clamp);
  return (
    <Scene>
      <Sfx at={TAP} name="tap" volume={0.6} />
      <Sfx at={CHAT} name="whoosh" volume={0.3} />
      <Sfx at={SEND} name="tap" volume={0.6} />
      <Sfx at={SENT} name="pop" volume={0.5} />
      <Slam top={150} size={88} out={cue[1] - 4} style={{ whiteSpace: 'nowrap', left: 0, right: 0 }}>
        Customer <span style={{ color: C.red }}>gayab</span>? 👀
      </Slam>
      <Slam top={150} size={92} delay={cue[1]}>
        1 tap = <span style={{ color: C.mint }}>reminder</span>
      </Slam>
      <Phone x={interpolate(slide, [0, 1], [1100, 0])} rot={interpolate(slide, [0, 1], [8, 0])}>
        <CustomersScreen press={press} />
        <Touch from={[420, 1000]} to={REMIND_BTN} start={TAP - 14} arrive={TAP - 1} press={TAP} />
        {f >= CHAT && <ReminderChat t={f - CHAT} sent={f >= SENT} />}
        {f >= CHAT && <Touch from={[420, 1000]} to={[600, 1209]} start={SEND - 12} arrive={SEND - 1} press={SEND} />}
      </Phone>
      <Rise top={380} delay={cue[0] + 16} size={46} style={{ color: '#fff', fontWeight: 700 }}>
        App batata hai kaun nahi aaya
      </Rise>
    </Scene>
  );
};

// ---- 9. The counter poster, free ----

const PosterSheet = () => {
  const shop = useShop();
  return (
    <div style={{ width: 620, height: 877, borderRadius: 18, overflow: 'hidden', background: 'linear-gradient(180deg,#fff,#f6efdc)', color: C.ink, position: 'relative', boxShadow: '0 50px 100px rgba(0,0,0,.5)' }}>
      <div style={{ height: 70, background: `repeating-linear-gradient(90deg, ${C.brand} 0 52px, #fff 52px 104px)`, borderRadius: '0 0 30px 30px' }} />
      <div style={{ textAlign: 'center', fontSize: shop.name.length > 14 ? 50 : 60, fontWeight: 900, letterSpacing: -1, marginTop: 50, lineHeight: 1.05, padding: '0 30px' }}>{shop.name}</div>
      <div style={{ textAlign: 'center', fontSize: 40, fontWeight: 900, color: C.brand, marginTop: 24 }}>Every 5 visits</div>
      <div style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, color: C.brand }}>हर 5 विज़िट पर</div>
      <div style={{ margin: '26px 44px 0', background: '#fff', borderRadius: 30, padding: '30px 0 26px', boxShadow: '0 12px 30px rgba(4,38,26,.14)' }}>
        <Stamps on={4} size={70} gap={12} />
        <div style={{ textAlign: 'center', fontSize: 52, fontWeight: 900, marginTop: 18 }}>{REWARD} 🎁</div>
      </div>
      <div style={{ textAlign: 'center', fontSize: 30, fontWeight: 800, marginTop: 34 }}>Just tell your phone number</div>
      <div style={{ textAlign: 'center', fontSize: 26, fontWeight: 700, marginTop: 6 }}>काउंटर पर बस अपना फ़ोन नंबर बताएँ</div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 64, background: '#f6efdc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px', fontSize: 18, fontWeight: 700 }}>
        <span>No app · Card on WhatsApp</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Logo size={34} style={{ borderRadius: 9 }} /> Regularhood
        </span>
      </div>
    </div>
  );
};

export const Poster = ({ cue }: Cues) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drop = pop(f, fps, 4, 110);
  const FREE = cue[0] + 36;
  const badge = pop(f, fps, FREE, 260);
  return (
    <Scene>
      <Sfx at={4} name="whoosh" volume={0.4} />
      <Sfx at={FREE} name="stamp" volume={0.6} />
      <Slam top={150} size={88} style={{ whiteSpace: 'nowrap', left: 0, right: 0 }}>
        Counter <span style={{ color: C.amber }}>poster</span> bhi 🖨️
      </Slam>
      <div style={{ position: 'absolute', left: 230, top: 470, transform: `translateY(${interpolate(drop, [0, 1], [1500, 0])}px) rotate(${interpolate(drop, [0, 1], [12, -3])}deg)` }}>
        <PosterSheet />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 770,
          top: 330,
          width: 230,
          height: 230,
          borderRadius: '50%',
          background: C.amber,
          color: C.bgBottom,
          display: 'grid',
          placeItems: 'center',
          fontSize: 70,
          fontWeight: 900,
          boxShadow: '0 20px 50px rgba(0,0,0,.4)',
          opacity: fadeIn(f, FREE, 2),
          transform: `scale(${interpolate(badge, [0, 1], [2.2, 1])}) rotate(12deg)`,
        }}
      >
        FREE
      </div>
      <Rise top={1430} delay={FREE + 6} size={50}>
        Print karo, counter pe lagao
      </Rise>
    </Scene>
  );
};

// ---- 10. End card ----

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
      <Sfx at={cue[0] + 20} name="stamp" volume={0.5} />
      <Sfx at={PILL} name="pop" volume={0.5} />
      <div style={{ position: 'absolute', left: 415, top: 300, transform: `scale(${logo})` }}>
        <Logo size={250} style={{ borderRadius: 58, boxShadow: '0 30px 70px rgba(0,0,0,.4)' }} />
      </div>
      <Slam top={590} delay={6} size={120}>
        Regular<span style={{ color: C.mint }}>hood</span>
      </Slam>
      <Slam top={800} delay={cue[0] + 20} size={76}>
        Pehle <Hl>50 customers</Hl>
        <br />
        bilkul <span style={{ color: C.mint }}>FREE</span>
      </Slam>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1150, textAlign: 'center', transform: `scale(${pill * pulse})`, opacity: fadeIn(f, PILL, 3) }}>
        <span style={{ display: 'inline-block', background: C.amber, color: C.bgBottom, fontSize: 76, fontWeight: 800, padding: '30px 70px', borderRadius: 100, boxShadow: '0 20px 60px rgba(240,162,2,.35)' }}>
          regularhood.in
        </span>
      </div>
      <Rise top={1380} delay={PILL + 10} size={50} style={{ color: '#fff', fontWeight: 700 }}>
        1 minute me setup · Aaj hi shuru karo
      </Rise>
    </Scene>
  );
};
