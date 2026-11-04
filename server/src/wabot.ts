import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Db } from './db';
import { LeadsService } from './leads';
import { offer } from './plans';
import { WhatsApp, type LeadReply } from './whatsapp';

// The reply bot for leads. When a shop owner taps "Haan, batao" on the intro template (or writes back for the first
// time), WhatsApp's 24-hour window opens and every message here is free. The bot answers with buttons:
//
//   how it works → [Video dikhao] [Kitna kharcha?] [Free shuru karo]
//   video        → the demo video (Admin → WhatsApp API → demo video link; the button is hidden without one)
//   price        → the free plan and Founding Shop, read from Admin → Plans
//   sign-up      → a link button with the lead's own sign-up link (a sign-up marks the lead joined)
//   questions    → a list of common questions; "Aapse baat karni hai" hands the chat to the admin
//
// About 20 hours after the sign-up link, if they haven't joined, one reminder goes out while the window is still open.
// What they type after the first reply isn't answered: it waits in Admin → WhatsApp chats as unread. The admin can
// pause the bot in any chat. Wording is Hinglish, or Hindi when they replied in Devanagari.

type Lang = 'hinglish' | 'hindi';
type Step = 'howto' | 'video' | 'price' | 'faq' | 'signup' | 'human' | 'later';
type BotRow = { phone: string; lead_id: number | null; lang: Lang; step: Step; paused: number };

const FAQ = ['faq_app', 'faq_gift', 'faq_shops', 'faq_data'] as const;
type Faq = (typeof FAQ)[number];
type Action = 'start' | 'video' | 'price' | 'signup' | 'faq' | 'human' | 'later' | Faq;
const ACTIONS: readonly string[] = ['video', 'price', 'signup', 'faq', 'human', 'later', ...FAQ];

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

