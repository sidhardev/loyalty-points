import { createContext, useCallback, useContext, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type RefObject } from 'react';
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
// one example shop at a time — a café to start — and the visitor can switch to a salon, kirana, bakery, gym or sweet
// shop; every section follows the pick, which shows the same two taps work for any shop.
// English and Hindi; prerendered in English (scripts/prerender.mjs). Everything is readable without JavaScript and at
// rest; animations replay what the product does, and stop for reduced motion.

export const FONTS = 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&display=swap';
const SIGNUP = '/app#signup';

function useFonts() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONTS}"]`)) return;
    document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: FONTS }));
  }, []);
}

/** The homepage's languages: the app's three (i18n.tsx). A ?lang=ml link opens it in Malayalam. */
type Lang = 'en' | 'hi' | 'ml';

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
type Example = { key: ExKey; icon: typeof Coffee; shop: string; needed: number; en: ExText; hi: ExText; ml: ExText };

const EXAMPLES: Example[] = [
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
    key: 'salon',
    icon: Scissors,
    shop: 'Style Studio Salon',
    needed: 4,
    en: { type: 'Salon', reward: 'a free head massage.', short: 'Free head massage', line: 'Clients who come back every few weeks' },
    hi: { type: 'सैलून', reward: 'मुफ़्त हेड मसाज।', short: 'मुफ़्त हेड मसाज', line: 'हर कुछ हफ़्ते में लौटने वाले ग्राहक' },
    ml: { type: 'സലൂൺ', reward: 'ഒരു ഫ്രീ ഹെഡ് മസാജ്.', short: 'ഫ്രീ ഹെഡ് മസാജ്', line: 'ഏതാനും ആഴ്ച കൂടുമ്പോൾ തിരികെ വരുന്നവർ' },
  },
  {
    key: 'kirana',
    icon: ShoppingBasket,
    shop: 'Gupta Kirana Store',
    needed: 10,
    en: { type: 'Kirana', reward: '₹50 off the bill.', short: '₹50 off', line: 'Families who shop with you every week' },
    hi: { type: 'किराना', reward: 'बिल पर ₹50 की छूट।', short: '₹50 की छूट', line: 'हर हफ़्ते सामान लेने वाले परिवार' },
    ml: { type: 'പലചരക്ക് കട', reward: 'ബില്ലിൽ ₹50 കിഴിവ്.', short: '₹50 കിഴിവ്', line: 'എല്ലാ ആഴ്ചയും സാധനം വാങ്ങുന്ന കുടുംബങ്ങൾ' },
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
    shop: 'Sharma Sweets',
    needed: 8,
    en: { type: 'Sweet shop', reward: '250g kaju katli, free.', short: 'Free kaju katli', line: 'Festival rush and the daily regulars' },
    hi: { type: 'मिठाई', reward: '250g काजू कतली मुफ़्त।', short: 'मुफ़्त काजू कतली', line: 'त्योहार की भीड़ और रोज़ के ग्राहक' },
    ml: { type: 'സ്വീറ്റ്സ് കട', reward: '250g കാജു കട്‌ലി ഫ്രീ.', short: 'ഫ്രീ കാജു കട്‌ലി', line: 'ഉത്സവത്തിരക്കും ദിവസേനയുള്ള സ്ഥിരക്കാരും' },
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
      ['Type the number, tap Add visit', 'Any phone, tablet or computer at the counter. Their card lands on WhatsApp right away.'],
      ['Give the reward when the app says', 'The screen turns orange on the last visit. Tap Given — done.'],
    ],
    howEvery: 'Every',
    howVisits: 'visits',
    howReward: 'Reward',
    howPhone: 'Customer’s number',
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
      ['Your customers stay yours', 'We never sell your list or use it for ads. Download everything anytime.', Lock],
    ] as const,
    autoKicker: 'Founding Shop',
    autoTitle: 'The follow-ups you never have time for. Sent for you.',
    autoSub: 'Regularhood’s WhatsApp number writes to your customers at the right moment, in your shop’s name, while you keep serving.',
    // One customer's month: when each message goes out, and what it says.
    autoSteps: [
      {
        when: 'After every visit',
        tag: (n: number) => `Visit ${n - 2}`,
        time: '6:42 pm',
        text: (shop: string, n: number, r: string) => `Your visit at ${shop} is stamped.\n${n - 2} of ${n} stamps — 2 more for ${r}.`,
        button: 'See my card',
      },
      {
        when: 'When the card is full',
        tag: (n: number) => `Visit ${n}`,
        time: '7:15 pm',
        text: (shop: string, _n: number, r: string) => `Good news! Your ${r} at ${shop} is ready. Just tell your number next time.`,
        button: 'See my card',
      },
      {
        when: 'If they stop coming',
        tag: () => 'Day 30, once',
        time: '11:30 am',
        text: (shop: string, _n: number, r: string) => `We miss you at ${shop}. Two more visits and the ${r} is yours.`,
        button: 'See my card',
      },
      {
        when: 'After the reward',
        tag: () => 'Same day',
        time: '7:20 pm',
        text: (shop: string) => `Thank you for visiting ${shop}. A Google review would help us a lot.`,
        button: 'Rate on Google',
      },
    ],
    autoAlso: [
      ['Unlimited customers', 'Every regular gets a card. No cap.'],
      ['Your price, locked', 'Every feature we add later, at no extra cost.'],
      ['Your call', 'Hindi or English, each message on or off. Customers can reply STOP.'],
    ] as const,
    autoCta: 'See the Founding price',
    shopsKicker: 'Already on Regularhood',
    shopsTitle: 'Shops using Regularhood',
    priceKicker: 'Price',
    // The numbers come from Admin → Plans (/api/public/founding); the prerendered page shows the defaults.
    priceTitle: (seats: number) => `Free to start. A founding price for the first ${seats} shops.`,
    priceSub: (free: number) =>
      `Start free with up to ${free} customers. When your regulars grow, become a Founding Shop: WhatsApp messages and Google reviews on autopilot, at a price we won’t offer again.`,
    priceFree: { name: 'Free', per: 'forever', limit: (n: number) => `Up to ${n} customers` },
    priceList: ['Customer cards in Hindi and English', 'Send their card on WhatsApp in one tap', 'Counter poster and WhatsApp status image', 'Spreadsheet export and daily backups'],
    founding: {
      name: 'Founding Shop',
      once: 'once, for life',
      yearly: (price: string) => `or ${price} a year`,
      list: [
        'Unlimited customers',
        'Card and “reward ready” sent on WhatsApp for you',
        '“We miss you” reminders, sent by themselves',
        'Google review requests after every reward',
        'Founding price locked, with every new feature',
      ],
      only: (seats: number) => `Only for the first ${seats} shops`,
      left: (left: number, total: number) => (left ? `${left} of ${total} places left` : 'All places taken'),
      closed: 'Not on sale right now',
      cta: 'Start free, upgrade anytime',
    },
    create: 'Create your shop',
    faqKicker: 'Questions',
    faqTitle: 'Asked at the counter.',
    finalTitle: 'Your next regular walks in today.',
    finalSub: 'Set up takes one minute. Their first stamp can land today.',
    footer: { how: 'How it works', price: 'Price', shops: 'For your kind of shop', cities: 'Shops by city', guides: 'Guides', login: 'Shop log in', privacy: 'Privacy', terms: 'Terms', refunds: 'Refunds', shipping: 'Delivery', contact: 'Contact', tag: 'From first visit to “the usual”.' },
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
      ['नंबर लिखें, विज़िट जोड़ें', 'काउंटर पर कोई भी फ़ोन, टैबलेट या कंप्यूटर। ग्राहक का कार्ड तुरंत WhatsApp पर पहुँचता है।'],
      ['ऐप बताए तब इनाम दें', 'आखिरी विज़िट पर स्क्रीन नारंगी हो जाती है। “दे दिया” दबाएँ — हो गया।'],
    ],
    howEvery: 'हर',
    howVisits: 'विज़िट पर',
    howReward: 'इनाम',
    howPhone: 'ग्राहक का नंबर',
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
      ['आपके ग्राहक आपके ही रहें', 'हम आपकी लिस्ट न बेचते हैं, न विज्ञापन में इस्तेमाल करते हैं। कभी भी सब डाउनलोड करें।', Lock],
    ] as const,
    autoKicker: 'फ़ाउंडिंग शॉप',
    autoTitle: 'जिन ग्राहकों को मैसेज करने का टाइम नहीं मिलता, उन्हें हम करते हैं।',
    autoSub: 'Regularhood का WhatsApp नंबर सही वक्त पर, आपकी दुकान के नाम से ग्राहकों को लिखता है, और आप काउंटर संभालते रहते हैं।',
    autoSteps: [
      {
        when: 'हर विज़िट के बाद',
        tag: (n: number) => `विज़िट ${n - 2}`,
        time: 'शाम 6:42',
        text: (shop: string, n: number, r: string) => `${shop} पर आपकी विज़िट जुड़ गई।\n${n} में से ${n - 2} स्टैम्प — ${r} के लिए बस 2 और।`,
        button: 'मेरा कार्ड देखें',
      },
      {
        when: 'कार्ड पूरा होने पर',
        tag: (n: number) => `विज़िट ${n}`,
        time: 'शाम 7:15',
        text: (shop: string, _n: number, r: string) => `खुशखबरी! ${shop} पर आपका ${r} तैयार है। अगली बार बस नंबर बताइए।`,
        button: 'मेरा कार्ड देखें',
      },
      {
        when: 'आना बंद करें तो',
        tag: () => '30वें दिन, एक बार',
        time: 'सुबह 11:30',
        text: (shop: string, _n: number, r: string) => `${shop} पर आपकी याद आ रही है। बस दो और विज़िट, फिर ${r} आपका।`,
        button: 'मेरा कार्ड देखें',
      },
      {
        when: 'इनाम के बाद',
        tag: () => 'उसी दिन',
        time: 'शाम 7:20',
        text: (shop: string) => `${shop} पर आने के लिए धन्यवाद। आपका Google रिव्यू हमारी बहुत मदद करेगा।`,
        button: 'Google पर रिव्यू दें',
      },
    ],
    autoAlso: [
      ['जितने चाहें ग्राहक', 'हर रेगुलर को कार्ड। कोई लिमिट नहीं।'],
      ['आपकी कीमत, लॉक', 'आगे आने वाले सारे फ़ीचर, बिना ज़्यादा पैसे।'],
      ['आपकी मर्ज़ी', 'हिंदी या English, हर मैसेज चालू/बंद। ग्राहक STOP लिख सकते हैं।'],
    ] as const,
    autoCta: 'फ़ाउंडिंग कीमत देखें',
    shopsKicker: 'Regularhood पर पहले से',
    shopsTitle: 'ये दुकानें Regularhood इस्तेमाल करती हैं',
    priceKicker: 'कीमत',
    priceTitle: (seats: number) => `शुरू करना मुफ़्त है। पहली ${seats} दुकानों के लिए फ़ाउंडिंग कीमत।`,
    priceSub: (free: number) =>
      `${free} ग्राहकों तक मुफ़्त शुरू करें। ग्राहक बढ़ें तो फ़ाउंडिंग शॉप बनें: WhatsApp मैसेज और Google रिव्यू अपने आप, ऐसी कीमत पर जो दोबारा नहीं मिलेगी।`,
    priceFree: { name: 'फ़्री', per: 'हमेशा', limit: (n: number) => `${n} ग्राहकों तक` },
    priceList: ['हिंदी और English में ग्राहक कार्ड', 'एक टैप में WhatsApp पर कार्ड भेजें', 'काउंटर पोस्टर और WhatsApp स्टेटस इमेज', 'स्प्रेडशीट डाउनलोड और रोज़ बैकअप'],
    founding: {
      name: 'फ़ाउंडिंग शॉप',
      once: 'एक बार, हमेशा के लिए',
      yearly: (price: string) => `या ${price} साल का`,
      list: [
        'जितने चाहें ग्राहक',
        'कार्ड और “इनाम तैयार” WhatsApp पर अपने आप',
        '“आपकी याद आ रही है” रिमाइंडर, अपने आप',
        'हर इनाम के बाद Google रिव्यू की रिक्वेस्ट',
        'फ़ाउंडिंग कीमत लॉक, हर नए फ़ीचर के साथ',
      ],
      only: (seats: number) => `सिर्फ़ पहली ${seats} दुकानों के लिए`,
      left: (left: number, total: number) => (left ? `${total} में से ${left} जगह बाकी` : 'सारी जगहें भर गईं'),
      closed: 'अभी उपलब्ध नहीं',
      cta: 'मुफ़्त शुरू करें, कभी भी अपग्रेड करें',
    },
    create: 'अपनी दुकान बनाएँ',
    faqKicker: 'सवाल',
    faqTitle: 'काउंटर पर पूछे गए सवाल।',
    finalTitle: 'आपका अगला पक्का ग्राहक आज ही आएगा।',
    finalSub: 'सेटअप में एक मिनट। पहला स्टैम्प आज ही लग सकता है।',
    footer: { how: 'कैसे काम करता है', price: 'कीमत', shops: 'आपकी तरह की दुकान के लिए', cities: 'शहर के हिसाब से', guides: 'गाइड', login: 'दुकान लॉग इन', privacy: 'प्राइवेसी', terms: 'शर्तें', refunds: 'रिफ़ंड', shipping: 'डिलीवरी', contact: 'संपर्क', tag: 'पहली विज़िट से “वही रोज़ वाला” तक।' },
  },
  ml: {
    login: 'ലോഗ് ഇൻ',
    start: 'സൗജന്യമായി തുടങ്ങൂ',
    open: 'നിങ്ങളുടെ കട തുറക്കൂ',
    eyebrow: 'ഓരോ ലോക്കൽ കടയ്ക്കും ഒരു ലോയൽറ്റി കാർഡ്',
    h1: (n: number) => `ഓരോ ${n}-ാം സന്ദർശനത്തിലും,`,
    sub: 'കസ്റ്റമറുടെ ഫോൺ നമ്പറിൽ ഒരു സ്റ്റാമ്പ് കാർഡ്. നമ്പർ ടൈപ്പ് ചെയ്ത് “സന്ദർശനം ചേർക്കൂ” ടാപ്പ് ചെയ്യൂ — സമ്മാനം എപ്പോൾ കൊടുക്കണമെന്ന് ആപ്പ് പറയും. കസ്റ്റമർക്ക് ആപ്പ് വേണ്ട, QR വേണ്ട, പോയിന്റുകളും വേണ്ട.',
    watch: 'എങ്ങനെയെന്ന് കാണൂ',
    note: 'സൗജന്യം · കാർഡ് വേണ്ട · 1 മിനിറ്റിൽ റെഡി',
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
    filmTitle: '15 സെക്കൻഡ്. രണ്ട് ടാപ്പ്. ജീവിതകാലം മുഴുവൻ ഒരു കസ്റ്റമർ.',
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
    everyKicker: 'കഫേകൾക്ക് മാത്രമല്ല',
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
      ['നിങ്ങളുടെ കസ്റ്റമർമാർ നിങ്ങളുടേത് തന്നെ', 'നിങ്ങളുടെ ലിസ്റ്റ് ഞങ്ങൾ വിൽക്കില്ല, പരസ്യത്തിന് ഉപയോഗിക്കില്ല. എപ്പോൾ വേണമെങ്കിലും എല്ലാം ഡൗൺലോഡ് ചെയ്യാം.', Lock],
    ] as const,
    autoKicker: 'ഫൗണ്ടിങ് ഷോപ്പ്',
    autoTitle: 'സമയം കിട്ടാത്ത ഫോളോ-അപ്പുകൾ. നിങ്ങൾക്കായി ഞങ്ങൾ അയക്കും.',
    autoSub: 'Regularhood-ന്റെ WhatsApp നമ്പർ ശരിയായ സമയത്ത്, നിങ്ങളുടെ കടയുടെ പേരിൽ കസ്റ്റമർമാർക്ക് എഴുതും, നിങ്ങൾ കൗണ്ടറിൽ തിരക്കിലായിരിക്കുമ്പോഴും.',
    autoSteps: [
      {
        when: 'ഓരോ സന്ദർശനത്തിനും ശേഷം',
        tag: (n: number) => `സന്ദർശനം ${n - 2}`,
        time: 'വൈകുന്നേരം 6:42',
        text: (shop: string, n: number, r: string) => `${shop}-ലെ നിങ്ങളുടെ സന്ദർശനം രേഖപ്പെടുത്തി.\n${n}-ൽ ${n - 2} സ്റ്റാമ്പ് — ${r} കിട്ടാൻ ഇനി 2 മാത്രം.`,
        button: 'എന്റെ കാർഡ് കാണൂ',
      },
      {
        when: 'കാർഡ് നിറയുമ്പോൾ',
        tag: (n: number) => `സന്ദർശനം ${n}`,
        time: 'വൈകുന്നേരം 7:15',
        text: (shop: string, _n: number, r: string) => `സന്തോഷ വാർത്ത! ${shop}-ൽ നിങ്ങളുടെ ${r} തയ്യാർ. അടുത്ത തവണ നമ്പർ പറഞ്ഞാൽ മതി.`,
        button: 'എന്റെ കാർഡ് കാണൂ',
      },
      {
        when: 'വരാതാകുമ്പോൾ',
        tag: () => '30-ാം ദിവസം, ഒരിക്കൽ',
        time: 'രാവിലെ 11:30',
        text: (shop: string, _n: number, r: string) => `${shop}-ൽ ഞങ്ങൾ നിങ്ങളെ മിസ്സ് ചെയ്യുന്നു. രണ്ട് സന്ദർശനം കൂടി, ${r} നിങ്ങളുടേത്.`,
        button: 'എന്റെ കാർഡ് കാണൂ',
      },
      {
        when: 'സമ്മാനത്തിന് ശേഷം',
        tag: () => 'അതേ ദിവസം',
        time: 'വൈകുന്നേരം 7:20',
        text: (shop: string) => `${shop} സന്ദർശിച്ചതിന് നന്ദി. ഒരു Google റിവ്യൂ ഞങ്ങൾക്ക് വലിയ സഹായമാണ്.`,
        button: 'Google-ൽ റിവ്യൂ ചെയ്യൂ',
      },
    ],
    autoAlso: [
      ['എത്ര കസ്റ്റമർമാർ വേണമെങ്കിലും', 'ഓരോ സ്ഥിരക്കാരനും ഒരു കാർഡ്. പരിധിയില്ല.'],
      ['നിങ്ങളുടെ വില, ലോക്ക്', 'ഇനി വരുന്ന എല്ലാ ഫീച്ചറുകളും, അധിക പണം ഇല്ലാതെ.'],
      ['നിങ്ങളുടെ ഇഷ്ടം', 'ഓരോ മെസേജും ഓൺ/ഓഫ് ചെയ്യാം. ഇപ്പോൾ ഹിന്ദിയിലും ഇംഗ്ലീഷിലും, മലയാളം ഉടൻ. കസ്റ്റമർക്ക് STOP എന്ന് മറുപടി നൽകാം.'],
    ] as const,
    autoCta: 'ഫൗണ്ടിങ് വില കാണൂ',
    shopsKicker: 'ഇതിനകം Regularhood-ൽ',
    shopsTitle: 'Regularhood ഉപയോഗിക്കുന്ന കടകൾ',
    priceKicker: 'വില',
    priceTitle: (seats: number) => `തുടങ്ങാൻ സൗജന്യം. ആദ്യത്തെ ${seats} കടകൾക്ക് ഫൗണ്ടിങ് വില.`,
    priceSub: (free: number) =>
      `${free} കസ്റ്റമർമാർ വരെ സൗജന്യമായി തുടങ്ങൂ. സ്ഥിരക്കാർ കൂടുമ്പോൾ ഫൗണ്ടിങ് ഷോപ്പ് ആകൂ: WhatsApp മെസേജുകളും Google റിവ്യൂകളും തനിയെ, ഇനി ഒരിക്കലും കിട്ടാത്ത വിലയ്ക്ക്.`,
    priceFree: { name: 'ഫ്രീ', per: 'എന്നും', limit: (n: number) => `${n} കസ്റ്റമർമാർ വരെ` },
    priceList: ['മലയാളം, ഹിന്ദി, ഇംഗ്ലീഷ് ഭാഷകളിൽ കസ്റ്റമർ കാർഡ്', 'ഒറ്റ ടാപ്പിൽ കാർഡ് WhatsApp-ൽ അയക്കൂ', 'കൗണ്ടർ പോസ്റ്ററും WhatsApp സ്റ്റാറ്റസ് ഇമേജും', 'സ്പ്രെഡ്ഷീറ്റ് ഡൗൺലോഡും ദിവസേന ബാക്കപ്പും'],
    founding: {
      name: 'ഫൗണ്ടിങ് ഷോപ്പ്',
      once: 'ഒരിക്കൽ, എന്നേക്കും',
      yearly: (price: string) => `അല്ലെങ്കിൽ വർഷം ${price}`,
      list: [
        'എത്ര കസ്റ്റമർമാർ വേണമെങ്കിലും',
        'കാർഡും “സമ്മാനം തയ്യാർ” മെസേജും WhatsApp-ൽ തനിയെ',
        '“ഞങ്ങൾ നിങ്ങളെ മിസ്സ് ചെയ്യുന്നു” റിമൈൻഡറുകൾ, തനിയെ',
        'ഓരോ സമ്മാനത്തിനും ശേഷം Google റിവ്യൂ അഭ്യർത്ഥന',
        'ഫൗണ്ടിങ് വില ലോക്ക്, എല്ലാ പുതിയ ഫീച്ചറുകളോടും കൂടി',
      ],
      only: (seats: number) => `ആദ്യത്തെ ${seats} കടകൾക്ക് മാത്രം`,
      left: (left: number, total: number) => (left ? `${total}-ൽ ${left} സ്ഥാനം ബാക്കി` : 'എല്ലാ സ്ഥാനങ്ങളും നിറഞ്ഞു'),
      closed: 'ഇപ്പോൾ ലഭ്യമല്ല',
      cta: 'സൗജന്യമായി തുടങ്ങൂ, എപ്പോൾ വേണമെങ്കിലും അപ്ഗ്രേഡ് ചെയ്യാം',
    },
    create: 'നിങ്ങളുടെ കട ഉണ്ടാക്കൂ',
    faqKicker: 'ചോദ്യങ്ങൾ',
    faqTitle: 'കൗണ്ടറിൽ ചോദിച്ചത്.',
    finalTitle: 'നിങ്ങളുടെ അടുത്ത സ്ഥിരം കസ്റ്റമർ ഇന്ന് തന്നെ വരും.',
    finalSub: 'സെറ്റപ്പിന് ഒരു മിനിറ്റ്. ആദ്യ സ്റ്റാമ്പ് ഇന്ന് തന്നെ വീഴാം.',
    footer: { how: 'എങ്ങനെ പ്രവർത്തിക്കുന്നു', price: 'വില', shops: 'നിങ്ങളുടെ തരം കടയ്ക്ക്', cities: 'നഗരം അനുസരിച്ച്', guides: 'ഗൈഡുകൾ', login: 'കട ലോഗ് ഇൻ', privacy: 'പ്രൈവസി', terms: 'നിബന്ധനകൾ', refunds: 'റീഫണ്ട്', shipping: 'ഡെലിവറി', contact: 'ബന്ധപ്പെടുക', tag: 'ആദ്യ സന്ദർശനം മുതൽ “എന്നും വരുന്നയാൾ” വരെ.' },
  },
};

