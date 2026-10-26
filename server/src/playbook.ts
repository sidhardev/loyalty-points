import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Injectable, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { AdminGuard, AdminId } from './admin';
import { Db } from './db';
import { seal, unseal } from './secret';

// Admin → Playbooks: a one-page Loyalty Playbook for a business we're pitching ("3 simple reward ideas for your kind of
// business"), written by Claude Haiku 5.5. The cold message offers it; this writes the page to send when they say yes,
// plus the short message that goes with it. The Anthropic key is set in the admin panel (encrypted in the database,
// see secret.ts) or comes from ANTHROPIC_API_KEY; it never reaches the browser. Every call is written to ai_usage.

const MODEL = 'claude-haiku-5-5';
const PRICE_IN_USD = 0.1; // per 1M input tokens
const PRICE_OUT_USD = 0.5; // per 1M output tokens (thinking included)

export type Playbook = {
  headline: string;
  intro: string;
  ideas: { title: string; how: string; why: string; example: string }[];
  firstWeek: string[];
  message: string; // to send with the playbook
};

const IDEA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Short name for the reward, 3-6 words' },
    how: { type: 'string', description: 'How it works, in 1-2 plain sentences the owner can set up today' },
    why: { type: 'string', description: 'Why it brings this kind of customer back, one sentence' },
    example: { type: 'string', description: 'The exact line the owner can tell a customer or put on the card' },
  },
  required: ['title', 'how', 'why', 'example'],
  additionalProperties: false,
};

const SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string', description: 'Title of the page, e.g. "Loyalty Playbook for Beauty On Call"' },
    intro: { type: 'string', description: '2 sentences: how customers of this business come back, and what the 3 ideas do about it' },
    ideas: { type: 'array', items: IDEA, description: 'Exactly 3 reward ideas' },
    firstWeek: { type: 'array', items: { type: 'string' }, description: '3 short steps to start this week' },
    message: { type: 'string', description: 'Short email/WhatsApp reply to send with the playbook, signed "Team Regularhood"' },
  },
  required: ['headline', 'intro', 'ideas', 'firstWeek', 'message'],
  additionalProperties: false,
};

const SYSTEM = `You write one-page Loyalty Playbooks for small Indian businesses (salons, cafés, gyms, clinics, home services, shops).
Regularhood is a simple loyalty app: a digital stamp card on the customer's phone (a reward after N visits), referral rewards,
automatic WhatsApp messages that bring back customers who stopped coming, and Google review requests after a visit.

Write for the owner: plain, warm, practical English an Indian small-business owner reads in one minute. No jargon, no hype,
no made-up statistics or percentages. Prices in ₹ and realistic for the city. Fit the ideas to how this business actually
works (for example a home-service business visits the customer, so there is no counter or walk-in). Each idea must be
different: e.g. a visit-count reward, a referral reward, a come-back or timing reward. Rewards are services, add-ons or
discounts the business itself can give, or a "free gift". Never mention chai or tea. Mention Regularhood at most once, in
the first-week steps, as the easy way to run it. The message is 3-5 lines: thanks for replying, here is the playbook,
one line on the idea likely to work best, and a soft offer to set it up free.`;

type Input = { business: string; businessType: string; city: string; notes: string };

@Injectable()
export class PlaybookService {
  constructor(private readonly db: Db) {}

  private panelKey() {
    const row = this.db.sql.prepare("SELECT value FROM app_settings WHERE key = 'anthropic_key'").get() as { value: string } | undefined;
    return row ? unseal(row.value) : null;
  }

  private key() {
    return this.panelKey() || process.env.ANTHROPIC_API_KEY?.trim() || '';
  }

  /** Which key is in use: never the key itself, only its last 4 characters. */
  keyInfo() {
    const panel = this.panelKey();
    const env = process.env.ANTHROPIC_API_KEY?.trim();
    const key = panel || env;
    return { source: panel ? ('panel' as const) : env ? ('env' as const) : null, last4: key ? key.slice(-4) : '' };
  }

  setKey(key: string | null) {
    if (key) this.db.sql.prepare("INSERT INTO app_settings (key, value) VALUES ('anthropic_key', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(seal(key));
    else this.db.sql.prepare("DELETE FROM app_settings WHERE key = 'anthropic_key'").run();
  }

  /** Checks a key by looking up the model (free, no tokens). Returns an error message, or ''. */
  async check(key = this.key()) {
    if (!key) return 'No key';
    try {
      await new Anthropic({ apiKey: key, maxRetries: 0, timeout: 15_000 }).models.retrieve(MODEL);
      return '';
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) return 'Anthropic did not accept this key';
      if (error instanceof Anthropic.APIError) return `Anthropic ${error.status ?? ''}: ${error.message}`;
      return `Could not reach Anthropic: ${(error as Error).message}`;
    }
  }

  list() {
    return (this.db.sql.prepare('SELECT * FROM playbooks ORDER BY id DESC LIMIT 50').all() as (Omit<Input, 'businessType'> & { id: number; created_at: string; business_type: string; content: string })[]).map(
      ({ content, business_type, ...row }) => ({ ...row, businessType: business_type, playbook: JSON.parse(content) as Playbook }),
    );
  }

