import { createContext, useCallback, useContext, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { AnimatePresence, motion, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import {
  ArrowRight,
  CakeSlice,
  Candy,
  Check,
  Coffee,
  Delete,
  Dumbbell,
  Gift,
  Lock,
  MessageCircle,
  Pause,
  Phone,
  Play,
  RotateCcw,
  Scissors,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  UserX,
} from 'lucide-react';
import { watchSections } from '../analytics';
import { getToken } from '../api';
import { setLang, useLang, type Lang } from '../i18n';
import { LogoMark } from '../ui';
import '../landing.css';

// regularhood.in — the homepage for shop owners. The shop app itself lives at /app.
// One idea: a stamp card on the customer's phone number ("every 5th visit, a free cappuccino"). The page is told with
// one example shop at a time — a café to start — and the visitor can switch to a salon, kirana, bakery, gym or sweet
// shop; every section follows the pick, which shows the same two taps work for any shop.
// English and Hindi; prerendered in English (scripts/prerender.mjs). Everything is readable without JavaScript and at
// rest; animations replay what the product does, and stop for reduced motion.

const FONTS = 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&display=swap';
const SIGNUP = '/app#signup';

function useFonts() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONTS}"]`)) return;
    document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: FONTS }));
  }, []);
}

/** The visitor's language, shared with the customer pages (i18n.tsx). English until hydrated, like the prerendered page. */
function usePageLang(): Lang {
  const stored = useLang();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready ? stored : 'en';
}