/** Every line the bot sends. Button titles stay within WhatsApp's 20 characters, list rows within 24. */
const TEXT = {
  hinglish: {
    howto:
      'Bas 3 step:\n1. Customer aaye, counter pe uska mobile number daaliye aur "Add visit" dabaiye\n2. Uska stamp card uske phone pe khulta hai, koi app nahi chahiye\n3. 5th visit pe customer ko free gift (gift aap chuniye)\n\nIsse ek baar aaya customer baar-baar aata hai.',
    video: '30 second mein dekhiye counter pe kaise kaam karta hai.',
    price: (o: ReturnType<typeof offer>) =>
      `Shuru karna free hai: ${o.freeCustomers} customers tak, hamesha ke liye.` +
      (o.open && o.left > 0
        ? `\n\nZyada customers ho jaayein to Founding Shop: ${rupees(o.prices.lifetime)} ek baar (lifetime) ya ${rupees(o.prices.yearly)}/saal. Isme customers ko unka card, "gift ready hai" aur "bahut din ho gaye" messages WhatsApp pe khud jaate hain.\nSirf ${o.total} shops ke liye, abhi ${o.left} jagah baaki.`
        : ''),
    signup: 'Bas 2 minute lagenge: shop ka naam aur mobile number daaliye, phir pehle customer ka visit add kijiye. Koi payment nahi chahiye.',
    signupButton: 'Free account banao',
    faq: 'Kya jaanna hai? Neeche se chuniye.',
    faqButton: 'Sawal chuniye',
    faqRows: {
      faq_app: ['Customer ko app chahiye?', ''],
      faq_gift: ['Gift kya dena hoga?', ''],
      faq_shops: ['Kaunsi shops ke liye?', ''],
      faq_data: ['Customer data safe hai?', ''],
      human: ['Aapse baat karni hai', 'Hum yahin reply karenge'],
    },
    answers: {
      faq_app: 'Nahi. Customer bas apna mobile number batata hai. Uska card ek link se phone pe khulta hai: koi download nahi, koi password nahi.',
      faq_gift: 'Gift aap chuniye: koi free item, free service ya discount, jo aapke shop pe chale. Kitne visit pe milega woh bhi aap set karte hain (normally 5).',
      faq_shops: 'Jahaan customer baar-baar aate hain: salon, café, bakery, sweets, kirana, gym, medical, tailor. Counter pe bas ek mobile ya laptop chahiye.',
      faq_data: 'Haan. Hum sirf customer ka naam aur number rakhte hain, aur woh sirf aapke shop ke liye hai. Hum data kisi ko bechte nahi, na ads dikhate hain.',
    } as Record<Faq, string>,
    human: 'Theek hai, hum thodi der mein yahin reply karte hain.',
    nudge: 'Account ban gaya? Koi dikkat aayi ho to bataiye, hum madad kar denge.',
    later: 'Theek hai. Jab time ho, upar wale link se 2 minute mein shuru kar sakte hain.',
    goodbye: 'Theek hai, ab aapko message nahi aayega. Kabhi zaroorat ho to START likhiye.',
    buttons: { video: 'Video dikhao', price: 'Kitna kharcha?', signup: 'Free shuru karo', faq: 'Sawal hai', more: 'Aur sawal', help: 'Help chahiye', again: 'Link phir bhejo', later: 'Baad mein' },
  },
  hindi: {
    howto:
      'बस 3 स्टेप:\n1. ग्राहक आए, काउंटर पर उसका मोबाइल नंबर डालिए और "Add visit" दबाइए\n2. उसका स्टैम्प कार्ड उसके फ़ोन पर खुलता है, कोई ऐप नहीं चाहिए\n3. 5वीं विज़िट पर ग्राहक को फ्री गिफ़्ट (गिफ़्ट आप चुनिए)\n\nइससे एक बार आया ग्राहक बार-बार आता है।',
    video: '30 सेकंड में देखिए काउंटर पर कैसे काम करता है।',
    price: (o: ReturnType<typeof offer>) =>
      `शुरू करना फ्री है: ${o.freeCustomers} ग्राहकों तक, हमेशा के लिए।` +
      (o.open && o.left > 0
        ? `\n\nज़्यादा ग्राहक हो जाएँ तो Founding Shop: ${rupees(o.prices.lifetime)} एक बार (lifetime) या ${rupees(o.prices.yearly)}/साल। इसमें ग्राहकों को उनका कार्ड, "गिफ़्ट तैयार है" और "बहुत दिन हो गए" मैसेज WhatsApp पर अपने आप जाते हैं।\nसिर्फ़ ${o.total} दुकानों के लिए, अभी ${o.left} जगह बाकी।`
        : ''),
    signup: 'बस 2 मिनट लगेंगे: दुकान का नाम और मोबाइल नंबर डालिए, फिर पहले ग्राहक की विज़िट जोड़िए। कोई पेमेंट नहीं चाहिए।',
    signupButton: 'फ्री अकाउंट बनाएँ',
    faq: 'क्या जानना है? नीचे से चुनिए।',
    faqButton: 'सवाल चुनिए',
    faqRows: {
      faq_app: ['ग्राहक को ऐप चाहिए?', ''],
      faq_gift: ['गिफ़्ट क्या देना होगा?', ''],
      faq_shops: ['किन दुकानों के लिए है?', ''],
      faq_data: ['डेटा सुरक्षित है?', ''],
      human: ['आपसे बात करनी है', 'हम यहीं जवाब देंगे'],
    },
    answers: {
      faq_app: 'नहीं। ग्राहक बस अपना मोबाइल नंबर बताता है। उसका कार्ड एक लिंक से फ़ोन पर खुलता है: कोई डाउनलोड नहीं, कोई पासवर्ड नहीं।',
      faq_gift: 'गिफ़्ट आप चुनिए: कोई फ्री आइटम, फ्री सर्विस या डिस्काउंट, जो आपकी दुकान पर चले। कितनी विज़िट पर मिलेगा, वह भी आप तय करते हैं (आमतौर पर 5)।',
      faq_shops: 'जहाँ ग्राहक बार-बार आते हैं: सैलून, कैफ़े, बेकरी, मिठाई, किराना, जिम, मेडिकल, टेलर। काउंटर पर बस एक मोबाइल या लैपटॉप चाहिए।',
      faq_data: 'हाँ। हम सिर्फ़ ग्राहक का नाम और नंबर रखते हैं, और वह सिर्फ़ आपकी दुकान के लिए है। हम डेटा किसी को बेचते नहीं, न विज्ञापन दिखाते हैं।',
    } as Record<Faq, string>,
    human: 'ठीक है, हम थोड़ी देर में यहीं जवाब देते हैं।',
    nudge: 'अकाउंट बन गया? कोई दिक्कत आई हो तो बताइए, हम मदद कर देंगे।',
    later: 'ठीक है। जब समय हो, ऊपर वाले लिंक से 2 मिनट में शुरू कर सकते हैं।',
    goodbye: 'ठीक है, अब आपको मैसेज नहीं आएगा। कभी ज़रूरत हो तो START लिखिए।',
    buttons: { video: 'वीडियो दिखाओ', price: 'कितना खर्चा?', signup: 'फ्री शुरू करें', faq: 'सवाल है', more: 'और सवाल', help: 'मदद चाहिए', again: 'लिंक फिर भेजें', later: 'बाद में' },
  },
};

