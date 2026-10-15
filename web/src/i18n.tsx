import { useEffect, useState, type ReactNode } from 'react';

// English / Hindi for the customer's card and the shop's own screens (switched with LangToggle, remembered per phone).
// Texts are looked up by their English wording; {name}-style placeholders are filled in after translating.

export type Lang = 'en' | 'hi';

const HI: Record<string, string> = {
  // member card and wallet
  'Add your card to your home screen': 'अपना कार्ड होम स्क्रीन पर लगाएँ',
  History: 'हिस्ट्री',
  "This link doesn't work": 'यह लिंक काम नहीं कर रहा',

  // stamp card
  '{shop} · My card': '{shop} · मेरा कार्ड',
  'Every {n} visits → {reward}': 'हर {n} विज़िट पर → {reward}',
  'Your {reward} is ready! 🎁': 'आपका {reward} तैयार है! 🎁',
  '1 more visit for {reward}': 'बस 1 और विज़िट, फिर {reward}',
  '{n} more visits for {reward}': 'बस {n} और विज़िट, फिर {reward}',
  'Get it on your next visit — just tell your phone number.': 'अगली बार आने पर लें — बस अपना फ़ोन नंबर बताएँ।',
  'Visit {x} of {n}': 'विज़िट {x} / {n}',
  'Just tell your phone number at the counter': 'काउंटर पर बस अपना फ़ोन नंबर बताएँ',
  'One visit a day counts. No app, no sign-up.': 'दिन में एक विज़िट गिनी जाती है। कोई ऐप नहीं, कोई साइन-अप नहीं।',
  'The shop sends your card on WhatsApp. No app, no sign-up.': 'दुकान आपका कार्ड WhatsApp पर भेजेगी। कोई ऐप नहीं, कोई साइन-अप नहीं।',
  'There is nothing to scan or log in to any more. The shop adds your visit and sends your card on WhatsApp.':
    'अब कुछ स्कैन या लॉग इन नहीं करना है। दुकान आपकी विज़िट जोड़ेगी और कार्ड WhatsApp पर भेजेगी।',
  'See your visits in one tap.': 'एक टैप में अपनी विज़िट देखें।',
  'Ask the shop to send your card again on WhatsApp.': 'दुकान से कहें कि आपका कार्ड फिर से WhatsApp पर भेजें।',
  'This QR code is not valid': 'यह QR कोड सही नहीं है',
  Visit: 'विज़िट',
  'Got {reward}': '{reward} मिला',
  'No visits yet.': 'अभी कोई विज़िट नहीं।',

  // the shop's screens
  'Add visit': 'विज़िट जोड़ें',
  Customers: 'ग्राहक',
  Settings: 'सेटिंग्स',
  'Install app': 'ऐप इंस्टॉल करें',
  'Your loyalty card': 'आपका लॉयल्टी कार्ड',
  'One rule for every customer. You can change it later in Settings.': 'हर ग्राहक के लिए एक नियम। बाद में सेटिंग्स में बदल सकते हैं।',
  Every: 'हर',
  'visits, the customer gets': 'विज़िट पर ग्राहक को मिलेगा',
  'Free chai': 'मुफ़्त चाय',
  Start: 'शुरू करें',
  Save: 'सेव करें',
  'Saving…': 'सेव हो रहा है…',
  Saved: 'सेव हो गया',
  'Every {n} visits →': 'हर {n} विज़िट पर →',
  'Customer’s phone number': 'ग्राहक का फ़ोन नंबर',
  '🎁 reward due': '🎁 इनाम बाकी',
  Clear: 'मिटाएँ',
  'Adding…': 'जुड़ रहा है…',
  Today: 'आज',
  visit: 'विज़िट',
  visits: 'विज़िट',
  'reward given': 'इनाम दिया',
  'rewards given': 'इनाम दिए',
  'Give {reward} now': 'अभी {reward} दें',
  'Visit already counted today.': 'आज की विज़िट पहले ही जुड़ चुकी है।',
  'This is visit {n}.': 'यह विज़िट {n} है।',
  'Their card is full.': 'कार्ड पूरा हो गया।',
  Given: 'दे दिया',
  'Not now — give it next time': 'अभी नहीं — अगली बार देंगे',
  'Wrong number? Undo': 'गलत नंबर? वापस लें',
  'Reward given 🎉': 'इनाम दे दिया 🎉',
  'Their card starts again.': 'कार्ड फिर से शुरू।',
  'Already counted today': 'आज पहले ही जुड़ चुका है',
  'One visit a day.': 'दिन में एक विज़िट।',
  '{n} more for {reward}.': 'बस {n} और, फिर {reward}।',
  'New customer!': 'नया ग्राहक!',
  'Send card on WhatsApp': 'WhatsApp पर कार्ड भेजें',
  'Next customer': 'अगला ग्राहक',
  'Visit removed': 'विज़िट हटा दी',

  // customers
  All: 'सभी',
  'Reward waiting': 'इनाम बाकी',
  'Not seen {n} days': '{n} दिन से नहीं आए',
  customer: 'ग्राहक',
  customers: 'ग्राहक',
  shown: 'दिख रहे',
  'Everyone who visited': 'जो भी आए',
  'Search phone number': 'फ़ोन नंबर खोजें',
  'Tap Remind to open WhatsApp with a ready message.': '“याद दिलाएँ” दबाएँ, WhatsApp तैयार मैसेज के साथ खुलेगा।',
  Sent: 'भेज दिया',
  Remind: 'याद दिलाएँ',
  Reward: 'इनाम',
  'No number matches': 'कोई नंबर नहीं मिला',
  'Everyone came back recently 🎉': 'सब हाल ही में आए हैं 🎉',
  'No rewards waiting': 'कोई इनाम बाकी नहीं',
  'No customers yet': 'अभी कोई ग्राहक नहीं',
  'Add a visit with a phone number — the customer shows up here.': 'फ़ोन नंबर से विज़िट जोड़ें — ग्राहक यहाँ दिखेगा।',
  'Add a visit': 'विज़िट जोड़ें',
  'no visits yet': 'अभी कोई विज़िट नहीं',
  'came today': 'आज आए',
  'came yesterday': 'कल आए',
  'came {n} days ago': '{n} दिन पहले आए',
  'Number changed': 'नंबर बदल गया',
  'Change number': 'नंबर बदलें',
  'Phone number': 'फ़ोन नंबर',
  '{reward} given 🎉': '{reward} दे दिया 🎉',
  'Undo this visit?': 'यह विज़िट वापस लें?',
  'Undo this reward?': 'यह इनाम वापस लें?',
  '{when} will be taken off their card.': '{when} वाली एंट्री कार्ड से हट जाएगी।',
  Undo: 'वापस लें',
  Undone: 'वापस ले लिया',
  undone: 'वापस लिया',
  'Delete {phone}?': '{phone} हटाएँ?',
  'Their stamps and history will be deleted. This can’t be undone.': 'इनकी सारी विज़िट और हिस्ट्री मिट जाएगी। यह वापस नहीं होगा।',
  Delete: 'हटाएँ',
  'Customer deleted': 'ग्राहक हटा दिया',
  'Give {reward}': '{reward} दें',
  'All visits': 'कुल विज़िट',
  Rewards: 'इनाम',
  'Last visit': 'आखिरी विज़िट',
  '{n}d ago': '{n} दिन पहले',
  'Send card': 'कार्ड भेजें',
  'See their card': 'उनका कार्ड देखें',

  // settings
  'Settings saved': 'सेटिंग्स सेव हो गईं',
  'Your card': 'आपका कार्ड',
  "Changing the number keeps everyone's visits. Customers who already have enough get the reward on their next visit.":
    'संख्या बदलने पर सबकी विज़िट बनी रहती हैं। जिनकी विज़िट पूरी हो चुकी हैं, उन्हें अगली बार इनाम मिलेगा।',
  Shop: 'दुकान',
  'Shop name': 'दुकान का नाम',
  'Your WhatsApp number': 'आपका WhatsApp नंबर',
  "Only for Regularhood support. Customers don't see it.": 'सिर्फ़ Regularhood सपोर्ट के लिए। ग्राहकों को नहीं दिखता।',
  'WhatsApp message to customers': 'ग्राहकों को WhatsApp मैसेज',
  'Saved on this phone right away.': 'इस फ़ोन पर तुरंत सेव हो जाता है।',
  Reminders: 'याद दिलाना',
  'Days without a visit before a customer counts as “not seen”': 'कितने दिन न आने पर ग्राहक “नहीं आए” में दिखे',
  'Save settings': 'सेटिंग्स सेव करें',
  'Counter poster': 'काउंटर पोस्टर',
  'Put it where people pay, so customers know about your card and tell you their number.': 'इसे बिल काउंटर पर लगाएँ, ताकि ग्राहक कार्ड के बारे में जानें और अपना नंबर बताएँ।',
  Green: 'हरा',
  'Light (saves ink)': 'हल्का (स्याही बचाए)',
  'Hindi lines': 'हिंदी लाइनें',
  'Print (A4)': 'प्रिंट (A4)',
  'Download PNG': 'PNG डाउनलोड करें',
  'Your data': 'आपका डेटा',
  'Activity log': 'गतिविधि लॉग',
  'Rewards given, undos, deleted customers and changes': 'दिए गए इनाम, वापस ली गई एंट्री, हटाए ग्राहक और बदलाव',
  'Download a spreadsheet (opens in Excel or Google Sheets). Keep a copy as a backup.': 'स्प्रेडशीट डाउनलोड करें (Excel या Google Sheets में खुलती है)। बैकअप के लिए एक कॉपी रखें।',
  'Preparing…': 'तैयार हो रहा है…',
  'Visit history': 'विज़िट हिस्ट्री',
  Downloaded: 'डाउनलोड हो गया',
  Account: 'अकाउंट',
  'App language': 'ऐप की भाषा',
  'Dark mode': 'डार्क मोड',
  'Turn on': 'चालू करें',
  'Turn off': 'बंद करें',
  'Log out?': 'लॉग आउट करें?',
  'Log out': 'लॉग आउट',
  Cancel: 'रद्द करें',

  // activity log
  'Every reward, undo and change — by your shop or by Regularhood support.': 'हर इनाम, वापस ली गई एंट्री और बदलाव — आपकी दुकान या Regularhood सपोर्ट द्वारा।',
  'Needs a look': 'ध्यान दें',
  Customer: 'ग्राहक',
  Support: 'सपोर्ट',
  'Nothing here yet': 'अभी यहाँ कुछ नहीं',
  'Rewards given, undos, deleted customers and setting changes show up here.': 'दिए गए इनाम, वापस ली गई एंट्री, हटाए ग्राहक और सेटिंग के बदलाव यहाँ दिखेंगे।',

  // share
  'Share your shop': 'अपनी दुकान शेयर करें',
  'Put it on your WhatsApp status or Instagram so customers know about your card. Other shop owners can get Regularhood from your link.':
    'इसे WhatsApp स्टेटस या Instagram पर लगाएँ, ताकि ग्राहक आपके कार्ड के बारे में जानें। दूसरे दुकानदार आपके लिंक से Regularhood ले सकते हैं।',
  'Share image': 'इमेज शेयर करें',
  Download: 'डाउनलोड',
  'Send on WhatsApp': 'WhatsApp पर भेजें',
  'To customers': 'ग्राहकों को',
  'To other shop owners': 'दूसरे दुकानदारों को',
  'Your share link': 'आपका शेयर लिंक',
  'Tell customers about your card': 'ग्राहकों को अपने कार्ड के बारे में बताएँ',
  'A ready image for your WhatsApp status and Instagram, in Hindi or English.': 'WhatsApp स्टेटस और Instagram के लिए तैयार इमेज, हिंदी या English में।',
  Share: 'शेयर',

  // messages from the server
  'Enter the 10-digit phone number': '10 अंकों का फ़ोन नंबर लिखें',
  'Another customer already has this phone number': 'यह नंबर पहले से किसी और ग्राहक का है',
  'The reward for this visit was already given — undo the reward first': 'इस विज़िट का इनाम दिया जा चुका है — पहले इनाम वापस लें',
  'Write what the customer gets, e.g. Free chai': 'लिखें कि ग्राहक को क्या मिलेगा, जैसे मुफ़्त चाय',

  // footer
  'Rewards by Regularhood': 'Regularhood के इनाम',
  'Run a shop? Get it free': 'दुकान है? मुफ़्त में पाएँ',

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
let enabled = false; // turned on by pages that can switch language (not the admin panel)

/** Called when a customer page or the shop app is shown. */
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