type Copy = (typeof COPY)['en'] | (typeof COPY)['hi'] | (typeof COPY)['ml'];

// Also published (in English) as FAQPage structured data by scripts/prerender.mjs.
export const FAQ = [
  ['Does it work for my kind of shop?', 'If the same people come back to you — a café, salon, kirana, bakery, gym, sweet shop, pharmacy or tiffin service — yes. You choose the number of visits and the reward.'],
  ['Do my customers need an app?', 'No. You add their visit with their phone number. Their card opens from a WhatsApp link in any browser — nothing to install.'],
  ['What if a customer doesn’t have a smartphone?', 'It still works. Visits are counted on their phone number, and the app tells you at the counter when their reward is due.'],
  ['What do I need at the counter?', 'Any phone, tablet or computer with internet. Open Regularhood in the browser or add it to your home screen.'],
  ['Can someone get two stamps in one day?', 'No. A phone number counts once a day, so a stamp can’t be added twice by mistake. Any visit or reward can be undone.'],
  ['Can I change the rule later?', 'Yes. Change the number of visits or the reward anytime in Settings. Everyone keeps the visits they already have.'],
  ['What does it cost?', 'Free to start, up to the Free plan’s customer limit. The first shops can become a Founding Shop, paid once for life or once a year (prices above): unlimited customers, WhatsApp messages sent to customers for you, and Google review requests. Pay by UPI; full refund within 7 days.'],
] as const;

