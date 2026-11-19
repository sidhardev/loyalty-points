import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type RefObject } from 'react';
import { AnimatePresence, domAnimation, LazyMotion, m, type MotionValue, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import {
  ArrowRight,
  CakeSlice,
  Candy,
  Check,
  CheckCheck,
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
import { setLang, useLang } from '../i18n';
import { LogoMark } from '../ui';
import '../landing.css';

// regularhood.in — the homepage for shop owners. The shop app itself lives at /app.
// One idea: a stamp card on the customer's phone number ("every 5th visit, a free cappuccino"). The page is told with
// one example shop at a time — a grocery to start — and the visitor can switch to a salon, café, bakery, gym or dessert
// bar; every section follows the pick, which shows the same two taps work for any shop. English is written for shops
// anywhere (no rupees or Indian names; prices in dollars outside India); Hindi and Malayalam keep Indian examples.
// The look: receipt paper and a rubber stamp (landing.css), set in Fraunces and Manrope.
// English and Hindi; prerendered in English (scripts/prerender.mjs). Everything is readable without JavaScript and at
// rest; animations replay what the product does, and stop for reduced motion.

export const FONTS =
  'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500..800;1,9..144,500..800&family=Manrope:wght@400..800&display=swap';
const SIGNUP = '/app#signup';

function useFonts() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONTS}"]`)) return;
    document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: FONTS }));
  }, []);
}

/** The homepage's languages: the app's three (i18n.tsx). A ?lang=ml link opens it in Malayalam. */
type Lang = 'en' | 'hi' | 'ml';

/** Guides and tools linked from the footer, so search engines see them as the site's main pages (server/src/guides.ts). */
const FOOT_GUIDES: Record<'en' | 'hi', [string, string][]> = {
  en: [
    ['/guide/how-to-get-repeat-customers', 'How to get repeat customers'],
    ['/guide/messages-to-bring-customers-back', 'Messages to bring customers back'],
    ['/guide/win-back-old-customers', 'Win back old customers'],
    ['/guide/loyalty-reward-ideas', 'Loyalty reward ideas'],
    ['/guide/digital-stamp-card', 'Digital stamp card'],
    ['/tools/stamp-card-maker', 'Free stamp card maker'],
    ['/tools/google-review-qr-code', 'Google review QR code'],
  ],
  hi: [
    ['/hi/guide/how-to-increase-shop-sales', 'दुकान में बिक्री कैसे बढ़ाए'],
    ['/hi/guide/get-customers-for-new-shop', 'दुकान पर ग्राहक कैसे आए'],
    ['/hi/guide/win-back-old-customers', 'पुराने ग्राहक वापस कैसे लाए'],
    ['/hi/guide/how-to-get-repeat-customers', 'पक्का ग्राहक कैसे बनाएँ'],
    ['/hi/guide/messages-to-bring-customers-back', 'ग्राहक को दोबारा बुलाने के मैसेज'],
    ['/hi/tools/stamp-card-maker', 'फ़्री स्टैम्प कार्ड मेकर'],
    ['/hi/tools/google-review-qr-code', 'Google रिव्यू QR कोड'],
  ],
};

/** The visitor's language, shared with the customer pages (i18n.tsx). English until hydrated, like the prerendered page. */
function usePageLang(): Lang {
  const stored = useLang();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready ? stored : 'en';
}

/** Scroll reveals: `.rv` elements start hidden only once JavaScript runs, and show as they come into view. Elements
 *  React mounts later are watched too: switching language remounts lists keyed by their text, which would otherwise
 *  stay hidden. */
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
    const watch = (scope: ParentNode) => scope.querySelectorAll('.rv:not(.in)').forEach((el) => io.observe(el));
    watch(root);
    const mo = new MutationObserver((records) => {
      for (const r of records)
        r.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          if (n.matches('.rv:not(.in)')) io.observe(n);
          watch(n);
        });
    });
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
}

// ---------------------------------------------------------------- the example shops

type ExKey = 'cafe' | 'salon' | 'kirana' | 'bakery' | 'gym' | 'sweets';
type ExText = { type: string; reward: string; short: string; line: string };
/** `shop` is the English name; `local` the Indian one shown in Hindi and Malayalam. */
type Example = { key: ExKey; icon: typeof Coffee; shop: string; local?: string; needed: number; en: ExText; hi: ExText; ml: ExText };

const EXAMPLES: Example[] = [
  {
    key: 'kirana',
    icon: ShoppingBasket,
    shop: 'Corner Market',
    local: 'Gupta Kirana Store',
    needed: 10,
    en: { type: 'Grocery', reward: '10% off the basket.', short: '10% off', line: 'Families who stock up with you every week' },
    hi: { type: 'किराना', reward: 'बिल पर ₹50 की छूट।', short: '₹50 की छूट', line: 'हर हफ़्ते सामान लेने वाले परिवार' },
    ml: { type: 'പലചരക്ക് കട', reward: 'ബില്ലിൽ ₹50 കിഴിവ്.', short: '₹50 കിഴിവ്', line: 'എല്ലാ ആഴ്ചയും സാധനം വാങ്ങുന്ന കുടുംബങ്ങൾ' },
  },
  {
    key: 'salon',
    icon: Scissors,
    shop: 'Style Studio Salon',
    needed: 4,
    en: { type: 'Salon', reward: 'a free head massage.', short: 'Free head massage', line: 'Clients who come back every few weeks' },
    hi: { type: 'सैलून', reward: 'मुफ़्त हेड मसाज।', short: 'मुफ़्त हेड मसाज', line: 'हर कुछ हफ़्ते में लौटने वाले ग्राहक' },
    ml: { type: 'സലൂൺ', reward: 'ഒരു ഫ്രീ ഹെഡ് മസാജ്.', short: 'ഫ്രീ ഹെഡ് മസാജ്', line: 'ഏതാനും ആഴ്ച കൂടുമ്പോൾ തിരികെ വരുന്നവർ' },
  },
  {
    key: 'cafe',
    icon: Coffee,
    shop: 'Brew & Bean Café',
    needed: 5,
    en: { type: 'Café', reward: 'a free cappuccino.', short: 'Free cappuccino', line: 'Regulars who come for their morning coffee' },
    hi: { type: 'कैफ़े', reward: 'मुफ़्त कैपुचीनो।', short: 'मुफ़्त कैपुचीनो', line: 'सुबह की कॉफ़ी वाले पक्के ग्राहक' },
    ml: { type: 'കഫേ', reward: 'ഒരു ഫ്രീ കാപ്പുച്ചിനോ.', short: 'ഫ്രീ കാപ്പുച്ചിനോ', line: 'രാവിലത്തെ കോഫിക്ക് സ്ഥിരം വരുന്നവർ' },
  },
  {
    key: 'bakery',
    icon: CakeSlice,
    shop: 'Sweet Crumbs Bakery',
    needed: 6,
    en: { type: 'Bakery', reward: 'a free pastry.', short: 'Free pastry', line: 'The evening snack crowd' },
    hi: { type: 'बेकरी', reward: 'मुफ़्त पेस्ट्री।', short: 'मुफ़्त पेस्ट्री', line: 'शाम के नाश्ते वाले ग्राहक' },
    ml: { type: 'ബേക്കറി', reward: 'ഒരു ഫ്രീ പേസ്ട്രി.', short: 'ഫ്രീ പേസ്ട്രി', line: 'വൈകുന്നേരത്തെ സ്നാക്സിന് വരുന്നവർ' },
  },
  {
    key: 'gym',
    icon: Dumbbell,
    shop: 'Iron House Gym',
    needed: 12,
    en: { type: 'Gym', reward: 'a free protein shake.', short: 'Free protein shake', line: 'Members who show up — so they keep showing up' },
    hi: { type: 'जिम', reward: 'मुफ़्त प्रोटीन शेक।', short: 'मुफ़्त प्रोटीन शेक', line: 'रोज़ आने वाले मेंबर — ताकि आते रहें' },
    ml: { type: 'ജിം', reward: 'ഒരു ഫ്രീ പ്രോട്ടീൻ ഷേക്ക്.', short: 'ഫ്രീ പ്രോട്ടീൻ ഷേക്ക്', line: 'ദിവസവും വരുന്ന മെമ്പർമാർ — അവർ വന്നുകൊണ്ടേയിരിക്കാൻ' },
  },
  {
    key: 'sweets',
    icon: Candy,
    shop: 'Scoops Dessert Bar',
    local: 'Sharma Sweets',
    needed: 8,
    en: { type: 'Dessert bar', reward: 'a free scoop.', short: 'Free scoop', line: 'The after-dinner crowd and the weekend regulars' },
    hi: { type: 'मिठाई', reward: '250g काजू कतली मुफ़्त।', short: 'मुफ़्त काजू कतली', line: 'त्योहार की भीड़ और रोज़ के ग्राहक' },
    ml: { type: 'സ്വീറ്റ്സ് കട', reward: '250g കാജു കട്‌ലി ഫ്രീ.', short: 'ഫ്രീ കാജു കട്‌ലി', line: 'ഉത്സവത്തിരക്കും ദിവസേനയുള്ള സ്ഥിരക്കാരും' },
  },
];

type ExampleState = { ex: Example; pick: (key: ExKey) => void; picked: boolean };
const ExampleContext = createContext<ExampleState>({ ex: EXAMPLES[0], pick: () => {}, picked: false });
const useExample = () => useContext(ExampleContext);

