import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from './admin';
import { Db } from './db';
import { Gemini } from './gemini';
import { SeoService } from './seo';

// Admin → WhatsApp status: Gemini writes ideas for Hindi WhatsApp status images that promote Regularhood to shop owners.
// It doesn't draw them: each idea becomes a ready-to-paste prompt for Gemini or ChatGPT image generation, which the
// admin uses with the logo (web/public/brand/) attached as a reference. Uses the AI model, prices and monthly budget set
// in Admin → SEO pages. Every batch is kept, and recent headlines are passed back so new ones don't repeat them.

export type StatusStyle = 'festive' | 'clean' | 'illustration' | 'photo' | 'bold';
export type PromptLang = 'en' | 'hi';

const STYLES: Record<StatusStyle, { en: string; hi: string; brief: string }> = {
  festive: {
    en: 'Warm and festive: diyas, marigold flowers, rangoli or soft festival lights, joyful mood',
    hi: 'त्योहार जैसा गर्म माहौल: दीये, गेंदे के फूल, रंगोली या हल्की रोशनी, खुशी का मूड',
    brief: 'festive Indian look',
  },
  clean: {
    en: 'Clean and modern flat design, plenty of empty space, soft shadows, premium and simple',
    hi: 'साफ़ और मॉडर्न फ़्लैट डिज़ाइन, खुली जगह, हल्की परछाइयाँ, सादा और प्रीमियम',
    brief: 'clean modern flat design',
  },
  illustration: {
    en: 'Friendly colourful 2D illustration, cartoon-style Indian characters, rounded shapes',
    hi: 'दोस्ताना रंगीन 2D इलस्ट्रेशन, कार्टून जैसे भारतीय किरदार, गोल आकार',
    brief: 'friendly 2D illustration',
  },
  photo: {
    en: 'Photo-realistic, natural light, a real Indian neighbourhood shop, shallow depth of field',
    hi: 'असली फ़ोटो जैसा, प्राकृतिक रोशनी, असली भारतीय मोहल्ले की दुकान, पीछे का हिस्सा हल्का धुंधला',
    brief: 'photo-realistic shop scene',
  },
  bold: {
    en: 'Bold typography poster: very large Hindi text is the hero, few simple shapes, strong contrast',
    hi: 'बोल्ड टाइपोग्राफी पोस्टर: बड़ा हिंदी टेक्स्ट ही मुख्य है, कुछ सादे आकार, तेज़ कंट्रास्ट',
    brief: 'bold typography poster with little imagery',
  },
};

type Idea = { angle: string; headline: string; subtext: string; cta: string; scene: string; caption: string };
export type StatusIdea = Idea & { prompt: string };
type BatchRow = { id: number; created_at: string; theme: string; shop_type: string; style: StatusStyle; prompt_lang: PromptLang; ideas: string; cost_usd: number };

const S = (type: string, extra: object = {}) => ({ type, ...extra });
const str = (description: string) => S('STRING', { description });
const schema = (count: number, lang: PromptLang) =>
  S('OBJECT', {
    properties: {
      ideas: S('ARRAY', {
        minItems: count,
        maxItems: count,
        items: S('OBJECT', {
          properties: {
            angle: str('A 2 to 5 word label for this idea, in English, e.g. "Lost stamp cards"'),
            headline: str('The big text on the image: Hindi in Devanagari, 3 to 8 words, catchy'),
            subtext: str('One supporting line under the headline: Hindi in Devanagari, at most 14 words'),
            cta: str('Short call to action for a button: Hindi in Devanagari, 2 to 5 words, e.g. "आज ही फ्री शुरू करें"'),
            scene: str(
              `What the image shows, in ${lang === 'hi' ? 'Hindi (Devanagari)' : 'English'}: 2 to 4 sentences describing people, place, objects, composition and mood. No text or words in the scene itself.`,
            ),
            caption: str('The WhatsApp caption to post with the status: Hindi in Devanagari, 1 or 2 short lines, may end with one emoji, no link'),
          },
          required: ['angle', 'headline', 'subtext', 'cta', 'scene', 'caption'],
        }),
      }),
    },
    required: ['ideas'],
  });

