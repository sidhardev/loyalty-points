// Free tools at /tools/<slug> and /hi/tools/<slug>. A tool is a page that does a job on its own (no sign-up), so shop
// owners searching for that job find us, and the page then shows what the app does better.
// First tool: the stamp card maker — type the shop's name and reward, print a sheet of paper stamp cards.

import type { SeoLang } from './seo-render';

export type StampMakerCopy = {
  title: string;
  description: string;
  name: string;
  eyebrow: string;
  h1: string;
  intro: string;
  form: { shop: string; reward: string; visits: string; contact: string; colour: string; print: string; tip: string };
  defaults: { shop: string; reward: string; contact: string };
  card: { kicker: string; rule: string; name: string };
  /** The "On their phone" preview: {shop}, {x} of {n}, {left} more for {r}. */
  preview: { paper: string; phone: string; bubble: string; open: string; note: string; cta: string };
  /** Shown once, the first time Print is pressed. {shop} and {n} are the visitor's own. */
  sheet: {
    title: string;
    lead: string;
    mobileLead: string;
    paperH: string;
    phoneH: string;
    rows: [string, string][];
    digital: string;
    print: string;
    pdf: string;
    both: string;
    close: string;
  };
  /** One line after printing. */
  after: { text: string; cta: string };
  how: { h2: string; steps: { title: string; text: string }[] };
  wrong: { h2: string; list: string[] };
  digital: { h2: string; p: string[]; cta: string };
  faqs: { q: string; a: string }[];
};

export const STAMP_MAKER_SLUG = 'stamp-card-maker';
export const STAMP_MAKER_UPDATED = '2026-11-16';

