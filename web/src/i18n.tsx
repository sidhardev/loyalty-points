import { useEffect, useState, type ReactNode } from 'react';

// English / Hindi for the pages customers see (wallet, bill QR, join, login). The shop's own screens stay English.
// Texts are looked up by their English wording; {name}-style placeholders are filled in after translating.

export type Lang = 'en' | 'hi';

const HI: Record<string, string> = {
  // member card and wallet
  points: 'पॉइंट्स',
  MEMBER: 'मेंबर',
  '★ GOLD': '★ गोल्ड',
  'Hi {name}': 'नमस्ते {name}',
  'Gold member — you earn ×{x} points': 'गोल्ड मेंबर — आपको ×{x} पॉइंट्स मिलते हैं',
  '{n} more points to ★ Gold (×{x} points)': '★ गोल्ड के लिए {n} पॉइंट्स और (×{x} पॉइंट्स)',
  'Shop for {amount} more → {reward}': '{amount} की और खरीदारी → {reward}',
  'My card': 'मेरा कार्ड',
  'Show this at the counter — the shop scans it to add your points.': 'काउंटर पर यह दिखाएँ — दुकान इसे स्कैन करके आपके पॉइंट्स जोड़ेगी।',
  'Your member card QR code': 'आपका मेंबर कार्ड QR कोड',
  'Add your card to your home screen': 'अपना कार्ड होम स्क्रीन पर लगाएँ',
  'See your points and show your card in one tap.': 'एक टैप में पॉइंट्स देखें और कार्ड दिखाएँ।',
  'Add to home screen': 'होम स्क्रीन पर लगाएँ',
  'You can get {reward} now!': 'आप अभी {reward} ले सकते हैं!',
  '{n} rewards': '{n} इनाम',
  'Tap “Get it” and show the code at the counter.': '“लें” दबाएँ और काउंटर पर कोड दिखाएँ।',
  Rewards: 'इनाम',
  '{n} pts per ₹100': 'हर ₹100 पर {n} पॉइंट्स',
  pts: 'पॉइंट्स',
  'Get it': 'लें',
  'Ready ✓': 'तैयार ✓',
  '{amount} more shopping': '{amount} की और खरीदारी',
  'Rewards coming soon.': 'इनाम जल्द आ रहे हैं।',
  History: 'हिस्ट्री',
  'No activity yet.': 'अभी कोई एंट्री नहीं।',
  "This link doesn't work": 'यह लिंक काम नहीं कर रहा',
  'Log in with your PIN': 'PIN से लॉग इन करें',
  '{shop} · My points': '{shop} · मेरे पॉइंट्स',

  // footer
  'Rewards by Habiturn': 'Habiturn के इनाम',
  'Run a shop? Get it free': 'दुकान है? मुफ़्त में पाएँ',

  // reward code
  'Your code for {reward}': '{reward} के लिए आपका कोड',
  'Show this code at the counter · {time} left': 'यह कोड काउंटर पर दिखाएँ · {time} बाकी',
  'Waiting for the shop…': 'दुकान का इंतज़ार…',
  'Cancel': 'रद्द करें',
  'Enjoy your {reward}! 🎉': '{reward} का मज़ा लें! 🎉',
  '{n} points used · new balance {balance}': '{n} पॉइंट्स इस्तेमाल हुए · नया बैलेंस {balance}',
  'This code expired. Make a new one when you are at the counter.': 'यह कोड एक्सपायर हो गया। काउंटर पर पहुँचकर नया कोड बनाएँ।',
  'Get {reward} for {n} points?': '{n} पॉइंट्स में {reward} लें?',
  "You'll get a 4-digit code to show at the counter. Points are only used when the shop confirms.":
    'आपको काउंटर पर दिखाने के लिए 4 अंकों का कोड मिलेगा। पॉइंट्स तभी कटेंगे जब दुकान पक्का करेगी।',
  'Get code': 'कोड पाएँ',

  // PIN
  "The PINs don't match": 'दोनों PIN मेल नहीं खाते',
  'PIN saved — you can log in with it anytime': 'PIN सेव हो गया — अब कभी भी इससे लॉग इन करें',
  'Log in anytime at {link}': '{link} पर कभी भी लॉग इन करें',
  'Change PIN': 'PIN बदलें',
  'Change your PIN': 'अपना PIN बदलें',
  'Set a PIN': 'PIN सेट करें',
  'With a 4-digit PIN you can check your points from any phone at {host}.': '4 अंकों के PIN से आप किसी भी फ़ोन पर {host} पर अपने पॉइंट्स देख सकते हैं।',
  'New PIN': 'नया PIN',
  'Repeat PIN': 'PIN दोबारा',
  'Save PIN': 'PIN सेव करें',

  // bill QR
  "Can't add these points": 'ये पॉइंट्स नहीं जुड़ सकते',
  'points from {shop}': '{shop} से पॉइंट्स',
  'balance {n}': 'बैलेंस {n}',
  'includes {list}': 'इसमें {list} शामिल',
  "You're now a ★ Gold member!": 'आप अब ★ गोल्ड मेंबर हैं!',
  "You'll earn extra points on every bill.": 'अब हर बिल पर ज़्यादा पॉइंट्स मिलेंगे।',
  'See my card and rewards': 'मेरा कार्ड और इनाम देखें',
  'Open my card': 'मेरा कार्ड खोलें',
  'Added to the account for this number.': 'इस नंबर के अकाउंट में जुड़ गए।',
  'Log in': 'लॉग इन',
  'with your PIN to see your balance.': 'करें और अपना बैलेंस देखें।',
  '{amount} bill': '{amount} का बिल',
  'waiting for you — tap below to add them': 'आपका इंतज़ार कर रहे हैं — नीचे टैप करके जोड़ें',
  'Adding…': 'जोड़ रहे हैं…',
  'Add to my card · {name}': 'मेरे कार्ड में जोड़ें · {name}',
  'Not {name}? Use a phone number': '{name} नहीं हैं? फ़ोन नंबर डालें',
  'Your phone number': 'आपका फ़ोन नंबर',
  "Welcome! You're new here. What's your name?": 'स्वागत है! आप यहाँ नए हैं। आपका नाम?',
  "Welcome! You're new here — you also get {n} bonus points. What's your name?": 'स्वागत है! आप यहाँ नए हैं — आपको {n} बोनस पॉइंट्स भी मिलेंगे। आपका नाम?',
  'Your name': 'आपका नाम',
  'Get {n} points': '{n} पॉइंट्स पाएँ',
  'Points from {shop}': '{shop} से पॉइंट्स',

  // join
  "This QR code doesn't work": 'यह QR कोड काम नहीं कर रहा',
  'Join our rewards': 'हमारे रिवॉर्ड्स से जुड़ें',
  'points free when you join · ': 'पॉइंट्स जुड़ने पर मुफ़्त · ',
  'Earn {n} points on every ₹100': 'हर ₹100 पर {n} पॉइंट्स कमाएँ',
  'Phone number': 'फ़ोन नंबर',
  'Choose a 4-digit PIN': '4 अंकों का PIN चुनें',
  "You'll use your phone number and PIN to check your points.": 'पॉइंट्स देखने के लिए आप फ़ोन नंबर और PIN इस्तेमाल करेंगे।',
  Birthday: 'जन्मदिन',
  'optional — for a birthday treat 🎂': 'वैकल्पिक — जन्मदिन के तोहफ़े के लिए 🎂',
  "You're already a member! Log in with your phone and PIN.": 'आप पहले से मेंबर हैं! फ़ोन और PIN से लॉग इन करें।',
  'Joining…': 'जुड़ रहे हैं…',
  'Join and see my points': 'जुड़ें और मेरे पॉइंट्स देखें',
  'Already a member?': 'पहले से मेंबर हैं?',
  'Join {shop} rewards': '{shop} रिवॉर्ड्स से जुड़ें',

  // login
  'Check your points': 'अपने पॉइंट्स देखें',
  'Your rewards': 'आपके रिवॉर्ड्स',
  'across {n} shops': '{n} दुकानों में',
  'Choose a shop': 'दुकान चुनें',
  'Log in with the phone number you gave the shop and your PIN.': 'दुकान को दिया फ़ोन नंबर और अपना PIN डालें।',
  PIN: 'PIN',
  'Checking…': 'जाँच रहे हैं…',
  'Your cards on this phone': 'इस फ़ोन पर आपके कार्ड',
  'Open straight away — no PIN needed on this phone.': 'सीधे खोलें — इस फ़ोन पर PIN की ज़रूरत नहीं।',
  'Forgot your PIN?': 'PIN भूल गए?',
  'Open your card above and set a new one.': 'ऊपर अपना कार्ड खोलें और नया PIN सेट करें।',
  "Ask the shop to send your points link on WhatsApp — open it and set a new PIN.": 'दुकान से WhatsApp पर अपना पॉइंट्स लिंक मँगवाएँ — उसे खोलकर नया PIN सेट करें।',

  // history rows
  'Bill of {amount}': '{amount} का बिल',
  'Redeemed {reward}': '{reward} लिया',
  'Welcome bonus': 'स्वागत बोनस',
  'Birthday bonus': 'जन्मदिन बोनस',
  Bonus: 'बोनस',
  Adjustment: 'बदलाव',
  undone: 'वापस लिया',

  // install
  'Install the app': 'ऐप इंस्टॉल करें',
  'Tap the {icon} Share button in the browser bar.': 'ब्राउज़र बार में {icon} शेयर बटन दबाएँ।',
  'Scroll down and tap Add to Home Screen.': 'नीचे जाकर “Add to Home Screen” दबाएँ।',
  'Tap Add.': '“Add” दबाएँ।',
  'Tap the {icon} menu at the top right of the browser.': 'ब्राउज़र में ऊपर दाईं ओर {icon} मेन्यू दबाएँ।',
  'Tap Install app or Add to Home screen.': '“Install app” या “Add to Home screen” दबाएँ।',
  'Tap Install.': '“Install” दबाएँ।',
  'Click the {icon} install icon at the right end of the address bar.': 'एड्रेस बार के दाएँ सिरे पर {icon} इंस्टॉल आइकन दबाएँ।',
  'Or open the browser menu and choose Install.': 'या ब्राउज़र मेन्यू खोलकर “Install” चुनें।',
  'It then opens from your home screen like any other app.': 'फिर यह बाकी ऐप्स की तरह होम स्क्रीन से खुलेगा।',
  'Got it': 'समझ गए',
  Install: 'इंस्टॉल',
  'Not now': 'अभी नहीं',
};