function brief(input: { theme: string; shopType: string; style: StatusStyle; count: number; lang: PromptLang }, recent: string[]) {
  return `You plan WhatsApp status images in Hindi for Regularhood, a loyalty and rewards app for small neighbourhood shops in India.
The statuses are posted by Regularhood's founder; the people who see them are shop owners (kirana, chai stall, salon, café, sweet shop, pharmacy, gym and so on). The goal: make a shop owner curious enough to try Regularhood.

Write ${input.count} different ideas. Each one becomes one 9:16 image.
${input.theme ? `Theme or occasion for this batch: "${input.theme}". Every idea should fit it.` : 'Pick varied angles: the problem of customers not coming back, how simple it is, festivals, free to start, a day in a shop owner\'s life, WhatsApp reminders, rewards customers love.'}
${input.shopType ? `Aim them at this kind of shop: "${input.shopType}". Show that kind of shop and its products.` : 'Show different kinds of Indian neighbourhood shops across the ideas.'}
Visual style: ${STYLES[input.style].brief}.

What Regularhood does (use only these facts):
- Points on every bill (10 points per ₹100 by default). The customer scans a QR at the counter, or the shop types their phone number.
- The customer's loyalty card opens in the phone's browser: no app to install. Works in Hindi and English.
- Rewards set by the shop, welcome and birthday bonus, a Gold tier for regulars.
- One-tap WhatsApp messages: points earned, and "we miss you" reminders to customers who haven't come back.
- Works on any phone. Free to start, set up in two minutes. Website: www.regularhood.in

Rules:
- All Hindi in Devanagari script, the everyday Hindi shop owners speak. Simple common English words are fine written in Devanagari (कस्टमर, पॉइंट्स, QR, WhatsApp may stay as is). Never write Hindi in Latin letters.
- Headlines are short and punchy: something a shop owner reads in one second.
- No statistics or percentages, no made-up testimonials or quotes, no competitor names, no price except "फ्री".
- The scene never contains written words, signboards with text, or logos: the text is added separately.
- Each idea clearly different from the others.${recent.length ? `\n- Don't repeat or closely copy these recent headlines: ${recent.map((h) => `"${h}"`).join(', ')}` : ''}`;
}

/** The text the admin pastes into Gemini or ChatGPT, with the logo attached as an image. */
function imagePrompt(idea: Idea, style: StatusStyle, lang: PromptLang) {
  if (lang === 'hi') {
    return `एक वर्टिकल 9:16 WhatsApp स्टेटस इमेज बनाओ (1080×1920 पिक्सल)।

दृश्य: ${idea.scene}

इमेज पर यह टेक्स्ट बिल्कुल ऐसे ही लिखो, हिंदी (देवनागरी) में, सही वर्तनी के साथ, बड़े और फ़ोन पर आसानी से पढ़े जाने वाले अक्षरों में:
• मुख्य लाइन: "${idea.headline}"
• उसके नीचे: "${idea.subtext}"
• बटन पर: "${idea.cta}"
• सबसे नीचे छोटे अक्षरों में: "www.regularhood.in"

ब्रांडिंग: मैंने Regularhood का लोगो साथ में जोड़ा है (हरा गोल-कोनों वाला चौकोर, ऊपर नारंगी-सफ़ेद दुकान की छतरी, QR जैसी खिड़कियाँ और तारे वाला नारंगी दरवाज़ा)। इस लोगो को बिना बदले, जैसा है वैसा ही ऊपर छोटा लगाओ और उसके पास "Regularhood" लिखो। लोगो दोबारा मत बनाओ।
रंग: गहरा हरा #0B7A52, नारंगी #F0A202, हल्का सफ़ेद #EEF2EC।
स्टाइल: ${STYLES[style].hi}।
ऊपर और नीचे लगभग 8% जगह खाली छोड़ो (वहाँ WhatsApp अपने बटन दिखाता है)। इसके अलावा कोई और टेक्स्ट, वॉटरमार्क या गलत अक्षर नहीं।`;
  }
  return `Create a vertical 9:16 WhatsApp Status image (1080×1920 px).

Scene: ${idea.scene}

Text on the image: write it exactly as given, in Hindi (Devanagari script), spelled correctly, in large letters that are easy to read on a phone:
• Headline: "${idea.headline}"
• Line below it: "${idea.subtext}"
• On a button: "${idea.cta}"
• Small, at the bottom: "www.regularhood.in"

Branding: I have attached the Regularhood logo (a green rounded square with an orange-and-white shop awning, QR-style windows and an orange door with a star). Place this exact logo, unchanged, small near the top, with the name "Regularhood" next to it. Do not redraw or alter the logo.
Colours: deep green #0B7A52, warm orange #F0A202, off-white #EEF2EC.
Style: ${STYLES[style].en}.
Leave about 8% empty space at the top and bottom (WhatsApp shows its buttons there). No other text, no watermarks, no misspelt or made-up letters.`;
}

