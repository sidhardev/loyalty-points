import { BadRequestException, Body, CanActivate, Controller, ExecutionContext, Get, HttpCode, Injectable, Post, Put, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import Anthropic from '@anthropic-ai/sdk';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { Db } from './db';
import { unseal } from './secret';

// Pushro Digital Hub (a mobile accessories shop) gets its own website at pushro.regularhood.in (pushro-site.ts) and a
// private studio at /studio (web/public/pushro/studio.html). The studio uses Claude Haiku 5.5 to design WhatsApp status
// images and to write marketing copy. Claude writes the design (words, layout, colours, which product to draw); the
// studio draws the 1080×1920 picture on a canvas in the browser, so the owner can download or share it straight away.
//
// The owner logs in with PUSHRO_CODE from the server's environment. The Anthropic key is the same one Admin → Playbooks
// uses (admin panel or ANTHROPIC_API_KEY). Every call is written to ai_usage with purpose 'pushro_*', and the studio
// stops after DAILY_LIMIT generations a day so a leaked code can't run up a bill.

const MODEL = 'claude-haiku-5-5';
const PRICE_IN_USD = 0.1; // per 1M input tokens
const PRICE_OUT_USD = 0.5; // per 1M output tokens (thinking included)
const DAILY_LIMIT = 150;

export const CATEGORIES = {
  covers: 'Covers & cases',
  glass: 'Tempered glass',
  chargers: 'Chargers & adapters',
  cables: 'Cables',
  earbuds: 'Earbuds & neckbands',
  headphones: 'Headphones',
  powerbanks: 'Power banks',
  watches: 'Smartwatches',
  speakers: 'Bluetooth speakers',
  holders: 'Car & bike holders',
  memory: 'Memory cards & pendrives',
  gadgets: 'Gadgets & more',
} as const;
export type CategoryKey = keyof typeof CATEGORIES;

export type PushroSite = {
  name: string;
  tagline: string;
  about: string;
  announce: string; // strip at the top of the site, e.g. this week's offer
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  mapsLink: string;
  hours: string;
  instagram: string;
  googleReview: string;
  loyaltyLink: string; // the shop's Regularhood stamp card page
  reward: string; // the loyalty reward, e.g. "tempered glass FREE"
  rewardVisits: number; // ...on this visit
  categories: CategoryKey[];
  offers: { title: string; price: string; note: string }[];
  highlights: string[];
};

export const DEFAULT_SITE: PushroSite = {
  name: 'Pushro Digital Hub',
  tagline: 'Har phone ke liye, sab kuch ek jagah.',
  about: 'Covers, tempered glass, chargers, earbuds, power banks aur smart gadgets: apne phone ke liye sahi accessory, sahi daam pe.',
  announce: '5 visit poore karo, ek tempered glass FREE pao!',
  phone: '+919636263623',
  whatsapp: '+919636263623',
  address: '',
  city: 'Jharkhand',
  mapsLink: '',
  hours: '',
  instagram: '',
  googleReview: '',
  loyaltyLink: '',
  reward: 'ek tempered glass FREE',
  rewardVisits: 5,
  categories: ['covers', 'glass', 'chargers', 'cables', 'earbuds', 'headphones', 'powerbanks', 'watches', 'speakers'],
  offers: [{ title: '5 visit pe tempered glass FREE', price: 'FREE', note: 'Har visit pe ek stamp. 5 visit poore hote hi ek tempered glass bilkul free.' }],
  highlights: [],
};

// ---------- Claude: status designs ----------

export const PRODUCTS = ['earbuds', 'headphones', 'phone', 'cover', 'glass', 'charger', 'cable', 'powerbank', 'watch', 'speaker', 'holder', 'memory'] as const;
export const TEMPLATES = ['spotlight', 'sale', 'minimal', 'split', 'festive'] as const;
export const PALETTES = ['electric', 'sunset', 'mint', 'royal', 'mono', 'fire', 'gold'] as const;

export type StatusDesign = {
  angle: string;
  template: (typeof TEMPLATES)[number];
  palette: (typeof PALETTES)[number];
  product: (typeof PRODUCTS)[number];
  badge: string;
  headline: string;
  subline: string;
  offer: string;
  cta: string;
  caption: string;
};

const enumOf = (values: readonly string[], description: string) => ({ type: 'string', enum: [...values], description });
const text = (description: string) => ({ type: 'string', description });

const STATUS_SCHEMA = {
  type: 'object',
  properties: {
    designs: {
      type: 'array',
      description: 'The status designs, as many as asked for',
      items: {
        type: 'object',
        properties: {
          angle: text('2-5 word English label for the idea, e.g. "Fast charging combo"'),
          template: enumOf(TEMPLATES, 'Layout: spotlight = big product with glow; sale = loud discount poster; minimal = calm premium; split = product one side, text the other; festive = festival greeting with the product'),
          palette: enumOf(PALETTES, 'Colour palette: electric = blue/cyan neon on dark; sunset = orange/pink; mint = green fresh; royal = purple/indigo; mono = black and white premium; fire = red/yellow loud; gold = black and gold festive'),
          product: enumOf(PRODUCTS, 'Which product to draw (ignored if the owner uploads a photo)'),
          badge: text('Tiny label above the headline, 1-3 words, e.g. "NEW ARRIVAL", "LIMITED STOCK", "COMBO DEAL". Empty if not needed'),
          headline: text('The big text: 2-6 words, punchy. Most important words first'),
          subline: text('One supporting line, at most 12 words'),
          offer: text('Price or discount text exactly from the owner\'s offer, e.g. "₹299 only" or "Flat 20% OFF". Empty string if the owner gave no price or discount: never invent one'),
          cta: text('2-4 word call to action, e.g. "Aaj hi aao", "WhatsApp karo"'),
          caption: text('Caption to post with the status: 1-2 short lines, may end with one emoji'),
        },
        required: ['angle', 'template', 'palette', 'product', 'badge', 'headline', 'subline', 'offer', 'cta', 'caption'],
        additionalProperties: false,
      },
    },
  },
  required: ['designs'],
  additionalProperties: false,
};

const LANG = {
  hinglish: 'Hinglish: Hindi written in Roman (English) letters, the way people type on WhatsApp, e.g. "Naya stock aa gaya!"',
  hindi: 'Hindi in Devanagari script, simple everyday words (English product words like charger or earbuds are fine)',
  english: 'Simple Indian English',
} as const;
export type Lang = keyof typeof LANG;

function shopContext(site: PushroSite) {
  return [
    `Shop: ${site.name}, a mobile accessories shop${site.city ? ` in ${site.city}` : ''} in India.`,
    `Sells: ${site.categories.map((c) => CATEGORIES[c]).join(', ')}.`,
    site.offers.length ? `Current offers on the website: ${site.offers.map((o) => `${o.title}${o.price ? ` (${o.price})` : ''}`).join('; ')}.` : '',
    site.reward ? `Loyalty reward: on the ${site.rewardVisits}th visit the customer gets: ${site.reward}.` : '',
    site.highlights.length ? `What the shop says about itself: ${site.highlights.join('; ')}.` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

const STATUS_SYSTEM = `You design WhatsApp status images for a neighbourhood mobile accessories shop in India. The owner posts them
on WhatsApp status and Instagram stories for customers and people nearby. Each design becomes a 1080x1920 image drawn by our
app: a background in the chosen palette, a drawing of the chosen product (or the owner's photo), and your text on top.

Rules:
- Short and punchy. Customers glance at a status for 2 seconds. The headline must read instantly.
- Never invent prices, discounts, brand names, warranties or stock claims. Use only what the owner gave. If no offer was given, offer is "".
- Vary the template, palette, product and angle across the designs, unless the owner asked for one product.
- Match the product to the request (earbuds request → earbuds, cover request → cover, etc.).
- Festive template only if there is a festival or occasion in the request or one is coming up within a few days of today's date.
- Never mention chai or tea. No hashtags in the caption.`;

// ---------- Claude: marketing copy ----------

export const TOOLS = {
  broadcast: {
    label: 'WhatsApp broadcast',
    brief: 'Write 3 different WhatsApp broadcast messages the shop can send to its customer list. Each 3-6 short lines, friendly, with the offer and a clear ask (visit / reply). Use *bold* WhatsApp formatting for the key line, at most 2 emojis.',
  },
  instagram: {
    label: 'Instagram post',
    brief: 'Write 3 Instagram captions for a post or reel. Each: a hook line, 2-3 lines of body, a call to action, then a line of 8-12 relevant hashtags (local + product).',
  },
  reel: {
    label: 'Reel idea',
    brief: 'Give 3 ideas for a 15-25 second Instagram reel the owner can shoot on a phone inside the shop. For each: the hook (first 2 seconds), 4-6 numbered shots with what to film, the on-screen text, and a trending-style audio mood (no specific song names).',
  },
  google: {
    label: 'Google Business post',
    brief: 'Write 3 Google Business Profile posts (each 60-120 words, plain text, no hashtags, no emojis) that help local search: mention the area/city if known and the product words people search for.',
  },
  review: {
    label: 'Review reply',
    brief: 'The details are a customer review. Write 3 different polite replies the owner can post on Google (2-4 lines each). Thank them by name if given; if the review is negative, apologise, do not argue, and invite them to visit or call to fix it.',
  },
  ideas: {
    label: 'Offer ideas',
    brief: 'Suggest 5 offer or combo ideas for this week that a small mobile accessories shop can actually run (combos, upgrade offers, exchange, bundle with new phone, student offer, festival offer). For each: the offer name, how it works in 1-2 lines, and a one-line status headline for it. Do not promise specific profit numbers.',
  },
} as const;
export type Tool = keyof typeof TOOLS;

const COPY_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: { title: text('Short title for this option, 2-6 words'), text: text('The full text, ready to copy. Use \\n for new lines') },
        required: ['title', 'text'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
};

const COPY_SYSTEM = `You are the marketing helper for a neighbourhood mobile accessories shop in India. Write copy the owner can paste
and post right away. Plain, warm, local; no corporate jargon, no hype words like "revolutionary". Never invent prices,
discounts, brand names, warranties, reviews or numbers: use only what the owner gave, and leave a [price] placeholder if a
price is needed but not given. Never mention chai or tea.`;

// ---------- Service ----------

@Injectable()
export class PushroService {
  constructor(private readonly db: Db) {}

  site(): PushroSite {
    const row = this.db.sql.prepare("SELECT value FROM app_settings WHERE key = 'pushro_site'").get() as { value: string } | undefined;
    if (!row) return DEFAULT_SITE;
    try {
      return { ...DEFAULT_SITE, ...(JSON.parse(row.value) as Partial<PushroSite>) };
    } catch {
      return DEFAULT_SITE;
    }
  }

  saveSite(site: PushroSite) {
    this.db.sql
      .prepare("INSERT INTO app_settings (key, value) VALUES ('pushro_site', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(JSON.stringify(site));
    return site;
  }

  usedToday() {
    return (this.db.sql.prepare("SELECT COUNT(*) AS n FROM ai_usage WHERE purpose LIKE 'pushro_%' AND ts >= date('now')").get() as { n: number }).n;
  }

  private key() {
    const row = this.db.sql.prepare("SELECT value FROM app_settings WHERE key = 'anthropic_key'").get() as { value: string } | undefined;
    return (row && unseal(row.value)) || process.env.ANTHROPIC_API_KEY?.trim() || '';
  }

  /** One structured call to Haiku. Returns the parsed JSON. */
  private async ask<T>(purpose: string, system: string, schema: Record<string, unknown>, prompt: string): Promise<T> {
    const key = this.key();
    if (!key) throw new BadRequestException('AI is not set up yet: the Anthropic API key is missing on the server');
    if (this.usedToday() >= DAILY_LIMIT) throw new BadRequestException(`Aaj ki limit (${DAILY_LIMIT}) poori ho gayi. Kal phir try karein.`);

    let inputTokens = 0;
    let outputTokens = 0;
    const record = (ok: boolean, error?: string) =>
      this.db.sql
        .prepare('INSERT INTO ai_usage (purpose, ref_id, model, input_tokens, output_tokens, cost_usd, ok, error) VALUES (?, NULL, ?, ?, ?, ?, ?, ?)')
        .run(purpose, MODEL, inputTokens, outputTokens, (inputTokens / 1e6) * PRICE_IN_USD + (outputTokens / 1e6) * PRICE_OUT_USD, ok ? 1 : 0, error?.slice(0, 500) ?? null);

    try {
      const response = await new Anthropic({ apiKey: key, timeout: 90_000 }).messages.create({
        model: MODEL,
        max_tokens: 16000,
        output_config: { effort: 'low', format: { type: 'json_schema', schema } },
        system,
        messages: [{ role: 'user', content: prompt }],
      });
      inputTokens = response.usage.input_tokens;
      outputTokens = response.usage.output_tokens;
      if (response.stop_reason === 'refusal') throw new Error('AI ne ye request mana kar di; thoda alag likh ke try karein');
      if (response.stop_reason === 'max_tokens') throw new Error('Jawab adhoora aaya; dobara try karein');
      const out = JSON.parse(response.content.map((b) => (b.type === 'text' ? b.text : '')).join('')) as T;
      record(true);
      return out;
    } catch (error) {
      const message =
        error instanceof Anthropic.AuthenticationError
          ? 'Anthropic did not accept the API key'
          : error instanceof Anthropic.RateLimitError
            ? 'AI abhi busy hai; ek minute baad try karein'
            : error instanceof Anthropic.APIError
              ? `Anthropic ${error.status ?? ''}: ${error.message}`
              : (error as Error).message;
      record(false, message);
      throw new BadRequestException(message);
    }
  }

  async statuses(input: { request: string; offer: string; product: string; lang: Lang; count: number }) {
    const site = this.site();
    const prompt = [
      shopContext(site),
      `Today's date: ${new Date().toISOString().slice(0, 10)}.`,
      `Language for all text: ${LANG[input.lang]}.`,
      `Write ${input.count} different status designs.`,
      `What the owner wants: ${input.request || 'General statuses that bring people into the shop this week.'}`,
      input.offer ? `The owner's offer (use exactly, do not change numbers): ${input.offer}` : 'The owner gave no price or discount: leave offer empty.',
      input.product && input.product !== 'any' ? `Product to draw in every design: ${input.product}.` : '',
    ]
      .filter(Boolean)
      .join('\n');
    const out = await this.ask<{ designs: StatusDesign[] }>('pushro_status', STATUS_SYSTEM, STATUS_SCHEMA, prompt);
    // Keep only values the studio knows how to draw.
    return out.designs.slice(0, input.count).map((d) => ({
      ...d,
      template: TEMPLATES.includes(d.template) ? d.template : 'spotlight',
      palette: PALETTES.includes(d.palette) ? d.palette : 'electric',
      product: PRODUCTS.includes(d.product) ? d.product : 'phone',
    }));
  }

  async copy(input: { tool: Tool; details: string; lang: Lang }) {
    const site = this.site();
    const prompt = [
      shopContext(site),
      `Today's date: ${new Date().toISOString().slice(0, 10)}.`,
      site.phone ? `Shop phone: ${site.phone}` : '',
      site.address ? `Shop address: ${site.address}` : '',
      `Language: ${LANG[input.lang]}.`,
      `Task: ${TOOLS[input.tool].brief}`,
      `Details from the owner: ${input.details || '(none: keep it general for this week)'}`,
    ]
      .filter(Boolean)
      .join('\n');
    const out = await this.ask<{ items: { title: string; text: string }[] }>(`pushro_${input.tool}`, COPY_SYSTEM, COPY_SCHEMA, prompt);
    return out.items;
  }
}

// ---------- Login ----------

const attempts = new Map<string, { n: number; until: number }>();

@Injectable()
export class PushroGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const token = req.headers.authorization?.replace(/^Bearer /, '');
    if (!token) throw new UnauthorizedException('Please log in');
    try {
      const payload = await this.jwt.verifyAsync<{ role?: string }>(token);
      if (payload.role !== 'pushro') throw new Error();
    } catch {
      throw new UnauthorizedException('Session expired, please log in again');
    }
    return true;
  }
}

const field = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
const url = (v: unknown) => {
  const s = field(v, 500);
  return /^https:\/\/[^\s<>"']+$/.test(s) ? s : '';
};
const digits = (v: unknown) => field(v, 20).replace(/[^\d+]/g, '');

@Controller('api/pushro')
export class PushroController {
  constructor(
    private readonly pushro: PushroService,
    private readonly jwt: JwtService,
  ) {}

  @Post('login')
  @HttpCode(200)
  login(@Req() req: Request, @Body() body: { code?: string }) {
    const ip = req.ip ?? '';
    const a = attempts.get(ip);
    if (a && a.n >= 8 && a.until > Date.now()) throw new BadRequestException('Bahut baar galat code. 15 minute baad try karein.');
    const expected = process.env.PUSHRO_CODE?.trim() ?? '';
    const given = field(body?.code, 100);
    const ok = expected.length >= 6 && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
    if (!ok) {
      attempts.set(ip, { n: (a && a.until > Date.now() ? a.n : 0) + 1, until: Date.now() + 15 * 60_000 });
      throw new BadRequestException(expected ? 'Code galat hai' : 'Studio is not set up yet (PUSHRO_CODE missing on the server)');
    }
    attempts.delete(ip);
    return { token: this.jwt.sign({ sub: 0, role: 'pushro' }, { expiresIn: '60d' }) };
  }

  @Get('site')
  site() {
    return this.pushro.site();
  }

  @Get('me')
  @UseGuards(PushroGuard)
  me() {
    return { site: this.pushro.site(), categories: CATEGORIES, tools: Object.fromEntries(Object.entries(TOOLS).map(([k, t]) => [k, t.label])), usedToday: this.pushro.usedToday(), dailyLimit: DAILY_LIMIT };
  }

  @Put('site')
  @UseGuards(PushroGuard)
  saveSite(@Body() b: Partial<Record<keyof PushroSite, unknown>>) {
    const site: PushroSite = {
      name: field(b.name, 60) || DEFAULT_SITE.name,
      tagline: field(b.tagline, 120),
      about: field(b.about, 600),
      announce: field(b.announce, 140),
      phone: digits(b.phone),
      whatsapp: digits(b.whatsapp),
      address: field(b.address, 250),
      city: field(b.city, 60),
      mapsLink: url(b.mapsLink),
      hours: field(b.hours, 100),
      instagram: field(b.instagram, 60).replace(/^@/, '').replace(/[^\w.]/g, ''),
      googleReview: url(b.googleReview),
      loyaltyLink: url(b.loyaltyLink),
      reward: field(b.reward, 80),
      rewardVisits: Math.min(20, Math.max(2, Math.round(Number(b.rewardVisits)) || 5)),
      categories: (Array.isArray(b.categories) ? b.categories : []).filter((c): c is CategoryKey => typeof c === 'string' && c in CATEGORIES),
      offers: (Array.isArray(b.offers) ? b.offers : [])
        .slice(0, 6)
        .map((o: Record<string, unknown>) => ({ title: field(o?.title, 60), price: field(o?.price, 30), note: field(o?.note, 120) }))
        .filter((o) => o.title),
      highlights: (Array.isArray(b.highlights) ? b.highlights : []).slice(0, 6).map((h) => field(h, 80)).filter(Boolean),
    };
    return this.pushro.saveSite(site);
  }

  @Post('status')
  @HttpCode(200)
  @UseGuards(PushroGuard)
  status(@Body() b: { request?: string; offer?: string; product?: string; lang?: string; count?: number }) {
    const lang = (b?.lang && b.lang in LANG ? b.lang : 'hinglish') as Lang;
    const product = field(b?.product, 20);
    return this.pushro.statuses({
      request: field(b?.request, 500),
      offer: field(b?.offer, 120),
      product: (PRODUCTS as readonly string[]).includes(product) ? product : 'any',
      lang,
      count: Math.min(6, Math.max(1, Number(b?.count) || 4)),
    });
  }

  @Post('copy')
  @HttpCode(200)
  @UseGuards(PushroGuard)
  copy(@Body() b: { tool?: string; details?: string; lang?: string }) {
    const tool = String(b?.tool ?? '');
    if (!(tool in TOOLS)) throw new BadRequestException('Pick a tool');
    const lang = (b?.lang && b.lang in LANG ? b.lang : 'hinglish') as Lang;
    return this.pushro.copy({ tool: tool as Tool, details: field(b?.details, 1500), lang });
  }
}
