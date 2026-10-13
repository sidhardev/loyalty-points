import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AdminGuard, AdminId } from './admin';
import { Db } from './db';
import { AiBudgetError, Gemini, type AiSettings } from './gemini';
import { render404, renderHub, renderPage, renderSitemap, type SeoContent, type SeoLang } from './seo-render';

// AI-written landing pages for each kind of shop: /for/<slug> in English and /hi/for/<slug> in Hindi. The superadmin
// queues shop types (Admin → SEO pages); a timer writes a few pages a day with Gemini, publishes them (or keeps them as
// drafts), and /sitemap.xml lists whatever is published. The pages are plain server-rendered HTML, so search engines
// read them without running JavaScript. On Vercel these paths are forwarded to this server (see vercel.json).

export type SeoSettings = AiSettings & {
  enabled: boolean;
  perDay: number; // pages written per day (attempts, so failures count too)
  runHourIst: number; // the day's writing starts at this hour, India time
  autoPublish: boolean; // false = new pages wait as drafts
  usdToInr: number; // only for showing costs in rupees
};

const DEFAULTS: SeoSettings = {
  enabled: true,
  perDay: 3,
  runHourIst: 10,
  autoPublish: true,
  model: 'gemini-3.1-flash-lite',
  priceInUsd: 0.25,
  priceOutUsd: 1.5,
  monthlyBudgetUsd: 5,
  usdToInr: 88,
};

/** Shop types offered by "Add suggested". Each becomes an English and a Hindi page. */
const SUGGESTED = [
  'Salon', 'Kirana store', 'Café', 'Sweet shop & bakery', 'Pharmacy', 'Gym', 'Boutique', 'Restaurant', 'Tiffin service',
  'Juice bar', 'Beauty parlour', 'Barber shop', 'Spa', 'Mobile repair shop', 'Stationery shop', 'Optical store', 'Pet shop',
  'Florist', 'Laundry & dry cleaning', 'Tailor', 'Dhaba', 'Ice cream parlour', 'Fruit & vegetable shop', 'Meat & fish shop',
  'Hardware store', 'Electronics shop', 'Book store', 'Toy shop', 'Footwear store', 'Jewellery shop',
];

const POINTS_PER_100 = 10;
export const SITE = (process.env.SITE_URL || 'https://habiturn.sidhar.me').replace(/\/$/, '');

export const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

export type SeoPageRow = {
  id: number;
  slug: string;
  lang: SeoLang;
  topic: string;
  notes: string;
  status: 'queued' | 'draft' | 'published' | 'failed';
  content: string | null;
  title: string;
  description: string;
  error: string | null;
  cost_usd: number;
  created_at: string;
  generated_at: string | null;
  published_at: string | null;
};

/** What Gemini must return (Gemini's OpenAPI-style schema). */
const S = (type: string, extra: object = {}) => ({ type, ...extra });
const str = (description: string) => S('STRING', { description });
const list = (items: object, min: number, max: number, description: string) => S('ARRAY', { items, minItems: min, maxItems: max, description });
const SCHEMA = S('OBJECT', {
  properties: {
    title: str('SEO title tag, at most 60 characters, includes the shop type and "loyalty" or "rewards"'),
    description: str('Meta description, 120 to 155 characters, plain and specific'),
    eyebrow: str('Two to five words above the headline, e.g. "Loyalty for salons"'),
    h1: str('The page headline: a benefit for this kind of shop, at most 70 characters'),
    intro: str('Two or three short sentences under the headline'),
    problems: list(S('OBJECT', { properties: { title: str('short'), text: str('one or two sentences') }, required: ['title', 'text'] }), 3, 3, 'Why customers of this kind of shop drift away'),
    steps: list(S('OBJECT', { properties: { title: str('short'), text: str('one or two sentences') }, required: ['title', 'text'] }), 3, 3, 'How Habiturn works at this kind of shop, in order'),
    billShopName: str('A made-up, ordinary shop name for the example bill (not a real brand or chain)'),
    billItems: list(S('OBJECT', { properties: { name: str('item, at most 14 characters'), price: S('INTEGER', { description: 'realistic price in rupees' }) }, required: ['name', 'price'] }), 2, 4, 'A typical bill at this kind of shop'),
    rewards: list(S('OBJECT', { properties: { name: str('the reward'), points: S('INTEGER', { description: `points needed, at ${POINTS_PER_100} points per ₹100 spent` }) }, required: ['name', 'points'] }), 3, 4, 'Reward ideas, cheapest first'),
    tips: list(str('one practical sentence'), 3, 5, 'Practical tips to get more repeat customers at this kind of shop'),
    faqs: list(S('OBJECT', { properties: { q: str('question'), a: str('answer, two or three sentences') }, required: ['q', 'a'] }), 4, 6, 'Questions an owner of this kind of shop would ask'),
  },
  required: ['title', 'description', 'eyebrow', 'h1', 'intro', 'problems', 'steps', 'billShopName', 'billItems', 'rewards', 'tips', 'faqs'],
});