const FAQ_HI = [
  ['क्या यह मेरी तरह की दुकान के लिए है?', 'अगर वही लोग बार-बार आते हैं — कैफ़े, सैलून, किराना, बेकरी, जिम, मिठाई की दुकान, मेडिकल या टिफ़िन — तो हाँ। विज़िट की संख्या और इनाम आप चुनते हैं।'],
  ['क्या ग्राहकों को ऐप चाहिए?', 'नहीं। आप उनके फ़ोन नंबर से विज़िट जोड़ते हैं। उनका कार्ड WhatsApp लिंक से किसी भी ब्राउज़र में खुलता है — कुछ इंस्टॉल नहीं करना।'],
  ['अगर ग्राहक के पास स्मार्टफ़ोन नहीं है?', 'तब भी चलेगा। विज़िट उनके फ़ोन नंबर पर गिनी जाती हैं, और इनाम कब देना है यह ऐप काउंटर पर ही बता देता है।'],
  ['काउंटर पर क्या चाहिए?', 'इंटरनेट वाला कोई भी फ़ोन, टैबलेट या कंप्यूटर। ब्राउज़र में Regularhood खोलें या होम स्क्रीन पर लगाएँ।'],
  ['क्या एक दिन में दो स्टैम्प लग सकते हैं?', 'नहीं। एक नंबर दिन में एक बार ही गिना जाता है, तो गलती से दो बार नहीं जुड़ता। कोई भी विज़िट या इनाम वापस लिया जा सकता है।'],
  ['क्या नियम बाद में बदल सकते हैं?', 'हाँ। सेटिंग्स में कभी भी विज़िट की संख्या या इनाम बदलें। सबकी पुरानी विज़िट बनी रहती हैं।'],
  ['इसकी कीमत क्या है?', 'फ़्री प्लान की ग्राहक लिमिट तक मुफ़्त। शुरुआती दुकानें एक बार (हमेशा के लिए) या साल में एक बार पेमेंट करके फ़ाउंडिंग शॉप बन सकती हैं (कीमत ऊपर देखें): जितने चाहें ग्राहक, ग्राहकों को WhatsApp मैसेज अपने आप, और Google रिव्यू की रिक्वेस्ट। UPI से पेमेंट; 7 दिन में पूरा रिफ़ंड।'],
] as const;