/** The examples with their Indian names, for Hindi and Malayalam. */
const LOCAL_EXAMPLES: Example[] = EXAMPLES.map((e) => (e.local ? { ...e, shop: e.local } : e));

/** The customer's number in the demos: a made-up one, written the local way. */
const DEMO_NUMBER: Record<Lang, string> = { en: '555 012 3456', hi: '98765 43210', ml: '98765 43210' };

const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;

// ---------------------------------------------------------------- copy

const COPY = {
  en: {
    login: 'Log in',
    start: 'Start free',
    heroCta: 'Make my stamp card',
    open: 'Open your shop',
    eyebrow: 'Digital stamp cards for local businesses',
    h1: 'The stamp card your customers',
    h1b: 'can’t lose.',
    sub: 'Type a customer’s phone number at the counter. They collect a stamp on every visit and a reward when the card is full, so they come back to you instead of the place next door. No app, no plastic, no QR codes.',
    watch: 'See it at the counter',
    note: 'Free to start · No payment details · Ready in a minute',
    paperCard: 'Loyalty card',
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
    filmTitle: '15 seconds. Two taps. One more reason to come back.',
    scenes: [
      ['The customer says their number', 'No app to open, no QR to scan. Regulars pop up after 4 digits.'],
      ['You tap “Add visit”', 'One big button. A stamp lands on their card.'],
      ['Their card arrives on WhatsApp', 'They see how many visits are left, in their own language.'],
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
      ['Type the number, tap Add visit', 'Any phone, tablet or computer at the counter. Their card lands on WhatsApp right away.'],
      ['Give the reward when the app says', 'The screen turns orange on the last visit. Tap Given — done.'],
    ],
    howEvery: 'Every',
    howVisits: 'visits',
    howReward: 'Reward',
    howPhone: 'Customer’s number',
    everyKicker: 'Any shop with regulars',
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
      ['Your customers stay yours', 'We never sell your list or use it for ads. Download it on Pro, or just ask us for it.', Lock],
    ] as const,
    autoKicker: 'Pro',
    autoTitle: 'The follow-ups you never have time for. One tap each.',
    autoSub: 'Regularhood tells you who to message and has the message ready. You send it from your own WhatsApp in one tap, in your shop’s name.',
    // One customer's month: the messages the shop sends from its own phone, and what they say.
    autoSteps: [
      {
        when: 'After a visit',
        tag: (n: number) => `Visit ${n - 2}`,
        time: '6:42 pm',
        text: (shop: string, n: number, r: string) => `Your visit at ${shop} is stamped.\n${n - 2} of ${n} stamps — 2 more for ${r}.`,
        button: 'See my card',
      },
      {
        when: 'If they stop coming',
        tag: () => 'On your “Not seen” list',
        time: '11:30 am',
        text: (shop: string, _n: number, r: string) => `We miss you at ${shop}. Two more visits and the ${r} is yours.`,
        button: 'See my card',
      },
      {
        when: 'After the reward',
        tag: () => 'Ask at the counter',
        time: '7:20 pm',
        text: (shop: string) => `Thank you for visiting ${shop}. A Google review would help us a lot.`,
        button: 'Rate on Google',
      },
    ],
    autoAlso: [
      ['Unlimited customers', 'Every regular gets a card. No cap.'],
      ['Your logo on every card', 'Customers see your shop’s logo when they open their card.'],
      ['Download everything', 'Customers and visit history as a spreadsheet, anytime.'],
    ] as const,
    autoCta: 'See Pro prices',
    shopsKicker: 'Already on Regularhood',
    shopsTitle: 'Shops using Regularhood',
    priceKicker: 'Price',
    // The numbers come from Admin → Plans (/api/public/founding); the prerendered page shows the defaults.
    priceTitle: 'Free to start. Pro when your regulars grow.',
    priceSub: (free: number) =>
      `Start free with up to ${free} customers. Go Pro for no limit, win-back reminders, Google reviews and your logo. Pay for a month or a year. Nothing is auto-debited.`,
    priceFree: { name: 'Free', per: 'forever', limit: (n: number) => `Up to ${n} customers` },
    priceList: ['Customer cards in English, Hindi and Malayalam', 'Send their card on WhatsApp in one tap', 'Counter poster and WhatsApp status image', 'Daily backups'],
    pro: {
      name: 'Pro',
      monthly: 'a month',
      yearly: (price: string, month: string, save: number) => `or ${price} a year${save > 0 ? ` (${month}/month, save ${save}%)` : ''}`,
      list: [
        'Unlimited customers',
        '“Not seen” list with one-tap WhatsApp reminders',
        'Google reviews: a button on the card, an ask after each reward',
        'Your logo on every customer card',
        'Download customers and visits (CSV)',
      ],
      cta: 'Start free, upgrade anytime',
    },
    create: 'Create your shop',
    faqKicker: 'Questions',
    faqTitle: 'Asked at the counter.',
    finalTitle: 'Your next regular walks in today.',
    finalSub: 'Set up takes a minute. Their first stamp can land before lunch.',
    worth: {
      kicker: 'Do the maths',
      title: 'What is one more visit worth?',
      sub: 'Move the sliders to match your shop. The gain is customers you already have, coming back a little more often.',
      bill: 'Average bill',
      back: 'Customers who come one extra time a month',
      month: 'more a month',
      year: (y: string) => `That’s ${y} a year.`,
      foot: 'And Regularhood is free to start.',
    },
    footer: { how: 'How it works', price: 'Price', shops: 'For your kind of shop', cities: 'Shops by city', guides: 'Guides', popular: 'Popular guides', login: 'Shop log in', privacy: 'Privacy', terms: 'Terms', refunds: 'Refunds', shipping: 'Delivery', contact: 'Contact', tag: 'From first visit to “the usual”.' },
  },
  hi: {
    login: 'लॉग इन',
    start: 'मुफ़्त शुरू करें',
    heroCta: 'मेरा स्टैम्प कार्ड बनाएँ',
    open: 'अपनी दुकान खोलें',
    eyebrow: 'हर लोकल दुकान के लिए लॉयल्टी कार्ड',
    h1: 'हर ग्राहक को बनाइए',
    h1b: 'पक्का ग्राहक।',
    sub: 'हर विज़िट पर ग्राहक को स्टैम्प, कार्ड भरते ही इनाम — तो वो बगल वाली दुकान नहीं, आपके पास लौटता है। ग्राहक को बस अपना फ़ोन नंबर बताना है।',
    watch: 'देखें कैसे चलता है',
    note: 'मुफ़्त · कोई पेमेंट नहीं · 1 मिनट में तैयार',
    paperCard: 'लॉयल्टी कार्ड',
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
    filmTitle: '15 सेकंड। दो टैप। लौटकर आने की एक और वजह।',
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
      ['नंबर लिखें, विज़िट जोड़ें', 'काउंटर पर कोई भी फ़ोन, टैबलेट या कंप्यूटर। ग्राहक का कार्ड तुरंत WhatsApp पर पहुँचता है।'],
      ['ऐप बताए तब इनाम दें', 'आखिरी विज़िट पर स्क्रीन नारंगी हो जाती है। “दे दिया” दबाएँ — हो गया।'],
    ],
    howEvery: 'हर',
    howVisits: 'विज़िट पर',
    howReward: 'इनाम',
    howPhone: 'ग्राहक का नंबर',
    everyKicker: 'हर दुकान के लिए',
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
      ['आपके ग्राहक आपके ही रहें', 'हम आपकी लिस्ट न बेचते हैं, न विज्ञापन में इस्तेमाल करते हैं। Pro पर डाउनलोड करें, या हमसे माँग लें।', Lock],
    ] as const,
    autoKicker: 'Pro',
    autoTitle: 'जिन ग्राहकों को मैसेज करने का टाइम नहीं मिलता, अब एक टैप में।',
    autoSub: 'Regularhood बताता है किसे मैसेज करना है, और मैसेज तैयार रखता है। आप अपने WhatsApp से, अपनी दुकान के नाम से, एक टैप में भेजते हैं।',
    autoSteps: [
      {
        when: 'विज़िट के बाद',
        tag: (n: number) => `विज़िट ${n - 2}`,
        time: 'शाम 6:42',
        text: (shop: string, n: number, r: string) => `${shop} पर आपकी विज़िट जुड़ गई।\n${n} में से ${n - 2} स्टैम्प — ${r} के लिए बस 2 और।`,
        button: 'मेरा कार्ड देखें',
      },
      {
        when: 'आना बंद करें तो',
        tag: () => '“नहीं आए” लिस्ट में',
        time: 'सुबह 11:30',
        text: (shop: string, _n: number, r: string) => `${shop} पर आपकी याद आ रही है। बस दो और विज़िट, फिर ${r} आपका।`,
        button: 'मेरा कार्ड देखें',
      },
      {
        when: 'इनाम के बाद',
        tag: () => 'काउंटर पर पूछें',
        time: 'शाम 7:20',
        text: (shop: string) => `${shop} पर आने के लिए धन्यवाद। आपका Google रिव्यू हमारी बहुत मदद करेगा।`,
        button: 'Google पर रिव्यू दें',
      },
    ],
    autoAlso: [
      ['जितने चाहें ग्राहक', 'हर रेगुलर को कार्ड। कोई लिमिट नहीं।'],
      ['हर कार्ड पर आपका लोगो', 'ग्राहक कार्ड खोलें तो आपकी दुकान का लोगो दिखे।'],
      ['सब डाउनलोड करें', 'ग्राहक और विज़िट की पूरी हिस्ट्री, स्प्रेडशीट में, कभी भी।'],
    ] as const,
    autoCta: 'Pro की कीमत देखें',
    shopsKicker: 'Regularhood पर पहले से',
    shopsTitle: 'ये दुकानें Regularhood इस्तेमाल करती हैं',
    priceKicker: 'कीमत',
    priceTitle: 'शुरू करना मुफ़्त है। ग्राहक बढ़ें तो Pro।',
    priceSub: (free: number) =>
      `${free} ग्राहकों तक मुफ़्त शुरू करें। Pro में कोई लिमिट नहीं, रुके ग्राहकों को रिमाइंडर, Google रिव्यू और आपका लोगो। एक महीने या एक साल के लिए पेमेंट करें। कोई ऑटो-डेबिट नहीं।`,
    priceFree: { name: 'फ़्री', per: 'हमेशा', limit: (n: number) => `${n} ग्राहकों तक` },
    priceList: ['हिंदी और English में ग्राहक कार्ड', 'एक टैप में WhatsApp पर कार्ड भेजें', 'काउंटर पोस्टर और WhatsApp स्टेटस इमेज', 'रोज़ बैकअप'],
    pro: {
      name: 'Pro',
      monthly: 'महीने का',
      yearly: (price: string, month: string, save: number) => `या ${price} साल का${save > 0 ? ` (${month}/महीना, ${save}% बचत)` : ''}`,
      list: [
        'जितने चाहें ग्राहक',
        '“नहीं आए” लिस्ट, एक टैप में WhatsApp रिमाइंडर',
        'Google रिव्यू: कार्ड पर बटन, हर इनाम के बाद रिक्वेस्ट',
        'हर ग्राहक कार्ड पर आपका लोगो',
        'ग्राहक और विज़िट डाउनलोड करें (CSV)',
      ],
      cta: 'मुफ़्त शुरू करें, कभी भी अपग्रेड करें',
    },
    create: 'अपनी दुकान बनाएँ',
    faqKicker: 'सवाल',
    faqTitle: 'काउंटर पर पूछे गए सवाल।',
    finalTitle: 'आपका अगला पक्का ग्राहक आज ही आएगा।',
    finalSub: 'सेटअप में एक मिनट। पहला स्टैम्प आज ही लग सकता है।',
    worth: {
      kicker: 'हिसाब लगाइए',
      title: 'एक और विज़िट से कितना फ़ायदा?',
      sub: 'अपनी दुकान के हिसाब से स्लाइडर खिसकाइए। फ़ायदा उन्हीं ग्राहकों से है जो पहले से आते हैं — बस थोड़ा ज़्यादा आएँ।',
      bill: 'औसत बिल',
      back: 'महीने में एक बार ज़्यादा आने वाले ग्राहक',
      month: 'हर महीने ज़्यादा',
      year: (y: string) => `यानी साल में ${y}।`,
      foot: 'और Regularhood शुरू करना मुफ़्त है।',
    },
    footer: { how: 'कैसे काम करता है', price: 'कीमत', shops: 'आपकी तरह की दुकान के लिए', cities: 'शहर के हिसाब से', guides: 'गाइड', popular: 'लोकप्रिय गाइड', login: 'दुकान लॉग इन', privacy: 'प्राइवेसी', terms: 'शर्तें', refunds: 'रिफ़ंड', shipping: 'डिलीवरी', contact: 'संपर्क', tag: 'पहली विज़िट से “वही रोज़ वाला” तक।' },
  },
  ml: {
    login: 'ലോഗ് ഇൻ',
    start: 'സൗജന്യമായി തുടങ്ങൂ',
    heroCta: 'എന്റെ സ്റ്റാമ്പ് കാർഡ് ഉണ്ടാക്കൂ',
    open: 'നിങ്ങളുടെ കട തുറക്കൂ',
    eyebrow: 'ഓരോ ലോക്കൽ കടയ്ക്കും ഒരു ലോയൽറ്റി കാർഡ്',
    h1: 'ഓരോ കസ്റ്റമറെയും',
    h1b: 'സ്ഥിരം കസ്റ്റമറാക്കൂ.',
    sub: 'ഓരോ സന്ദർശനത്തിലും ഒരു സ്റ്റാമ്പ്, കാർഡ് നിറയുമ്പോൾ ഒരു സമ്മാനം — അതുകൊണ്ട് അവർ തൊട്ടടുത്ത കടയിലേക്കല്ല, നിങ്ങളുടെ അടുത്തേക്ക് തിരികെ വരും. അവരുടെ ഫോൺ നമ്പർ മാത്രം മതി.',
    watch: 'എങ്ങനെയെന്ന് കാണൂ',
    note: 'സൗജന്യം · പണം വേണ്ട · 1 മിനിറ്റിൽ റെഡി',
    paperCard: 'ലോയൽറ്റി കാർഡ്',
    pickLabel: 'നിങ്ങളുടേത് പോലെയുള്ള ഒരു കട തിരഞ്ഞെടുക്കൂ',
    demoHint: 'പരീക്ഷിച്ചു നോക്കൂ — “സന്ദർശനം ചേർക്കൂ” ടാപ്പ് ചെയ്യൂ',
    demoAdd: 'സന്ദർശനം ചേർക്കൂ',
    demoVisit: (n: number, of: number) => `സന്ദർശനം ${n} / ${of}`,
    demoLeft: (n: number, r: string) => `${r} കിട്ടാൻ ഇനി ${n} മാത്രം`,
    demoGive: (r: string) => `ഇപ്പോൾ ${r} കൊടുക്കൂ`,
    demoGiven: 'കൊടുത്തു',
    demoAgain: 'വീണ്ടും തുടങ്ങൂ',
    floatSent: 'കാർഡ് WhatsApp-ൽ അയച്ചു',
    floatVisit: '+1 സന്ദർശനം',
    rule: (n: number, r: string) => `ഓരോ ${n} സന്ദർശനത്തിനും → ${r}`,
    filmKicker: 'കൗണ്ടറിൽ കാണൂ',
    filmTitle: '15 സെക്കൻഡ്. രണ്ട് ടാപ്പ്. തിരികെ വരാൻ ഒരു കാരണം കൂടി.',
    scenes: [
      ['കസ്റ്റമർ നമ്പർ പറയുന്നു', 'ആപ്പ് തുറക്കേണ്ട, QR സ്കാൻ ചെയ്യേണ്ട. സ്ഥിരം കസ്റ്റമർമാർ 4 അക്കത്തിൽ തന്നെ തെളിയും.'],
      ['നിങ്ങൾ “സന്ദർശനം ചേർക്കൂ” ടാപ്പ് ചെയ്യുന്നു', 'ഒരു വലിയ ബട്ടൺ. അവരുടെ കാർഡിൽ ഒരു സ്റ്റാമ്പ് വീഴും.'],
      ['കാർഡ് WhatsApp-ൽ എത്തുന്നു', 'ഇനി എത്ര സന്ദർശനം ബാക്കിയുണ്ടെന്ന് അവർ കാണും — മലയാളത്തിലോ ഹിന്ദിയിലോ ഇംഗ്ലീഷിലോ.'],
      ['അവസാന സന്ദർശനത്തിൽ ആപ്പ് പറയും', '“ഇപ്പോൾ സമ്മാനം കൊടുക്കൂ.” “കൊടുത്തു” ടാപ്പ് ചെയ്താൽ കാർഡ് വീണ്ടും തുടങ്ങും.'],
    ],
    filmPlay: 'പ്ലേ',
    filmPause: 'നിർത്തൂ',
    filmReplay: 'വീണ്ടും കാണൂ',
    customerSays: 'എന്റെ നമ്പർ',
    waName: 'നിങ്ങളുടെ കാർഡ്',
    scrollKicker: 'ഇത് എന്തുകൊണ്ട് ഫലിക്കുന്നു',
    scrollTitle: 'ഏതാണ്ട് നിറഞ്ഞ കാർഡിനായി ആളുകൾ തിരികെ വരും.',
    scrollSub: 'ഓരോ സ്റ്റാമ്പും നാളെയും നിങ്ങളെ തന്നെ തിരഞ്ഞെടുക്കാൻ ഒരു കാരണമാണ് — തൊട്ടടുത്ത കടയെയല്ല.',
    scrollVisit: (k: number) => `സന്ദർശനം ${k}`,
    scrollStart: 'ആദ്യ സന്ദർശനം',
    scrollDone: (r: string) => `${r}!`,
    howKicker: 'എങ്ങനെ പ്രവർത്തിക്കുന്നു',
    howTitle: 'മൂന്ന് ഘട്ടം. പഠിക്കാൻ ഒന്നുമില്ല.',
    steps: [
      ['ഒരു നിയമം വെക്കൂ', 'എത്ര സന്ദർശനം, എന്ത് സമ്മാനം എന്ന് തിരഞ്ഞെടുക്കൂ. അതാണ് നിങ്ങളുടെ മുഴുവൻ ലോയൽറ്റി പ്രോഗ്രാം.'],
      ['നമ്പർ ടൈപ്പ് ചെയ്യൂ, സന്ദർശനം ചേർക്കൂ', 'കൗണ്ടറിലെ ഏത് ഫോണോ ടാബ്‌ലെറ്റോ കമ്പ്യൂട്ടറോ മതി. അവരുടെ കാർഡ് ഉടൻ WhatsApp-ൽ എത്തും.'],
      ['ആപ്പ് പറയുമ്പോൾ സമ്മാനം കൊടുക്കൂ', 'അവസാന സന്ദർശനത്തിൽ സ്ക്രീൻ ഓറഞ്ച് ആകും. “കൊടുത്തു” ടാപ്പ് ചെയ്യൂ — കഴിഞ്ഞു.'],
    ],
    howEvery: 'ഓരോ',
    howVisits: 'സന്ദർശനത്തിനും',
    howReward: 'സമ്മാനം',
    howPhone: 'കസ്റ്റമറുടെ നമ്പർ',
    everyKicker: 'സ്ഥിരം കസ്റ്റമർമാരുള്ള ഏത് കടയ്ക്കും',
    everyTitle: 'ഒരു കാർഡ്. എല്ലാ തരം കടകൾക്കും.',
    everySub: 'ആളുകൾ നിങ്ങളുടെ അടുത്ത് വീണ്ടും വീണ്ടും വരുന്നുണ്ടെങ്കിൽ, ഇത് നിങ്ങൾക്കുള്ളതാണ്. നിയമം നിങ്ങൾ തീരുമാനിക്കൂ — ചില ആശയങ്ങൾ ഇതാ.',
    everyRule: (n: number) => `ഓരോ ${n} സന്ദർശനത്തിനും`,
    everyTry: 'ഈ കടയ്ക്ക് വേണ്ടി കാണൂ',
    custKicker: 'നിങ്ങളുടെ കസ്റ്റമർമാർക്ക്',
    custTitle: 'ഒന്നും ഡൗൺലോഡ് ചെയ്യേണ്ട. ഒന്നും ഓർക്കേണ്ട.',
    custSub: 'അവരുടെ കാർഡ് അവരുടെ ഫോൺ നമ്പറിലാണ്. ഒറ്റ ടാപ്പിൽ WhatsApp-ൽ എത്തും; ഏത് ബ്രൗസറിലും തുറക്കും, സമ്മാനം എത്ര അടുത്താണെന്ന് കൃത്യമായി കാണിക്കും.',
    bubble: (shop: string, x: number, n: number, r: string) => `${shop}: സന്ദർശനം ${x}/${n} ✓ ${r} കിട്ടാൻ ഇനി ${n - x} മാത്രം! 🎁`,
    cardLeft: (n: number, r: string) => `${r} കിട്ടാൻ ഇനി ${n} സന്ദർശനം`,
    whyKicker: 'കടക്കാർ ഇത് തിരഞ്ഞെടുക്കുന്നത് എന്തുകൊണ്ട്',
    why: [
      ['കൗണ്ടറിൽ ആർക്കും ഉപയോഗിക്കാം', 'ഒരു കീപാഡും ഒരു ബട്ടണും. ട്രെയിനിങ് വേണ്ട, മാനുവൽ വേണ്ട.', Smartphone],
      ['എല്ലാ കസ്റ്റമർക്കും പറ്റും', 'ഫോൺ നമ്പർ മാത്രം മതി. സൈൻ-അപ്പ് വേണ്ട, ആപ്പ് വേണ്ട, QR വേണ്ട, PIN വേണ്ട.', Phone],
      ['വരാതായവരെ തിരികെ കൊണ്ടുവരൂ', '30 ദിവസമായി വരാത്തവരെ കാണൂ, ഒറ്റ ടാപ്പിൽ “ഞങ്ങൾ നിങ്ങളെ മിസ്സ് ചെയ്യുന്നു” അയക്കൂ.', UserX],
      ['നിങ്ങളുടെ കസ്റ്റമർമാർ നിങ്ങളുടേത് തന്നെ', 'നിങ്ങളുടെ ലിസ്റ്റ് ഞങ്ങൾ വിൽക്കില്ല, പരസ്യത്തിന് ഉപയോഗിക്കില്ല. Pro-യിൽ ഡൗൺലോഡ് ചെയ്യാം, അല്ലെങ്കിൽ ഞങ്ങളോട് ചോദിച്ചാൽ മതി.', Lock],
    ] as const,
    autoKicker: 'Pro',
    autoTitle: 'സമയം കിട്ടാത്ത ഫോളോ-അപ്പുകൾ. ഓരോന്നും ഒറ്റ ടാപ്പിൽ.',
    autoSub: 'ആർക്ക് മെസേജ് അയക്കണമെന്ന് Regularhood പറയും, മെസേജ് തയ്യാറാക്കി വെക്കും. നിങ്ങളുടെ സ്വന്തം WhatsApp-ൽ നിന്ന്, കടയുടെ പേരിൽ, ഒറ്റ ടാപ്പിൽ നിങ്ങൾ അയക്കും.',
    autoSteps: [
      {
        when: 'സന്ദർശനത്തിന് ശേഷം',
        tag: (n: number) => `സന്ദർശനം ${n - 2}`,
        time: 'വൈകുന്നേരം 6:42',
        text: (shop: string, n: number, r: string) => `${shop}-ലെ നിങ്ങളുടെ സന്ദർശനം രേഖപ്പെടുത്തി.\n${n}-ൽ ${n - 2} സ്റ്റാമ്പ് — ${r} കിട്ടാൻ ഇനി 2 മാത്രം.`,
        button: 'എന്റെ കാർഡ് കാണൂ',
      },
      {
        when: 'വരാതാകുമ്പോൾ',
        tag: () => '“വരാത്തവർ” ലിസ്റ്റിൽ',
        time: 'രാവിലെ 11:30',
        text: (shop: string, _n: number, r: string) => `${shop}-ൽ ഞങ്ങൾ നിങ്ങളെ മിസ്സ് ചെയ്യുന്നു. രണ്ട് സന്ദർശനം കൂടി, ${r} നിങ്ങളുടേത്.`,
        button: 'എന്റെ കാർഡ് കാണൂ',
      },
      {
        when: 'സമ്മാനത്തിന് ശേഷം',
        tag: () => 'കൗണ്ടറിൽ ചോദിക്കൂ',
        time: 'വൈകുന്നേരം 7:20',
        text: (shop: string) => `${shop} സന്ദർശിച്ചതിന് നന്ദി. ഒരു Google റിവ്യൂ ഞങ്ങൾക്ക് വലിയ സഹായമാണ്.`,
        button: 'Google-ൽ റിവ്യൂ ചെയ്യൂ',
      },
    ],
    autoAlso: [
      ['എത്ര കസ്റ്റമർമാർ വേണമെങ്കിലും', 'ഓരോ സ്ഥിരക്കാരനും ഒരു കാർഡ്. പരിധിയില്ല.'],
      ['ഓരോ കാർഡിലും നിങ്ങളുടെ ലോഗോ', 'കസ്റ്റമർ കാർഡ് തുറക്കുമ്പോൾ നിങ്ങളുടെ കടയുടെ ലോഗോ കാണും.'],
      ['എല്ലാം ഡൗൺലോഡ് ചെയ്യാം', 'കസ്റ്റമർമാരും സന്ദർശന ചരിത്രവും സ്പ്രെഡ്ഷീറ്റായി, എപ്പോൾ വേണമെങ്കിലും.'],
    ] as const,
    autoCta: 'Pro വില കാണൂ',
    shopsKicker: 'ഇതിനകം Regularhood-ൽ',
    shopsTitle: 'Regularhood ഉപയോഗിക്കുന്ന കടകൾ',
    priceKicker: 'വില',
    priceTitle: 'തുടങ്ങാൻ സൗജന്യം. സ്ഥിരക്കാർ കൂടുമ്പോൾ Pro.',
    priceSub: (free: number) =>
      `${free} കസ്റ്റമർമാർ വരെ സൗജന്യമായി തുടങ്ങൂ. Pro-യിൽ പരിധിയില്ല, വരാത്തവർക്ക് റിമൈൻഡർ, Google റിവ്യൂ, നിങ്ങളുടെ ലോഗോ. ഒരു മാസത്തേക്കോ ഒരു വർഷത്തേക്കോ പണമടയ്ക്കാം. ഓട്ടോ-ഡെബിറ്റ് ഇല്ല.`,
    priceFree: { name: 'ഫ്രീ', per: 'എന്നും', limit: (n: number) => `${n} കസ്റ്റമർമാർ വരെ` },
    priceList: ['മലയാളം, ഹിന്ദി, ഇംഗ്ലീഷ് ഭാഷകളിൽ കസ്റ്റമർ കാർഡ്', 'ഒറ്റ ടാപ്പിൽ കാർഡ് WhatsApp-ൽ അയക്കൂ', 'കൗണ്ടർ പോസ്റ്ററും WhatsApp സ്റ്റാറ്റസ് ഇമേജും', 'ദിവസേന ബാക്കപ്പ്'],
    pro: {
      name: 'Pro',
      monthly: 'മാസം',
      yearly: (price: string, month: string, save: number) => `അല്ലെങ്കിൽ വർഷം ${price}${save > 0 ? ` (മാസം ${month}, ${save}% ലാഭം)` : ''}`,
      list: [
        'എത്ര കസ്റ്റമർമാർ വേണമെങ്കിലും',
        '“വരാത്തവർ” ലിസ്റ്റ്, ഒറ്റ ടാപ്പിൽ WhatsApp റിമൈൻഡർ',
        'Google റിവ്യൂ: കാർഡിൽ ബട്ടൺ, ഓരോ സമ്മാനത്തിനും ശേഷം അഭ്യർത്ഥന',
        'ഓരോ കസ്റ്റമർ കാർഡിലും നിങ്ങളുടെ ലോഗോ',
        'കസ്റ്റമർമാരെയും സന്ദർശനങ്ങളും ഡൗൺലോഡ് ചെയ്യാം (CSV)',
      ],
      cta: 'സൗജന്യമായി തുടങ്ങൂ, എപ്പോൾ വേണമെങ്കിലും അപ്ഗ്രേഡ് ചെയ്യാം',
    },
    create: 'നിങ്ങളുടെ കട ഉണ്ടാക്കൂ',
    faqKicker: 'ചോദ്യങ്ങൾ',
    faqTitle: 'കൗണ്ടറിൽ ചോദിച്ചത്.',
    finalTitle: 'നിങ്ങളുടെ അടുത്ത സ്ഥിരം കസ്റ്റമർ ഇന്ന് തന്നെ വരും.',
    finalSub: 'സെറ്റപ്പിന് ഒരു മിനിറ്റ്. ആദ്യ സ്റ്റാമ്പ് ഇന്ന് തന്നെ വീഴാം.',
    worth: {
      kicker: 'കണക്ക് നോക്കൂ',
      title: 'ഒരു സന്ദർശനം കൂടി വന്നാൽ എത്ര?',
      sub: 'നിങ്ങളുടെ കടയ്ക്ക് അനുസരിച്ച് സ്ലൈഡർ നീക്കൂ. ഇപ്പോൾ വരുന്ന കസ്റ്റമർമാർ കുറച്ചുകൂടി വരുന്നതാണ് ലാഭം.',
      bill: 'ശരാശരി ബിൽ',
      back: 'മാസത്തിൽ ഒരു തവണ കൂടുതൽ വരുന്ന കസ്റ്റമർമാർ',
      month: 'മാസം അധികം',
      year: (y: string) => `അതായത് വർഷം ${y}.`,
      foot: 'Regularhood തുടങ്ങാൻ സൗജന്യമാണ്.',
    },
    footer: { how: 'എങ്ങനെ പ്രവർത്തിക്കുന്നു', price: 'വില', shops: 'നിങ്ങളുടെ തരം കടയ്ക്ക്', cities: 'നഗരം അനുസരിച്ച്', guides: 'ഗൈഡുകൾ', popular: 'Popular guides', login: 'കട ലോഗ് ഇൻ', privacy: 'പ്രൈവസി', terms: 'നിബന്ധനകൾ', refunds: 'റീഫണ്ട്', shipping: 'ഡെലിവറി', contact: 'ബന്ധപ്പെടുക', tag: 'ആദ്യ സന്ദർശനം മുതൽ “എന്നും വരുന്നയാൾ” വരെ.' },
  },
};