function prompt(topic: string, lang: SeoLang, notes: string) {
  return `You write landing pages for Habiturn, a loyalty and rewards app for small neighbourhood shops in India.
Write one page for owners of this kind of shop: "${topic}".${notes ? `\nExtra notes from the editor: ${notes}` : ''}

Language: ${
    lang === 'hi'
      ? 'Hindi, written in Devanagari script (हिंदी), the way shop owners speak. Every sentence must be in Devanagari: never write Hindi in Latin letters (no "ke liye", no Hinglish). Only brand and tech words may stay in Latin letters: Habiturn, QR, WhatsApp. Write the shop type in Hindi too (for example सैलून, किराना स्टोर, जिम), and use पॉइंट्स, इनाम, लॉयल्टी.'
      : 'Simple Indian English. Short sentences.'
  }

What Habiturn does (use only these facts):
- The shop gives points on every bill: ${POINTS_PER_100} points per ₹100 by default (the shop can change it).
- Three ways to give points at the counter: show a bill QR the customer scans with their phone camera, scan the customer's card QR, or type their phone number (works for customers without a smartphone).
- The customer's card opens from a link in the browser: no app to install. It shows the balance, the next reward in rupees ("₹350 more for a free haircut"), history, and works in English and Hindi.
- Rewards the shop sets; customers get a 4-digit code to claim one at the counter.
- Welcome bonus, birthday bonus, and a Gold tier: after enough points, a customer earns 1.5× points on every bill (the shop can change this). Never say double points.
- One-tap WhatsApp messages: points earned after a bill, and "we miss you" reminders to customers who haven't come back for a while.
- A dashboard showing what returning customers spent this month.
- Safety: a limit on points per customer per day, a check on very large bills, undo, and an activity log.
- Export customers and history to a spreadsheet. Works on any phone with a camera. Free to start, set up in two minutes.

Rules:
- Be specific to "${topic}": its customers, the services or products they buy, how often they visit, typical bills and good rewards. Name real things that shop sells.
- Use the name of this kind of shop and the words loyalty or rewards ${lang === 'hi' ? '(in Hindi: लॉयल्टी, इनाम) ' : ''}naturally in the headline, intro and a few answers, the way an owner would search for it.
- Friendly and practical, like advice from another shop owner. Never say customers are forced or pressured to come back.
- Every FAQ question ends with a question mark.
- No statistics, percentages or research claims, no testimonials, no quotes from people, no competitor names, no prices for Habiturn except "free to start".
- Prices on the example bill and the reward points must be realistic in India today. Reward points must fit ${POINTS_PER_100} points per ₹100.
- No markdown, no emoji, no exclamation marks in the headline.`;
}

