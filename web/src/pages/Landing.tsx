import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import QRCode from 'qrcode';
import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react';
import {
  ArrowRight,
  Check,
  Database,
  Download,
  Gift,
  Languages,
  Lock,
  MessageCircle,
  Phone,
  QrCode,
  ScanLine,
  Scissors,
  ScrollText,
  ShieldCheck,
  ShoppingBasket,
  Coffee,
  Cake,
  Pill,
  Smartphone,
  Ticket,
  TrendingUp,
} from 'lucide-react';
import { watchSections } from '../analytics';
import { getToken } from '../api';
import { LogoMark } from '../ui';
import '../landing.css';

// regularhood.in — the homepage for shop owners. The shop app itself lives at /app.
// The story is told with an example shop the visitor picks (a salon or a kirana store); see EXAMPLES. Its phone screens are real
// screenshots of the app with demo data, and figures on the drawn dashboard card are marked as examples.
// Motion: everything is readable at rest; animations only replay what the product does, and stop for reduced motion.
// CSS plays the one-off moments; Motion (springs, scroll progress) drives anything that follows the pointer or the scroll.

const FONTS = 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=Martian+Mono:wght@400;600&display=swap';
const SIGNUP = '/app#signup';

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function useFonts() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONTS}"]`)) return;
    document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: FONTS }));
  }, []);
}

/** True once the element has scrolled into view (and stays true). */
function useInView<T extends Element>(threshold = 0.35) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (!('IntersectionObserver' in window)) return setSeen(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen] as const;
}

/** True while the media query matches. The prerendered page (see scripts/prerender.mjs) is the narrow layout, so it
 * starts false while hydrating and switches right after. */
function useMedia(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mq = matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => matchMedia(query).matches,
    () => false,
  );
}

/** A number that counts from `from` to `to` once `run` turns true. Shows the final value at rest. */
function CountUp({ from = 0, to, run, delay = 0, ms = 1100, format = (n: number) => n.toLocaleString('en-IN') }: {
  from?: number;
  to: number;
  run: boolean;
  delay?: number;
  ms?: number;
  format?: (n: number) => string;
}) {
  const [value, setValue] = useState(to);
  useEffect(() => {
    // At rest (and when the example shop changes without animating) it shows the final value.
    if (!run || reducedMotion()) return setValue(to);
    let frame = 0;
    const timer = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / ms);
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(Math.round(from + (to - from) * eased));
        if (p < 1) frame = requestAnimationFrame(tick);
      };
      setValue(from);
      frame = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [run, from, to, delay, ms]);
  return <span className="lp-num">{format(value)}</span>;
}

/** A drawn QR-like pattern for the illustrations — deliberately not scannable. */
function FakeQr({ seed }: { seed: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const n = 25;
    const s = canvas.width / n;
    let x = seed;
    const rand = () => (x = (x * 1103515245 + 12345) % 2147483648) / 2147483648;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f2e24';
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const finder = (i < 8 && j < 8) || (i > n - 9 && j < 8) || (i < 8 && j > n - 9);
        if (!finder && rand() > 0.52) ctx.fillRect(i * s, j * s, s, s);
      }
    for (const [cx, cy] of [
      [0, 0],
      [n - 7, 0],
      [0, n - 7],
    ]) {
      ctx.fillRect(cx * s, cy * s, 7 * s, 7 * s);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect((cx + 1) * s, (cy + 1) * s, 5 * s, 5 * s);
      ctx.fillStyle = '#0f2e24';
      ctx.fillRect((cx + 2) * s, (cy + 2) * s, 3 * s, 3 * s);
    }
  }, [seed]);
  return <canvas ref={ref} width={175} height={175} aria-hidden="true" />;
}

