import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Injectable, NotFoundException, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { AdminGuard, AdminId, SHOP_SELECT, shopView, type ShopRow } from './admin';
import { Db } from './db';
import { LoyaltyService } from './loyalty.service';
import { PlaybookService } from './playbook';
import { planSettings } from './plans';

// Admin → Shops → "Draft a message": Claude Haiku 5.5 reads what we know about one shop (its numbers, plan, notes, last
// contact) and writes a short, personal WhatsApp message from the founder, of the kind the admin picked: a built-in
// type, one of the admin's own (msg_templates), or an instruction typed for this one message. The admin edits and sends
// it themselves; nothing is sent from here. Uses the Anthropic key from Admin → Settings. Every call goes to ai_usage.

const MODEL = 'claude-haiku-5-5';
const PRICE_IN_USD = 0.1; // per 1M input tokens
const PRICE_OUT_USD = 0.5; // per 1M output tokens (thinking included)

export const DRAFT_LANGS = { hinglish: 'Hinglish (Hindi in Roman letters, mixed with everyday English words)', hindi: 'Hindi in Devanagari', english: 'simple Indian English' } as const;
type Lang = keyof typeof DRAFT_LANGS;

/** Message types every admin has. Custom ones (msg_templates) get ids from the database; these are named. */
export const BUILT_IN_TEMPLATES = [
  {
    id: 'welcome',
    title: 'Welcome a new shop',
    instruction: 'Welcome them warmly, thank them for signing up, and offer to help them set up the stamp card and add their first visit, on a quick call if they like.',
  },
  {
    id: 'first-visit',
    title: 'Help them start (no visits yet)',
    instruction: 'They signed up but have not added a customer visit yet. Ask casually if something got in the way, explain in one line how easy the first visit is (type the phone number, tap Add visit), and offer to do it together on a 5-minute call.',
  },
  {
    id: 'win-back',
    title: 'Bring a sleeping shop back',
    instruction: 'They used Regularhood before but have stopped adding visits. Mention what they achieved (their real numbers), ask what changed or if anything is hard at the counter, and offer help. No guilt, no pressure.',
  },
  {
    id: 'check-in',
    title: 'Check in with an active shop',
    instruction: 'They are using it well. Appreciate them with one specific number, ask how customers are liking the card, and ask what one thing would make it better for them.',
  },
  {
    id: 'pro',
    title: 'Offer Pro',
    instruction: 'Offer the Pro plan: no customer limit, a list of customers who stopped coming with one-tap WhatsApp reminders sent from their own phone, Google review requests, their logo on the card, and downloading their customers. Mention the prices (monthly or yearly). Fit it to their numbers (e.g. customers not seen lately, or close to the free limit). Friendly, not salesy, easy to say no.',
  },
  {
    id: 'referral',
    title: 'Ask for a referral',
    instruction: 'Thank them for using Regularhood and ask if they know another shop owner nearby who would like it; they can share their link from the app. Keep it light.',
  },
  {
    id: 'feedback',
    title: 'Ask for feedback',
    instruction: 'Ask for honest feedback in one or two questions: what they like, what is missing or annoying. Say their answer will shape what gets built next.',
  },
] as const;

const SCHEMA = {
  type: 'object',
  properties: { message: { type: 'string', description: 'The WhatsApp message, ready to send' } },
  required: ['message'],
  additionalProperties: false,
};

const system = (lang: Lang) => `You draft WhatsApp messages from the founder of Regularhood to one of the shop owners who use it.
Regularhood is a simple loyalty app for small Indian shops: a stamp card on the customer's phone number (every N visits,
a reward), and one-tap WhatsApp messages the shop sends from its own phone. Free for a limited number of customers; the
paid Pro plan removes the limit and adds a list of customers who stopped coming (with one-tap WhatsApp reminders),
Google review requests, the shop's logo on the card, and downloading customers as a spreadsheet. Regularhood never
messages a shop's customers itself.

Write like a real person texting a shop owner they know: short (2-5 lines), warm, specific to this shop, one clear ask at
the end. Language: ${DRAFT_LANGS[lang]}. Use the shop's name naturally. Use only the facts given; never invent numbers,
features, discounts or deadlines. If a number is zero or unknown, don't mention it. No pleading or begging tone, no 🙏 emoji,
at most one other emoji. Never mention chai or tea. No subject line, no hashtags, no "Dear Sir/Madam", no signature line.
Don't say you are an AI.`;

