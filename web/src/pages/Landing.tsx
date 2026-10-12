import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import QRCode from 'qrcode';
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
  ScrollText,
  ShieldCheck,
  Smartphone,
  Ticket,
  TrendingUp,
} from 'lucide-react';
import { getToken } from '../api';
import '../landing.css';

// habiturn.sidhar.me — the homepage for shop owners. The shop app itself lives at /app.
// The phone screens are real screenshots of the app (a demo tea stall); figures on the drawn dashboard card are marked as examples.
// Motion: everything is readable at rest; animations only replay what the product does, and stop for reduced motion.

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
    if (!run || reducedMotion()) return;
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

/** Wrapper that adds `.play` when it scrolls into view, so CSS can replay its animation. */
function Play({ as: Tag = 'div', className = '', children, threshold, style }: {
  as?: 'div' | 'section' | 'article';
  className?: string;
  children: ReactNode;
  threshold?: number;
  style?: CSSProperties;
}) {
  const [ref, seen] = useInView<HTMLDivElement>(threshold);
  return (
    <Tag ref={ref} className={`${className} ${seen ? 'play' : ''}`} style={style}>
      {children}
    </Tag>
  );
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
  const signedIn = Boolean(getToken());
  useEffect(() => {
    const onScroll = () => setScrolled(scrollY > 8);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="lp-wrap">
        <a className="lp-logo" href="/" aria-label="Habiturn home">
          <span className="lp-logo-mark" aria-hidden="true">
            ★
          </span>
          Habiturn
        </a>
        <nav className="lp-nav-links" aria-label="Sections">
          <a href="#how">How it works</a>
          <a href="#app">The app</a>
          <a href="#counter">At the counter</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="lp-nav-end">
          {signedIn ? (
            <a className="lp-btn lp-btn-ink" href="/app">
              Open your shop <ArrowRight size={16} />
            </a>
          ) : (
            <>
              <a className="lp-login" href="/app">
                Log in
              </a>
              <a className="lp-btn lp-btn-ink" href={SIGNUP}>
                Start free
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------- hero

const BILL = [
  ['Masala chai ×2', 60],
  ['Bun maska', 45],
  ['Samosa ×3', 45],
  ['Cold coffee', 300],
] as const;

function Hero() {
  const [qr, setQr] = useState('');
  const [started, setStarted] = useState(false);
  useEffect(() => {
    QRCode.toDataURL(`${location.origin}${SIGNUP}`, { width: 360, margin: 1, color: { dark: '#0f2e24' } }).then(setQr);
    const t = setTimeout(() => setStarted(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className={`lp-wrap lp-hero ${started ? 'play' : ''}`}>
      <div className="lp-hero-copy">
        <p className="lp-eyebrow">Loyalty for neighbourhood shops</p>
        <h1>
          <span className="lp-h1-line">From first</span> <span className="lp-h1-line">visit to</span>{' '}
          <em className="lp-h1-line">“the&nbsp;usual”.</em>
        </h1>
        <p className="lp-lede">
          Habiturn turns walk-ins into regulars. Points on every bill, rewards your customers can see on their phone, and a nudge when they
          haven’t been back. Nothing for them to install.
        </p>
        <div className="lp-cta">
          <a className="lp-btn lp-btn-ink" href={SIGNUP}>
            Start free <ArrowRight size={18} />
          </a>
          <a className="lp-btn lp-btn-line" href="#how">
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
      </div>

      <div
        className="lp-scene"
        role="img"
        aria-label="A ₹450 bill stamped with 45 points, the counter QR standee, and the customer's points card showing 165 points"
      >
        <div className="lp-receipt" aria-hidden="true">
          <h4>CHAI POINT</h4>
          <div className="lp-c">MG Road · 12 Oct, 5:42 pm</div>
          <hr />
          {BILL.map(([item, price], i) => (
            <div className="lp-row lp-line" style={{ '--i': i } as CSSProperties} key={item}>
              <span>{item}</span>
              <span>₹{price}</span>
            </div>
          ))}
          <hr />
          <div className="lp-row lp-total">
            <span>TOTAL</span>
            <span>
              ₹<CountUp to={450} run={started} delay={700} ms={700} />
            </span>
          </div>
          <div className="lp-stamp">+45 POINTS</div>
        </div>
        <div className="lp-standee">
          <b>Scan to try Habiturn</b>
          <div className="lp-qr-wrap">{qr ? <img src={qr} alt="QR code that opens Habiturn sign-up on your phone" /> : <FakeQr seed={11} />}</div>
          <span>Opens sign-up on your phone</span>
        </div>
        <div className="lp-walletcard" aria-hidden="true">
          <small>Chai Point · Ravi</small>
          <strong>
            <CountUp from={120} to={165} run={started} delay={1500} ms={900} />
          </strong>
          <p>
            Shop for ₹350 more → <b>Free cold coffee</b>
          </p>
          <div className="lp-meter">
            <i style={{ width: '82%' }} />
          </div>
        </div>
      </div>
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

// Ravi's visits by week, Aug → Oct: one visit at first, almost daily by the end.
const VISITS = [[2], [], [5], [1, 5], [3], [1, 4, 6], [0, 3, 5], [1, 2, 4, 6], [0, 2, 3, 5], [0, 1, 3, 4, 6], [0, 1, 2, 4, 5, 6], [0, 1, 2, 3, 4, 5]];

function Problem() {
  let n = 0;
  return (
    <section className="lp-section lp-wrap" id="why">
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
            <b>Habiturn</b>
            <span>remembers every customer for you, and gives them a reason to return.</span>
          </li>
        </ul>
      </div>

      <Play className="lp-habit lp-reveal" threshold={0.3}>
        <div className="lp-habit-head">
          <h3>What a regular looks like</h3>
          <span className="lp-mono">Ravi at Chai Point · each dot is a day · Aug → Oct</span>
        </div>
        <div className="lp-habit-body">
          <div className="lp-cal" role="img" aria-label="Twelve weeks of visits: one in the first week, rising to almost every day by week twelve">
            {VISITS.map((days, w) => (
              <div className="lp-week" key={w}>
                {Array.from({ length: 7 }, (_, d) => {
                  const on = days.includes(d);
                  const cls = ['lp-d', on && 'on', w === 0 && d === 2 && 'first', w === 11 && d === 5 && 'today'].filter(Boolean).join(' ');
                  return <span key={d} className={cls} style={on ? ({ '--i': n++ } as CSSProperties) : undefined} />;
                })}
              </div>
            ))}
          </div>
          <ol className="lp-milestones">
            <li>
              <b>Week 1</b>
              <span>One visit. Scans the bill QR, gets a welcome bonus.</span>
            </li>
            <li>
              <b>Week 6</b>
              <span>Three visits. A free chai is close, and the card shows it.</span>
            </li>
            <li>
              <b>Week 12</b>
              <span>Six visits. Doesn’t order any more, just nods.</span>
            </li>
          </ol>
        </div>
        <div className="lp-habit-foot">
          <span>
            <b>First visit</b> · a ₹40 chai
          </span>
          <span className="lp-said">“The usual, bhaiya.”</span>
        </div>
      </Play>
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

function Steps() {
  const [ref1, seen1] = useInView<HTMLDivElement>(0.4);
  const [ref2, seen2] = useInView<HTMLDivElement>(0.4);
  const [ref3, seen3] = useInView<HTMLDivElement>(0.4);
  return (
    <section className="lp-section lp-wrap" id="how">
      <div className="lp-reveal">
        <p className="lp-kicker">How it works</p>
        <h2 className="lp-h2">Three steps, all on the phone you already have.</h2>
      </div>
      <div className="lp-steps">
        <article className="lp-step lp-reveal">
          <div ref={ref1} className={`lp-step-art ${seen1 ? 'play' : ''}`}>
            <div className="lp-mini" aria-label="Bill QR screen: ₹450, 45 points, waiting for the customer to scan">
              <small>Bill QR · Chai Point</small>
              <span className="lp-big">
                +<CountUp to={45} run={seen1} ms={800} />
              </span>
              <small>points for ₹450</small>
              <div className="lp-qr-wrap lp-qr-mini">
                <FakeQr seed={41} />
              </div>
              <span className="lp-wait">
                <i /> Waiting for scan · <BillTimer run={seen1} />
              </span>
            </div>
          </div>
          <div className="lp-step-text">
            <b>STEP 1</b>
            <h3>Show the bill QR</h3>
            <p>Type the bill amount and turn your phone around. The customer scans it with their camera. New customers join right there.</p>
          </div>
        </article>

        <article className="lp-step lp-reveal">
          <div ref={ref2} className={`lp-step-art ${seen2 ? 'play' : ''}`}>
            <div className="lp-mini" aria-label="Customer's points card: 165 points, ₹350 more to a free cold coffee">
              <small>Hi Ravi</small>
              <div className="lp-mini-card">
                <small>Chai Point · Member</small>
                <strong>
                  <CountUp from={120} to={165} run={seen2} delay={200} />
                </strong>
                <div className="lp-meter">
                  <i style={{ width: '82%' }} />
                </div>
                <p>Shop for ₹350 more → Free cold coffee</p>
              </div>
              <span className="lp-mini-btn">My card</span>
            </div>
          </div>
          <div className="lp-step-text">
            <b>STEP 2</b>
            <h3>Points land on their phone</h3>
            <p>Their card opens from a link: balance, the next reward in rupees, their history, and a QR for next time.</p>
          </div>
        </article>

        <article className="lp-step lp-reveal">
          <div ref={ref3} className={`lp-step-art ${seen3 ? 'play' : ''}`}>
            <div className="lp-chat" aria-label="WhatsApp messages to the customer">
              <div className="lp-bubble lp-b1">
                Hi Ravi! 🎉 You earned 45 points at Chai Point. Your balance: 165 points. <a href="#how">habiturn.sidhar.me/w/…</a>
                <time>5:43 pm</time>
              </div>
              <div className="lp-chat-gap">31 days later</div>
              <div className="lp-typing" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <div className="lp-bubble lp-b2">
                We miss you at Chai Point! You have 165 points waiting — your free cold coffee is close.
                <time>11:02 am</time>
              </div>
            </div>
          </div>
          <div className="lp-step-text">
            <b>STEP 3</b>
            <h3>They come back</h3>
            <p>A reward to aim for, a birthday treat, and a one-tap WhatsApp message when someone has been away for a month.</p>
          </div>
        </article>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- the real app

const SCREENS = [
  { src: '/landing/dashboard.webp', alt: 'Habiturn shop dashboard: 8 visits and ₹1,715 in sales today, ₹32,145 spent by returning customers in 30 days', title: 'Your day at a glance', text: 'Today’s visits and sales, and what returning customers spent this month.' },
  { src: '/landing/give-points.webp', alt: 'Give points sheet with Bill QR, Scan card, Reward code and phone search', title: 'One button at the counter', text: 'Bill QR, scan their card, a reward code, or their phone number.' },
  { src: '/landing/bill-qr.webp', alt: 'Bill QR for a ₹450 bill worth 45 points, waiting for the customer to scan', title: 'The bill QR', text: 'The customer scans, and your screen says “Points added” by itself.' },
];

function AppScreens() {
  return (
    <section className="lp-section lp-screens" id="app">
      <div className="lp-wrap">
        <div className="lp-reveal">
          <p className="lp-kicker">The app</p>
          <h2 className="lp-h2">This is what you’ll use. Real screens, not mock-ups.</h2>
          <p className="lp-sub">Habiturn runs in the browser on your phone and installs to the home screen. Here it is at a tea stall.</p>
        </div>
        <div className="lp-phones">
          {SCREENS.map((s, i) => (
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
    <section className="lp-section lp-wrap" id="counter">
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
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  return (
    <section className="lp-section lp-wrap" id="customers">
      <div className="lp-customer">
        <div className="lp-reveal">
          <p className="lp-kicker">For your customers</p>
          <h2 className="lp-h2">Their card lives on their phone.</h2>
          <p className="lp-sub">No app to download and no password to remember. A link opens their card, and it can sit on the home screen like any app.</p>
          <ul className="lp-points-list">
            <li>
              <Gift size={18} />
              <span>The next reward shown in rupees, so “₹350 more” means something.</span>
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
            <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')} aria-pressed={lang === 'en'}>
              English
            </button>
            <button className={lang === 'hi' ? 'on' : ''} onClick={() => setLang('hi')} aria-pressed={lang === 'hi'} lang="hi">
              हिंदी
            </button>
          </div>
          <div className="lp-device lp-device-lg">
            <img
              className={lang === 'en' ? 'on' : ''}
              src="/landing/wallet-en.webp"
              alt="Ravi's card at Chai Point: 165 points, shop for ₹350 more for a free cold coffee"
              width={390}
              height={844}
              loading="lazy"
            />
            <img
              className={lang === 'hi' ? 'on' : ''}
              src="/landing/wallet-hi.webp"
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
  const [ref, seen] = useInView<HTMLDivElement>(0.5);
  return (
    <section className="lp-section lp-proof" id="proof">
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
            ₹<CountUp to={18400} run={seen} ms={1400} />
          </strong>
          <p className="lp-dash-sub">
            spent by <CountUp to={34} run={seen} ms={1400} /> returning customers on <CountUp to={61} run={seen} ms={1400} /> repeat visits
          </p>
          <span className="lp-trend">
            <TrendingUp size={15} /> +22% vs the 30 days before
          </span>
          <div className="lp-dash-facts">
            <div>
              <b>41%</b>
              <span>of sales</span>
            </div>
            <div>
              <b>7</b>
              <span>back after 30+ days</span>
            </div>
            <div>
              <b>9</b>
              <span>rewards given</span>
            </div>
          </div>
          <p className="lp-example">Example figures for a tea stall</p>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- trust, pricing, faq

function Trust() {
  return (
    <section className="lp-section lp-wrap" id="trust">
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
    <section className="lp-section lp-wrap" id="pricing">
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
          <a className="lp-btn lp-btn-ink" href={SIGNUP}>
            Create your shop <ArrowRight size={18} />
          </a>
        </div>
      </div>
    </section>
  );
}

const FAQ = [
  ['Do my customers need to download an app?', 'No. Their card opens from a link in the browser. They can add it to their home screen if they like, but they never have to install anything.'],
  ['What if a customer doesn’t have a smartphone?', 'Type their phone number and the bill amount. They collect points the same way, and you can redeem rewards for them from their page.'],
  ['What do I need at the counter?', 'Any phone with a camera and internet. Open Habiturn in the browser or install it on your home screen. A printed QR poster helps new customers join on their own.'],
  ['Can staff give extra points to friends?', 'You set a limit on how many times one customer can get points in 24 hours, and very large bills ask for a second confirmation. Every undo, adjustment and deletion is recorded in the activity log.'],
  ['What happens if a customer forgets their PIN?', 'If they’ve opened their card on that phone before, it opens without the PIN and they can set a new one. Otherwise, send them their card link from your customer list.'],
  ['Can I get my data out?', 'Yes. Settings → Your data downloads your customers and full points history as spreadsheets that open in Excel or Google Sheets.'],
] as const;

function Faq() {
  return (
    <section className="lp-section lp-wrap" id="faq">
      <div className="lp-faq">
        <div className="lp-reveal">
          <p className="lp-kicker">Questions</p>
          <h2 className="lp-h2">Asked at the counter.</h2>
        </div>
        <div className="lp-faq-list lp-reveal">
          {FAQ.map(([q, a], i) => (
            <details key={q} open={i === 0}>
              <summary>{q}</summary>
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
  useEffect(() => {
    document.title = 'Habiturn — turn walk-ins into regulars';
  }, []);

  return (
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
        <section className="lp-final">
          <div className="lp-wrap">
            <div className="lp-reveal">
              <h2>Your next regular walks in today.</h2>
              <p>Set up takes two minutes. Your first points can go out with the next bill.</p>
            </div>
            <a className="lp-btn lp-btn-paper" href={SIGNUP}>
              Start free <ArrowRight size={18} />
            </a>
          </div>
        </section>
      </main>
      <footer className="lp-foot">
        <div className="lp-wrap">
          <a className="lp-logo" href="/" aria-label="Habiturn home">
            <span className="lp-logo-mark" aria-hidden="true">
              ★
            </span>
            Habiturn
          </a>
          <nav aria-label="Footer">
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="/app">Shop log in</a>
            <a href="/login">Customer: check your points</a>
          </nav>
          <small>From first visit to “the usual”.</small>
        </div>
      </footer>
    </div>
  );
}