// ---------------------------------------------------------------- nav

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  // Read after hydrating: the prerendered page is the signed-out one.
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => setSignedIn(Boolean(getToken())), []);
  useEffect(() => {
    const onScroll = () => setScrolled(scrollY > 8);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="lp-wrap">
        <a className="lp-logo" href="/" aria-label="Regularhood home">
          <span className="lp-logo-mark" aria-hidden="true">
            <LogoMark />
          </span>
          Regularhood
        </a>
        <nav className="lp-nav-links" aria-label="Sections">
          <a href="#how" data-track="nav: How it works">
            How it works
          </a>
          <a href="#app" data-track="nav: The app">
            The app
          </a>
          <a href="#counter" data-track="nav: At the counter">
            At the counter
          </a>
          <a href="#pricing" data-track="nav: Pricing">
            Pricing
          </a>
          <a href="#faq" data-track="nav: FAQ">
            FAQ
          </a>
        </nav>
        <div className="lp-nav-end">
          {signedIn ? (
            <a className="lp-btn lp-btn-ink" href="/app" data-track="nav: Open your shop">
              Open your shop <ArrowRight size={16} />
            </a>
          ) : (
            <>
              <a className="lp-login" href="/app" data-track="nav: Log in">
                Log in
              </a>
              <a className="lp-btn lp-btn-ink" href={SIGNUP} data-track="nav: Start free">
                Start free
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------- the example shop

// The page tells its story with one made-up shop at a time, and the visitor picks one like theirs: a salon (a visit every
// few weeks, bigger bills), a kirana store (near-daily), a café, a sweet shop (festival spikes) or a pharmacy (monthly refills). The phone screens are real screenshots of the app with each
// shop's demo data; the drawn bill, card, messages and figures match them.
type ExampleKey = 'salon' | 'kirana' | 'cafe' | 'sweets' | 'pharmacy';
type Example = {
  key: ExampleKey;
  label: string;
  icon: typeof Scissors;
  shop: string;
  time: string;
  customer: string;
  bill: readonly (readonly [string, number])[];
  total: number;
  points: number; // for this bill
  before: number; // the customer's points before it
  after: number;
  reward: string; // the next reward on their card
  toReward: number; // ₹ more to get it
  meter: string;
  place: string; // "Here it is at …"
  habit: {
    visits: number[][]; // days of the week with a visit, for 12 weeks
    first: [number, number];
    today: [number, number];
    label: string;
    milestones: readonly (readonly [string, string])[];
    firstVisit: string;
    said: string;
  };
  later: string;
  proof: { sales: number; customers: number; visits: number; trend: number; share: number; wonBack: number; rewards: number };
};

const EXAMPLES: Record<ExampleKey, Example> = {
  salon: {
    key: 'salon',
    label: 'Salon',
    icon: Scissors,
    shop: 'Kesh Unisex Salon',
    time: '6:10 pm',
    customer: 'Priya',
    bill: [
      ['Haircut', 350],
      ['Hair spa', 600],
      ['Threading', 50],
    ],
    total: 1000,
    points: 100,
    before: 220,
    after: 320,
    reward: 'Free haircut',
    toReward: 800,
    meter: '80%',
    place: 'at a salon',
    habit: {
      visits: [[2], [], [], [4], [], [], [2, 6], [], [], [3], [], [1, 5]],
      first: [0, 2],
      today: [11, 5],
      label: 'Priya at the salon · each dot is a visit · Aug → Oct',
      milestones: [
        ['Week 1', 'First haircut. Scans the bill QR and gets welcome points.'],
        ['Week 7', 'Back for threading, then a hair spa. A free haircut is close, and the card shows it.'],
        ['Week 12', 'Every three weeks, same chair. Doesn’t try the salon next door.'],
      ],
      firstVisit: 'a ₹350 haircut',
      said: '“Same as last time, didi.”',
    },
    later: '5 weeks later',
    proof: { sales: 124600, customers: 86, visits: 131, trend: 18, share: 46, wonBack: 12, rewards: 19 },
  },
  kirana: {
    key: 'kirana',
    label: 'Kirana store',
    icon: ShoppingBasket,
    shop: 'Gupta General Store',
    time: '7:25 pm',
    customer: 'Ravi',
    bill: [
      ['Atta 5 kg', 265],
      ['Toor dal 1 kg', 165],
      ['Oil 1 L', 150],
      ['Milk ×4', 68],
    ],
    total: 648,
    points: 32,
    before: 236,
    after: 268,
    reward: 'Free 1 L oil',
    toReward: 640,
    meter: '89%',
    place: 'at a kirana store',
    habit: {
      visits: [[2], [], [5], [1, 5], [3], [1, 4, 6], [0, 3, 5], [1, 2, 4, 6], [0, 2, 3, 5], [0, 1, 3, 4, 6], [0, 1, 2, 4, 5, 6], [0, 1, 2, 3, 4, 5]],
      first: [0, 2],
      today: [11, 5],
      label: 'Ravi at the store · each dot is a day · Aug → Oct',
      milestones: [
        ['Week 1', 'Milk and bread. Scans the bill QR and gets welcome points.'],
        ['Week 6', 'Buys the monthly ration here too. Free oil is close, and the card shows it.'],
        ['Week 12', 'Sends his list on WhatsApp and picks it up on the way home.'],
      ],
      firstVisit: '₹68 of milk',
      said: '“Bhaiya, the usual list.”',
    },
    later: '31 days later',
    proof: { sales: 218400, customers: 152, visits: 1640, trend: 11, share: 58, wonBack: 9, rewards: 31 },
  },
  cafe: {
    key: 'cafe',
    label: 'Café',
    icon: Coffee,
    shop: 'Little Bean Café',
    time: '4:40 pm',
    customer: 'Aditi',
    bill: [
      ['Cold coffee', 180],
      ['Sandwich', 160],
      ['Brownie', 110],
    ],
    total: 450,
    points: 45,
    before: 120,
    after: 165,
    reward: 'Free cold coffee',
    toReward: 350,
    meter: '82%',
    place: 'at a café',
    habit: {
      visits: [[4], [], [5], [], [2, 5], [5], [1, 5], [3, 5], [5, 6], [2, 5], [1, 3, 5], [2, 5]],
      first: [0, 4],
      today: [11, 5],
      label: 'Aditi at the café · each dot is a visit · Aug → Oct',
      milestones: [
        ['Week 1', 'First cold coffee. Scans the bill QR and gets welcome points.'],
        ['Week 5', 'Fridays with friends now. A free cold coffee is close, and the card shows it.'],
        ['Week 12', 'Has a usual table and a usual order.'],
      ],
      firstVisit: 'a ₹180 cold coffee',
      said: '“One cold coffee, less sugar.”',
    },
    later: '3 weeks later',
    proof: { sales: 96800, customers: 210, visits: 320, trend: 14, share: 52, wonBack: 15, rewards: 44 },
  },
  sweets: {
    key: 'sweets',
    label: 'Sweets & bakery',
    icon: Cake,
    shop: 'Mishra Sweets & Bakery',
    time: '8:05 pm',
    customer: 'Sunil',
    bill: [
      ['Kaju katli', 450],
      ['Cake ½ kg', 350],
      ['Samosa ×4', 80],
    ],
    total: 880,
    points: 88,
    before: 212,
    after: 300,
    reward: 'Free ½ kg cake',
    toReward: 1000,
    meter: '75%',
    place: 'at a sweet shop',
    habit: {
      visits: [[6], [], [6], [], [3, 6], [], [6], [1, 3, 4, 5], [6], [], [6], [2, 6]],
      first: [0, 6],
      today: [11, 6],
      label: 'Sunil at the sweet shop · each dot is a visit · Aug → Oct',
      milestones: [
        ['Week 1', 'Sunday samosas. Scans the bill QR and gets welcome points.'],
        ['Week 8', 'Every Diwali box for the family, from here. A free cake is close.'],
        ['Week 12', 'Every birthday cake in the family comes from here now.'],
      ],
      firstVisit: '₹80 of samosas',
      said: '“Bhaiya, the usual box.”',
    },
    later: '4 weeks later',
    proof: { sales: 148200, customers: 260, visits: 690, trend: 31, share: 49, wonBack: 22, rewards: 38 },
  },
  pharmacy: {
    key: 'pharmacy',
    label: 'Pharmacy',
    icon: Pill,
    shop: 'City Care Pharmacy',
    time: '10:15 am',
    customer: 'Kamla',
    bill: [
      ['BP tablets', 420],
      ['Test strips', 550],
      ['Vitamin D3', 130],
    ],
    total: 1100,
    points: 55,
    before: 145,
    after: 200,
    reward: '₹100 off your bill',
    toReward: 1000,
    meter: '80%',
    place: 'at a pharmacy',
    habit: {
      visits: [[1], [], [], [], [1, 5], [], [], [], [1], [], [3], [1]],
      first: [0, 1],
      today: [11, 1],
      label: 'Kamla at the pharmacy · each dot is a visit · Aug → Oct',
      milestones: [
        ['Week 1', 'Her monthly BP medicine. Scans the bill QR and gets welcome points.'],
        ['Week 5', 'Back on the same date for the refill. ₹100 off is close, and the card shows it.'],
        ['Week 12', 'Every refill comes from here, and her son’s cough syrup too.'],
      ],
      firstVisit: 'a ₹420 refill',
      said: '“Same as last month, beta.”',
    },
    later: '5 weeks later',
    proof: { sales: 212000, customers: 180, visits: 410, trend: 9, share: 63, wonBack: 11, rewards: 27 },
  },
};

const ExampleContext = createContext<{ ex: Example; pick: (key: ExampleKey) => void }>({ ex: EXAMPLES.salon, pick: () => {} });
const useExample = () => useContext(ExampleContext);

/** The chosen example: ?shop=kirana in the link, then the visitor's last pick. The prerendered page is the salon. */
function ExampleProvider({ children }: { children: ReactNode }) {
  const [key, setKey] = useState<ExampleKey>('salon');
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = new URLSearchParams(location.search).get('shop') ?? localStorage.getItem('lp_example');
    } catch {
      // No storage: stay on the salon.
    }
    if (saved && saved in EXAMPLES) setKey(saved as ExampleKey);
  }, []);
  const pick = (k: ExampleKey) => {
    setKey(k);
    try {
      localStorage.setItem('lp_example', k);
    } catch {
      // Just not remembered.
    }
  };
  return <ExampleContext.Provider value={{ ex: EXAMPLES[key], pick }}>{children}</ExampleContext.Provider>;
}

/** "Pick a shop like yours": the examples, and a line saying they're only examples. */
function ExamplePicker({ className = '' }: { className?: string }) {
  const { ex, pick } = useExample();
  return (
    <div className={`lp-pick ${className}`}>
      <span className="lp-pick-label" id={`lp-pick-${className || 'hero'}`}>
        Pick a shop like yours
      </span>
      <div className="lp-pick-row" role="group" aria-labelledby={`lp-pick-${className || 'hero'}`}>
        {Object.values(EXAMPLES).map((e) => (
          <button
            key={e.key}
            className={e.key === ex.key ? 'on' : ''}
            aria-pressed={e.key === ex.key}
            onClick={() => pick(e.key)}
            data-track={`example: ${e.label}`}
          >
            <e.icon size={15} /> {e.label}
          </button>
        ))}
      </div>
      <small>Works for any shop that gives a bill: gyms, boutiques, tiffin services, juice bars…</small>
    </div>
  );
}

const inr = (n: number) => n.toLocaleString('en-IN');

// ---------------------------------------------------------------- hero


/** Offset of one piece of the hero scene: follows the pointer by `k` px and drifts by `drift` px as the hero scrolls away. */
function useDepth(px: MotionValue<number>, py: MotionValue<number>, scroll: MotionValue<number>, k: number, drift: number) {
  const x = useTransform(px, (v) => v * k);
  const y = useTransform(() => py.get() * k + scroll.get() * drift);
  return { x, y };
}

function Hero() {
  const { ex } = useExample();
  const [qr, setQr] = useState('');
  const [started, setStarted] = useState(false);
  const still = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    QRCode.toDataURL(`${location.origin}${SIGNUP}`, { width: 360, margin: 1, color: { dark: '#0f2e24' } }).then(setQr);
    const t = setTimeout(() => setStarted(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Pointer position over the hero, -0.5 … 0.5 from the centre, eased by a spring.
  const spring = { stiffness: 110, damping: 18, mass: 0.7 };
  const px = useSpring(useMotionValue(0), spring);
  const py = useSpring(useMotionValue(0), spring);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const scroll = useTransform(scrollYProgress, (v) => (still ? 0 : v));
  const rotateY = useTransform(px, (v) => v * 14);
  const rotateX = useTransform(() => py.get() * -10 + scroll.get() * 8);
  const receipt = useDepth(px, py, scroll, -22, 70);
  const standee = useDepth(px, py, scroll, 14, -30);
  const card = useDepth(px, py, scroll, 30, -110);

  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (still || e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <section
      ref={ref}
      className={`lp-wrap lp-hero ${started ? 'play' : ''}`}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      data-section="hero"
    >
      <div className="lp-hero-bg" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="lp-hero-copy">
        <p className="lp-eyebrow">Loyalty for neighbourhood shops</p>
        <h1>
          <span className="lp-h1-line">
            <span>From first</span>
          </span>{' '}
          <span className="lp-h1-line">
            <span>visit to</span>
          </span>{' '}
          <em className="lp-h1-line">
            <span>“the&nbsp;usual”.</span>
          </em>
        </h1>
        <p className="lp-lede">
          Regularhood turns walk-ins into regulars. Points on every bill, rewards your customers can see on their phone, and a nudge when they
          haven’t been back. Nothing for them to install.
        </p>
        <div className="lp-cta">
          <a className="lp-btn lp-btn-ink" href={SIGNUP} data-track="hero: Start free">
            Start free <ArrowRight size={18} />
          </a>
          <a className="lp-btn lp-btn-line" href="#how" data-track="hero: See how it works">
            See how it works
          </a>
        </div>
        <ul className="lp-hero-meta">
          <li>
            <Check size={16} /> Free to start
          </li>
          <li>
            <Check size={16} /> Set up in two minutes
          </li>
          <li>
            <Check size={16} /> Any phone with a camera
          </li>
        </ul>
        <ExamplePicker />
      </div>

      <motion.div
        className="lp-scene"
        role="img"
        aria-label={`A ₹${inr(ex.total)} bill at ${ex.shop} stamped with ${ex.points} points, the counter QR standee, and ${ex.customer}'s points card showing ${ex.after} points`}
        style={{ rotateX, rotateY, transformPerspective: 1100 }}
      >
        <motion.div className="lp-receipt" aria-hidden="true" style={receipt}>
          <h4>{ex.shop.toUpperCase()}</h4>
          <div className="lp-c">Today · {ex.time}</div>
          <hr />
          {ex.bill.map(([item, price], i) => (
            <div className="lp-row lp-line" style={{ '--i': i } as CSSProperties} key={`${ex.key}-${item}`}>
              <span>{item}</span>
              <span>₹{inr(price)}</span>
            </div>
          ))}
          <hr />
          <div className="lp-row lp-total">
            <span>TOTAL</span>
            <span>
              ₹<CountUp to={ex.total} run={started} delay={700} ms={700} />
            </span>
          </div>
          <div className="lp-stamp">+{ex.points} POINTS</div>
        </motion.div>
        <motion.div className="lp-standee" style={standee}>
          <b>Scan to try Regularhood</b>
          <div className="lp-qr-wrap">{qr ? <img src={qr} alt="QR code that opens Regularhood sign-up on your phone" /> : <FakeQr seed={11} />}</div>
          <span>Opens sign-up on your phone</span>
        </motion.div>
        <motion.div className="lp-walletcard" aria-hidden="true" style={card}>
          <small>
            {ex.shop} · {ex.customer}
          </small>
          <strong>
            <CountUp from={ex.before} to={ex.after} run={started} delay={2250} ms={800} />
          </strong>
          <p>
            Shop for ₹{inr(ex.toReward)} more → <b>{ex.reward}</b>
          </p>
          <div className="lp-meter">
            <i style={{ width: ex.meter }} />
          </div>
        </motion.div>
        {/* the stamp's points fly over to the customer's card */}
        <div className="lp-coins" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <i key={i} style={{ '--i': i } as CSSProperties} />
          ))}
        </div>
      </motion.div>
    </section>
  );
}