type Copy = (typeof COPY)['en'] | (typeof COPY)['hi'] | (typeof COPY)['ml'];

// Also published (in English) as FAQPage structured data by scripts/prerender.mjs.
export const FAQ = [
  ['Does it work for my kind of shop?', 'If the same people come back to you — a café, salon, barber, grocery, bakery, gym, dessert bar, pharmacy or car wash — yes. You choose the number of visits and the reward.'],
  ['Do my customers need an app?', 'No. You add their visit with their phone number. Their card opens from a WhatsApp link in any browser — nothing to install.'],
  ['What if a customer doesn’t have a smartphone?', 'It still works. Visits are counted on their phone number, and the app tells you at the counter when their reward is due.'],
  ['What do I need at the counter?', 'Any phone, tablet or computer with internet. Open Regularhood in the browser or add it to your home screen.'],
  ['Can someone get two stamps in one day?', 'No. A phone number counts once a day, so a stamp can’t be added twice by mistake. Any visit or reward can be undone.'],
  ['Can I change the rule later?', 'Yes. Change the number of visits or the reward anytime in Settings. Everyone keeps the visits they already have.'],
  ['What does it cost?', 'Free to start, up to the Free plan’s customer limit. Pro (prices above) removes the limit and adds a list of customers who stopped coming with one-tap WhatsApp reminders, Google reviews, your logo on the card and spreadsheet downloads. Pay for a month or a year; nothing renews by itself. Full refund within 7 days.'],
] as const;