const DEVANAGARI = /[ऀ-ॿ]/;

@Injectable()
export class WaBot implements OnModuleDestroy {
  private timer: NodeJS.Timeout;

  constructor(
    private readonly db: Db,
    private readonly wa: WhatsApp,
    private readonly leads: LeadsService,
  ) {
    wa.bot = this;
    this.timer = setInterval(() => void this.nudgeRound().catch((e) => console.error('WhatsApp bot reminders failed:', (e as Error).message)), 15 * 60_000);
    this.timer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  private row(phone: string) {
    return this.db.sql.prepare('SELECT phone, lead_id, lang, step, paused FROM wa_bot WHERE phone = ?').get(phone) as BotRow | undefined;
  }

  private save(phone: string, leadId: number, lang: Lang, step: Step) {
    this.db.sql
      .prepare(
        `INSERT INTO wa_bot (phone, lead_id, lang, step, paused, signup_at) VALUES (?, ?, ?, ?, ?, CASE WHEN ? = 'signup' THEN datetime('now') END)
         ON CONFLICT(phone) DO UPDATE SET lead_id = excluded.lead_id, step = excluded.step, paused = excluded.paused,
           signup_at = COALESCE(excluded.signup_at, signup_at), updated_at = datetime('now')`,
      )
      .run(phone, leadId, lang, step, step === 'human' ? 1 : 0, step);
  }

  /** A lead's reply: a tap on one of the bot's buttons, the intro's "yes", or their first message. */
  async reply(r: LeadReply) {
    const row = this.row(r.phone);
    if (row?.paused) return;
    let action: Action | null = r.id?.startsWith('rh_') && ACTIONS.includes(r.id.slice(3)) ? (r.id.slice(3) as Action) : null;
    if (!action) {
      // The intro's "Haan, batao" always starts over. A first typed message starts the flow too, unless the admin was
      // already talking to them before the bot existed.
      const talked = this.db.sql.prepare("SELECT 1 FROM wa_messages WHERE phone = ? AND direction = 'out' AND kind != 'template' AND status != 'failed'").get(r.phone);
      if (r.type === 'button' ? r.yes : !row && !talked) action = 'start';
    }
    if (!action) return;
    const lang: Lang = row?.lang ?? (DEVANAGARI.test(r.said) ? 'hindi' : 'hinglish');
    await this.send(r.phone, r.leadId, lang, action);
  }

  /** "Abhi nahi" or STOP: one line saying no more messages will come. */
  async goodbye(phone: string, leadId: number, said: string) {
    const lang: Lang = this.row(phone)?.lang ?? (DEVANAGARI.test(said) ? 'hindi' : 'hinglish');
    this.db.sql.prepare("UPDATE wa_bot SET step = 'later', updated_at = datetime('now') WHERE phone = ?").run(phone);
    await this.wa.sendTextTo(phone, TEXT[lang].goodbye, leadId, true);
  }

  private async send(phone: string, leadId: number, lang: Lang, action: Action) {
    const t = TEXT[lang];
    const b = t.buttons;
    const video = this.wa.settings().demoVideoUrl;
    const buttons = (list: [string, string][]) => ({ type: 'button', action: { buttons: list.map(([id, title]) => ({ type: 'reply', reply: { id: `rh_${id}`, title } })) } });
    const shown = (text: string, list: [string, string][]) => `${text}\n\n${list.map(([, title]) => `[${title}]`).join(' ')}`;
    const ask = async (step: Step, text: string, list: [string, string][], header?: object) => {
      this.save(phone, leadId, lang, step);
      await this.wa.sendInteractive(phone, { ...buttons(list), ...(header ? { header } : {}), body: { text } }, header ? `🎬 Demo video\n${shown(text, list)}` : shown(text, list), leadId);
    };

    switch (action) {
      case 'start':
        return ask('howto', t.howto, [...(video ? [['video', b.video] as [string, string]] : []), ['price', b.price], ['signup', b.signup]]);
      case 'video':
        if (!video) return ask('howto', t.howto, [['price', b.price], ['signup', b.signup], ['faq', b.faq]]);
        return ask('video', t.video, [['price', b.price], ['signup', b.signup], ['faq', b.faq]], { type: 'video', video: { link: video } });
      case 'price':
        return ask('price', t.price(offer(this.db.sql)), [['signup', b.signup], ['faq', b.faq]]);
      case 'signup': {
        this.save(phone, leadId, lang, 'signup');
        const url = this.leads.link(leadId);
        await this.wa.sendInteractive(
          phone,
          { type: 'cta_url', body: { text: t.signup }, action: { name: 'cta_url', parameters: { display_text: t.signupButton, url } } },
          `${t.signup}\n\n[${t.signupButton}] ${url}`,
          leadId,
        );
        return;
      }
      case 'faq': {
        this.save(phone, leadId, lang, 'faq');
        const rows = Object.entries(t.faqRows).map(([id, [title, description]]) => ({ id: `rh_${id}`, title, ...(description ? { description } : {}) }));
        await this.wa.sendInteractive(
          phone,
          { type: 'list', body: { text: t.faq }, action: { button: t.faqButton, sections: [{ title: t.faqButton, rows }] } },
          `${t.faq}\n\n${rows.map((r) => `• ${r.title}`).join('\n')}`,
          leadId,
        );
        return;
      }
      case 'human':
        this.save(phone, leadId, lang, 'human');
        await this.wa.sendTextTo(phone, t.human, leadId);
        return;
      case 'later':
        this.save(phone, leadId, lang, 'later');
        await this.wa.sendTextTo(phone, t.later, leadId);
        return;
      default:
        return ask('faq', t.answers[action], [['signup', b.signup], ['price', b.price], ['faq', b.more]]);
    }
  }

  /**
   * One reminder to leads who got the sign-up link about 20 hours ago and haven't joined, while WhatsApp still allows
   * free messages (24 hours after their last message).
   */
  async nudgeRound() {
    if (!this.wa.settings().autoPitch) return;
    const due = this.db.sql
      .prepare(
        `SELECT b.phone, b.lead_id, b.lang FROM wa_bot b JOIN leads l ON l.id = b.lead_id
         WHERE b.step = 'signup' AND b.paused = 0 AND b.nudged_at IS NULL AND b.signup_at <= datetime('now', '-20 hours')
           AND l.status != 'joined' AND l.wa_opted_out = 0
           AND NOT EXISTS (SELECT 1 FROM wa_optouts o WHERE o.phone = b.phone)
           AND (SELECT MAX(created_at) FROM wa_messages m WHERE m.phone = b.phone AND m.direction = 'in') >= datetime('now', '-23 hours', '-30 minutes')`,
      )
      .all() as { phone: string; lead_id: number; lang: Lang }[];
    for (const d of due) {
      this.db.sql.prepare("UPDATE wa_bot SET nudged_at = datetime('now') WHERE phone = ?").run(d.phone);
      const t = TEXT[d.lang];
      const list: [string, string][] = [['human', t.buttons.help], ['signup', t.buttons.again], ['later', t.buttons.later]];
      await this.wa
        .sendInteractive(
          d.phone,
          { type: 'button', body: { text: t.nudge }, action: { buttons: list.map(([id, title]) => ({ type: 'reply', reply: { id: `rh_${id}`, title } })) } },
          `${t.nudge}\n\n${list.map(([, title]) => `[${title}]`).join(' ')}`,
          d.lead_id,
        )
        .catch((e) => console.error(`WhatsApp bot reminder to ${d.phone} failed:`, (e as Error).message));
    }
  }
}