const SHOPS = ['Chai stalls', 'Bakeries', 'Salons', 'Sweet shops', 'Kirana stores', 'Cafés', 'Juice bars', 'Pharmacies', 'Gyms', 'Tiffin services'];

function ShopTypes() {
  // Two copies side by side; the strip slides by exactly one copy and starts over.
  const run = [...SHOPS, ...SHOPS];
  return (
    <div className="lp-marquee" aria-label={`Made for ${SHOPS.join(', ')}`}>
      <div className="lp-marquee-track" aria-hidden="true">
        {run.map((s, i) => (
          <span key={i}>
            {s}
            <i>★</i>
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- why + the habit

function Problem() {
  const { ex } = useExample();
  const { habit } = ex;
  const ref = useRef<HTMLDivElement>(null);
  // Scroll progress through the card → --p (0 … 1); CSS fills the dots and milestones from it (1 until the script sets it).
  // It moves only as fast as the visitor scrolls, so it stays on under reduced motion (as fades; see the CSS).
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.7'] });
  useMotionValueEvent(scrollYProgress, 'change', (v) => ref.current?.style.setProperty('--p', v.toFixed(3)));
  useEffect(() => ref.current?.style.setProperty('--p', String(scrollYProgress.get())), [scrollYProgress]);
  let n = 0;
  return (
    <section className="lp-section lp-wrap" id="why" data-section="why">
      <div className="lp-problem lp-reveal">
        <div>
          <p className="lp-kicker">Why it matters</p>
          <h2 className="lp-h2">A new customer pays, smiles and walks out. Whether they come back is left to luck.</h2>
        </div>
        <ul className="lp-today">
          <li>
            <b>Punch cards</b>
            <span>get lost in a wallet, or never come out of it.</span>
          </li>
          <li>
            <b>Discounts</b>
            <span>bring people once and cut into every bill after.</span>
          </li>
          <li>
            <b>Memory</b>
            <span>knows faces, not who hasn’t been in for a month.</span>
          </li>
          <li className="lp-us">
            <b>Regularhood</b>
            <span>remembers every customer for you, and gives them a reason to return.</span>
          </li>
        </ul>
      </div>

      <div ref={ref} className="lp-habit lp-reveal" style={{ '--n': habit.visits.flat().length } as CSSProperties}>
        <div className="lp-habit-head">
          <h3>What a regular looks like</h3>
          <span className="lp-mono">{habit.label}</span>
        </div>
        <div className="lp-habit-body">
          <div className="lp-cal" role="img" aria-label={`Twelve weeks of ${ex.customer}'s visits: ${habit.visits.flat().length} in all, from the first one to a habit`}>
            {habit.visits.map((days, w) => (
              <div className="lp-week" key={w}>
                {Array.from({ length: 7 }, (_, d) => {
                  const on = days.includes(d);
                  const at = (p: [number, number]) => w === p[0] && d === p[1];
                  const cls = ['lp-d', on && 'on', at(habit.first) && 'first', at(habit.today) && 'today'].filter(Boolean).join(' ');
                  return <span key={d} className={cls} style={on ? ({ '--i': n++ } as CSSProperties) : undefined} />;
                })}
              </div>
            ))}
          </div>
          <ol className="lp-milestones">
            {habit.milestones.map(([when, what]) => (
              <li key={`${ex.key}-${when}`}>
                <b>{when}</b>
                <span>{what}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="lp-habit-foot">
          <span>
            <b>First visit</b> · {habit.firstVisit}
          </span>
          <span className="lp-said">{habit.said}</span>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- how it works

function BillTimer({ run }: { run: boolean }) {
  const [left, setLeft] = useState(161);
  useEffect(() => {
    if (!run || reducedMotion()) return;
    setLeft(179);
    const t = setInterval(() => setLeft((s) => (s > 120 ? s - 1 : 179)), 1000);
    return () => clearInterval(t);
  }, [run]);
  return (
    <span className="lp-num">
      {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
    </span>
  );
}

const STEPS = [
  { title: 'Show the bill QR', text: 'Type the bill amount and turn your phone around. The customer scans it with their camera. New customers join right there.' },
  { title: 'Points land on their phone', text: 'Their card opens from a link: balance, the next reward in rupees, their history, and a QR for next time.' },
  { title: 'They come back', text: 'A reward to aim for, a birthday treat, and a one-tap WhatsApp message when someone has been away for a month.' },
];

/** The picture for one step. `play` replays what that step does on screen. */
function StepArt({ step, play }: { step: number; play: boolean }) {
  const { ex } = useExample();
  if (step === 0)
    return (
      <div className="lp-mini" aria-label={`Bill QR screen: ₹${inr(ex.total)}, ${ex.points} points, waiting for the customer to scan`}>
        <small>Bill QR · {ex.shop}</small>
        <span className="lp-big">
          +<CountUp to={ex.points} run={play} ms={800} />
        </span>
        <small>points for ₹{inr(ex.total)}</small>
        <div className="lp-qr-wrap lp-qr-mini">
          <FakeQr seed={41} />
        </div>
        <span className="lp-wait">
          <i /> Waiting for scan · <BillTimer run={play} />
        </span>
      </div>
    );
  if (step === 1)
    return (
      <div className="lp-mini" aria-label={`Customer's points card: ${ex.after} points, ₹${inr(ex.toReward)} more to ${ex.reward.toLowerCase()}`}>
        <small>Hi {ex.customer}</small>
        <div className="lp-mini-card">
          <small>{ex.shop} · Member</small>
          <strong>
            <CountUp from={ex.before} to={ex.after} run={play} delay={200} />
          </strong>
          <div className="lp-meter">
            <i style={{ width: ex.meter }} />
          </div>
          <p>
            Shop for ₹{inr(ex.toReward)} more → {ex.reward}
          </p>
        </div>
        <span className="lp-mini-btn">My card</span>
      </div>
    );
  return (
    <div className="lp-chat" aria-label="WhatsApp messages to the customer">
      <div className="lp-bubble lp-b1">
        Hi {ex.customer}! 🎉 You earned {ex.points} points at {ex.shop}. Your balance: {ex.after} points. <a href="#how">regularhood.in/w/…</a>
        <time>5:43 pm</time>
      </div>
      <div className="lp-chat-gap">{ex.later}</div>
      <div className="lp-typing" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="lp-bubble lp-b2">
        We miss you at {ex.shop}! You have {ex.after} points waiting — your {ex.reward.toLowerCase()} is close.
        <time>11:02 am</time>
      </div>
    </div>
  );
}

function StepsHead() {
  return (
    <>
      <p className="lp-kicker">How it works</p>
      <h2 className="lp-h2">Three steps, all on the phone you already have.</h2>
    </>
  );
}

/** Narrow screens: the three steps stacked, each playing as it scrolls in. */
function StepCard({ step }: { step: number }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.4);
  return (
    <article className="lp-step lp-reveal">
      <div ref={ref} className={`lp-step-art ${seen ? 'play' : ''}`}>
        <StepArt step={step} play={seen} />
      </div>
      <div className="lp-step-text">
        <b>STEP {step + 1}</b>
        <h3>{STEPS[step].title}</h3>
        <p>{STEPS[step].text}</p>
      </div>
    </article>
  );
}

/** Wide screens: the section pins while you scroll, and one big screen walks through the three steps. */
function StepsStory() {
  const track = useRef<HTMLDivElement>(null);
  const [inView, seen] = useInView<HTMLDivElement>(0.3);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: track, offset: ['start start', 'end end'] });
  useMotionValueEvent(scrollYProgress, 'change', (v) => setActive(Math.min(STEPS.length - 1, Math.floor(v * STEPS.length))));

  // Clicking a step scrolls to the middle of its stretch of the track.
  const goTo = (i: number) => {
    const el = track.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + ((i + 0.5) / STEPS.length) * (el.offsetHeight - innerHeight), behavior: 'smooth' });
  };

  return (
    <div ref={track} className="lp-story">
      <div ref={inView} className="lp-story-pin">
        <div className="lp-story-side">
          <StepsHead />
          <ol className="lp-story-steps">
            <motion.i className="lp-story-rail" style={{ scaleY: scrollYProgress }} aria-hidden="true" />
            {STEPS.map((s, i) => (
              <li key={s.title} className={i === active ? 'on' : i < active ? 'done' : ''} onClick={() => goTo(i)}>
                <b>STEP {i + 1}</b>
                <h3>{s.title}</h3>
                <div className="lp-story-more">
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="lp-stage" data-step={active}>
          <span className="lp-stage-count" aria-hidden="true">
            0{active + 1}
            <small> / 0{STEPS.length}</small>
          </span>
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className={`lp-step-art ${i === active ? 'on' : i < active ? 'past' : ''} ${seen && i === active ? 'play' : ''}`}
              aria-hidden={i !== active}
            >
              <StepArt step={i} play={seen && i === active} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Steps() {
  const wide = useMedia('(min-width: 861px)');
  return (
    <section className="lp-section lp-wrap" id="how" data-section="how">
      {wide ? (
        <StepsStory />
      ) : (
        <>
          <div className="lp-reveal">
            <StepsHead />
          </div>
          <div className="lp-steps">
            {STEPS.map((s, i) => (
              <StepCard key={s.title} step={i} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- the real app

const screens = (ex: Example) => [
  {
    src: `/landing/${ex.key}/dashboard.webp`,
    alt: `Regularhood dashboard ${ex.place}: today’s visits and sales, and what returning customers spent in 30 days`,
    title: 'Your day at a glance',
    text: 'Today’s visits and sales, and what returning customers spent this month.',
  },
  {
    src: `/landing/${ex.key}/give-points.webp`,
    alt: 'Give points sheet with Bill QR, Scan card, Reward code and phone search',
    title: 'One button at the counter',
    text: 'Bill QR, scan their card, a reward code, or their phone number.',
  },
  {
    src: `/landing/${ex.key}/bill-qr.webp`,
    alt: `Bill QR for a ₹${inr(ex.total)} bill worth ${ex.points} points, waiting for the customer to scan`,
    title: 'The bill QR',
    text: 'The customer scans, and your screen says “Points added” by itself.',
  },
];

function AppScreens() {
  const { ex } = useExample();
  return (
    <section className="lp-section lp-screens" id="app" data-section="app">
      <div className="lp-wrap">
        <div className="lp-reveal">
          <p className="lp-kicker">The app</p>
          <h2 className="lp-h2">This is what you’ll use. Real screens, not mock-ups.</h2>
          <p className="lp-sub">Regularhood runs in the browser on your phone and installs to the home screen. Here it is {ex.place}.</p>
          <ExamplePicker className="lp-pick-sm" />
        </div>
        <div className="lp-phones">
          {screens(ex).map((s, i) => (
            <figure className="lp-shot lp-reveal" key={s.src} style={{ '--i': i } as CSSProperties}>
              <div className="lp-device">
                <img src={s.src} alt={s.alt} width={390} height={844} loading="lazy" decoding="async" />
              </div>
              <figcaption>
                <b>{s.title}</b>
                <span>{s.text}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- counter

function Counter() {
  return (
    <section className="lp-section lp-wrap" id="counter" data-section="counter">
      <div className="lp-reveal">
        <p className="lp-kicker">At the counter</p>
        <h2 className="lp-h2">Built for a queue, not a demo.</h2>
        <p className="lp-sub">Four ways to give points or a reward. Use whichever is fastest for the customer in front of you.</p>
      </div>
      <div className="lp-ways lp-reveal">
        <div className="lp-way">
          <span className="lp-way-icon">
            <QrCode size={24} />
          </span>
          <div>
            <h3>Bill QR</h3>
            <p>You type the amount, they scan. If they saved their card before, it takes one tap on their side.</p>
          </div>
        </div>
        <div className="lp-way">
          <span className="lp-way-icon">
            <ScanLine size={24} />
          </span>
          <div>
            <h3>Scan their card</h3>
            <p>The customer opens “My card”. You point your camera at it and their name comes up.</p>
          </div>
        </div>
        <div className="lp-way">
          <span className="lp-way-icon">
            <Phone size={24} />
          </span>
          <div>
            <h3>Phone number</h3>
            <p>No smartphone, no problem. Type their number and the bill, and they still collect points.</p>
          </div>
        </div>
        <div className="lp-way">
          <span className="lp-way-icon">
            <Ticket size={24} />
          </span>
          <div>
            <h3>Reward code</h3>
            <p>They tap “Get it” on a reward and read you a code. You check who it is, then hand it over.</p>
            <span className="lp-ticket">
              1403 <small>10:00</small>
            </span>
          </div>
        </div>
      </div>
      <div className="lp-guard lp-reveal" aria-label="Safety checks">
        <span>
          <ShieldCheck size={16} /> A daily limit per customer
        </span>
        <span>
          <ShieldCheck size={16} /> “Are you sure?” on very large bills
        </span>
        <span>
          <ShieldCheck size={16} /> Undo for any mistake
        </span>
        <span>
          <ShieldCheck size={16} /> Every change in an activity log
        </span>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- the customer's card (real screenshots, EN / हिं)

function Customer() {
  const { ex } = useExample();
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  return (
    <section className="lp-section lp-wrap" id="customers" data-section="customers">
      <div className="lp-customer">
        <div className="lp-reveal">
          <p className="lp-kicker">For your customers</p>
          <h2 className="lp-h2">Their card lives on their phone.</h2>
          <p className="lp-sub">No app to download and no password to remember. A link opens their card, and it can sit on the home screen like any app.</p>
          <ul className="lp-points-list">
            <li>
              <Gift size={18} />
              <span>The next reward shown in rupees, so “₹{inr(ex.toReward)} more” means something.</span>
            </li>
            <li>
              <Languages size={18} />
              <span>English or Hindi, one tap. Try it on the card.</span>
            </li>
            <li>
              <Smartphone size={18} />
              <span>A phone number and 4-digit PIN open it from any other phone.</span>
            </li>
            <li>
              <MessageCircle size={18} />
              <span>Every bill can be sent to them on WhatsApp, with their card link.</span>
            </li>
          </ul>
        </div>
        <div className="lp-card-demo lp-reveal">
          <div className="lp-lang" role="group" aria-label="Show the card in">
            <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')} aria-pressed={lang === 'en'} data-track="card language: English">
              English
            </button>
            <button
              className={lang === 'hi' ? 'on' : ''}
              onClick={() => setLang('hi')}
              aria-pressed={lang === 'hi'}
              lang="hi"
              data-track="card language: Hindi"
            >
              हिंदी
            </button>
          </div>
          <div className="lp-device lp-device-lg">
            <img
              className={lang === 'en' ? 'on' : ''}
              src={`/landing/${ex.key}/wallet-en.webp`}
              alt={`${ex.customer}'s card at ${ex.shop}: ${ex.after} points, shop for ₹${inr(ex.toReward)} more for ${ex.reward.toLowerCase()}`}
              width={390}
              height={844}
              loading="lazy"
            />
            <img
              className={lang === 'hi' ? 'on' : ''}
              src={`/landing/${ex.key}/wallet-hi.webp`}
              alt="The same card in Hindi"
              width={390}
              height={844}
              loading="lazy"
              aria-hidden={lang !== 'hi'}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- proof

function Proof() {
  const { ex } = useExample();
  const { proof } = ex;
  const [ref, seen] = useInView<HTMLDivElement>(0.5);
  return (
    <section className="lp-section lp-proof" id="proof" data-section="proof">
      <div className="lp-wrap lp-proof-grid">
        <div className="lp-reveal">
          <p className="lp-kicker">On your dashboard</p>
          <h2 className="lp-h2">Know if it’s working, in rupees.</h2>
          <p className="lp-sub">
            Every day your dashboard shows what customers who came back spent in the last 30 days, how that compares with the month before,
            and who returned after a month away.
          </p>
        </div>
        <div ref={ref} className={`lp-dash lp-reveal ${seen ? 'play' : ''}`}>
          <div className="lp-dash-head">
            <span>Customers who came back</span>
            <span>Last 30 days</span>
          </div>
          <strong>
            ₹<CountUp to={proof.sales} run={seen} ms={1400} />
          </strong>
          <p className="lp-dash-sub">
            spent by <CountUp to={proof.customers} run={seen} ms={1400} /> returning customers on <CountUp to={proof.visits} run={seen} ms={1400} /> repeat
            visits
          </p>
          <span className="lp-trend">
            <TrendingUp size={15} /> +{proof.trend}% vs the 30 days before
          </span>
          <div className="lp-dash-facts">
            <div>
              <b>{proof.share}%</b>
              <span>of sales</span>
            </div>
            <div>
              <b>{proof.wonBack}</b>
              <span>back after 30+ days</span>
            </div>
            <div>
              <b>{proof.rewards}</b>
              <span>rewards given</span>
            </div>
          </div>
          <p className="lp-example">Example figures {ex.place}</p>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- trust, pricing, faq

function Trust() {
  return (
    <section className="lp-section lp-wrap" id="trust" data-section="trust">
      <div className="lp-reveal">
        <p className="lp-kicker">Your customers stay yours</p>
        <h2 className="lp-h2">Built so you can trust it with your regulars.</h2>
      </div>
      <div className="lp-trust lp-reveal">
        <div>
          <Lock size={22} />
          <h3>Never sold or shared</h3>
          <p>Your customers’ names and numbers are yours. We don’t sell them, share them or message them ourselves.</p>
        </div>
        <div>
          <Download size={22} />
          <h3>Take it with you</h3>
          <p>Download your customers and full points history as a spreadsheet whenever you like.</p>
        </div>
        <div>
          <Database size={22} />
          <h3>Saved every day</h3>
          <p>A copy of your data is kept every day, so a bad day doesn’t cost you your customers.</p>
        </div>
        <div>
          <ScrollText size={22} />
          <h3>Mistakes are easy to catch</h3>
          <p>Limits, big-bill checks and an activity log show who changed what, and when.</p>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section className="lp-section lp-wrap" id="pricing" data-section="pricing">
      <div className="lp-price">
        <div className="lp-reveal">
          <p className="lp-kicker">Pricing</p>
          <h2 className="lp-h2">Free to start.</h2>
          <p className="lp-sub">Sign up, print your counter QR and give your first points today. No card needed.</p>
        </div>
        <div className="lp-price-card lp-reveal">
          <div className="lp-price-tag">
            <strong>₹0</strong>
            <span>to get started</span>
          </div>
          <ul>
            {[
              'Bill QR, card scan and phone-number points',
              'Rewards, Gold tier, welcome and birthday bonuses',
              'Customer cards in English and Hindi',
              'WhatsApp messages and “we miss you” reminders',
              'Dashboard with what returning customers spent',
              'Spreadsheet export and daily backups',
            ].map((f) => (
              <li key={f}>
                <Check size={18} />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <a className="lp-btn lp-btn-ink" href={SIGNUP} data-track="pricing: Create your shop">
            Create your shop <ArrowRight size={18} />
          </a>
        </div>
      </div>
    </section>
  );
}

// Also published as FAQPage structured data by scripts/prerender.mjs.
export const FAQ = [
  ['Do my customers need to download an app?', 'No. Their card opens from a link in the browser. They can add it to their home screen if they like, but they never have to install anything.'],
  ['What if a customer doesn’t have a smartphone?', 'Type their phone number and the bill amount. They collect points the same way, and you can redeem rewards for them from their page.'],
  ['What do I need at the counter?', 'Any phone with a camera and internet. Open Regularhood in the browser or install it on your home screen. A printed QR poster helps new customers join on their own.'],
  ['Can staff give extra points to friends?', 'You set a limit on how many times one customer can get points in 24 hours, and very large bills ask for a second confirmation. Every undo, adjustment and deletion is recorded in the activity log.'],
  ['What happens if a customer forgets their PIN?', 'If they’ve opened their card on that phone before, it opens without the PIN and they can set a new one. Otherwise, send them their card link from your customer list.'],
  ['Can I get my data out?', 'Yes. Settings → Your data downloads your customers and full points history as spreadsheets that open in Excel or Google Sheets.'],
] as const;

function Faq() {
  return (
    <section className="lp-section lp-wrap" id="faq" data-section="faq">
      <div className="lp-faq">
        <div className="lp-reveal">
          <p className="lp-kicker">Questions</p>
          <h2 className="lp-h2">Asked at the counter.</h2>
        </div>
        <div className="lp-faq-list lp-reveal">
          {FAQ.map(([q, a], i) => (
            <details key={q} open={i === 0}>
              <summary data-track={`faq: ${q}`}>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- page

export function Landing() {
  useFonts();
  useEffect(() => watchSections(), []);

  return (
    <ExampleProvider>
      <div className="lp">
        <Nav />
        <main>
          <Hero />
          <ShopTypes />
          <Problem />
          <hr className="lp-tear" />
          <Steps />
          <AppScreens />
          <Counter />
          <hr className="lp-tear" />
          <Customer />
          <Proof />
          <Trust />
          <hr className="lp-tear" />
          <Pricing />
          <hr className="lp-tear" />
          <Faq />
          <section className="lp-final" data-section="final">
            <div className="lp-wrap">
              <div className="lp-reveal">
                <h2>Your next regular walks in today.</h2>
                <p>Set up takes two minutes. Your first points can go out with the next bill.</p>
              </div>
              <a className="lp-btn lp-btn-paper" href={SIGNUP} data-track="final: Start free">
                Start free <ArrowRight size={18} />
              </a>
            </div>
          </section>
        </main>
        <footer className="lp-foot" data-section="footer">
          <div className="lp-wrap">
            <a className="lp-logo" href="/" aria-label="Regularhood home">
              <span className="lp-logo-mark" aria-hidden="true">
                <LogoMark />
              </span>
              Regularhood
            </a>
            <nav aria-label="Footer">
              <a href="#how" data-track="footer: How it works">
                How it works
              </a>
              <a href="#pricing" data-track="footer: Pricing">
                Pricing
              </a>
              <a href="/for" data-track="footer: For your kind of shop">
                For your kind of shop
              </a>
              <a href="/app" data-track="footer: Shop log in">
                Shop log in
              </a>
              <a href="/login" data-track="footer: Customer: check your points">
                Customer: check your points
              </a>
            </nav>
            <small>From first visit to “the usual”.</small>
          </div>
        </footer>
      </div>
    </ExampleProvider>
  );
}