const FAQ_HI = [
  ['क्या यह मेरी तरह की दुकान के लिए है?', 'अगर वही लोग बार-बार आते हैं — कैफ़े, सैलून, किराना, बेकरी, जिम, मिठाई की दुकान, मेडिकल या टिफ़िन — तो हाँ। विज़िट की संख्या और इनाम आप चुनते हैं।'],
  ['क्या ग्राहकों को ऐप चाहिए?', 'नहीं। आप उनके फ़ोन नंबर से विज़िट जोड़ते हैं। उनका कार्ड WhatsApp लिंक से किसी भी ब्राउज़र में खुलता है — कुछ इंस्टॉल नहीं करना।'],
  ['अगर ग्राहक के पास स्मार्टफ़ोन नहीं है?', 'तब भी चलेगा। विज़िट उनके फ़ोन नंबर पर गिनी जाती हैं, और इनाम कब देना है यह ऐप काउंटर पर ही बता देता है।'],
  ['काउंटर पर क्या चाहिए?', 'इंटरनेट वाला कोई भी फ़ोन, टैबलेट या कंप्यूटर। ब्राउज़र में Regularhood खोलें या होम स्क्रीन पर लगाएँ।'],
  ['क्या एक दिन में दो स्टैम्प लग सकते हैं?', 'नहीं। एक नंबर दिन में एक बार ही गिना जाता है, तो गलती से दो बार नहीं जुड़ता। कोई भी विज़िट या इनाम वापस लिया जा सकता है।'],
  ['क्या नियम बाद में बदल सकते हैं?', 'हाँ। सेटिंग्स में कभी भी विज़िट की संख्या या इनाम बदलें। सबकी पुरानी विज़िट बनी रहती हैं।'],
  ['इसकी कीमत क्या है?', 'फ़्री प्लान की ग्राहक लिमिट तक मुफ़्त। Pro (कीमत ऊपर देखें) में कोई लिमिट नहीं, साथ में आना बंद कर चुके ग्राहकों की लिस्ट और एक टैप में WhatsApp रिमाइंडर, Google रिव्यू, कार्ड पर आपका लोगो और स्प्रेडशीट डाउनलोड। एक महीने या एक साल के लिए पेमेंट करें; कोई ऑटो-डेबिट नहीं। UPI से पेमेंट; 7 दिन में पूरा रिफ़ंड।'],
] as const;