@Injectable()
export class SeoService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly db: Db,
    private readonly gemini: Gemini,
  ) {}

  onModuleInit() {
    // Checks every 10 minutes whether today's pages are due; one page per check, so a day's few spread out a little.
    this.timer = setInterval(() => void this.tick(), 10 * 60_000);
    this.timer.unref();
    setTimeout(() => void this.tick(), 30_000).unref();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  settings(): SeoSettings {
    const row = this.db.sql.prepare("SELECT value FROM app_settings WHERE key = 'seo'").get() as { value: string } | undefined;
    return { ...DEFAULTS, ...(row ? (JSON.parse(row.value) as Partial<SeoSettings>) : {}) };
  }

  saveSettings(input: Partial<SeoSettings>) {
    const s = { ...this.settings() };
    const num = (v: unknown, label: string, min: number, max: number) => {
      const n = Number(v);
      if (!Number.isFinite(n) || n < min || n > max) throw new BadRequestException(`${label} must be between ${min} and ${max}`);
      return n;
    };
    if (input.enabled !== undefined) s.enabled = Boolean(input.enabled);
    if (input.autoPublish !== undefined) s.autoPublish = Boolean(input.autoPublish);
    if (input.perDay !== undefined) s.perDay = Math.round(num(input.perDay, 'Pages per day', 0, 20));
    if (input.runHourIst !== undefined) s.runHourIst = Math.round(num(input.runHourIst, 'Start hour', 0, 23));
    if (input.priceInUsd !== undefined) s.priceInUsd = num(input.priceInUsd, 'Input price', 0, 100);
    if (input.priceOutUsd !== undefined) s.priceOutUsd = num(input.priceOutUsd, 'Output price', 0, 100);
    if (input.monthlyBudgetUsd !== undefined) s.monthlyBudgetUsd = num(input.monthlyBudgetUsd, 'Monthly budget', 0, 1000);
    if (input.usdToInr !== undefined) s.usdToInr = num(input.usdToInr, 'USD to INR', 1, 1000);
    if (input.model !== undefined) {
      const model = String(input.model).trim();
      if (!/^[a-z0-9.\-]{3,60}$/.test(model)) throw new BadRequestException('Model id looks wrong, e.g. gemini-3.1-flash-lite');
      s.model = model;
    }
    this.db.sql.prepare("INSERT INTO app_settings (key, value) VALUES ('seo', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(JSON.stringify(s));
    return s;
  }

  /** The start of today in India, as a UTC timestamp in SQLite's format. */
  private istDayStart() {
    const ist = 5.5 * 3_600_000;
    const start = Math.floor((Date.now() + ist) / 86_400_000) * 86_400_000 - ist;
    return new Date(start).toISOString().slice(0, 19).replace('T', ' ');
  }

  attemptsToday() {
    // Pages, not calls: retries of the same page count once.
    return (this.db.sql.prepare("SELECT COUNT(DISTINCT ref_id) AS n FROM ai_usage WHERE purpose = 'seo-page' AND ts >= ?").get(this.istDayStart()) as { n: number }).n;
  }

  /** Adds shop types to the queue, in the given languages; ones already there are skipped. */
  queue(topics: string[], langs: SeoLang[], notes = '') {
    const add = this.db.sql.prepare('INSERT OR IGNORE INTO seo_pages (slug, lang, topic, notes) VALUES (?, ?, ?, ?)');
    let added = 0;
    for (const raw of topics) {
      const topic = raw.trim().slice(0, 80);
      const slug = slugify(topic);
      if (!slug) continue;
      for (const lang of langs) added += Number(add.run(slug, lang, topic, notes.trim().slice(0, 500)).changes);
    }
    return added;
  }

  suggested() {
    return this.queue(SUGGESTED, ['en', 'hi']);
  }

  /** Runs from the timer: writes the next queued page if today's are due. */
  async tick() {
    const s = this.settings();
    if (!s.enabled || !this.gemini.configured || this.running) return;
    const istHour = new Date(Date.now() + 5.5 * 3_600_000).getUTCHours();
    if (istHour < s.runHourIst || this.attemptsToday() >= s.perDay) return;
    if (this.gemini.monthSpend() >= s.monthlyBudgetUsd) return;
    const next = this.db.sql.prepare("SELECT id FROM seo_pages WHERE status = 'queued' ORDER BY id LIMIT 1").get() as { id: number } | undefined;
    if (next) await this.generate(next.id, false).catch((error) => console.error('SEO page failed:', (error as Error).message));
  }

  /** Writes (or rewrites) one page now. Pages the admin asks for by hand don't count towards the day's automatic ones. */
  async generate(id: number, manual = false) {
    if (this.running) throw new BadRequestException('A page is being written right now, try again in a minute');
    const page = this.page(id);
    const s = this.settings();
    this.running = true;
    try {
      // One more try if the answer doesn't pass the checks in clean() (e.g. Hindi written in Latin letters).
      const write = () => this.gemini.json<SeoContent>(prompt(page.topic, page.lang, page.notes), SCHEMA, s, { purpose: manual ? 'seo-page-manual' : 'seo-page', refId: id });
      let { data, costUsd } = await write();
      let content: SeoContent;
      try {
        content = clean(data, page.lang);
      } catch {
        const again = await write();
        content = clean(again.data, page.lang);
        costUsd += again.costUsd;
      }
      const status = s.autoPublish || page.status === 'published' ? 'published' : 'draft';
      this.db.sql
        .prepare(
          `UPDATE seo_pages SET status = ?, content = ?, title = ?, description = ?, error = NULL, cost_usd = cost_usd + ?,
             generated_at = datetime('now'), published_at = CASE WHEN ? = 'published' THEN COALESCE(published_at, datetime('now')) ELSE published_at END
           WHERE id = ?`,
        )
        .run(status, JSON.stringify(content), content.title, content.description, costUsd, status, id);
    } catch (error) {
      const message = (error as Error).message;
      // Out of budget isn't the page's fault: it stays queued for next month. A page that was already written keeps its
      // current version (and stays live) when a rewrite fails; only a never-written page becomes "failed".
      if (!(error instanceof AiBudgetError)) {
        this.db.sql
          .prepare("UPDATE seo_pages SET status = CASE WHEN content IS NULL THEN 'failed' ELSE status END, error = ? WHERE id = ?")
          .run(message.slice(0, 500), id);
      }
      throw new BadRequestException(message);
    } finally {
      this.running = false;
    }
    return this.page(id);
  }

  page(id: number) {
    const row = this.db.sql.prepare('SELECT * FROM seo_pages WHERE id = ?').get(id) as SeoPageRow | undefined;
    if (!row) throw new NotFoundException('Page not found');
    return row;
  }

  published(lang?: SeoLang) {
    return this.db.sql
      .prepare(`SELECT * FROM seo_pages WHERE status = 'published' ${lang ? 'AND lang = ?' : ''} ORDER BY topic`)
      .all(...(lang ? [lang] : [])) as SeoPageRow[];
  }

  /** The finished HTML of one page (published, or any page for the admin's preview). */
  html(row: SeoPageRow) {
    if (!row.content) throw new NotFoundException('This page has not been written yet');
    const others = this.published(row.lang).filter((p) => p.slug !== row.slug);
    const twin = this.db.sql.prepare("SELECT * FROM seo_pages WHERE slug = ? AND lang != ? AND status = 'published'").get(row.slug, row.lang) as SeoPageRow | undefined;
    return renderPage(row, JSON.parse(row.content) as SeoContent, { site: SITE, twin, others, pointsPer100: POINTS_PER_100 });
  }
}

/** Keeps the model's output to the shape and lengths the page expects. */
function clean(d: SeoContent, lang: SeoLang): SeoContent {
  const t = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
  const pairs = (list: unknown, max: number) =>
    (Array.isArray(list) ? list : []).slice(0, max).map((x: { title?: string; text?: string }) => ({ title: t(x?.title, 80), text: t(x?.text, 400) }));
  const content: SeoContent = {
    title: t(d.title, 70),
    description: t(d.description, 170),
    eyebrow: t(d.eyebrow, 60),
    h1: t(d.h1, 90),
    intro: t(d.intro, 500),
    problems: pairs(d.problems, 3),
    steps: pairs(d.steps, 3),
    billShopName: t(d.billShopName, 40),
    billItems: (Array.isArray(d.billItems) ? d.billItems : [])
      .slice(0, 4)
      .map((i) => ({ name: t(i?.name, 24), price: Math.max(1, Math.round(Number(i?.price) || 0)) }))
      .filter((i) => i.name),
    rewards: (Array.isArray(d.rewards) ? d.rewards : [])
      .slice(0, 4)
      .map((r) => ({ name: t(r?.name, 60), points: Math.max(1, Math.round(Number(r?.points) || 0)) }))
      .filter((r) => r.name)
      .sort((a, b) => a.points - b.points),
    tips: (Array.isArray(d.tips) ? d.tips : []).slice(0, 5).map((x) => t(x, 300)).filter(Boolean),
    faqs: (Array.isArray(d.faqs) ? d.faqs : [])
      .slice(0, 6)
      .map((f) => ({ q: t(f?.q, 160).replace(/([^?？।.!])$/u, '$1?'), a: t(f?.a, 600) }))
      .filter((f) => f.q && f.a),
  };
  if (!content.title || !content.h1 || content.problems.length < 2 || content.faqs.length < 2) throw new Error('The model returned an incomplete page');
  if (lang === 'hi') {
    // Mostly Devanagari, not Hindi typed in Latin letters.
    const sample = `${content.h1} ${content.intro} ${content.faqs.map((f) => f.a).join(' ')}`;
    const devanagari = (sample.match(/[\u0900-\u097F]/g) ?? []).length;
    const latin = (sample.match(/[A-Za-z]/g) ?? []).length;
    if (devanagari < latin * 2) throw new Error('The Hindi page came back in Latin letters');
  }
  return content;
}

// ---------------------------------------------------------------- admin

@Controller('api/admin/seo')
@UseGuards(AdminGuard)
export class SeoAdminController {
  constructor(
    private readonly seo: SeoService,
    private readonly gemini: Gemini,
    private readonly db: Db,
  ) {}

  /** Settings, today's progress, costs, the pages and the latest AI calls. */
  @Get()
  overview() {
    const s = this.seo.settings();
    const sum = (where: string, ...args: string[]) =>
      this.db.sql.prepare(`SELECT COALESCE(SUM(cost_usd), 0) AS usd, COUNT(*) AS calls FROM ai_usage WHERE ${where}`).get(...args) as { usd: number; calls: number };
    const pages = this.db.sql
      .prepare(
        `SELECT p.id, p.slug, p.lang, p.topic, p.notes, p.status, p.title, p.description, p.error, p.cost_usd, p.created_at, p.generated_at, p.published_at,
           (SELECT COUNT(*) FROM page_views v WHERE v.path = CASE p.lang WHEN 'hi' THEN '/hi/for/' ELSE '/for/' END || p.slug) AS views
         FROM seo_pages p ORDER BY CASE p.status WHEN 'queued' THEN 1 ELSE 0 END, COALESCE(p.generated_at, p.created_at) DESC, p.id`,
      )
      .all();
    return {
      settings: s,
      keySet: this.gemini.configured,
      key: this.gemini.keyInfo(),
      today: { attempts: this.seo.attemptsToday(), perDay: s.perDay },
      cost: {
        today: sum("ts >= datetime('now', '-1 day')"),
        month: sum("ts >= date('now', 'start of month')"),
        all: sum('1 = 1'),
      },
      pages,
      usage: this.db.sql.prepare('SELECT * FROM ai_usage ORDER BY id DESC LIMIT 40').all(),
      site: SITE,
    };
  }

  /** Saves a new Gemini key after checking it with Google. It's stored encrypted and never sent back. */
  @Put('key')
  async setKey(@AdminId() adminId: number, @Body() body: { key?: string }) {
    const key = String(body?.key ?? '').trim();
    if (!/^[\w.\-]{20,200}$/.test(key)) throw new BadRequestException('That doesn’t look like a Gemini API key');
    const problem = await this.gemini.check(this.seo.settings().model, key);
    if (problem) throw new BadRequestException(`Key not saved. ${problem}`);
    this.gemini.setKey(key);
    this.audit(adminId, `Set a new Gemini API key (…${key.slice(-4)})`);
    return this.gemini.keyInfo();
  }

  /** Removes the panel's key; the server's GEMINI_API_KEY (if any) is used again. */
  @Delete('key')
  removeKey(@AdminId() adminId: number) {
    this.gemini.setKey(null);
    this.audit(adminId, 'Removed the Gemini API key set in the admin panel');
    return this.gemini.keyInfo();
  }

  /** Checks the key in use, without spending tokens. */
  @Post('key/test')
  @HttpCode(200)
  async testKey() {
    const problem = await this.gemini.check(this.seo.settings().model);
    if (problem) throw new BadRequestException(problem);
    return { ok: true };
  }

  private audit(adminId: number, detail: string) {
    this.db.sql.prepare('INSERT INTO admin_log (admin_id, merchant_id, action, detail) VALUES (?, NULL, ?, ?)').run(adminId, 'ai_key', detail);
  }

  @Put('settings')
  saveSettings(@Body() body: Partial<SeoSettings>) {
    return this.seo.saveSettings(body ?? {});
  }

  /** Queue shop types: { topics: ['Salon', 'Gym'], langs: ['en', 'hi'], notes } or { suggested: true }. */
  @Post('queue')
  queue(@Body() body: { topics?: string[] | string; langs?: string[]; notes?: string; suggested?: boolean }) {
    if (body?.suggested) return { added: this.seo.suggested() };
    const topics = (Array.isArray(body?.topics) ? body.topics : String(body?.topics ?? '').split(/[\n,]/)).map((t) => String(t)).filter((t) => t.trim());
    const langs = (body?.langs ?? ['en', 'hi']).filter((l): l is SeoLang => l === 'en' || l === 'hi');
    if (!topics.length) throw new BadRequestException('Type at least one kind of shop');
    if (!langs.length) throw new BadRequestException('Pick English, Hindi or both');
    return { added: this.seo.queue(topics, langs, body?.notes ?? '') };
  }

  @Post('pages/:id/generate')
  @HttpCode(200)
  generate(@Param('id', ParseIntPipe) id: number) {
    return this.seo.generate(id, true);
  }

  /** The next queued page, now (doesn't count against today's pages). */
  @Post('generate-next')
  @HttpCode(200)
  generateNext() {
    const next = this.db.sql.prepare("SELECT id FROM seo_pages WHERE status = 'queued' ORDER BY id LIMIT 1").get() as { id: number } | undefined;
    if (!next) throw new BadRequestException('The queue is empty — add some shop types first');
    return this.seo.generate(next.id, true);
  }

  @Post('pages/:id/publish')
  @HttpCode(200)
  publish(@Param('id', ParseIntPipe) id: number) {
    const page = this.seo.page(id);
    if (!page.content) throw new BadRequestException('This page has not been written yet');
    this.db.sql.prepare("UPDATE seo_pages SET status = 'published', published_at = COALESCE(published_at, datetime('now')) WHERE id = ?").run(id);
    return { ok: true };
  }

  @Post('pages/:id/unpublish')
  @HttpCode(200)
  unpublish(@Param('id', ParseIntPipe) id: number) {
    const page = this.seo.page(id);
    this.db.sql.prepare('UPDATE seo_pages SET status = ? WHERE id = ?').run(page.content ? 'draft' : 'queued', id);
    return { ok: true };
  }

  /** Puts a failed page back in the queue. */
  @Post('pages/:id/retry')
  @HttpCode(200)
  retry(@Param('id', ParseIntPipe) id: number) {
    this.seo.page(id);
    this.db.sql.prepare("UPDATE seo_pages SET status = 'queued', error = NULL WHERE id = ? AND status = 'failed'").run(id);
    return { ok: true };
  }

  @Delete('pages/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    this.seo.page(id);
    this.db.sql.prepare('DELETE FROM seo_pages WHERE id = ?').run(id);
    return { ok: true };
  }

  /** The page as visitors would see it, for drafts too. */
  @Get('pages/:id/html')
  preview(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    res.type('html').send(this.seo.html(this.seo.page(id)));
  }
}

// ---------------------------------------------------------------- public pages and sitemap

@Controller()
export class SeoPublicController {
  constructor(
    private readonly seo: SeoService,
    private readonly db: Db,
  ) {}

  private send(res: Response, html: string, status = 200) {
    res.status(status).type('html').set('cache-control', 'public, max-age=300, s-maxage=3600').send(html);
  }

  private one(lang: SeoLang, slug: string, res: Response) {
    const row = this.db.sql.prepare("SELECT * FROM seo_pages WHERE slug = ? AND lang = ? AND status = 'published'").get(slug, lang) as SeoPageRow | undefined;
    if (!row) return this.send(res, render404(SITE, lang), 404);
    this.send(res, this.seo.html(row));
  }

  @Get('for')
  hubEn(@Res() res: Response) {
    this.send(res, renderHub(SITE, 'en', this.seo.published('en'), this.seo.published('hi').length > 0));
  }

  @Get('hi/for')
  hubHi(@Res() res: Response) {
    this.send(res, renderHub(SITE, 'hi', this.seo.published('hi'), this.seo.published('en').length > 0));
  }

  @Get('for/:slug')
  pageEn(@Param('slug') slug: string, @Res() res: Response) {
    this.one('en', slug, res);
  }

  @Get('hi/for/:slug')
  pageHi(@Param('slug') slug: string, @Res() res: Response) {
    this.one('hi', slug, res);
  }

  /** The homepage plus every published page, with its other-language twin. Updates as pages are published. */
  @Get('sitemap.xml')
  sitemap(@Res() res: Response) {
    res.type('application/xml').set('cache-control', 'public, max-age=600, s-maxage=3600').send(renderSitemap(SITE, this.seo.published()));
  }
}