  remove(id: number) {
    this.db.sql.prepare('DELETE FROM playbooks WHERE id = ?').run(id);
  }

  async write(input: Input) {
    const key = this.key();
    if (!key) throw new BadRequestException('No Anthropic API key: set one on this page, or ANTHROPIC_API_KEY on the server');

    let inputTokens = 0;
    let outputTokens = 0;
    const record = (ok: boolean, refId: number | null, error?: string) =>
      this.db.sql
        .prepare('INSERT INTO ai_usage (purpose, ref_id, model, input_tokens, output_tokens, cost_usd, ok, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run('playbook', refId, MODEL, inputTokens, outputTokens, (inputTokens / 1e6) * PRICE_IN_USD + (outputTokens / 1e6) * PRICE_OUT_USD, ok ? 1 : 0, error?.slice(0, 500) ?? null);

    let playbook: Playbook;
    try {
      const response = await new Anthropic({ apiKey: key, timeout: 120_000 }).messages.create({
        model: MODEL,
        max_tokens: 16000,
        output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
        system: SYSTEM,
        messages: [
          {
            role: 'user',
            content: [
              `Business: ${input.business}`,
              `Type of business: ${input.businessType}`,
              `City: ${input.city}`,
              input.notes && `What we know about them: ${input.notes}`,
            ]
              .filter(Boolean)
              .join('\n'),
          },
        ],
      });
      inputTokens = response.usage.input_tokens;
      outputTokens = response.usage.output_tokens;
      if (response.stop_reason === 'refusal') throw new Error('Claude declined to write this one; try different wording');
      if (response.stop_reason === 'max_tokens') throw new Error('The playbook came back cut off; try again');
      const text = response.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
      playbook = JSON.parse(text) as Playbook;
      if (playbook.ideas?.length !== 3) throw new Error(`Expected 3 ideas, got ${playbook.ideas?.length ?? 0}; try again`);
    } catch (error) {
      const message =
        error instanceof Anthropic.AuthenticationError
          ? 'Anthropic did not accept the API key'
          : error instanceof Anthropic.RateLimitError
            ? 'Anthropic is rate-limiting us; try again in a minute'
            : error instanceof Anthropic.APIError
              ? `Anthropic ${error.status ?? ''}: ${error.message}`
              : (error as Error).message;
      record(false, null, message);
      throw new BadRequestException(message);
    }

    const { lastInsertRowid } = this.db.sql
      .prepare('INSERT INTO playbooks (business, business_type, city, notes, content) VALUES (?, ?, ?, ?, ?)')
      .run(input.business, input.businessType, input.city, input.notes, JSON.stringify(playbook));
    record(true, Number(lastInsertRowid));
    return this.list().find((p) => p.id === Number(lastInsertRowid))!;
  }
}

@Controller('api/admin/playbooks')
@UseGuards(AdminGuard)
export class PlaybookAdminController {
  constructor(
    private readonly playbooks: PlaybookService,
    private readonly db: Db,
  ) {}

  @Get()
  overview() {
    const cost = this.db.sql.prepare("SELECT COUNT(*) AS calls, COALESCE(SUM(cost_usd), 0) AS usd FROM ai_usage WHERE purpose = 'playbook'").get() as { calls: number; usd: number };
    return { key: this.playbooks.keyInfo(), model: MODEL, cost, playbooks: this.playbooks.list() };
  }

  @Post()
  @HttpCode(200)
  write(@Body() body: { business?: string; businessType?: string; city?: string; notes?: string }) {
    const field = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
    const input = { business: field(body?.business, 100), businessType: field(body?.businessType, 200), city: field(body?.city, 60), notes: field(body?.notes, 1000) };
    if (!input.business) throw new BadRequestException('Type the business name');
    if (!input.businessType) throw new BadRequestException('Say what kind of business it is');
    if (!input.city) throw new BadRequestException('Type the city');
    return this.playbooks.write(input);
  }

  @Put('key')
  async setKey(@AdminId() adminId: number, @Body() body: { key?: string }) {
    const key = String(body?.key ?? '').trim();
    if (!/^sk-ant-[\w-]{20,300}$/.test(key)) throw new BadRequestException('That doesn’t look like an Anthropic API key (it starts with sk-ant-)');
    const problem = await this.playbooks.check(key);
    if (problem) throw new BadRequestException(`Key not saved. ${problem}`);
    this.playbooks.setKey(key);
    this.audit(adminId, `Set a new Anthropic API key (…${key.slice(-4)})`);
    return this.playbooks.keyInfo();
  }

  @Delete('key')
  removeKey(@AdminId() adminId: number) {
    this.playbooks.setKey(null);
    this.audit(adminId, 'Removed the Anthropic API key set in the admin panel');
    return this.playbooks.keyInfo();
  }

  // After 'key', so DELETE /key isn't taken for an id.
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    this.playbooks.remove(id);
    return { ok: true };
  }

  private audit(adminId: number, action: string) {
    this.db.sql.prepare('INSERT INTO admin_log (admin_id, merchant_id, action, detail) VALUES (?, NULL, ?, ?)').run(adminId, 'anthropic_key', action);
  }
}
