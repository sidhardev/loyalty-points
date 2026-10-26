// WhatsApp templates for the messages Regularhood sends a Founding Shop's customers (automessages.ts). Each template
// exists in Hindi and English under the same name, as WhatsApp allows. Body variables are the same in both languages:
//   card, missyou: {{1}} shop · {{2}} stamps · {{3}} visits needed · {{4}} visits left · {{5}} reward
//   reward: {{1}} shop · {{2}} reward          review: {{1}} shop
// The button opens the customer's card (/w/<token>) or, for review, our redirect to the shop's Google review page.

import { SITE } from './seo';

export type AutoKind = 'card' | 'reward' | 'missyou' | 'review';
export type MsgLang = 'hi' | 'en';

type Template = {
  name: string;
  category: 'UTILITY' | 'MARKETING';
  body: Record<MsgLang, string>;
  button: Record<MsgLang, string>;
  url: string; // ends in {{1}}: the wallet token or the shop's join code
  example: { body: string[]; url: string };
};

const CARD = { hi: 'मेरा कार्ड देखें', en: 'See my card' };

export const CUSTOMER_TEMPLATES: Record<AutoKind, Template> = {
  card: {
    name: 'rh_card',
    category: 'UTILITY',
    body: {
      hi: 'नमस्ते! {{1}} पर आपकी विज़िट जुड़ गई ✅\n{{3}} में से {{2}} स्टैम्प हो गए — {{5}} के लिए बस {{4}} और विज़िट।\nअपना कार्ड नीचे देखें।',
      en: 'Your visit at {{1}} is stamped ✅\nYou have {{2}} of {{3}} stamps — {{4}} more visits for {{5}}.\nTap below to see your card.',
    },
    button: CARD,
    url: `${SITE}/w/{{1}}`,
    example: { body: ['Sharma Sweets', '3', '5', '2', 'free kaju katli'], url: `${SITE}/w/Ab3dE5gH7jK9` },
  },
  reward: {
    name: 'rh_reward',
    category: 'UTILITY',
    body: {
      hi: '🎁 खुशखबरी! {{1}} पर आपका {{2}} तैयार है।\nअगली बार काउंटर पर बस अपना फ़ोन नंबर बताइए।',
      en: '🎁 Good news! Your {{2}} at {{1}} is ready.\nJust tell your phone number at the counter on your next visit.',
    },
    button: CARD,
    url: `${SITE}/w/{{1}}`,
    example: { body: ['Sharma Sweets', 'free kaju katli'], url: `${SITE}/w/Ab3dE5gH7jK9` },
  },
  missyou: {
    name: 'rh_missyou',
    category: 'MARKETING',
    body: {
      hi: 'नमस्ते! {{1}} पर हमें आपकी याद आ रही है 👋\nआपके {{3}} में से {{2}} स्टैम्प पहले से हैं — {{5}} के लिए बस {{4}} और विज़िट।\nये मैसेज बंद करने के लिए STOP लिखें।',
      en: 'We miss you at {{1}}! 👋\nYou already have {{2}} of {{3}} stamps — just {{4}} more visits for {{5}}.\nReply STOP to stop these messages.',
    },
    button: CARD,
    url: `${SITE}/w/{{1}}`,
    example: { body: ['Sharma Sweets', '3', '5', '2', 'free kaju katli'], url: `${SITE}/w/Ab3dE5gH7jK9` },
  },
  review: {
    name: 'rh_review',
    category: 'UTILITY',
    body: {
      hi: 'आने के लिए धन्यवाद! 🙏\n{{1}} में आपका अनुभव कैसा रहा? आपका Google रिव्यू इस लोकल दुकान की बहुत मदद करता है। सिर्फ़ 30 सेकंड लगेंगे।',
      en: 'Thank you for visiting {{1}} 🙏\nHow was your experience? A Google review helps this local shop a lot. It takes 30 seconds.',
    },
    button: { hi: 'Google पर रिव्यू दें', en: 'Rate on Google' },
    url: `${SITE}/api/public/review/{{1}}`,
    example: { body: ['Sharma Sweets'], url: `${SITE}/api/public/review/k7Qm2x` },
  },
};

/** The message as the customer reads it, kept in wa_messages. */
export const fill = (text: string, values: string[]) => values.reduce((t, v, i) => t.replaceAll(`{{${i + 1}}}`, v), text);