const KEY = 'lp_lang';
const CHANGED = 'lp-lang-changed';

function initial(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'en' || saved === 'hi') return saved;
  } catch {
    // Fall back to the phone's language.
  }
  return navigator.language?.toLowerCase().startsWith('hi') ? 'hi' : 'en';
}

let current: Lang = initial();
let enabled = false; // only customer pages turn translation on

/** Called once when a customer page is shown. */
export function enableTranslation() {
  enabled = true;
  document.documentElement.lang = current;
}

export function setLang(lang: Lang) {
  current = lang;
  document.documentElement.lang = lang;
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // Kept for this visit only.
  }
  dispatchEvent(new Event(CHANGED));
}

/** Translates with the current language. Pages re-render on a change through useLang(). */
export function t(text: string, vars: Record<string, string | number> = {}) {
  const template = (enabled && current === 'hi' && HI[text]) || text;
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function useLang() {
  const [lang, set] = useState(current);
  useEffect(() => {
    const update = () => set(current);
    addEventListener(CHANGED, update);
    return () => removeEventListener(CHANGED, update);
  }, []);
  return lang;
}

/** Text with one {icon} placeholder, rendered with the icon in place. */
export function withIcon(text: string, icon: ReactNode) {
  const [before, after = ''] = text.split('{icon}');
  return (
    <>
      {before}
      {icon}
      {after}
    </>
  );
}

/** EN / हिं switch shown on customer pages. */
export function LangToggle() {
  const lang = useLang();
  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')} aria-pressed={lang === 'en'}>
        EN
      </button>
      <button className={lang === 'hi' ? 'active' : ''} onClick={() => setLang('hi')} aria-pressed={lang === 'hi'} lang="hi">
        हिं
      </button>
    </div>
  );
}