const FAQ_ML = [
  ['എന്റെ തരം കടയ്ക്ക് ഇത് പറ്റുമോ?', 'ഒരേ ആളുകൾ വീണ്ടും വീണ്ടും വരുന്നുണ്ടെങ്കിൽ — കഫേ, സലൂൺ, പലചരക്ക് കട, ബേക്കറി, ജിം, സ്വീറ്റ്സ് കട, ഫാർമസി, ടിഫിൻ സർവീസ് — പറ്റും. സന്ദർശനങ്ങളുടെ എണ്ണവും സമ്മാനവും നിങ്ങൾ തിരഞ്ഞെടുക്കൂ.'],
  ['എന്റെ കസ്റ്റമർമാർക്ക് ആപ്പ് വേണോ?', 'വേണ്ട. അവരുടെ ഫോൺ നമ്പർ വെച്ച് നിങ്ങൾ സന്ദർശനം ചേർക്കും. അവരുടെ കാർഡ് WhatsApp ലിങ്കിൽ നിന്ന് ഏത് ബ്രൗസറിലും തുറക്കും — ഒന്നും ഇൻസ്റ്റാൾ ചെയ്യേണ്ട.'],
  ['കസ്റ്റമർക്ക് സ്മാർട്ട്ഫോൺ ഇല്ലെങ്കിലോ?', 'എന്നാലും പ്രവർത്തിക്കും. സന്ദർശനങ്ങൾ അവരുടെ ഫോൺ നമ്പറിലാണ് കണക്കാക്കുന്നത്, സമ്മാനം എപ്പോൾ കൊടുക്കണമെന്ന് ആപ്പ് കൗണ്ടറിൽ തന്നെ പറയും.'],
  ['കൗണ്ടറിൽ എന്താണ് വേണ്ടത്?', 'ഇന്റർനെറ്റ് ഉള്ള ഏത് ഫോണോ ടാബ്‌ലെറ്റോ കമ്പ്യൂട്ടറോ. ബ്രൗസറിൽ Regularhood തുറക്കൂ, അല്ലെങ്കിൽ ഹോം സ്ക്രീനിൽ ചേർക്കൂ.'],
  ['ഒരു ദിവസം രണ്ട് സ്റ്റാമ്പ് കിട്ടുമോ?', 'ഇല്ല. ഒരു ഫോൺ നമ്പർ ദിവസം ഒരിക്കൽ മാത്രമേ കണക്കാക്കൂ, അതുകൊണ്ട് അബദ്ധത്തിൽ രണ്ട് തവണ ചേരില്ല. ഏത് സന്ദർശനവും സമ്മാനവും തിരിച്ചെടുക്കാം.'],
  ['നിയമം പിന്നീട് മാറ്റാമോ?', 'മാറ്റാം. സെറ്റിംഗ്സിൽ എപ്പോൾ വേണമെങ്കിലും സന്ദർശനങ്ങളുടെ എണ്ണമോ സമ്മാനമോ മാറ്റൂ. എല്ലാവരുടെയും പഴയ സന്ദർശനങ്ങൾ അതുപോലെ നിൽക്കും.'],
  ['ഇതിന് എത്ര ചെലവാകും?', 'ഫ്രീ പ്ലാനിന്റെ കസ്റ്റമർ പരിധി വരെ സൗജന്യം. Pro-യിൽ (വില മുകളിൽ കാണാം) പരിധിയില്ല, കൂടാതെ വരാതായ കസ്റ്റമർമാരുടെ ലിസ്റ്റും ഒറ്റ ടാപ്പിൽ WhatsApp റിമൈൻഡറും, Google റിവ്യൂ, കാർഡിൽ നിങ്ങളുടെ ലോഗോ, സ്പ്രെഡ്ഷീറ്റ് ഡൗൺലോഡ്. ഒരു മാസത്തേക്കോ ഒരു വർഷത്തേക്കോ പണമടയ്ക്കാം; ഓട്ടോ-ഡെബിറ്റ് ഇല്ല. UPI വഴി പണമടയ്ക്കാം; 7 ദിവസത്തിനകം മുഴുവൻ റീഫണ്ട്.'],
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
  // Scrolled past 24px: a 1px marker at y = 24 has left the screen. Watching it (rather than reading scrollY on
  // every scroll) never makes the browser lay the page out early.
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!marker.current || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting));
    io.observe(marker.current);
    return () => io.disconnect();
  }, []);
  return (
    <>
      <span className="lp-nav-marker" ref={marker} aria-hidden="true" />
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
              <button className={lang === 'ml' ? 'active' : ''} onClick={() => setLang('ml')} aria-pressed={lang === 'ml'} lang="ml" data-track="nav: Malayalam">
                മ
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
    </>
  );
}