const devanagariShare = (text: string) => {
  const dev = (text.match(/[ऀ-ॿ]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  return dev / Math.max(1, dev + latin);
};

@Controller('api/admin/status')
@UseGuards(AdminGuard)
export class StatusAdminController {
  constructor(
    private readonly db: Db,
    private readonly gemini: Gemini,
    private readonly seo: SeoService,
  ) {}

  /** The latest batches, newest first. */
  @Get()
  list() {
    const rows = this.db.sql.prepare('SELECT * FROM status_prompts ORDER BY id DESC LIMIT 30').all() as BatchRow[];
    return {
      keySet: this.gemini.configured,
      model: this.seo.settings().model,
      batches: rows.map(({ ideas, ...b }) => ({ ...b, ideas: JSON.parse(ideas) as StatusIdea[] })),
    };
  }

  @Post()
  @HttpCode(200)
  async generate(@Body() body: { theme?: string; shopType?: string; style?: string; count?: number; lang?: string }) {
    const input = {
      theme: String(body?.theme ?? '').trim().slice(0, 200),
      shopType: String(body?.shopType ?? '').trim().slice(0, 80),
      style: (body?.style && body.style in STYLES ? body.style : 'clean') as StatusStyle,
      count: Math.min(5, Math.max(1, Math.round(Number(body?.count) || 3))),
      lang: (body?.lang === 'hi' ? 'hi' : 'en') as PromptLang,
    };
    const recent = (this.db.sql.prepare('SELECT ideas FROM status_prompts ORDER BY id DESC LIMIT 8').all() as { ideas: string }[])
      .flatMap((r) => (JSON.parse(r.ideas) as Idea[]).map((i) => i.headline))
      .slice(0, 30);

    const t = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
    const write = async () => {
      const { data, costUsd } = await this.gemini.json<{ ideas: Idea[] }>(brief(input, recent), schema(input.count, input.lang), this.seo.settings(), { purpose: 'whatsapp-status' });
      const ideas = (Array.isArray(data?.ideas) ? data.ideas : [])
        .slice(0, input.count)
        .map((i) => ({ angle: t(i?.angle, 60), headline: t(i?.headline, 80), subtext: t(i?.subtext, 160), cta: t(i?.cta, 50), scene: t(i?.scene, 900), caption: t(i?.caption, 300) }))
        .filter((i) => i.headline && i.scene);
      if (!ideas.length) throw new Error('The model returned no ideas');
      // The words on the image must be Devanagari, not Hindi typed in Latin letters.
      if (devanagariShare(ideas.map((i) => `${i.headline} ${i.subtext} ${i.cta}`).join(' ')) < 0.7) throw new Error('The Hindi came back in Latin letters');
      return { ideas, costUsd };
    };

    let result: Awaited<ReturnType<typeof write>>;
    try {
      result = await write().catch(write); // one more try if the answer doesn't pass the checks
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
    const ideas: StatusIdea[] = result.ideas.map((i) => ({ ...i, prompt: imagePrompt(i, input.style, input.lang) }));
    const { lastInsertRowid } = this.db.sql
      .prepare('INSERT INTO status_prompts (theme, shop_type, style, prompt_lang, ideas, cost_usd) VALUES (?, ?, ?, ?, ?, ?)')
      .run(input.theme, input.shopType, input.style, input.lang, JSON.stringify(ideas), result.costUsd);
    return { id: Number(lastInsertRowid), ideas, costUsd: result.costUsd };
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    this.db.sql.prepare('DELETE FROM status_prompts WHERE id = ?').run(id);
    return { ok: true };
  }
}