const days = (t: string | null) => (t ? Math.floor((Date.now() - Date.parse(`${t.replace(' ', 'T')}Z`)) / 86_400_000) : null);
const ago = (t: string | null) => {
  const d = days(t);
  return d === null ? 'never' : d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
};

@Injectable()
export class DraftService {
  constructor(
    private readonly db: Db,
    private readonly loyalty: LoyaltyService,
    private readonly playbooks: PlaybookService,
  ) {}

  templates() {
    const custom = this.db.sql.prepare('SELECT id, title, instruction, created_at FROM msg_templates ORDER BY id').all() as { id: number; title: string; instruction: string; created_at: string }[];
    return [...BUILT_IN_TEMPLATES.map((t) => ({ ...t, builtIn: true })), ...custom.map((t) => ({ ...t, id: String(t.id), builtIn: false }))];
  }

  /** What we tell Claude about the shop: counts and dates, never customers' names or numbers. */
  private facts(id: number) {
    const sql = this.db.sql;
    const row = sql.prepare(`${SHOP_SELECT} WHERE m.id = ?`).get(id) as ShopRow | undefined;
    if (!row) throw new NotFoundException('Shop not found');
    const s = shopView(row);
    const m = this.loyalty.merchant(id);
    const c = sql
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM transactions WHERE merchant_id = :m AND type = 'earn' AND reversed = 0) AS visits,
           (SELECT COUNT(*) FROM transactions WHERE merchant_id = :m AND type = 'redeem' AND reversed = 0) AS rewards,
           (SELECT COUNT(*) FROM customers WHERE merchant_id = :m AND points >= :needed) AS waiting,
           (SELECT COUNT(*) FROM (SELECT customer_id FROM transactions WHERE merchant_id = :m AND type = 'earn' AND reversed = 0
              GROUP BY customer_id HAVING COUNT(*) >= 2)) AS cameBack,
           (SELECT COUNT(*) FROM customers WHERE merchant_id = :m AND COALESCE(last_visit, created_at) < datetime('now', :inactive)) AS notSeen`,
      )
      .get({ m: id, needed: m.visits_needed, inactive: `-${m.inactive_days} days` }) as Record<string, number>;
    const notes = (sql.prepare('SELECT note FROM admin_notes WHERE merchant_id = ? ORDER BY id DESC LIMIT 5').all(id) as { note: string }[]).map((n) => n.note);
    const plans = planSettings(sql);
    const status = { active: 'active (added visits in the last 7 days)', sleeping: 'sleeping (used it before, no visits for 7+ days)', new: 'new (joined in the last 2 days)', never: 'signed up but never added a visit', paused: 'account paused' }[s.status];
    const paid = s.activePlan === 'monthly' || s.activePlan === 'yearly' || s.activePlan === 'lifetime';
    return {
      name: s.name,
      text: [
        `Shop: ${s.name}`,
        `Status: ${status}`,
        `Joined: ${ago(s.created_at)}; last opened the app: ${ago(s.last_seen_at)}`,
        `Stamp card: ${s.reward_name ? `every ${s.visits_needed} visits → ${s.reward_name}` : 'not set up yet'}`,
        `Customers: ${s.customers}; ${c.cameBack} came back at least once; ${c.notSeen} not seen for ${m.inactive_days}+ days`,
        `Visits: ${s.visits30} in the last 30 days, ${c.visits} all time; last visit ${ago(s.last_visit)}`,
        `Rewards given: ${s.rewards30} in the last 30 days, ${c.rewards} all time; ${c.waiting} customers have a reward waiting`,
        `Plan: ${paid ? `Pro (${s.activePlan})` : `free (up to ${plans.freeCustomers} customers)`}`,
        !paid &&
          `Pro price: ₹${plans.monthlyPaise / 100} a month or ₹${plans.yearlyPaise / 100} a year`,
        s.referrals > 0 && `Brought ${s.referrals} other shops to Regularhood`,
        s.last_contact && `We last contacted them ${ago(s.last_contact)}${s.last_contact_detail ? `: ${s.last_contact_detail}` : ''}`,
        notes.length && `Our notes about them (newest first):\n${notes.map((n) => `- ${n}`).join('\n')}`,
      ]
        .filter(Boolean)
        .join('\n'),
    };
  }

  async draft(id: number, input: { templateId?: string; instruction?: string; lang?: string }) {
    const key = this.playbooks.key();
    if (!key) throw new BadRequestException('No Anthropic API key: add one in Admin → Settings');
    const lang: Lang = input.lang && input.lang in DRAFT_LANGS ? (input.lang as Lang) : 'hinglish';
    const template = input.templateId ? this.templates().find((t) => t.id === input.templateId) : undefined;
    if (input.templateId && !template) throw new BadRequestException('That message type no longer exists');
    const extra = String(input.instruction ?? '').trim().slice(0, 1000);
    if (!template && !extra) throw new BadRequestException('Pick a message type or write what the message should say');
    const shop = this.facts(id);

    let inputTokens = 0;
    let outputTokens = 0;
    const record = (ok: boolean, error?: string) =>
      this.db.sql
        .prepare('INSERT INTO ai_usage (purpose, ref_id, model, input_tokens, output_tokens, cost_usd, ok, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run('shop-draft', id, MODEL, inputTokens, outputTokens, (inputTokens / 1e6) * PRICE_IN_USD + (outputTokens / 1e6) * PRICE_OUT_USD, ok ? 1 : 0, error?.slice(0, 500) ?? null);

    try {
      const response = await new Anthropic({ apiKey: key, timeout: 60_000 }).messages.create({
        model: MODEL,
        max_tokens: 4000,
        output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
        system: system(lang),
        messages: [
          {
            role: 'user',
            content: [
              `<shop>\n${shop.text}\n</shop>\n`,
              template && `What the message should do: ${template.instruction}`,
              extra && (template ? `Also: ${extra}` : `What the message should do: ${extra}`),
            ]
              .filter((l): l is string => !!l)
              .join('\n'),
          },
        ],
      });
      inputTokens = response.usage.input_tokens;
      outputTokens = response.usage.output_tokens;
      if (response.stop_reason === 'refusal') throw new Error('Claude declined to write this one; try different wording');
      if (response.stop_reason === 'max_tokens') throw new Error('The message came back cut off; try again');
      const text = response.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
      const message = String((JSON.parse(text) as { message?: string }).message ?? '').trim();
      if (!message) throw new Error('Claude returned an empty message; try again');
      record(true);
      return { message, costUsd: (inputTokens / 1e6) * PRICE_IN_USD + (outputTokens / 1e6) * PRICE_OUT_USD };
    } catch (error) {
      const message =
        error instanceof Anthropic.AuthenticationError
          ? 'Anthropic did not accept the API key (Admin → Settings)'
          : error instanceof Anthropic.RateLimitError
            ? 'Anthropic is rate-limiting us; try again in a minute'
            : error instanceof Anthropic.APIError
              ? `Anthropic ${error.status ?? ''}: ${error.message}`
              : (error as Error).message;
      record(false, message);
      throw new BadRequestException(message);
    }
  }
}

@Controller('api/admin/drafts')
@UseGuards(AdminGuard)
export class DraftsAdminController {
  constructor(
    private readonly drafts: DraftService,
    private readonly db: Db,
  ) {}

  @Get('templates')
  templates() {
    return { templates: this.drafts.templates(), langs: Object.keys(DRAFT_LANGS), model: MODEL };
  }

  @Post('templates')
  addTemplate(@AdminId() adminId: number, @Body() body: { title?: string; instruction?: string }) {
    const title = String(body?.title ?? '').trim().slice(0, 80);
    const instruction = String(body?.instruction ?? '').trim().slice(0, 1000);
    if (!title) throw new BadRequestException('Give the message type a short name');
    if (!instruction) throw new BadRequestException('Write what this kind of message should say');
    const { lastInsertRowid } = this.db.sql.prepare('INSERT INTO msg_templates (title, instruction) VALUES (?, ?)').run(title, instruction);
    this.audit(adminId, `Added the message type "${title}"`);
    return this.drafts.templates().find((t) => t.id === String(lastInsertRowid));
  }

  @Delete('templates/:id')
  removeTemplate(@AdminId() adminId: number, @Param('id', ParseIntPipe) id: number) {
    const row = this.db.sql.prepare('SELECT title FROM msg_templates WHERE id = ?').get(id) as { title: string } | undefined;
    if (!row) throw new NotFoundException('Message type not found');
    this.db.sql.prepare('DELETE FROM msg_templates WHERE id = ?').run(id);
    this.audit(adminId, `Deleted the message type "${row.title}"`);
    return { ok: true };
  }

  @Post('shops/:id')
  @HttpCode(200)
  draft(@Param('id', ParseIntPipe) id: number, @Body() body: { templateId?: string; instruction?: string; lang?: string }) {
    return this.drafts.draft(id, body ?? {});
  }

  private audit(adminId: number, detail: string) {
    this.db.sql.prepare('INSERT INTO admin_log (admin_id, merchant_id, action, detail) VALUES (?, NULL, ?, ?)').run(adminId, 'msg_template', detail);
  }
}