export const STAMP_MAKER: Record<SeoLang, StampMakerCopy> = {
  en: {
    title: 'Free Stamp Card Maker — Print Loyalty Cards for Your Shop',
    description: 'Make a loyalty stamp card for your shop in one minute: type your shop name and reward, pick the visits, and print 10 cards on A4. Free, no sign-up.',
    name: 'Stamp card maker',
    eyebrow: 'Free tool',
    h1: 'Free stamp card maker for your shop',
    intro: 'Type your shop’s name and the reward, pick how many visits it takes, and print a sheet of 10 loyalty stamp cards on A4 paper. Free, no sign-up.',
    form: {
      shop: 'Shop name',
      reward: 'Reward',
      visits: 'Visits for the reward',
      contact: 'Phone or address (optional)',
      colour: 'Colour',
      print: 'Print 10 cards (A4)',
      tip: 'Print on thick paper (250–300 gsm) and cut along the dotted lines. Each card is 85 × 55 mm, the size of a visiting card.',
    },
    defaults: { shop: 'Gupta Kirana Store', reward: '₹50 off', contact: '' },
    card: { kicker: 'Loyalty card', rule: 'Every {n} visits: {r}', name: 'Name' },
    preview: {
      paper: 'Paper card',
      phone: 'On their phone',
      bubble: '{shop}: visit {x} of {n} ✓ {left} more for {r}!',
      open: 'See my card',
      note: 'The same card, on the customer’s phone number. Nothing to carry, nothing to lose.',
      cta: 'Start it free',
    },
    sheet: {
      title: '{shop}’s card is ready',
      lead: 'Customers will need to bring this paper card {n} times. Forget it once, and that visit’s stamp is gone.',
      mobileLead: 'No printer nearby? Start the same card on customers’ phones right now. Nothing to print.',
      paperH: 'Paper card',
      phoneH: 'On their phone number',
      rows: [
        ['Left at home: no stamp', 'Their number is always with them'],
        ['Anyone with a pen can add a stamp', 'Only your counter adds a visit'],
        ['You can’t tell who stopped coming', 'A list of who stopped, with a message ready'],
      ],
      digital: 'Put this card on their phones, free',
      print: 'Print paper cards',
      pdf: 'Save as PDF for the print shop',
      both: 'Or do both: print these, and keep the phone card as a backup. Free to start.',
      close: 'Close',
    },
    after: {
      text: 'Printed? When a customer forgets their card, add the visit on their phone number instead. Free.',
      cta: 'Start the phone card',
    },
    how: {
      h2: 'How to use paper stamp cards at your counter',
      steps: [
        { title: 'Give a card on the first visit', text: 'Write the customer’s name, tick the first box, and say the rule out loud: “Five more visits and the next one is on us.”' },
        { title: 'Tick or sign one box per visit', text: 'Use a pen only you have, or a rubber stamp, so boxes can’t be filled at home.' },
        { title: 'On the last box, give the reward', text: 'Hand over the reward with a new card, so the next round starts the same day.' },
      ],
    },
    wrong: {
      h2: 'Where paper cards go wrong',
      list: [
        'Customers forget the card at home or lose it, so most cards never get full.',
        'Anyone with a pen can add a stamp.',
        'You can’t see who has stopped coming.',
        'You can’t remind anyone that they’re one visit away from the reward.',
      ],
    },
    digital: {
      h2: 'The same card, on the customer’s phone number',
      p: [
        'Regularhood keeps the stamp card on the customer’s phone number instead of paper. At the counter you type the number and tap Add visit; the app tells you when to give the reward. Nothing to lose, nothing to fake.',
        'The customer gets their card on WhatsApp in one tap and can open it in any browser. You also see who hasn’t come back, with a “we miss you” message ready. Free to start.',
      ],
      cta: 'Try the digital card free',
    },
    faqs: [
      { q: 'What size is a loyalty stamp card?', a: 'Most are visiting-card size, 85 × 55 mm, so they fit in a wallet. This maker prints 10 of them on one A4 sheet.' },
      { q: 'How many visits should the card have?', a: 'Five to eight works for most shops. Shops people visit very often, like a kirana or dairy, can use ten; salons, where people come every few weeks, often use four.' },
      { q: 'What reward should I give?', a: 'Something you sell often that costs you little: a free add-on, a small item, or a fixed amount off the bill. Not a free full bill.' },
      { q: 'Is this stamp card maker free?', a: 'Yes. No sign-up, no watermark. The cards are made in your browser and printed from it.' },
    ],
  },
  hi: {
    title: 'फ़्री स्टैम्प कार्ड मेकर — दुकान के लिए लॉयल्टी कार्ड प्रिंट करें',
    description: 'अपनी दुकान का लॉयल्टी स्टैम्प कार्ड एक मिनट में बनाएँ: दुकान का नाम और इनाम लिखें, विज़िट चुनें और A4 पर 10 कार्ड प्रिंट करें। मुफ़्त, बिना साइन-अप।',
    name: 'स्टैम्प कार्ड मेकर',
    eyebrow: 'फ़्री टूल',
    h1: 'दुकान के लिए फ़्री स्टैम्प कार्ड मेकर',
    intro: 'दुकान का नाम और इनाम लिखें, कितनी विज़िट पर इनाम मिलेगा चुनें, और A4 पेपर पर 10 लॉयल्टी स्टैम्प कार्ड प्रिंट करें। मुफ़्त, बिना साइन-अप।',
    form: {
      shop: 'दुकान का नाम',
      reward: 'इनाम',
      visits: 'इनाम कितनी विज़िट पर',
      contact: 'फ़ोन या पता (ज़रूरी नहीं)',
      colour: 'रंग',
      print: '10 कार्ड प्रिंट करें (A4)',
      tip: 'मोटे पेपर (250–300 gsm) पर प्रिंट करें और डॉटेड लाइन पर काटें। हर कार्ड 85 × 55 mm का है, विज़िटिंग कार्ड जितना।',
    },
    defaults: { shop: 'गुप्ता किराना स्टोर', reward: '₹50 की छूट', contact: '' },
    card: { kicker: 'लॉयल्टी कार्ड', rule: 'हर {n} विज़िट पर: {r}', name: 'नाम' },
    preview: {
      paper: 'पेपर कार्ड',
      phone: 'ग्राहक के फ़ोन पर',
      bubble: '{shop}: विज़िट {x} / {n} ✓ {r} के लिए बस {left} और!',
      open: 'मेरा कार्ड देखें',
      note: 'यही कार्ड, ग्राहक के फ़ोन नंबर पर। न साथ लाना, न खोने का डर।',
      cta: 'मुफ़्त शुरू करें',
    },
    sheet: {
      title: '{shop} का कार्ड तैयार है',
      lead: 'ग्राहक को यह पेपर कार्ड {n} बार साथ लाना होगा। एक बार भूला, तो उस विज़िट का स्टैम्प गया।',
      mobileLead: 'पास में प्रिंटर नहीं है? यही कार्ड अभी ग्राहकों के फ़ोन पर शुरू करें। कुछ प्रिंट नहीं करना।',
      paperH: 'पेपर कार्ड',
      phoneH: 'फ़ोन नंबर पर',
      rows: [
        ['घर भूल गए: स्टैम्प नहीं', 'नंबर हमेशा साथ रहता है'],
        ['पेन से कोई भी स्टैम्प बढ़ा दे', 'विज़िट सिर्फ़ आपके काउंटर से जुड़ती है'],
        ['पता नहीं कौन आना बंद कर गया', 'कौन नहीं आया, उसकी लिस्ट मैसेज के साथ'],
      ],
      digital: 'यही कार्ड फ़ोन पर चलाएँ, मुफ़्त',
      print: 'पेपर कार्ड प्रिंट करें',
      pdf: 'PDF सेव करें (प्रिंट की दुकान के लिए)',
      both: 'या दोनों करें: कार्ड प्रिंट करें, और फ़ोन वाला कार्ड बैकअप रखें। शुरू करना मुफ़्त है।',
      close: 'बंद करें',
    },
    after: {
      text: 'प्रिंट हो गया? जब कोई ग्राहक कार्ड भूल जाए, उसके फ़ोन नंबर पर विज़िट जोड़ें। मुफ़्त।',
      cta: 'फ़ोन वाला कार्ड शुरू करें',
    },
    how: {
      h2: 'काउंटर पर पेपर स्टैम्प कार्ड कैसे चलाएँ',
      steps: [
        { title: 'पहली विज़िट पर कार्ड दें', text: 'ग्राहक का नाम लिखें, पहला खाना टिक करें और नियम बोलकर बताएँ: “पाँच विज़िट और, फिर अगली बार इनाम।”' },
        { title: 'हर विज़िट पर एक खाना टिक करें', text: 'ऐसा पेन या रबर स्टैम्प रखें जो सिर्फ़ आपके पास हो, ताकि कोई घर पर खाने न भर दे।' },
        { title: 'आख़िरी खाने पर इनाम दें', text: 'इनाम के साथ नया कार्ड भी दें, ताकि अगला राउंड उसी दिन शुरू हो जाए।' },
      ],
    },
    wrong: {
      h2: 'पेपर कार्ड में दिक्कत कहाँ आती है',
      list: [
        'ग्राहक कार्ड घर भूल जाते हैं या खो देते हैं, इसलिए ज़्यादातर कार्ड कभी भरते ही नहीं।',
        'पेन वाला कोई भी स्टैम्प बढ़ा सकता है।',
        'पता नहीं चलता कि कौन आना बंद कर गया।',
        'किसी को याद नहीं दिला सकते कि इनाम बस एक विज़िट दूर है।',
      ],
    },
    digital: {
      h2: 'यही कार्ड, ग्राहक के फ़ोन नंबर पर',
      p: [
        'Regularhood स्टैम्प कार्ड को पेपर की जगह ग्राहक के फ़ोन नंबर पर रखता है। काउंटर पर नंबर लिखें और Add visit दबाएँ; इनाम कब देना है, ऐप बताता है। न खोने का डर, न नकली स्टैम्प।',
        'ग्राहक को एक टैप में WhatsApp पर उसका कार्ड मिलता है, जो किसी भी ब्राउज़र में खुलता है। आपको यह भी दिखता है कि कौन वापस नहीं आया, “हम आपको याद कर रहे हैं” मैसेज के साथ। शुरू करना मुफ़्त है।',
      ],
      cta: 'डिजिटल कार्ड मुफ़्त आज़माएँ',
    },
    faqs: [
      { q: 'लॉयल्टी स्टैम्प कार्ड का साइज़ क्या होता है?', a: 'ज़्यादातर विज़िटिंग कार्ड जितना, 85 × 55 mm, ताकि बटुए में आ जाए। यह मेकर एक A4 शीट पर ऐसे 10 कार्ड प्रिंट करता है।' },
      { q: 'कार्ड पर कितनी विज़िट रखें?', a: 'ज़्यादातर दुकानों के लिए पाँच से आठ। जहाँ लोग बहुत बार आते हैं, जैसे किराना, वहाँ दस; सैलून जैसी जगह, जहाँ लोग कुछ हफ़्तों में आते हैं, वहाँ चार।' },
      { q: 'इनाम क्या दें?', a: 'ऐसी चीज़ जो आप अक्सर बेचते हैं और जिसकी लागत कम है: कोई ऐड-ऑन, छोटी चीज़ या बिल पर तय छूट। पूरा बिल मुफ़्त नहीं।' },
      { q: 'क्या यह स्टैम्प कार्ड मेकर फ़्री है?', a: 'हाँ। न साइन-अप, न वॉटरमार्क। कार्ड आपके ब्राउज़र में बनते हैं और वहीं से प्रिंट होते हैं।' },
    ],
  },
};