/** Scroll reveals: `.rv` elements start hidden only once JavaScript runs, and show as they come into view. */
function useReveals() {
  useEffect(() => {
    const root = document.querySelector('.lp');
    if (!root) return;
    root.classList.add('lp-js');
    if (!('IntersectionObserver' in window)) return root.classList.remove('lp-js');
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    root.querySelectorAll('.rv').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// ---------------------------------------------------------------- the example shops

type ExKey = 'cafe' | 'salon' | 'kirana' | 'bakery' | 'gym' | 'sweets';
type ExText = { type: string; reward: string; short: string; line: string };
type Example = { key: ExKey; icon: typeof Coffee; shop: string; needed: number; en: ExText; hi: ExText };

const EXAMPLES: Example[] = [
  {
    key: 'cafe',
    icon: Coffee,
    shop: 'Brew & Bean Café',
    needed: 5,
    en: { type: 'Café', reward: 'a free cappuccino.', short: 'Free cappuccino', line: 'Regulars who come for their morning coffee' },
    hi: { type: 'कैफ़े', reward: 'मुफ़्त कैपुचीनो।', short: 'मुफ़्त कैपुचीनो', line: 'सुबह की कॉफ़ी वाले पक्के ग्राहक' },
  },
  {
    key: 'salon',
    icon: Scissors,
    shop: 'Style Studio Salon',
    needed: 4,
    en: { type: 'Salon', reward: 'a free head massage.', short: 'Free head massage', line: 'Clients who come back every few weeks' },
    hi: { type: 'सैलून', reward: 'मुफ़्त हेड मसाज।', short: 'मुफ़्त हेड मसाज', line: 'हर कुछ हफ़्ते में लौटने वाले ग्राहक' },
  },
  {
    key: 'kirana',
    icon: ShoppingBasket,
    shop: 'Gupta Kirana Store',
    needed: 10,
    en: { type: 'Kirana', reward: '₹50 off the bill.', short: '₹50 off', line: 'Families who shop with you every week' },
    hi: { type: 'किराना', reward: 'बिल पर ₹50 की छूट।', short: '₹50 की छूट', line: 'हर हफ़्ते सामान लेने वाले परिवार' },
  },
  {
    key: 'bakery',
    icon: CakeSlice,
    shop: 'Sweet Crumbs Bakery',
    needed: 6,
    en: { type: 'Bakery', reward: 'a free pastry.', short: 'Free pastry', line: 'The evening snack crowd' },
    hi: { type: 'बेकरी', reward: 'मुफ़्त पेस्ट्री।', short: 'मुफ़्त पेस्ट्री', line: 'शाम के नाश्ते वाले ग्राहक' },
  },
  {
    key: 'gym',
    icon: Dumbbell,
    shop: 'Iron House Gym',
    needed: 12,
    en: { type: 'Gym', reward: 'a free protein shake.', short: 'Free protein shake', line: 'Members who show up — so they keep showing up' },
    hi: { type: 'जिम', reward: 'मुफ़्त प्रोटीन शेक।', short: 'मुफ़्त प्रोटीन शेक', line: 'रोज़ आने वाले मेंबर — ताकि आते रहें' },
  },
  {
    key: 'sweets',
    icon: Candy,
    shop: 'Sharma Sweets',
    needed: 8,
    en: { type: 'Sweet shop', reward: '250g kaju katli, free.', short: 'Free kaju katli', line: 'Festival rush and the daily regulars' },
    hi: { type: 'मिठाई', reward: '250g काजू कतली मुफ़्त।', short: 'मुफ़्त काजू कतली', line: 'त्योहार की भीड़ और रोज़ के ग्राहक' },
  },
];

type ExampleState = { ex: Example; pick: (key: ExKey) => void; picked: boolean };
const ExampleContext = createContext<ExampleState>({ ex: EXAMPLES[0], pick: () => {}, picked: false });
const useExample = () => useContext(ExampleContext);

const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;

// ---------------------------------------------------------------- copy

const COPY = {
  en: {
    login: 'Log in',
    start: 'Start free',
    open: 'Open your shop',
    eyebrow: 'The loyalty card for every local shop',
    h1: (n: number) => `Every ${ordinal(n)} visit,`,
    sub: 'A stamp card on the customer’s phone number. Type the number, tap “Add visit” — the app tells you when to give the reward. No app for customers, no QR codes, no points.',
    watch: 'Watch it work',
    note: 'Free · No card needed · Ready in 1 minute',
    pickLabel: 'Pick a shop like yours',
    demoHint: 'Try it — tap “Add visit”',
    demoAdd: 'Add visit',
    demoVisit: (n: number, of: number) => `Visit ${n} of ${of}`,
    demoLeft: (n: number, r: string) => `${n} more for ${r}`,
    demoGive: (r: string) => `Give ${r} now`,
    demoGiven: 'Given',
    demoAgain: 'Start again',
    floatSent: 'Card sent on WhatsApp',
    floatVisit: '+1 visit',
    rule: (n: number, r: string) => `Every ${n} visits → ${r}`,
    filmKicker: 'See it at the counter',
    filmTitle: '15 seconds. Two taps. A customer for life.',
    scenes: [
      ['The customer says their number', 'No app to open, no QR to scan. Regulars pop up after 4 digits.'],
      ['You tap “Add visit”', 'One big button. A stamp lands on their card.'],
      ['Their card arrives on WhatsApp', 'They see how many visits are left — in Hindi or English.'],
      ['On the last visit, the app tells you', '“Give the reward now.” Tap Given, the card starts again.'],
    ],
    filmPlay: 'Play',
    filmPause: 'Pause',
    filmReplay: 'Replay',
    customerSays: 'My number is',
    waName: 'Your card',
    scrollKicker: 'Why it works',
    scrollTitle: 'People come back for a card that’s almost full.',
    scrollSub: 'Every stamp is a reason to choose you again tomorrow — over the shop next door.',
    scrollVisit: (k: number) => `Visit ${k}`,
    scrollStart: 'First visit',
    scrollDone: (r: string) => `${r}!`,
    howKicker: 'How it works',
    howTitle: 'Three steps. Nothing to learn.',
    steps: [
      ['Set one rule', 'Pick how many visits and what they get. That’s your whole loyalty program.'],
      ['Type the number, tap Add visit', 'Any phone, tablet or computer at the counter. Your staff learn it in a minute.'],
      ['Give the reward when the app says', 'The screen turns orange on the last visit. Tap Given — done.'],
    ],
    everyKicker: 'Not just cafés',
    everyTitle: 'One card. Every kind of shop.',
    everySub: 'If people visit you again and again, it works for you. You choose the rule — here are some ideas.',
    everyRule: (n: number) => `Every ${n} visits`,
    everyTry: 'See it for this shop',
    custKicker: 'For your customers',
    custTitle: 'Nothing to download. Nothing to remember.',
    custSub: 'Their card lives on their phone number. One tap sends it on WhatsApp; it opens in any browser and shows exactly how close they are.',
    bubble: (shop: string, x: number, n: number, r: string) => `${shop}: visit ${x} of ${n} ✓ ${n - x} more for ${r}! 🎁`,
    cardLeft: (n: number, r: string) => `${n} more visits for ${r}`,
    whyKicker: 'Why shops pick it',
    why: [
      ['Anyone at the counter can use it', 'A keypad and one button. No training, no manual.', Smartphone],
      ['Works for every customer', 'Only a phone number. No sign-up, no app, no QR, no PIN.', Phone],
      ['Bring back the ones who stopped', 'See who hasn’t come in 30 days and send a “we miss you” in one tap.', UserX],
      ['Your customers stay yours', 'We never sell or message them. Download everything anytime.', Lock],
    ] as const,
    priceKicker: 'Price',
    priceTitle: 'Free to start.',
    priceSub: 'Sign up, set your rule and add your first visit today.',
    priceList: ['Unlimited customers and visits', 'Customer cards in Hindi and English', 'WhatsApp card and reminder messages', 'Counter poster and WhatsApp status image', 'Spreadsheet export and daily backups'],
    create: 'Create your shop',
    faqKicker: 'Questions',
    faqTitle: 'Asked at the counter.',
    finalTitle: 'Your next regular walks in today.',
    finalSub: 'Set up takes one minute. Their first stamp can land today.',
    footer: { how: 'How it works', price: 'Price', shops: 'For your kind of shop', login: 'Shop log in', tag: 'From first visit to “the usual”.' },
  },
  hi: {
    login: 'लॉग इन',
    start: 'मुफ़्त शुरू करें',
    open: 'अपनी दुकान खोलें',
    eyebrow: 'हर लोकल दुकान के लिए लॉयल्टी कार्ड',
    h1: (n: number) => `हर ${n}वीं विज़िट पर`,
    sub: 'ग्राहक के फ़ोन नंबर पर स्टैम्प कार्ड। नंबर लिखें, “विज़िट जोड़ें” दबाएँ — इनाम कब देना है, ऐप खुद बताएगा। ग्राहक को न ऐप, न QR, न पॉइंट्स।',
    watch: 'देखें कैसे चलता है',
    note: 'मुफ़्त · कोई कार्ड नहीं चाहिए · 1 मिनट में तैयार',
    pickLabel: 'अपनी जैसी दुकान चुनें',
    demoHint: 'आज़माएँ — “विज़िट जोड़ें” दबाएँ',
    demoAdd: 'विज़िट जोड़ें',
    demoVisit: (n: number, of: number) => `विज़िट ${n} / ${of}`,
    demoLeft: (n: number, r: string) => `बस ${n} और, फिर ${r}`,
    demoGive: (r: string) => `अभी ${r} दें`,
    demoGiven: 'दे दिया',
    demoAgain: 'फिर से',
    floatSent: 'WhatsApp पर कार्ड गया',
    floatVisit: '+1 विज़िट',
    rule: (n: number, r: string) => `हर ${n} विज़िट पर → ${r}`,
    filmKicker: 'काउंटर पर देखें',
    filmTitle: '15 सेकंड। दो टैप। ग्राहक हमेशा के लिए।',
    scenes: [
      ['ग्राहक अपना नंबर बताता है', 'न ऐप खोलना, न QR स्कैन। पुराने ग्राहक 4 अंक में दिख जाते हैं।'],
      ['आप “विज़िट जोड़ें” दबाते हैं', 'एक बड़ा बटन। कार्ड पर एक स्टैम्प लग जाता है।'],
      ['कार्ड WhatsApp पर पहुँचता है', 'ग्राहक देखता है कितनी विज़िट बाकी हैं — हिंदी या English में।'],
      ['आखिरी विज़िट पर ऐप बताता है', '“अभी इनाम दें।” “दे दिया” दबाएँ, कार्ड फिर शुरू।'],
    ],
    filmPlay: 'चलाएँ',
    filmPause: 'रोकें',
    filmReplay: 'फिर से',
    customerSays: 'मेरा नंबर है',
    waName: 'आपका कार्ड',
    scrollKicker: 'यह क्यों काम करता है',
    scrollTitle: 'लगभग भरा हुआ कार्ड ग्राहक को वापस लाता है।',
    scrollSub: 'हर स्टैम्प एक वजह है कि कल भी ग्राहक आपके पास आए — बगल वाली दुकान पर नहीं।',
    scrollVisit: (k: number) => `विज़िट ${k}`,
    scrollStart: 'पहली विज़िट',
    scrollDone: (r: string) => `${r}!`,
    howKicker: 'कैसे काम करता है',
    howTitle: 'तीन कदम। सीखने को कुछ नहीं।',
    steps: [
      ['एक नियम तय करें', 'कितनी विज़िट और क्या इनाम — बस यही आपका पूरा लॉयल्टी प्रोग्राम है।'],
      ['नंबर लिखें, विज़िट जोड़ें', 'काउंटर पर कोई भी फ़ोन, टैबलेट या कंप्यूटर। स्टाफ़ एक मिनट में सीख जाता है।'],
      ['ऐप बताए तब इनाम दें', 'आखिरी विज़िट पर स्क्रीन नारंगी हो जाती है। “दे दिया” दबाएँ — हो गया।'],
    ],
    everyKicker: 'सिर्फ़ कैफ़े नहीं',
    everyTitle: 'एक कार्ड। हर तरह की दुकान।',
    everySub: 'अगर ग्राहक आपके पास बार-बार आते हैं, तो यह आपके लिए है। नियम आप चुनें — ये रहे कुछ आइडिया।',
    everyRule: (n: number) => `हर ${n} विज़िट पर`,
    everyTry: 'इस दुकान के लिए देखें',
    custKicker: 'आपके ग्राहकों के लिए',
    custTitle: 'न कुछ डाउनलोड। न कुछ याद रखना।',
    custSub: 'कार्ड उनके फ़ोन नंबर पर है। एक टैप में WhatsApp पर पहुँचता है, किसी भी ब्राउज़र में खुलता है और दिखाता है कि इनाम कितना पास है।',
    bubble: (shop: string, x: number, n: number, r: string) => `${shop}: विज़िट ${x}/${n} ✓ बस ${n - x} और, फिर ${r}! 🎁`,
    cardLeft: (n: number, r: string) => `बस ${n} और विज़िट, फिर ${r}`,
    whyKicker: 'दुकानदार इसे क्यों चुनते हैं',
    why: [
      ['काउंटर पर कोई भी चला ले', 'एक कीपैड और एक बटन। न ट्रेनिंग, न मैनुअल।', Smartphone],
      ['हर ग्राहक के लिए', 'सिर्फ़ फ़ोन नंबर। न साइन-अप, न ऐप, न QR, न PIN।', Phone],
      ['रुके हुए ग्राहकों को वापस लाएँ', 'देखें कौन 30 दिन से नहीं आया और एक टैप में “आपकी याद आई” भेजें।', UserX],
      ['आपके ग्राहक आपके ही रहें', 'हम न उन्हें बेचते हैं, न मैसेज करते हैं। कभी भी सब डाउनलोड करें।', Lock],
    ] as const,
    priceKicker: 'कीमत',
    priceTitle: 'शुरू करना मुफ़्त है।',
    priceSub: 'साइन अप करें, नियम तय करें और आज ही पहली विज़िट जोड़ें।',
    priceList: ['जितने चाहें ग्राहक और विज़िट', 'हिंदी और English में ग्राहक कार्ड', 'WhatsApp पर कार्ड और याद दिलाने वाले मैसेज', 'काउंटर पोस्टर और WhatsApp स्टेटस इमेज', 'स्प्रेडशीट डाउनलोड और रोज़ बैकअप'],
    create: 'अपनी दुकान बनाएँ',
    faqKicker: 'सवाल',
    faqTitle: 'काउंटर पर पूछे गए सवाल।',
    finalTitle: 'आपका अगला पक्का ग्राहक आज ही आएगा।',
    finalSub: 'सेटअप में एक मिनट। पहला स्टैम्प आज ही लग सकता है।',
    footer: { how: 'कैसे काम करता है', price: 'कीमत', shops: 'आपकी तरह की दुकान के लिए', login: 'दुकान लॉग इन', tag: 'पहली विज़िट से “वही रोज़ वाला” तक।' },
  },
};

type Copy = (typeof COPY)['en'] | (typeof COPY)['hi'];

// Also published (in English) as FAQPage structured data by scripts/prerender.mjs.
export const FAQ = [
  ['Does it work for my kind of shop?', 'If the same people come back to you — a café, salon, kirana, bakery, gym, sweet shop, pharmacy or tiffin service — yes. You choose the number of visits and the reward.'],
  ['Do my customers need an app?', 'No. You add their visit with their phone number. Their card opens from a WhatsApp link in any browser — nothing to install.'],
  ['What if a customer doesn’t have a smartphone?', 'It still works. Visits are counted on their phone number, and the app tells you at the counter when their reward is due.'],
  ['What do I need at the counter?', 'Any phone, tablet or computer with internet. Open Regularhood in the browser or add it to your home screen.'],
  ['Can someone get two stamps in one day?', 'No. A phone number counts once a day, so a stamp can’t be added twice by mistake. Any visit or reward can be undone.'],
  ['Can I change the rule later?', 'Yes. Change the number of visits or the reward anytime in Settings. Everyone keeps the visits they already have.'],
] as const;

const FAQ_HI = [
  ['क्या यह मेरी तरह की दुकान के लिए है?', 'अगर वही लोग बार-बार आते हैं — कैफ़े, सैलून, किराना, बेकरी, जिम, मिठाई की दुकान, मेडिकल या टिफ़िन — तो हाँ। विज़िट की संख्या और इनाम आप चुनते हैं।'],
  ['क्या ग्राहकों को ऐप चाहिए?', 'नहीं। आप उनके फ़ोन नंबर से विज़िट जोड़ते हैं। उनका कार्ड WhatsApp लिंक से किसी भी ब्राउज़र में खुलता है — कुछ इंस्टॉल नहीं करना।'],
  ['अगर ग्राहक के पास स्मार्टफ़ोन नहीं है?', 'तब भी चलेगा। विज़िट उनके फ़ोन नंबर पर गिनी जाती हैं, और इनाम कब देना है यह ऐप काउंटर पर ही बता देता है।'],
  ['काउंटर पर क्या चाहिए?', 'इंटरनेट वाला कोई भी फ़ोन, टैबलेट या कंप्यूटर। ब्राउज़र में Regularhood खोलें या होम स्क्रीन पर लगाएँ।'],
  ['क्या एक दिन में दो स्टैम्प लग सकते हैं?', 'नहीं। एक नंबर दिन में एक बार ही गिना जाता है, तो गलती से दो बार नहीं जुड़ता। कोई भी विज़िट या इनाम वापस लिया जा सकता है।'],
  ['क्या नियम बाद में बदल सकते हैं?', 'हाँ। सेटिंग्स में कभी भी विज़िट की संख्या या इनाम बदलें। सबकी पुरानी विज़िट बनी रहती हैं।'],
] as const;

// ---------------------------------------------------------------- small pieces

function Stamps({ on, of, size = 34, pop = -1 }: { on: number; of: number; size?: number; pop?: number }) {
  return (
    <div className="lp-stamps" style={{ '--s': `${size}px` } as CSSProperties}>
      {Array.from({ length: of }, (_, i) => (
        <span key={i} className={`${i < on ? 'on' : ''} ${i === of - 1 ? 'last' : ''} ${i === pop ? 'pop' : ''}`} style={{ '--k': i } as CSSProperties}>
          {i === of - 1 ? <Gift size={size * 0.46} /> : i < on ? <Check size={size * 0.46} strokeWidth={3} /> : null}
        </span>
      ))}
    </div>
  );
}

/** Confetti pieces with fixed positions (no randomness, so the prerendered page and the browser agree). */
const CONFETTI = Array.from({ length: 22 }, (_, i) => ({
  x: ((i * 37) % 100) - 50,
  d: 0.05 * (i % 7),
  r: (i * 47) % 360,
  c: ['#f59e0b', '#10b981', '#f43f5e', '#6366f1', '#fde68a'][i % 5],
}));

function Confetti() {
  return (
    <div className="lp-confetti" aria-hidden="true">
      {CONFETTI.map((p, i) => (
        <i key={i} style={{ '--x': `${p.x * 3}px`, '--d': `${p.d}s`, '--r': `${p.r}deg`, background: p.c } as CSSProperties} />
      ))}
    </div>
  );
}

/** A soft light that follows the pointer across a card. */
const spotlight = (e: PointerEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
};

// ---------------------------------------------------------------- nav

function Nav({ c, lang }: { c: Copy; lang: Lang }) {
  const [signedIn, setSignedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => setSignedIn(Boolean(getToken())), []); // after hydrating: the prerendered page is signed out
  useEffect(() => {
    const onScroll = () => setScrolled(scrollY > 24);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="lp-wrap">
        <a className="lp-logo" href="/" aria-label="Regularhood home">
          <LogoMark size={32} />
          <span>Regularhood</span>
        </a>
        <div className="lp-nav-end">
          <div className="lp-lang" role="group" aria-label="Language">
            <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')} aria-pressed={lang === 'en'} data-track="nav: English">
              EN
            </button>
            <button className={lang === 'hi' ? 'active' : ''} onClick={() => setLang('hi')} aria-pressed={lang === 'hi'} lang="hi" data-track="nav: Hindi">
              हिं
            </button>
          </div>
          {signedIn ? (
            <a className="lp-btn lp-btn-glow lp-btn-sm" href="/app" data-track="nav: Open your shop">
              {c.open}
            </a>
          ) : (
            <>
              <a className="lp-login" href="/app" data-track="nav: Log in">
                {c.login}
              </a>
              <a className="lp-btn lp-btn-glow lp-btn-sm" href={SIGNUP} data-track="nav: Start free">
                {c.start}
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------- hero

/** Shop picker: every section of the page follows it. */
function ShopPicker({ lang, className = '' }: { lang: Lang; className?: string }) {
  const { ex, pick } = useExample();
  return (
    <div className={`lp-picker ${className}`} role="tablist" aria-label="Example shop">
      {EXAMPLES.map((e) => {
        const Icon = e.icon;
        const on = e.key === ex.key;
        return (
          <button key={e.key} role="tab" aria-selected={on} className={on ? 'on' : ''} onClick={() => pick(e.key)} data-track={`picker: ${e.key}`}>
            {on && <motion.span layoutId={`pick-${className}`} className="lp-picker-bg" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            <Icon size={16} />
            <span>{e[lang].type}</span>
          </button>
        );
      })}
    </div>
  );
}

/** The shop's counter screen, drawn small: tap "Add visit" and the stamps fill; the last visit asks for the reward. */
function DemoPhone({ c, lang }: { c: Copy; lang: Lang }) {
  const { ex } = useExample();
  const t = ex[lang];
  const start = Math.max(1, ex.needed - 3);
  const [stamps, setStamps] = useState(start);
  const [shown, setShown] = useState<'keypad' | 'visit' | 'reward'>('keypad');
  const [sent, setSent] = useState(false);
  useEffect(() => {
    setStamps(Math.max(1, ex.needed - 3));
    setShown('keypad');
  }, [ex]);
  useEffect(() => {
    if (shown !== 'visit') return;
    setSent(true);
    const a = setTimeout(() => setShown('keypad'), 1700);
    const b = setTimeout(() => setSent(false), 2600);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [shown, stamps]);

  const add = () => {
    const next = stamps + 1;
    setStamps(next);
    setShown(next >= ex.needed ? 'reward' : 'visit');
  };

  // A gentle 3D tilt toward the pointer.
  const reduce = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rx = useSpring(useTransform(py, [-0.5, 0.5], [7, -7]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(px, [-0.5, 0.5], [-9, 9]), { stiffness: 120, damping: 18 });
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };

  return (
    <div
      className="lp-demo"
      onPointerMove={move}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
      }}
    >
      <motion.div className="lp-phone" style={{ rotateX: rx, rotateY: ry }}>
        <div className="lp-phone-notch" />
        <div className="lp-phone-screen">
          <div className="lp-phone-head">
            <span className="lp-phone-shop">{ex.shop}</span>
            <span className="lp-phone-rule">{c.rule(ex.needed, t.short)}</span>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            {shown === 'reward' ? (
              <motion.div key="reward" className="lp-phone-result reward" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <Confetti />
                <span className="lp-phone-icon">
                  <Gift size={30} />
                </span>
                <strong>{c.demoGive(t.short)}</strong>
                <Stamps on={ex.needed} of={ex.needed} size={ex.needed > 8 ? 18 : 24} />
                <button
                  className="lp-phone-btn orange"
                  onClick={() => {
                    setStamps(0);
                    setShown('keypad');
                  }}
                  data-track="demo: Given"
                >
                  <Check size={18} strokeWidth={3} /> {c.demoGiven}
                </button>
              </motion.div>
            ) : shown === 'visit' ? (
              <motion.div key="visit" className="lp-phone-result" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <span className="lp-phone-icon">
                  <Check size={30} strokeWidth={3} />
                </span>
                <strong>{c.demoVisit(stamps, ex.needed)}</strong>
                <Stamps on={stamps} of={ex.needed} size={ex.needed > 8 ? 18 : 24} pop={stamps - 1} />
                <span className="lp-phone-small">{c.demoLeft(ex.needed - stamps, t.short)}</span>
              </motion.div>
            ) : (
              <motion.div key="keypad" className="lp-phone-keypad" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="lp-phone-number">98765 43210</div>
                <div className="lp-phone-keys" aria-hidden="true">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', ''].map((k, i) => (
                    <span key={i}>{k || (i === 11 ? <Delete size={15} /> : '')}</span>
                  ))}
                </div>
                <button className="lp-phone-btn" onClick={add} data-track="demo: Add visit">
                  <Check size={18} strokeWidth={3} /> {c.demoAdd}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <AnimatePresence>
        {sent && (
          <motion.div className="lp-float lp-float-wa" initial={{ opacity: 0, y: 16, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }}>
            <MessageCircle size={16} /> {c.floatSent}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="lp-float lp-float-visit" aria-hidden="true">
        <Sparkles size={15} /> {c.floatVisit}
      </div>
      <p className="lp-demo-hint">
        {shown === 'reward' ? (
          <button className="lp-link" onClick={() => setShown('keypad')}>
            <RotateCcw size={14} /> {c.demoAgain}
          </button>
        ) : (
          c.demoHint
        )}
      </p>
    </div>
  );
}

function Hero({ c, lang }: { c: Copy; lang: Lang }) {
  const { ex } = useExample();
  return (
    <section className="lp-hero" data-section="hero">
      <div className="lp-aurora" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="lp-grain" aria-hidden="true" />
      <div className="lp-wrap lp-hero-grid">
        <div className="lp-hero-text">
          <p className="lp-eyebrow">
            <span className="lp-dot" /> {c.eyebrow}
          </p>
          <h1>
            <span className="lp-h1-line">{c.h1(ex.needed)}</span>
            <span className="lp-h1-swap">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={`${ex.key}-${lang}`}
                  className="lp-h1-reward"
                  initial={{ y: '0.6em', opacity: 0, filter: 'blur(8px)' }}
                  animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                  exit={{ y: '-0.5em', opacity: 0, filter: 'blur(8px)' }}
                  transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  {ex[lang].reward}
                </motion.span>
              </AnimatePresence>
            </span>
          </h1>
          <p className="lp-sub">{c.sub}</p>
          <div className="lp-cta">
            <a className="lp-btn lp-btn-glow" href={SIGNUP} data-track="hero: Start free">
              {c.start} <ArrowRight size={18} />
            </a>
            <a className="lp-btn lp-btn-ghost" href="#film" data-track="hero: Watch it work">
              <Play size={16} fill="currentColor" /> {c.watch}
            </a>
          </div>
          <p className="lp-note">{c.note}</p>
          <div className="lp-pick-wrap">
            <span className="lp-pick-label">{c.pickLabel}</span>
            <ShopPicker lang={lang} className="hero" />
          </div>
        </div>
        <DemoPhone c={c} lang={lang} />
      </div>
    </section>
  );
}

function Marquee({ lang }: { lang: Lang }) {
  const items = [...EXAMPLES.map((e) => e[lang].type), ...(lang === 'hi' ? ['मेडिकल', 'टिफ़िन', 'जूस बार', 'चाय की दुकान', 'लॉन्ड्री'] : ['Pharmacy', 'Tiffin', 'Juice bar', 'Chai stall', 'Laundry'])];
  const row = (
    <div className="lp-marquee-row">
      {items.map((s, i) => (
        <span key={i}>
          <Check size={14} strokeWidth={3} /> {s}
        </span>
      ))}
    </div>
  );
  return (
    <div className="lp-marquee" aria-hidden="true">
      <div className="lp-marquee-track">
        {row}
        {row}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- the film

const SCENE_MS = [3400, 2800, 3200, 3600];

/** "Watch it work": a 13-second film of the counter, drawn live so it follows the picked shop and language. */
function Film({ c, lang }: { c: Copy; lang: Lang }) {
  const { ex } = useExample();
  const t = ex[lang];
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { amount: 0.45 });
  const [scene, setScene] = useState(0);
  const [progress, setProgress] = useState(0); // 0..1 within the scene
  const [playing, setPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);

  // Autoplays in a loop whenever it's on screen, like a muted video, until the visitor pauses it. It plays even with
  // "reduce motion" on: it's the page's main explainer, and the pause button is always there.
  useEffect(() => {
    setPlaying(visible && !userPaused);
  }, [visible, userPaused]);

  // The loop reads and writes refs, so a jump to another scene while playing is picked up straight away.
  const at = useRef({ scene: 0, progress: 0 });
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const a = at.current;
      a.progress += (now - last) / SCENE_MS[a.scene];
      last = now;
      if (a.progress >= 1) {
        a.progress = 0;
        a.scene = (a.scene + 1) % SCENE_MS.length;
        setScene(a.scene);
      }
      setProgress(a.progress);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const jump = (i: number) => {
    at.current = { scene: i, progress: 0 };
    setScene(i);
    setProgress(0);
  };
  const toggle = () => {
    setUserPaused(playing);
    setPlaying(!playing);
  };

  const before = ex.needed - 1;
  // Paused at the start of a scene (stepping through it, or less motion): show how the scene ends.
  const p = playing || progress > 0 ? progress : 1;
  const typed = '9876543210'.slice(0, Math.min(10, Math.floor(p * 14)));
  const shown = typed.length > 5 ? `${typed.slice(0, 5)} ${typed.slice(5)}` : typed;
  const pressed = scene === 1 && p < 0.25;
  const elapsed = SCENE_MS.slice(0, scene).reduce((a, b) => a + b, 0) + progress * SCENE_MS[scene];

  return (
    <section className="lp-film-sec" id="film" data-section="film">
      <div className="lp-wrap">
        <p className="lp-kicker rv">{c.filmKicker}</p>
        <h2 className="lp-h2 rv">{c.filmTitle}</h2>
        <div className="lp-film rv" ref={ref}>
          <div className="lp-film-top">
            <span className="lp-film-live">
              <span className="lp-dot" /> {ex.shop}
            </span>
            <span className="lp-film-time">
              0:{String(Math.floor(elapsed / 1000)).padStart(2, '0')} / 0:{String(Math.round(SCENE_MS.reduce((a, b) => a + b) / 1000)).padStart(2, '0')}
            </span>
          </div>

          <div className="lp-film-stage">
            <div className="lp-film-caption">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div key={`${scene}-${lang}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }}>
                  <span className="lp-film-step">{String(scene + 1).padStart(2, '0')}</span>
                  <h3>{c.scenes[scene][0]}</h3>
                  <p>{c.scenes[scene][1]}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="lp-film-screen">
              {scene === 0 && (
                <div className="lp-film-say">
                  <span className="lp-film-bubble-say">
                    {c.customerSays} <b>98765 43210</b>
                  </span>
                </div>
              )}
              <div className={`lp-mini-phone ${scene === 2 ? 'customer' : ''}`}>
                {scene === 2 ? (
                  <div className="lp-wa">
                    <div className="lp-wa-head">
                      <span className="lp-wa-avatar">
                        <LogoMark size={22} />
                      </span>
                      <span>
                        <b>{ex.shop}</b>
                        <small>WhatsApp</small>
                      </span>
                    </div>
                    <div className="lp-wa-body">
                      {p < 0.22 ? (
                        <span className="lp-wa-typing">
                          <i />
                          <i />
                          <i />
                        </span>
                      ) : (
                        <motion.div className="lp-wa-msg" initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
                          {c.bubble(ex.shop, before, ex.needed, t.short)}
                          <div className="lp-wa-card">
                            <small>{c.waName}</small>
                            <Stamps on={before} of={ex.needed} size={ex.needed > 8 ? 13 : 17} />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                ) : scene === 3 ? (
                  <div className="lp-phone-result reward film">
                    {p > 0.12 && <Confetti />}
                    <span className="lp-phone-icon">
                      <Gift size={26} />
                    </span>
                    <strong>{c.demoGive(t.short)}</strong>
                    <Stamps on={ex.needed} of={ex.needed} size={ex.needed > 8 ? 13 : 18} pop={ex.needed - 1} />
                    <span className={`lp-phone-btn orange ${playing && p > 0.7 ? 'tap' : ''}`}>
                      <Check size={16} strokeWidth={3} /> {c.demoGiven}
                    </span>
                  </div>
                ) : scene === 1 && !pressed ? (
                  <div className="lp-phone-result film">
                    <span className="lp-phone-icon">
                      <Check size={26} strokeWidth={3} />
                    </span>
                    <strong>{c.demoVisit(before, ex.needed)}</strong>
                    <Stamps on={before} of={ex.needed} size={ex.needed > 8 ? 13 : 18} pop={before - 1} />
                    <span className="lp-phone-small">{c.demoLeft(1, t.short)}</span>
                  </div>
                ) : (
                  <div className="lp-phone-keypad film">
                    <div className="lp-phone-number">{shown || <span className="lp-caret" />}</div>
                    <div className="lp-phone-keys" aria-hidden="true">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', ''].map((k, i) => (
                        <span key={i} className={scene === 0 && k && typed.endsWith(k) && p < 0.72 ? 'hit' : ''}>
                          {k}
                        </span>
                      ))}
                    </div>
                    <span className={`lp-phone-btn ${pressed ? 'tap' : ''} ${typed.length < 10 && scene === 0 ? 'dim' : ''}`}>
                      <Check size={16} strokeWidth={3} /> {c.demoAdd}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lp-film-bar">
            <button className="lp-film-play" onClick={toggle} aria-label={playing ? c.filmPause : c.filmPlay} data-track="film: play/pause">
              {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            </button>
            <div className="lp-film-segs">
              {SCENE_MS.map((_, i) => (
                <button key={i} onClick={() => jump(i)} aria-label={c.scenes[i][0]} data-track={`film: scene ${i + 1}`}>
                  <span style={{ transform: `scaleX(${i < scene ? 1 : i === scene ? progress : 0})` }} />
                </button>
              ))}
            </div>
            <button className="lp-film-play" onClick={() => jump(0)} aria-label={c.filmReplay} data-track="film: replay">
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- the card that fills as you scroll

function ScrollCard({ c, lang }: { c: Copy; lang: Lang }) {
  const { ex } = useExample();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const [k, setK] = useState(ex.needed);
  const [moved, setMoved] = useState(false);
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    setMoved(true);
    setK(Math.min(ex.needed, Math.floor(p * (ex.needed + 0.6))));
  });
  // At rest (prerendered, or before any scroll) the card shows full.
  const on = moved ? k : ex.needed;
  const done = on >= ex.needed;
  const glow = useTransform(scrollYProgress, [0, 1], [0.15, 1]);

  return (
    <section className="lp-scroll" ref={ref} data-section="why-card">
      <div className="lp-scroll-sticky">
        <div className="lp-wrap lp-scroll-grid">
          <div>
            <p className="lp-kicker">{c.scrollKicker}</p>
            <h2 className="lp-h2">{c.scrollTitle}</h2>
            <p className="lp-sub">{c.scrollSub}</p>
          </div>
          <div className="lp-scroll-card-wrap">
            <motion.div className="lp-scroll-glow" style={{ opacity: glow }} aria-hidden="true" />
            <div className={`lp-card big ${done ? 'done' : ''}`}>
              <span className="lp-card-shop">
                <LogoMark size={26} /> {ex.shop}
              </span>
              <span className="lp-card-rule">{c.rule(ex.needed, ex[lang].short)}</span>
              <Stamps on={on} of={ex.needed} size={ex.needed > 8 ? 30 : 44} pop={on - 1} />
              <div className="lp-scroll-count">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.strong key={`${on}-${done}-${lang}`} initial={{ y: 22, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -22, opacity: 0 }}>
                    {done ? c.scrollDone(ex[lang].short) : on === 0 ? c.scrollStart : c.scrollVisit(on)}
                  </motion.strong>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- sections

function How({ c }: { c: Copy }) {
  return (
    <section className="lp-section lp-wrap" id="how" data-section="how">
      <p className="lp-kicker rv">{c.howKicker}</p>
      <h2 className="lp-h2 rv">{c.howTitle}</h2>
      <ol className="lp-steps">
        {c.steps.map(([title, text], i) => (
          <li key={title} className="rv" style={{ '--i': i } as CSSProperties} onPointerMove={spotlight}>
            <span className="lp-step-n">{i + 1}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function EveryShop({ c, lang }: { c: Copy; lang: Lang }) {
  const { ex, pick } = useExample();
  return (
    <section className="lp-section lp-every" id="every" data-section="every">
      <div className="lp-wrap">
        <p className="lp-kicker rv">{c.everyKicker}</p>
        <h2 className="lp-h2 rv">{c.everyTitle}</h2>
        <p className="lp-sub rv">{c.everySub}</p>
        <div className="lp-every-grid">
          {EXAMPLES.map((e, i) => {
            const Icon = e.icon;
            return (
              <button
                key={e.key}
                className={`lp-every-card rv ${e.key === ex.key ? 'on' : ''}`}
                style={{ '--i': i } as CSSProperties}
                onPointerMove={spotlight}
                onClick={() => {
                  pick(e.key);
                  document.getElementById('film')?.scrollIntoView({ behavior: 'smooth' });
                }}
                data-track={`every: ${e.key}`}
              >
                <span className="lp-every-icon">
                  <Icon size={22} />
                </span>
                <span className="lp-every-type">{e[lang].type}</span>
                <strong>{c.everyRule(e.needed)}</strong>
                <span className="lp-every-reward">→ {e[lang].short}</span>
                <Stamps on={e.needed - 1} of={e.needed} size={e.needed > 8 ? 14 : 18} />
                <span className="lp-every-line">{e[lang].line}</span>
                <span className="lp-every-try">
                  {c.everyTry} <ArrowRight size={14} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ForCustomers({ c, lang }: { c: Copy; lang: Lang }) {
  const { ex } = useExample();
  const x = ex.needed - 2;
  return (
    <section className="lp-section lp-band" id="customers" data-section="customers">
      <div className="lp-wrap lp-split">
        <div>
          <p className="lp-kicker rv">{c.custKicker}</p>
          <h2 className="lp-h2 rv">{c.custTitle}</h2>
          <p className="lp-sub rv">{c.custSub}</p>
        </div>
        <div className="lp-cust-art rv">
          <div className="lp-bubble">
            <MessageCircle size={16} />
            <span>{c.bubble(ex.shop, x, ex.needed, ex[lang].short)}</span>
          </div>
          <div className="lp-card">
            <span className="lp-card-shop">
              <LogoMark size={24} /> {ex.shop}
            </span>
            <span className="lp-card-rule">{c.rule(ex.needed, ex[lang].short)}</span>
            <Stamps on={x} of={ex.needed} size={ex.needed > 8 ? 26 : 36} />
            <strong>{c.cardLeft(ex.needed - x, ex[lang].short)}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

function Why({ c }: { c: Copy }) {
  return (
    <section className="lp-section lp-wrap" id="why" data-section="why">
      <p className="lp-kicker rv">{c.whyKicker}</p>
      <div className="lp-why">
        {c.why.map(([title, text, Icon], i) => (
          <div key={title} className="rv" style={{ '--i': i } as CSSProperties} onPointerMove={spotlight}>
            <span className="lp-why-icon">
              <Icon size={20} />
            </span>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Pricing({ c }: { c: Copy }) {
  return (
    <section className="lp-section lp-wrap" id="pricing" data-section="pricing">
      <div className="lp-price">
        <div>
          <p className="lp-kicker rv">{c.priceKicker}</p>
          <h2 className="lp-h2 rv">{c.priceTitle}</h2>
          <p className="lp-sub rv">{c.priceSub}</p>
        </div>
        <div className="lp-price-card rv">
          <strong className="lp-price-tag">₹0</strong>
          <ul>
            {c.priceList.map((f) => (
              <li key={f}>
                <Check size={18} /> {f}
              </li>
            ))}
          </ul>
          <a className="lp-btn lp-btn-glow" href={SIGNUP} data-track="pricing: Create your shop">
            {c.create} <ArrowRight size={18} />
          </a>
        </div>
      </div>
    </section>
  );
}

function Faq({ c, lang }: { c: Copy; lang: Lang }) {
  const list = lang === 'hi' ? FAQ_HI : FAQ;
  return (
    <section className="lp-section lp-wrap" id="faq" data-section="faq">
      <p className="lp-kicker rv">{c.faqKicker}</p>
      <h2 className="lp-h2 rv">{c.faqTitle}</h2>
      <div className="lp-faq rv">
        {list.map(([q, a], i) => (
          <details key={q} open={i === 0}>
            <summary data-track={`faq: ${FAQ[i][0]}`}>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- page

/** Cycles the example shop in the hero until the visitor picks one, only while the hero is on screen. */
function useExampleTour() {
  const [key, setKey] = useState<ExKey>('cafe');
  const [picked, setPicked] = useState(false);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (picked || reduce) return;
    let heroVisible = true;
    const hero = document.querySelector('.lp-hero');
    const io = hero ? new IntersectionObserver(([e]) => (heroVisible = e.isIntersecting), { threshold: 0.3 }) : null;
    if (hero) io!.observe(hero);
    const timer = setInterval(() => {
      if (!heroVisible || document.hidden) return;
      setKey((k) => EXAMPLES[(EXAMPLES.findIndex((e) => e.key === k) + 1) % EXAMPLES.length].key);
    }, 4200);
    return () => {
      clearInterval(timer);
      io?.disconnect();
    };
  }, [picked, reduce]);
  const pick = useCallback((k: ExKey) => {
    setPicked(true);
    setKey(k);
  }, []);
  return { ex: EXAMPLES.find((e) => e.key === key)!, pick, picked };
}

export function Landing() {
  useFonts();
  useReveals();
  useEffect(() => watchSections(), []);
  const lang = usePageLang();
  const c = COPY[lang];
  const example = useExampleTour();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <ExampleContext.Provider value={example}>
      <div className="lp" lang={lang}>
        <Nav c={c} lang={lang} />
        <main>
          <Hero c={c} lang={lang} />
          <Marquee lang={lang} />
          <Film c={c} lang={lang} />
          <How c={c} />
          <ScrollCard c={c} lang={lang} />
          <EveryShop c={c} lang={lang} />
          <ForCustomers c={c} lang={lang} />
          <Why c={c} />
          <Pricing c={c} />
          <Faq c={c} lang={lang} />
          <section className="lp-final" data-section="final">
            <div className="lp-aurora" aria-hidden="true">
              <span />
              <span />
            </div>
            <div className="lp-wrap">
              <h2 className="rv">{c.finalTitle}</h2>
              <p className="rv">{c.finalSub}</p>
              <a className="lp-btn lp-btn-glow rv" href={SIGNUP} data-track="final: Start free">
                {c.start} <ArrowRight size={18} />
              </a>
            </div>
          </section>
        </main>
        <footer className="lp-foot" data-section="footer">
          <div className="lp-wrap">
            <a className="lp-logo" href="/" aria-label="Regularhood home">
              <LogoMark size={28} />
              <span>Regularhood</span>
            </a>
            <nav aria-label="Footer">
              <a href="#how" data-track="footer: How it works">
                {c.footer.how}
              </a>
              <a href="#pricing" data-track="footer: Pricing">
                {c.footer.price}
              </a>
              <a href="/for" data-track="footer: For your kind of shop">
                {c.footer.shops}
              </a>
              <a href="/app" data-track="footer: Shop log in">
                {c.footer.login}
              </a>
            </nav>
            <small>{c.footer.tag}</small>
          </div>
        </footer>
      </div>
    </ExampleContext.Provider>
  );
}