const FAQ_ML = [
  ['എന്റെ തരം കടയ്ക്ക് ഇത് പറ്റുമോ?', 'ഒരേ ആളുകൾ വീണ്ടും വീണ്ടും വരുന്നുണ്ടെങ്കിൽ — കഫേ, സലൂൺ, പലചരക്ക് കട, ബേക്കറി, ജിം, സ്വീറ്റ്സ് കട, ഫാർമസി, ടിഫിൻ സർവീസ് — പറ്റും. സന്ദർശനങ്ങളുടെ എണ്ണവും സമ്മാനവും നിങ്ങൾ തിരഞ്ഞെടുക്കൂ.'],
  ['എന്റെ കസ്റ്റമർമാർക്ക് ആപ്പ് വേണോ?', 'വേണ്ട. അവരുടെ ഫോൺ നമ്പർ വെച്ച് നിങ്ങൾ സന്ദർശനം ചേർക്കും. അവരുടെ കാർഡ് WhatsApp ലിങ്കിൽ നിന്ന് ഏത് ബ്രൗസറിലും തുറക്കും — ഒന്നും ഇൻസ്റ്റാൾ ചെയ്യേണ്ട.'],
  ['കസ്റ്റമർക്ക് സ്മാർട്ട്ഫോൺ ഇല്ലെങ്കിലോ?', 'എന്നാലും പ്രവർത്തിക്കും. സന്ദർശനങ്ങൾ അവരുടെ ഫോൺ നമ്പറിലാണ് കണക്കാക്കുന്നത്, സമ്മാനം എപ്പോൾ കൊടുക്കണമെന്ന് ആപ്പ് കൗണ്ടറിൽ തന്നെ പറയും.'],
  ['കൗണ്ടറിൽ എന്താണ് വേണ്ടത്?', 'ഇന്റർനെറ്റ് ഉള്ള ഏത് ഫോണോ ടാബ്‌ലെറ്റോ കമ്പ്യൂട്ടറോ. ബ്രൗസറിൽ Regularhood തുറക്കൂ, അല്ലെങ്കിൽ ഹോം സ്ക്രീനിൽ ചേർക്കൂ.'],
  ['ഒരു ദിവസം രണ്ട് സ്റ്റാമ്പ് കിട്ടുമോ?', 'ഇല്ല. ഒരു ഫോൺ നമ്പർ ദിവസം ഒരിക്കൽ മാത്രമേ കണക്കാക്കൂ, അതുകൊണ്ട് അബദ്ധത്തിൽ രണ്ട് തവണ ചേരില്ല. ഏത് സന്ദർശനവും സമ്മാനവും തിരിച്ചെടുക്കാം.'],
  ['നിയമം പിന്നീട് മാറ്റാമോ?', 'മാറ്റാം. സെറ്റിംഗ്സിൽ എപ്പോൾ വേണമെങ്കിലും സന്ദർശനങ്ങളുടെ എണ്ണമോ സമ്മാനമോ മാറ്റൂ. എല്ലാവരുടെയും പഴയ സന്ദർശനങ്ങൾ അതുപോലെ നിൽക്കും.'],
  ['ഇതിന് എത്ര ചെലവാകും?', 'ഫ്രീ പ്ലാനിന്റെ കസ്റ്റമർ പരിധി വരെ സൗജന്യം. ആദ്യത്തെ കടകൾക്ക് ഒരിക്കൽ (എന്നേക്കും) അല്ലെങ്കിൽ വർഷത്തിൽ ഒരിക്കൽ പണമടച്ച് ഫൗണ്ടിങ് ഷോപ്പ് ആകാം (വില മുകളിൽ കാണാം): എത്ര കസ്റ്റമർമാർ വേണമെങ്കിലും, കസ്റ്റമർമാർക്ക് WhatsApp മെസേജുകൾ തനിയെ, Google റിവ്യൂ അഭ്യർത്ഥനകൾ. UPI വഴി പണമടയ്ക്കാം; 7 ദിവസത്തിനകം മുഴുവൻ റീഫണ്ട്.'],
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
      <m.div className="lp-phone" style={{ rotateX: rx, rotateY: ry }}>
        <div className="lp-phone-notch" />
        <div className="lp-phone-screen">
          <div className="lp-phone-head">
            <span className="lp-phone-shop">{ex.shop}</span>
            <span className="lp-phone-rule">{c.rule(ex.needed, t.short)}</span>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            {shown === 'reward' ? (
              <m.div key="reward" className="lp-phone-result reward" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
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
              </m.div>
            ) : shown === 'visit' ? (
              <m.div key="visit" className="lp-phone-result" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <span className="lp-phone-icon">
                  <Check size={30} strokeWidth={3} />
                </span>
                <strong>{c.demoVisit(stamps, ex.needed)}</strong>
                <Stamps on={stamps} of={ex.needed} size={ex.needed > 8 ? 18 : 24} pop={stamps - 1} />
                <span className="lp-phone-small">{c.demoLeft(ex.needed - stamps, t.short)}</span>
              </m.div>
            ) : (
              <m.div key="keypad" className="lp-phone-keypad" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="lp-phone-number">98765 43210</div>
                <div className="lp-phone-keys" aria-hidden="true">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', ''].map((k, i) => (
                    <span key={i}>{k || (i === 11 ? <Delete size={15} /> : '')}</span>
                  ))}
                </div>
                <button className="lp-phone-btn" onClick={add} data-track="demo: Add visit">
                  <Check size={18} strokeWidth={3} /> {c.demoAdd}
                </button>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </m.div>

      <AnimatePresence>
        {sent && (
          <m.div className="lp-float lp-float-wa" initial={{ opacity: 0, y: 16, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }}>
            <MessageCircle size={16} /> {c.floatSent}
          </m.div>
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
              <AnimatePresence initial={false}>
                <m.span
                  key={`${ex.key}-${lang}`}
                  className="lp-h1-reward"
                  initial={{ y: '0.6em', opacity: 0, filter: 'blur(8px)' }}
                  animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                  exit={{ y: '-0.5em', opacity: 0, filter: 'blur(8px)' }}
                  transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  {ex[lang].reward}
                </m.span>
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

/** More kinds of shop for the scrolling strip, after the examples. */
const MORE_SHOPS: Record<Lang, string[]> = {
  en: ['Pharmacy', 'Tiffin', 'Juice bar', 'Chai stall', 'Laundry'],
  hi: ['मेडिकल', 'टिफ़िन', 'जूस बार', 'चाय की दुकान', 'लॉन्ड्री'],
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
            <b className="lp-how-typed">98765 43210</b>
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
 * Founding Shop, shown as one customer's month: each message Regularhood sends by itself, at the moment it goes out,
 * on a WhatsApp chat background. Uses the shop picked at the top of the page.
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
          <li key={`${s.name}-${i}`} style={{ '--i': i } as CSSProperties}>
            <span className="lp-using-mark" aria-hidden="true">
              {[...s.name.trim()][0]?.toUpperCase() ?? '•'}
            </span>
            <span>
              <strong>{s.name}</strong>
              {s.rewardName && <small>{c.rule(s.visitsNeeded, s.rewardName)}</small>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

type Founding = { open: boolean; total: number; left: number; prices: { lifetime: number; yearly: number }; freeCustomers: number };

const inr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

/** Free, and the Founding Shop offer with its places left (live; the prerendered page shows the default prices). */
function Pricing({ c }: { c: Copy }) {
  const [founding, setFounding] = useState<Founding>({ open: true, total: 100, left: -1, prices: { lifetime: 149_900, yearly: 49_900 }, freeCustomers: 50 });
  useEffect(() => {
    fetch('/api/public/founding')
      .then((r) => (r.ok ? r.json() : null))
      .then((f: Founding | null) => f && setFounding(f))
      .catch(() => {});
  }, []);
  const f = c.founding;
  return (
    <section className="lp-section lp-wrap" id="pricing" data-section="pricing">
      <p className="lp-kicker rv">{c.priceKicker}</p>
      <h2 className="lp-h2 rv">{c.priceTitle(founding.total)}</h2>
      <p className="lp-sub rv">{c.priceSub(founding.freeCustomers)}</p>
      <div className="lp-price-cards">
        <div className="lp-price-card lp-price-free rv">
          <p className="lp-price-name">{c.priceFree.name}</p>
          <div>
            <strong className="lp-price-tag">₹0</strong> <span className="lp-price-per">{c.priceFree.per}</span>
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
          <span className="lp-price-badge">
            {founding.open ? f.only(founding.total) : f.closed}
            {founding.open && founding.left >= 0 && ` · ${f.left(founding.left, founding.total)}`}
          </span>
          <p className="lp-price-name">{f.name}</p>
          <div>
            <strong className="lp-price-tag">{inr(founding.prices.lifetime)}</strong> <span className="lp-price-per">{f.once}</span>
            <p className="lp-price-alt">{f.yearly(inr(founding.prices.yearly))}</p>
          </div>
          <ul>
            {f.list.map((item) => (
              <li key={item}>
                <Check size={18} /> {item}
              </li>
            ))}
          </ul>
          <a className="lp-btn lp-btn-glow" href={SIGNUP} data-track="pricing: Founding Shop">
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
            <Autopilot c={c} lang={lang} />
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
              <small>{c.footer.tag}</small>
            </div>
          </footer>
        </div>
      </ExampleContext.Provider>
    </LazyMotion>
  );
}