// ---------------------------------------------------------------- hero

/** Shop picker: every section of the page follows it. */
function ShopPicker({ lang, className = '' }: { lang: Lang; className?: string }) {
  const { ex, pick } = useExample();
  const ref = useRef<HTMLDivElement>(null);
  // Where each button sits, read when ResizeObserver reports (just after a layout, so reading costs nothing). The
  // green pill then slides from the old button to the new one without measuring anything when the pick changes.
  const boxes = useRef<Partial<Record<ExKey, { x: number; y: number; w: number; h: number }>>>({});
  useEffect(() => {
    const el = ref.current;
    if (!el || !('ResizeObserver' in window)) return;
    const buttons = [...el.children] as HTMLElement[];
    const ro = new ResizeObserver(() => {
      for (const b of buttons) boxes.current[b.dataset.key as ExKey] = { x: b.offsetLeft, y: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight };
    });
    ro.observe(el);
    buttons.forEach((b) => ro.observe(b));
    return () => ro.disconnect();
  }, []);
  const shown = useRef(ex.key);
  useEffect(() => {
    const from = boxes.current[shown.current];
    const to = boxes.current[ex.key];
    shown.current = ex.key;
    const pill = ref.current?.querySelector<HTMLElement>('.on > .lp-picker-bg');
    if (!from || !to || from === to || !pill?.animate) return;
    // The pill fills its button's border box (inset -1px); start it over the old button.
    const start = { left: from.x - to.x - 1, top: from.y - to.y - 1, right: to.x + to.w - from.x - from.w - 1, bottom: to.y + to.h - from.y - from.h - 1 };
    pill.animate(
      [Object.fromEntries(Object.entries(start).map(([k, v]) => [k, `${v}px`])), { left: '-1px', top: '-1px', right: '-1px', bottom: '-1px' }],
      { duration: 380, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
    );
  }, [ex.key]);
  return (
    <div className={`lp-picker ${className}`} role="tablist" aria-label="Example shop" ref={ref}>
      {EXAMPLES.map((e) => {
        const Icon = e.icon;
        const on = e.key === ex.key;
        return (
          <button key={e.key} role="tab" aria-selected={on} className={on ? 'on' : ''} onClick={() => pick(e.key)} data-key={e.key} data-track={`picker: ${e.key}`}>
            {on && <span className="lp-picker-bg" />}
            <Icon size={16} />
            <span>{e[lang].type}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * The hero's one object: the customer's stamp card, as a paper ticket, with the shop's counter strip torn off the bottom.
 * Tap "Add visit" and a rubber stamp thumps into the next box; the card goes out on WhatsApp; the last visit turns the
 * card into the reward. The same thing the app does, without drawing a phone.
 */
function StampDemo({ c, lang }: { c: Copy; lang: Lang }) {
  const { ex } = useExample();
  const t = ex[lang];
  const [stamps, setStamps] = useState(Math.max(1, ex.needed - 3));
  const [reward, setReward] = useState(false);
  const [sent, setSent] = useState(0); // bumps on every visit, to replay the "sent" note
  useEffect(() => {
    setStamps(Math.max(1, ex.needed - 3));
    setReward(false);
    setSent(0);
  }, [ex]);
  useEffect(() => {
    if (!sent) return;
    const a = setTimeout(() => setSent(0), 2200);
    return () => clearTimeout(a);
  }, [sent]);

  const add = () => {
    const next = stamps + 1;
    setStamps(next);
    setSent((n) => n + 1);
    if (next >= ex.needed) setReward(true);
  };
  const given = () => {
    setStamps(0);
    setReward(false);
  };

  return (
    <div className="lp-demo lp-stampdemo">
      <div className={`lp-ticket ${reward ? 'is-reward' : ''}`}>
        <div className="lp-ticket-card">
          <div className="lp-ticket-head">
            <span className="lp-ticket-kicker">{c.paperCard}</span>
            <span className="lp-ticket-count" aria-live="polite">
              {c.demoVisit(stamps, ex.needed)}
            </span>
          </div>
          <strong className="lp-ticket-shop">{ex.shop}</strong>
          <span className="lp-ticket-rule">{c.rule(ex.needed, t.short)}</span>
          <div className="lp-ticket-boxes" style={{ '--cols': ex.needed <= 6 ? ex.needed : Math.ceil(ex.needed / 2) } as CSSProperties}>
            {Array.from({ length: ex.needed }, (_, i) => {
              const last = i === ex.needed - 1;
              const inked = i < stamps;
              return (
                <span
                  key={`${ex.key}-${i}-${inked}`}
                  className={`${inked ? 'inked' : ''} ${last ? 'last' : ''} ${inked && i === stamps - 1 ? 'fresh' : ''}`}
                  style={{ '--r': `${((i * 53) % 28) - 14}deg` } as CSSProperties}
                >
                  {inked ? <Check size={24} strokeWidth={3} /> : last ? <Gift size={22} /> : null}
                </span>
              );
            })}
          </div>
          {reward && (
            <m.div className="lp-ticket-reward" initial={{ scale: 1.8, opacity: 0, rotate: -18 }} animate={{ scale: 1, opacity: 1, rotate: -8 }} transition={{ type: 'spring', stiffness: 420, damping: 18 }}>
              <span>{c.demoGive(t.short)}</span>
            </m.div>
          )}
        </div>
        <div className="lp-ticket-counter">
          <span className="lp-ticket-number">{DEMO_NUMBER[lang]}</span>
          {reward ? (
            <button className="lp-ticket-btn orange" onClick={given} data-track="demo: Given">
              <Check size={18} strokeWidth={3} /> {c.demoGiven}
            </button>
          ) : (
            <button className="lp-ticket-btn" onClick={add} data-track="demo: Add visit">
              <Check size={18} strokeWidth={3} /> {c.demoAdd}
            </button>
          )}
        </div>
        <AnimatePresence>
          {sent > 0 && (
            <m.div key={sent} className="lp-ticket-sent" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
              <MessageCircle size={15} /> {c.floatSent}
            </m.div>
          )}
        </AnimatePresence>
      </div>
      <p className="lp-demo-hint">
        {reward ? (
          <button className="lp-link" onClick={given}>
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
  return (
    <section className="lp-hero" data-section="hero">
      <div className="lp-grain" aria-hidden="true" />
      <div className="lp-wrap lp-hero-grid">
        <div className="lp-hero-text">
          <p className="lp-eyebrow">
            <span className="lp-dot" /> {c.eyebrow}
          </p>
          <h1>
            <span className="lp-h1-line">{c.h1}</span>
            <span className="lp-h1-swap">
              <span className="lp-h1-reward">{c.h1b}</span>
            </span>
          </h1>
          <p className="lp-sub">{c.sub}</p>
          <div className="lp-cta">
            <a className="lp-btn lp-btn-glow" href={SIGNUP} data-track="hero: Start free">
              {c.heroCta} <ArrowRight size={18} />
            </a>
            <a className="lp-btn lp-btn-ghost" href="#film" data-track="hero: Watch it work">
              <Play size={16} fill="currentColor" /> {c.watch}
            </a>
          </div>
          <p className="lp-note">{c.note}</p>
          <div className="lp-pick-wrap lp-pick-wide">
            <span className="lp-pick-label">{c.pickLabel}</span>
            <ShopPicker lang={lang} className="hero" />
          </div>
        </div>
        <StampDemo c={c} lang={lang} />
        {/* phones: the picker sits under the phone it changes */}
        <div className="lp-pick-wrap lp-pick-narrow">
          <span className="lp-pick-label">{c.pickLabel}</span>
          <ShopPicker lang={lang} className="hero" />
        </div>
      </div>
    </section>
  );
}

/** More kinds of shop for the scrolling strip, after the examples. */
const MORE_SHOPS: Record<Lang, string[]> = {
  en: ['Barber', 'Pharmacy', 'Pet groomer', 'Juice bar', 'Laundry', 'Car wash', 'Florist'],
  hi: ['मेडिकल', 'टिफ़िन', 'जूस बार', 'लॉन्ड्री', 'कार वॉश'],
  ml: ['ഫാർമസി', 'ടിഫിൻ', 'ജ്യൂസ് ബാർ', 'ബ്യൂട്ടി പാർലർ', 'ലോൺട്രി'],
};

function Marquee({ lang }: { lang: Lang }) {
  const items = [...EXAMPLES.map((e) => e[lang].type), ...MORE_SHOPS[lang]];
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
              <AnimatePresence initial={false}>
                <m.div key={`${scene}-${lang}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }}>
                  <span className="lp-film-step">{String(scene + 1).padStart(2, '0')}</span>
                  <h3>{c.scenes[scene][0]}</h3>
                  <p>{c.scenes[scene][1]}</p>
                </m.div>
              </AnimatePresence>
            </div>

            <div className="lp-film-screen">
              {scene === 0 && (
                <div className="lp-film-say">
                  <span className="lp-film-bubble-say">
                    {c.customerSays} <b>{DEMO_NUMBER[lang]}</b>
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
                        <m.div className="lp-wa-msg" initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
                          {c.bubble(ex.shop, before, ex.needed, t.short)}
                          <div className="lp-wa-card">
                            <small>{c.waName}</small>
                            <Stamps on={before} of={ex.needed} size={ex.needed > 8 ? 13 : 17} />
                          </div>
                        </m.div>
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

/** Copies how far the page has scrolled through `target` (0..1) into `to`. */
function ScrollProgress({ target, to }: { target: RefObject<HTMLElement | null>; to: MotionValue<number> }) {
  const { scrollYProgress } = useScroll({ target, offset: ['start start', 'end end'] });
  useMotionValueEvent(scrollYProgress, 'change', (p) => to.set(p));
  return null;
}

function ScrollCard({ c, lang }: { c: Copy; lang: Lang }) {
  const { ex } = useExample();
  const ref = useRef<HTMLElement>(null);
  // Scroll tracking measures the section, so it starts only when the section comes near, not while the page loads.
  const near = useInView(ref, { once: true, margin: '50% 0px' });
  const progress = useMotionValue(0);
  const [k, setK] = useState(ex.needed);
  const [moved, setMoved] = useState(false);
  useMotionValueEvent(progress, 'change', (p) => {
    setMoved(true);
    setK(Math.min(ex.needed, Math.floor(p * (ex.needed + 0.6))));
  });
  // At rest (prerendered, or before any scroll) the card shows full.
  const on = moved ? k : ex.needed;
  const done = on >= ex.needed;
  const glow = useTransform(progress, [0, 1], [0.15, 1]);

  return (
    <section className="lp-scroll" ref={ref} data-section="why-card">
      {near && <ScrollProgress target={ref} to={progress} />}
      <div className="lp-scroll-sticky">
        <div className="lp-wrap lp-scroll-grid">
          <div>
            <p className="lp-kicker">{c.scrollKicker}</p>
            <h2 className="lp-h2">{c.scrollTitle}</h2>
            <p className="lp-sub">{c.scrollSub}</p>
          </div>
          <div className="lp-scroll-card-wrap">
            <m.div className="lp-scroll-glow" style={{ opacity: glow }} aria-hidden="true" />
            <div className={`lp-card big ${done ? 'done' : ''}`}>
              <span className="lp-card-shop">
                <LogoMark size={26} /> {ex.shop}
              </span>
              <span className="lp-card-rule">{c.rule(ex.needed, ex[lang].short)}</span>
              <Stamps on={on} of={ex.needed} size={ex.needed > 8 ? 30 : 44} pop={on - 1} />
              <div className="lp-scroll-count">
                <AnimatePresence initial={false}>
                  <m.strong key={`${on}-${done}-${lang}`} initial={{ y: 22, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -22, opacity: 0 }}>
                    {done ? c.scrollDone(ex[lang].short) : on === 0 ? c.scrollStart : c.scrollVisit(on)}
                  </m.strong>
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

/** What each step looks like on the counter's screen, for the picked example shop. Plays once as its card comes in. */
function HowArt({ step, c, lang }: { step: number; c: Copy; lang: Lang }) {
  const { ex } = useExample();
  const reward = ex[lang].short;
  const size = ex.needed > 8 ? 16 : 20;
  if (step === 0)
    return (
      <div className="lp-how-art lp-how-rule" aria-hidden="true">
        <div className="lp-how-row">
          <span>{c.howEvery}</span>
          <span className="lp-how-stepper">
            <i>−</i>
            <b key={ex.key}>{ex.needed}</b>
            <i>+</i>
          </span>
          <span>{c.howVisits}</span>
        </div>
        <div className="lp-how-reward">
          <Gift size={16} />
          <span>
            <small>{c.howReward}</small>
            {reward}
          </span>
        </div>
      </div>
    );
  if (step === 1)
    return (
      <div className="lp-how-art lp-how-add" aria-hidden="true">
        <div className="lp-how-input">
          <Phone size={15} />
          <span>
            <small>{c.howPhone}</small>
            <b className="lp-how-typed">{DEMO_NUMBER[lang]}</b>
          </span>
        </div>
        <span className="lp-how-btn">{c.demoAdd}</span>
        <div className="lp-how-wa">
          <MessageCircle size={14} />
          <span>{c.floatSent}</span>
          <Stamps on={ex.needed - 2} of={ex.needed} size={size - 4} pop={ex.needed - 3} />
        </div>
      </div>
    );
  return (
    <div className="lp-how-art lp-how-give" aria-hidden="true">
      <Stamps on={ex.needed} of={ex.needed} size={size} />
      <span className="lp-how-btn lp-how-btn-orange">
        <Gift size={16} /> {c.demoGive(reward)}
      </span>
      <span className="lp-how-given">
        <Check size={14} strokeWidth={3} /> {c.demoGiven}
      </span>
    </div>
  );
}

function How({ c, lang }: { c: Copy; lang: Lang }) {
  return (
    <section className="lp-section lp-wrap" id="how" data-section="how">
      <p className="lp-kicker rv">{c.howKicker}</p>
      <h2 className="lp-h2 rv">{c.howTitle}</h2>
      <ol className="lp-steps">
        {c.steps.map(([title, text], i) => (
          <li key={title} className="rv" style={{ '--i': i } as CSSProperties} onPointerMove={spotlight}>
            <HowArt step={i} c={c} lang={lang} />
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

/**
 * Pro, shown as one customer's month: the messages the shop sends from its own WhatsApp in one tap (Regularhood never
 * messages customers itself), on a WhatsApp chat background. Uses the shop picked at the top of the page.
 */
function Autopilot({ c, lang }: { c: Copy; lang: Lang }) {
  const { ex } = useExample();
  // "Free cappuccino" reads as "the free cappuccino" mid-sentence.
  const reward = lang === 'en' ? ex.en.short.charAt(0).toLowerCase() + ex.en.short.slice(1) : ex.hi.short;

  return (
    <section className="lp-section lp-wrap" id="founding" data-section="founding">
      <p className="lp-kicker rv">{c.autoKicker}</p>
      <h2 className="lp-h2 rv">{c.autoTitle}</h2>
      <p className="lp-sub rv">{c.autoSub}</p>

      <ol className="lp-auto rv">
        {c.autoSteps.map((step, i) => (
          <li key={step.when} style={{ '--i': i } as CSSProperties}>
            <div className="lp-auto-when">
              <span className="lp-auto-tag">{step.tag(ex.needed)}</span>
              <strong>{step.when}</strong>
            </div>
            <div className="lp-auto-bubble">
              <p>{step.text(ex.shop, ex.needed, reward)}</p>
              <span className="lp-auto-time">
                {step.time} <CheckCheck size={14} aria-hidden="true" />
              </span>
              <span className="lp-auto-btn">{step.button}</span>
            </div>
          </li>
        ))}
      </ol>

      <div className="lp-auto-foot rv">
        <dl className="lp-auto-also">
          {c.autoAlso.map(([title, text]) => (
            <div key={title}>
              <dt>{title}</dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>
        <a className="lp-link lp-auto-cta" href="#pricing" data-track="founding: See the price">
          {c.autoCta} <ArrowRight size={18} />
        </a>
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

type ListedShop = { name: string; visitsNeeded: number; rewardName: string };

/** Real shops the admin ticked in Admin → Shops. Not in the prerendered page; nothing at all until one is ticked. */
function ShopsUsing({ c }: { c: Copy }) {
  const [shops, setShops] = useState<ListedShop[]>([]);
  useEffect(() => {
    fetch('/api/public/shops')
      .then((r) => (r.ok ? r.json() : []))
      .then((list: ListedShop[]) => setShops(Array.isArray(list) ? list : []))
      .catch(() => {});
  }, []);
  if (!shops.length) return null;
  return (
    <section className="lp-section lp-wrap lp-using" id="shops">
      <p className="lp-kicker">{c.shopsKicker}</p>
      <h2 className="lp-h2">{c.shopsTitle}</h2>
      <ul className="lp-using-list">
        {shops.map((s, i) => (
          <li key={`${s.name}-${i}`} style={{ '--i': i, '--t': `${((i * 37) % 7) - 3}deg` } as CSSProperties}>
            <strong>{s.name}</strong>
            {s.rewardName && <small>{c.rule(s.visitsNeeded, s.rewardName)}</small>}
            <span className="lp-using-dots" aria-hidden="true">
              {Array.from({ length: Math.min(Math.max(s.visitsNeeded, 3), 10) }, (_, k) => (
                <i key={k} className={k < Math.ceil(Math.min(s.visitsNeeded, 10) / 2) ? 'on' : ''} />
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "Do the maths": the shop's own numbers turned into rupees. Only what the visitor sets, so no claim of ours. */
function Worth({ c }: { c: Copy }) {
  const w = c.worth;
  const abroad = useAbroad();
  const [bill, setBill] = useState(250);
  const [back, setBack] = useState(20);
  // Outside India the bill is in dollars: a smaller scale, set once the visitor's time zone is known.
  useEffect(() => {
    if (abroad) setBill(15);
  }, [abroad]);
  const month = bill * back;
  const rs = (n: number) => (abroad ? `$${n.toLocaleString('en-US')}` : `₹${n.toLocaleString('en-IN')}`);
  return (
    <section className="lp-section lp-wrap" id="worth" data-section="worth">
      <p className="lp-kicker rv">{w.kicker}</p>
      <h2 className="lp-h2 rv">{w.title}</h2>
      <p className="lp-sub rv">{w.sub}</p>
      <div className="lp-worth rv">
        <div className="lp-worth-inputs">
          <label>
            <span>
              {w.bill} <strong>{rs(bill)}</strong>
            </span>
            <input
              type="range"
              min={abroad ? 5 : 50}
              max={abroad ? 200 : 2000}
              step={abroad ? 5 : 50}
              value={bill}
              onChange={(e) => setBill(+e.target.value)}
              data-track="worth: bill"
            />
          </label>
          <label>
            <span>
              {w.back} <strong>{back}</strong>
            </span>
            <input type="range" min={5} max={200} step={5} value={back} onChange={(e) => setBack(+e.target.value)} data-track="worth: customers" />
          </label>
        </div>
        <div className="lp-worth-out" aria-live="polite">
          <p className="lp-worth-num">
            +{rs(month)} <span>{w.month}</span>
          </p>
          <p className="lp-worth-year">{w.year(rs(month * 12))}</p>
          <p className="lp-worth-foot">{w.foot}</p>
          <a className="lp-btn lp-btn-glow" href={SIGNUP} data-track="worth: Start free">
            {c.start} <ArrowRight size={18} />
          </a>
        </div>
      </div>
    </section>
  );
}

type Prices = { monthly: number; yearly: number; lifetime: number };
type Founding = { open: boolean; total: number; left: number; prices: Prices; usdPrices?: Prices; freeCustomers: number };

const inr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;
const usd = (cents: number) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;

/** Visitors outside India see Pro in US dollars, the way they would pay (the prerendered page shows rupees). */
function useAbroad() {
  const [abroad, setAbroad] = useState(false);
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setAbroad(Boolean(tz) && tz !== 'Asia/Kolkata' && tz !== 'Asia/Calcutta');
    } catch {
      // stays in rupees
    }
  }, []);
  return abroad;
}

/** Free and Pro: monthly or yearly (live; the prerendered page shows the default prices). */
function Pricing({ c }: { c: Copy }) {
  const [founding, setFounding] = useState<Founding>({
    open: false,
    total: 0,
    left: 0,
    prices: { monthly: 9_900, yearly: 79_900, lifetime: 149_900 },
    usdPrices: { monthly: 500, yearly: 3_900, lifetime: 7_900 },
    freeCustomers: 15,
  });
  const abroad = useAbroad();
  useEffect(() => {
    fetch('/api/public/founding')
      .then((r) => (r.ok ? r.json() : null))
      .then((f: Founding | null) => f && setFounding(f))
      .catch(() => {});
  }, []);
  const f = c.pro;
  const fmt = abroad ? usd : inr;
  const pr = abroad && founding.usdPrices ? founding.usdPrices : founding.prices;
  return (
    <section className="lp-section lp-wrap" id="pricing" data-section="pricing">
      <p className="lp-kicker rv">{c.priceKicker}</p>
      <h2 className="lp-h2 rv">{c.priceTitle}</h2>
      <p className="lp-sub rv">{c.priceSub(founding.freeCustomers)}</p>
      <div className="lp-price-cards">
        <div className="lp-price-card lp-price-free rv">
          <p className="lp-price-name">{c.priceFree.name}</p>
          <div>
            <strong className="lp-price-tag">{abroad ? '$0' : '₹0'}</strong> <span className="lp-price-per">{c.priceFree.per}</span>
          </div>
          <ul>
            {[c.priceFree.limit(founding.freeCustomers), ...c.priceList].map((item) => (
              <li key={item}>
                <Check size={18} /> {item}
              </li>
            ))}
          </ul>
          <a className="lp-btn lp-btn-glow" href={SIGNUP} data-track="pricing: Create your shop">
            {c.create} <ArrowRight size={18} />
          </a>
        </div>
        <div className="lp-price-card rv">
          <p className="lp-price-name">{f.name}</p>
          <div>
            <strong className="lp-price-tag">{fmt(pr.monthly)}</strong> <span className="lp-price-per">{f.monthly}</span>
            <p className="lp-price-alt">
              {f.yearly(
                fmt(pr.yearly),
                fmt(abroad ? Math.round(pr.yearly / 12) : Math.round(pr.yearly / 1200) * 100),
                Math.round((1 - pr.yearly / (pr.monthly * 12)) * 100),
              )}
            </p>
          </div>
          <ul>
            {f.list.map((item) => (
              <li key={item}>
                <Check size={18} /> {item}
              </li>
            ))}
          </ul>
          <a className="lp-btn lp-btn-glow" href={SIGNUP} data-track="pricing: Pro">
            {f.cta} <ArrowRight size={18} />
          </a>
        </div>
      </div>
    </section>
  );
}

function Faq({ c, lang }: { c: Copy; lang: Lang }) {
  const list = { en: FAQ, hi: FAQ_HI, ml: FAQ_ML }[lang];
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
  const [key, setKey] = useState<ExKey>('kirana');
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
  const tour = useExampleTour();
  // Hindi and Malayalam show the Indian shop names; English the international ones. The example objects stay the same
  // between renders (the demo phone starts over when its example changes).
  const ex = lang === 'en' ? tour.ex : LOCAL_EXAMPLES.find((e) => e.key === tour.ex.key)!;
  const example = useMemo(() => ({ ex, pick: tour.pick, picked: tour.picked }), [ex, tour.pick, tour.picked]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    // Animations without motion's layout features (nothing here animates layout): smaller, and nothing measures the
    // page while it loads.
    <LazyMotion features={domAnimation} strict>
      <ExampleContext.Provider value={example}>
        <div className="lp" lang={lang}>
          <Nav c={c} lang={lang} />
          <main>
            <Hero c={c} lang={lang} />
            <Marquee lang={lang} />
            <Film c={c} lang={lang} />
            <How c={c} lang={lang} />
            <ScrollCard c={c} lang={lang} />
            <EveryShop c={c} lang={lang} />
            <ForCustomers c={c} lang={lang} />
            <Why c={c} />
            <ShopsUsing c={c} />
            <Worth c={c} />
            <Autopilot c={c} lang={lang} />
            <Pricing c={c} />
            <Faq c={c} lang={lang} />
            <section className="lp-final" data-section="final">
              <div className="lp-wrap">
                <h2 className="rv">{c.finalTitle}</h2>
                <p className="rv">{c.finalSub}</p>
                <a className="lp-btn lp-btn-glow rv" href={SIGNUP} data-track="final: Start free">
                  {c.heroCta} <ArrowRight size={18} />
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
                <a href={lang === 'hi' ? '/hi/city' : '/city'} data-track="footer: Shops by city">
                  {c.footer.cities}
                </a>
                <a href={lang === 'hi' ? '/hi/guide' : '/guide'} data-track="footer: Guides">
                  {c.footer.guides}
                </a>
                <a href="/app" data-track="footer: Shop log in">
                  {c.footer.login}
                </a>
                <a href="/privacy" data-track="footer: Privacy">
                  {c.footer.privacy}
                </a>
                <a href="/terms" data-track="footer: Terms">
                  {c.footer.terms}
                </a>
                <a href="/refunds" data-track="footer: Refunds">
                  {c.footer.refunds}
                </a>
                <a href="/shipping" data-track="footer: Delivery">
                  {c.footer.shipping}
                </a>
                <a href="/contact" data-track="footer: Contact">
                  {c.footer.contact}
                </a>
              </nav>
              <nav aria-label={c.footer.popular} className="lp-foot-guides">
                <span>{c.footer.popular}:</span>
                {(lang === 'hi' ? FOOT_GUIDES.hi : FOOT_GUIDES.en).map(([href, label]) => (
                  <a key={href} href={href} data-track={`footer guide: ${href}`}>
                    {label}
                  </a>
                ))}
              </nav>
              <small>{c.footer.tag}</small>
            </div>
          </footer>
        </div>
      </ExampleContext.Provider>
    </LazyMotion>
  );
}
