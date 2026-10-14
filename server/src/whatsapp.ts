import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Injectable,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
  type RawBodyRequest,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { AdminGuard, AdminId } from './admin';
import { Db } from './db';
import { LeadsService } from './leads';
import { seal, unseal } from './secret';
import { SITE } from './seo';

// WhatsApp Cloud API (Meta) for the lead finder. A shop that hasn't messaged us can only be sent an approved template:
// a short intro with the shop's name and kind, and two quick-reply buttons. When the owner taps "yes" (or writes back),
// WhatsApp lets us send free-form messages for 24 hours, so the AI pitch with the sign-up link goes out by itself and
// the admin can chat from the panel. "Not now" or STOP marks the lead not interested and it is never messaged again.
//
// Meta tells us about deliveries, reads, replies and what each message was billed as through the webhook
// (/api/whatsapp/webhook, checked with the app secret). Costs: the price per marketing message is a setting (Meta's
// rate card for India changes), counted when Meta says a message is billable; sends stop at the monthly budget and at
// a daily cap, which also protects the number's quality rating.

export type WaSettings = {
  phoneNumberId: string;
  wabaId: string; // WhatsApp Business Account id: needed to list and create templates
  graphVersion: string;
  templateName: string;
  templateLang: string;
  templateParams: number; // how many {{n}} the template body has: 1 = shop name, 2 = kind of shop, 3 = area
  templateBody: string; // the body text, kept to show what was sent
  autoPitch: boolean; // send the AI pitch when an owner taps yes or replies
  dailyLimit: number; // templates per 24 hours
  marketingPriceUsd: number; // per delivered marketing message
  utilityPriceUsd: number;
  monthlyBudgetUsd: number;
  verifyToken: string; // Meta sends it back when the webhook is set up
};

const DEFAULTS: WaSettings = {
  phoneNumberId: '',
  wabaId: '',
  graphVersion: 'v23.0',
  templateName: '',
  templateLang: 'hi',
  templateParams: 0,
  templateBody: '',
  autoPitch: true,
  dailyLimit: 50,
  marketingPriceUsd: 0.0107,
  utilityPriceUsd: 0.0014,
  monthlyBudgetUsd: 5,
  verifyToken: '',
};

/** Templates offered by "Create template", ready for Meta's review. {{1}} = shop name, {{2}} = kind of shop. */
export const SUGGESTED_TEMPLATES = {
  hi: {
    name: 'regularhood_intro_hi',
    body: 'नमस्ते {{1}} जी 🙏\nहम Regularhood से हैं, छोटी दुकानों के लिए लॉयल्टी पॉइंट्स और रिवॉर्ड्स ऐप।\nआपके {{2}} के रेगुलर कस्टमर्स को हर बिल पर पॉइंट्स मिलें, तो वो बार-बार आते हैं। कस्टमर को कोई ऐप नहीं चाहिए, और शुरू करना फ्री है।\nक्या 2 मिनट में देखना चाहेंगे?',
    yes: 'हाँ, बताइए',
    no: 'अभी नहीं',
  },
  en: {
    name: 'regularhood_intro_hinglish',
    body: 'Namaste {{1}} ji 🙏\nHum Regularhood se hain, chhoti dukaanon ke liye loyalty points aur rewards app.\nAapke {{2}} ke regular customers ko har bill par points milein, to woh baar-baar aate hain. Customer ko koi app nahi chahiye, aur shuru karna free hai.\nKya 2 minute mein dekhna chahenge?',
    yes: 'Haan, batao',
    no: 'Abhi nahi',
  },
};

/** Overridable only for local testing against a stand-in server. */
const API_BASE = (process.env.WHATSAPP_API_BASE || 'https://graph.facebook.com').replace(/\/$/, '');

// Quick-reply buttons and the usual typed answers. (\b doesn't work after Devanagari, hence the lookahead.)
const YES = /^(ha+n|haa|ji|yes|ok|okay|sure|batao|bataiye|interested|हाँ|हां|जी|बताइए|बताओ)(?=$|[\s,.!?।🙏])/iu;
const NO = /^(stop|unsubscribe|nahi|nahin|no|not now|abhi nahi|mat bhejo|नहीं|अभी नहीं|बंद)(?=$|[\s,.!?।🙏])/iu;

type LeadLite = { id: number; name: string; category: string; shop_type: string; area: string; phone: string; mobile: number; wa_opted_out: number; last_inbound_at: string | null; pitch: string | null; status: string };
type GraphError = { error?: { message?: string; code?: number; error_data?: { details?: string } } };

/** '+91 98260 12345' → '919826012345' */
export const waDigits = (phone: string) => phone.replace(/\D/g, '');

@Injectable()
export class WhatsApp {
  constructor(
    private readonly db: Db,
    private readonly leads: LeadsService,
  ) {}

  // ---------------------------------------------------------------- settings and secrets

  settings(): WaSettings {
    const row = this.db.sql.prepare("SELECT value FROM app_settings WHERE key = 'whatsapp'").get() as { value: string } | undefined;
    const s = { ...DEFAULTS, ...(row ? (JSON.parse(row.value) as Partial<WaSettings>) : {}) };
    // IDs can also come from the server's .env; ones saved in the panel win.
    s.phoneNumberId ||= process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ?? '';
    s.wabaId ||= process.env.WHATSAPP_WABA_ID?.trim() ?? '';
    if (!s.verifyToken) {
      s.verifyToken = randomBytes(18).toString('base64url');
      this.store(s);
    }
    return s;
  }

  private store(s: WaSettings) {
    this.db.sql.prepare("INSERT INTO app_settings (key, value) VALUES ('whatsapp', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(JSON.stringify(s));
  }

  saveSettings(input: Partial<WaSettings>) {
    const s = { ...this.settings() };
    const num = (v: unknown, label: string, min: number, max: number) => {
      const n = Number(v);
      if (!Number.isFinite(n) || n < min || n > max) throw new BadRequestException(`${label} must be between ${min} and ${max}`);
      return n;
    };
    const id = (v: unknown, label: string) => {
      const t = String(v ?? '').trim();
      if (t && !/^\d{5,30}$/.test(t)) throw new BadRequestException(`${label} is a long number, from Meta's WhatsApp → API setup page`);
      return t;
    };
    if (input.phoneNumberId !== undefined) s.phoneNumberId = id(input.phoneNumberId, 'Phone number ID');
    if (input.wabaId !== undefined) s.wabaId = id(input.wabaId, 'WhatsApp Business Account ID');
    if (input.graphVersion !== undefined) {
      const v = String(input.graphVersion).trim();
      if (!/^v\d{2}\.\d$/.test(v)) throw new BadRequestException('API version looks like v23.0');
      s.graphVersion = v;
    }
    if (input.templateName !== undefined) {
      s.templateName = String(input.templateName).trim().slice(0, 512);
      s.templateLang = String(input.templateLang ?? s.templateLang).trim().slice(0, 15);
      s.templateParams = Math.round(num(input.templateParams ?? 0, 'Template variables', 0, 3));
      s.templateBody = String(input.templateBody ?? '').slice(0, 1100);
    }
    if (input.autoPitch !== undefined) s.autoPitch = Boolean(input.autoPitch);
    if (input.dailyLimit !== undefined) s.dailyLimit = Math.round(num(input.dailyLimit, 'Messages per day', 0, 10_000));
    if (input.marketingPriceUsd !== undefined) s.marketingPriceUsd = num(input.marketingPriceUsd, 'Marketing price', 0, 10);
    if (input.utilityPriceUsd !== undefined) s.utilityPriceUsd = num(input.utilityPriceUsd, 'Utility price', 0, 10);
    if (input.monthlyBudgetUsd !== undefined) s.monthlyBudgetUsd = num(input.monthlyBudgetUsd, 'Monthly budget', 0, 1000);
    this.store(s);
    return s;
  }

  private secret(name: 'wa_token' | 'wa_app_secret', env: string) {
    const row = this.db.sql.prepare('SELECT value FROM app_settings WHERE key = ?').get(name) as { value: string } | undefined;
    const panel = row ? unseal(row.value) : null;
    const fromEnv = process.env[env]?.trim();
    return { value: panel || fromEnv || '', source: panel ? ('panel' as const) : fromEnv ? ('env' as const) : null };
  }

  token() {
    return this.secret('wa_token', 'WHATSAPP_TOKEN').value;
  }

  appSecret() {
    return this.secret('wa_app_secret', 'WHATSAPP_APP_SECRET').value;
  }

  setSecret(name: 'wa_token' | 'wa_app_secret', value: string | null) {
    if (value) this.db.sql.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(name, seal(value));
    else this.db.sql.prepare('DELETE FROM app_settings WHERE key = ?').run(name);
  }

  secretsInfo() {
    const t = this.secret('wa_token', 'WHATSAPP_TOKEN');
    const a = this.secret('wa_app_secret', 'WHATSAPP_APP_SECRET');
    return { token: { source: t.source, last4: t.value.slice(-4) }, appSecret: { source: a.source, last4: a.value.slice(-4) } };
  }

  /** Ready to send: a number, a token and a chosen template. */
  get ready() {
    const s = this.settings();
    return Boolean(s.phoneNumberId && this.token() && s.templateName);
  }

  // ---------------------------------------------------------------- Graph API

  private async graph<T>(path: string, init: { method?: string; body?: object; token?: string } = {}): Promise<T> {
    const s = this.settings();
    const token = init.token ?? this.token();
    if (!token) throw new BadRequestException('Add the WhatsApp access token first');
    let res: globalThis.Response;
    try {
      res = await fetch(`${API_BASE}/${s.graphVersion}/${path}`, {
        method: init.method ?? 'GET',
        headers: { authorization: `Bearer ${token}`, ...(init.body ? { 'content-type': 'application/json' } : {}) },
        body: init.body ? JSON.stringify(init.body) : undefined,
        signal: AbortSignal.timeout(20_000),
      });
    } catch (error) {
      throw new BadRequestException(`Could not reach WhatsApp: ${(error as Error).message}`);
    }
    const body = (await res.json().catch(() => ({}))) as T & GraphError;
    if (!res.ok) {
      const e = body.error;
      throw new BadRequestException(`WhatsApp ${res.status}${e?.code ? ` (${e.code})` : ''}: ${e?.error_data?.details || e?.message || 'request failed'}`);
    }
    return body;
  }

  /** The number as Meta sees it, including its quality rating and daily messaging tier. Free. */
  phoneInfo(token?: string) {
    const s = this.settings();
    if (!s.phoneNumberId) throw new BadRequestException('Add the phone number ID first');
    return this.graph<{ display_phone_number?: string; verified_name?: string; quality_rating?: string; messaging_limit_tier?: string; name_status?: string }>(
      `${s.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,messaging_limit_tier,name_status`,
      { token },
    );
  }

  async templates() {
    const s = this.settings();
    if (!s.wabaId) throw new BadRequestException('Add the WhatsApp Business Account ID first');
    const r = await this.graph<{ data?: { name: string; language: string; status: string; category: string; components?: { type: string; text?: string }[] }[] }>(
      `${s.wabaId}/message_templates?fields=name,language,status,category,components&limit=100`,
    );
    return (r.data ?? []).map((t) => {
      const body = t.components?.find((c) => c.type === 'BODY')?.text ?? '';
      return { name: t.name, language: t.language, status: t.status, category: t.category, body, params: new Set(body.match(/\{\{\d+\}\}/g) ?? []).size };
    });
  }

  /** Sends one of the suggested templates to Meta for review (usually approved within minutes to a day). */
  createTemplate(lang: 'hi' | 'en', body?: string) {
    const s = this.settings();
    if (!s.wabaId) throw new BadRequestException('Add the WhatsApp Business Account ID first');
    const t = SUGGESTED_TEMPLATES[lang];
    const text = (body ?? t.body).trim();
    const vars = new Set(text.match(/\{\{\d+\}\}/g) ?? []).size;
    if (vars > 2) throw new BadRequestException('Use at most {{1}} (shop name) and {{2}} (kind of shop)');
    const examples = ['Sharma Kirana Store', lang === 'hi' ? 'किराना स्टोर' : 'kirana store'].slice(0, vars);
    return this.graph<{ id: string; status: string }>(`${s.wabaId}/message_templates`, {
      method: 'POST',
      body: {
        name: `${t.name}_${Date.now().toString(36)}`,
        language: lang,
        category: 'MARKETING',
        components: [
          { type: 'BODY', text, ...(vars ? { example: { body_text: [examples] } } : {}) },
          { type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: t.yes }, { type: 'QUICK_REPLY', text: t.no }] },
        ],
      },
    });
  }

  // ---------------------------------------------------------------- costs and limits

  monthCost() {
    return this.db.sql
      .prepare(
        `SELECT COALESCE(SUM(cost_usd), 0) AS usd,
           COUNT(*) FILTER (WHERE direction = 'out' AND kind = 'template' AND status != 'failed') AS templates,
           COUNT(*) FILTER (WHERE direction = 'out' AND status = 'read') AS read,
           COUNT(DISTINCT CASE WHEN direction = 'in' THEN phone END) AS replied
         FROM wa_messages WHERE created_at >= date('now', 'start of month')`,
      )
      .get() as { usd: number; templates: number; read: number; replied: number };
  }

  sentToday() {
    return (
      this.db.sql
        .prepare("SELECT COUNT(*) AS n FROM wa_messages WHERE direction = 'out' AND kind = 'template' AND status != 'failed' AND created_at >= datetime('now', '-1 day')")
        .get() as { n: number }
    ).n;
  }

  // ---------------------------------------------------------------- sending

  private lead(id: number) {
    this.leads.lead(id); // 404 if missing
    return this.db.sql.prepare('SELECT * FROM leads WHERE id = ?').get(id) as LeadLite;
  }

  private record(m: { leadId: number | null; phone: string; direction: 'out' | 'in'; wamid?: string; kind: string; body: string; status: string; error?: string }) {
    this.db.sql
      .prepare('INSERT OR IGNORE INTO wa_messages (lead_id, phone, direction, wamid, kind, body, status, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(m.leadId, m.phone, m.direction, m.wamid ?? null, m.kind, m.body.slice(0, 4000), m.status, m.error?.slice(0, 500) ?? null);
  }

  windowOpen(l: Pick<LeadLite, 'last_inbound_at'>) {
    return Boolean(l.last_inbound_at && Date.now() - Date.parse(`${l.last_inbound_at.replace(' ', 'T')}Z`) < 24 * 3_600_000);
  }

  /** The intro template to one lead. Refuses opted-out leads, landlines, and anything past the daily cap or budget. */
  async sendTemplate(leadId: number) {
    const s = this.settings();
    const l = this.lead(leadId);
    if (!this.ready) throw new BadRequestException('Set up WhatsApp first: number, token and a template');
    if (l.wa_opted_out) throw new BadRequestException(`${l.name} asked not to be messaged`);
    if (!l.mobile) throw new BadRequestException(`${l.name} has no mobile number`);
    if (this.sentToday() >= s.dailyLimit) throw new BadRequestException(`Today's limit of ${s.dailyLimit} messages is reached (change it in WhatsApp settings)`);
    if (this.monthCost().usd + s.marketingPriceUsd > s.monthlyBudgetUsd + 1e-9) throw new BadRequestException(`This month's WhatsApp budget ($${s.monthlyBudgetUsd}) is used up`);

    const values = [l.name, l.category || l.shop_type || 'dukaan', l.area].slice(0, s.templateParams).map((v) => v.slice(0, 60));
    const phone = waDigits(l.phone);
    const text = values.reduce((t, v, i) => t.replaceAll(`{{${i + 1}}}`, v), s.templateBody || `[${s.templateName}]`);
    try {
      const r = await this.graph<{ messages?: { id: string }[] }>(`${s.phoneNumberId}/messages`, {
        method: 'POST',
        body: {
          messaging_product: 'whatsapp',
          to: phone,
          type: 'template',
          template: {
            name: s.templateName,
            language: { code: s.templateLang },
            ...(values.length ? { components: [{ type: 'body', parameters: values.map((v) => ({ type: 'text', text: v })) }] } : {}),
          },
        },
      });
      this.record({ leadId, phone, direction: 'out', wamid: r.messages?.[0]?.id, kind: 'template', body: text, status: 'sent' });
      this.db.sql
        .prepare(
          `UPDATE leads SET status = CASE WHEN status = 'new' THEN 'contacted' ELSE status END,
             contacted_at = COALESCE(contacted_at, datetime('now')), updated_at = datetime('now') WHERE id = ?`,
        )
        .run(leadId);
    } catch (error) {
      const message = (error as Error).message;
      this.record({ leadId, phone, direction: 'out', kind: 'template', body: text, status: 'failed', error: message });
      // Not on WhatsApp: stop offering to message this number.
      if (/\(131026\)/.test(message)) this.db.sql.prepare('UPDATE leads SET mobile = 0 WHERE id = ?').run(leadId);
      throw error;
    }
  }

  /** A free-form message: only allowed for 24 hours after the lead's last message. */
  async sendText(leadId: number, text: string) {
    const s = this.settings();
    const l = this.lead(leadId);
    const body = text.trim().slice(0, 4000);
    if (!body) throw new BadRequestException('Write a message');
    if (!s.phoneNumberId || !this.token()) throw new BadRequestException('Set up WhatsApp first');
    if (l.wa_opted_out) throw new BadRequestException(`${l.name} asked not to be messaged`);
    if (!this.windowOpen(l)) throw new BadRequestException('WhatsApp only allows free messages within 24 hours of their last reply. Send the template instead.');
    const phone = waDigits(l.phone);
    try {
      const r = await this.graph<{ messages?: { id: string }[] }>(`${s.phoneNumberId}/messages`, {
        method: 'POST',
        body: { messaging_product: 'whatsapp', to: phone, type: 'text', text: { body, preview_url: true } },
      });
      this.record({ leadId, phone, direction: 'out', wamid: r.messages?.[0]?.id, kind: 'text', body, status: 'sent' });
    } catch (error) {
      this.record({ leadId, phone, direction: 'out', kind: 'text', body, status: 'failed', error: (error as Error).message });
      throw error;
    }
  }

  /** The lead's AI pitch (written now if there isn't one), with the sign-up link, as a free-form message. */
  async sendPitch(leadId: number, lang?: 'hinglish' | 'hindi') {
    let l = this.lead(leadId);
    if (!l.pitch) {
      await this.leads.writePitch(leadId);
      l = this.lead(leadId);
    }
    const pitch = JSON.parse(l.pitch!) as { whatsapp: string; whatsappHindi: string };
    const useHindi = lang ? lang === 'hindi' : this.settings().templateLang.startsWith('hi');
    await this.sendText(leadId, (useHindi ? pitch.whatsappHindi : pitch.whatsapp).replace(/\[link\]/gi, this.leads.link(leadId)));
  }

  /** The intro template to the best new leads that haven't been messaged, up to `count`. */
  async sendBulk(count: number) {
    const ids = (
      this.db.sql
        .prepare(
          `SELECT id FROM leads WHERE status = 'new' AND mobile = 1 AND wa_opted_out = 0
             AND NOT EXISTS (SELECT 1 FROM wa_messages m WHERE m.lead_id = leads.id AND m.direction = 'out' AND m.status != 'failed')
           ORDER BY score DESC, reviews DESC LIMIT ?`,
        )
        .all(count) as { id: number }[]
    ).map((r) => r.id);
    let sent = 0;
    let error = '';
    for (const id of ids) {
      try {
        await this.sendTemplate(id);
        sent++;
      } catch (e) {
        error = (e as Error).message;
        if (/limit|budget|token|Set up|\(190\)|\(131031\)/i.test(error)) break; // won't get better for the next lead
      }
    }
    return { sent, tried: ids.length, error };
  }

  thread(leadId: number) {
    return this.db.sql.prepare('SELECT id, direction, kind, body, status, error, category, cost_usd, created_at FROM wa_messages WHERE lead_id = ? ORDER BY id').all(leadId);
  }

  // ---------------------------------------------------------------- webhook

  /** True if Meta signed this body with our app secret. */
  verifySignature(raw: Buffer | undefined, header: string | undefined) {
    const secret = this.appSecret();
    if (!secret || !raw || !header?.startsWith('sha256=')) return false;
    const expected = Buffer.from(createHmac('sha256', secret).update(raw).digest('hex'));
    const got = Buffer.from(header.slice(7));
    return expected.length === got.length && timingSafeEqual(expected, got);
  }

  async handleWebhook(payload: WebhookPayload) {
    const s = this.settings();
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const v = change.value;
        if (!v || (s.phoneNumberId && v.metadata?.phone_number_id && v.metadata.phone_number_id !== s.phoneNumberId)) continue;

        for (const st of v.statuses ?? []) {
          const price = st.pricing?.billable ? (st.pricing.category === 'marketing' ? s.marketingPriceUsd : st.pricing.category === 'utility' ? s.utilityPriceUsd : 0) : 0;
          const order = { sent: 1, delivered: 2, read: 3, failed: 4 } as Record<string, number>;
          const row = this.db.sql.prepare('SELECT status, cost_usd FROM wa_messages WHERE wamid = ?').get(st.id) as { status: string; cost_usd: number } | undefined;
          if (!row) continue;
          const status = (order[st.status] ?? 0) > (order[row.status] ?? 0) ? st.status : row.status;
          this.db.sql
            .prepare(
              `UPDATE wa_messages SET status = ?, error = COALESCE(?, error), category = COALESCE(?, category), cost_usd = CASE WHEN cost_usd = 0 THEN ? ELSE cost_usd END,
                 updated_at = datetime('now') WHERE wamid = ?`,
            )
            .run(status, st.errors?.[0] ? `${st.errors[0].code}: ${st.errors[0].title ?? st.errors[0].message ?? ''}` : null, st.pricing?.category ?? null, price, st.id);
        }

        for (const m of v.messages ?? []) {
          const phone = m.from;
          const text = m.button?.text ?? m.interactive?.button_reply?.title ?? m.text?.body ?? `[${m.type}]`;
          const lead = this.db.sql
            .prepare("SELECT * FROM leads WHERE replace(replace(replace(phone, '+', ''), ' ', ''), '-', '') = ? ORDER BY id LIMIT 1")
            .get(phone) as LeadLite | undefined;
          this.record({ leadId: lead?.id ?? null, phone, direction: 'in', wamid: m.id, kind: m.type, body: text, status: 'received' });
          if (!lead) continue;
          this.db.sql.prepare("UPDATE leads SET last_inbound_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(lead.id);

          const said = text.trim();
          if (NO.test(said)) {
            this.db.sql.prepare("UPDATE leads SET wa_opted_out = 1, status = CASE WHEN status = 'joined' THEN status ELSE 'not_interested' END WHERE id = ?").run(lead.id);
          } else {
            this.db.sql.prepare("UPDATE leads SET status = 'interested' WHERE id = ? AND status IN ('new', 'contacted')").run(lead.id);
            // The first "yes" (or any first reply) gets the pitch with the sign-up link, once.
            const pitched = this.db.sql.prepare("SELECT 1 FROM wa_messages WHERE lead_id = ? AND direction = 'out' AND kind = 'text' AND status != 'failed'").get(lead.id);
            if (s.autoPitch && !pitched && (YES.test(said) || m.type === 'text')) {
              await this.sendPitch(lead.id).catch((e) => console.error(`WhatsApp pitch to lead ${lead.id} failed:`, (e as Error).message));
            }
          }
        }
      }
    }
  }
}

type WebhookPayload = {
  entry?: {
    changes?: {
      value?: {
        metadata?: { phone_number_id?: string };
        statuses?: { id: string; status: string; pricing?: { billable?: boolean; category?: string }; errors?: { code: number; title?: string; message?: string }[] }[];
        messages?: {
          id: string;
          from: string;
          type: string;
          text?: { body?: string };
          button?: { text?: string; payload?: string };
          interactive?: { button_reply?: { title?: string } };
        }[];
      };
    }[];
  }[];
};

// ---------------------------------------------------------------- admin

@Controller('api/admin/whatsapp')
@UseGuards(AdminGuard)
export class WhatsAppAdminController {
  constructor(
    private readonly wa: WhatsApp,
    private readonly db: Db,
  ) {}

  @Get()
  overview() {
    const s = this.wa.settings();
    return {
      settings: s,
      secrets: this.wa.secretsInfo(),
      ready: this.wa.ready,
      webhookUrl: `${SITE}/api/whatsapp/webhook`,
      sentToday: this.wa.sentToday(),
      month: this.wa.monthCost(),
      suggested: SUGGESTED_TEMPLATES,
    };
  }

  @Put('settings')
  save(@Body() body: Partial<WaSettings>) {
    return this.wa.saveSettings(body ?? {});
  }

  /** Saves the access token after checking it can see the phone number. */
  @Put('token')
  async setToken(@AdminId() adminId: number, @Body() body: { token?: string }) {
    const token = String(body?.token ?? '').trim();
    if (!/^[\w.\-|]{30,1000}$/.test(token)) throw new BadRequestException('That doesn’t look like a WhatsApp access token');
    await this.wa.phoneInfo(token);
    this.wa.setSecret('wa_token', token);
    this.audit(adminId, `Set a new WhatsApp access token (…${token.slice(-4)})`);
    return this.wa.secretsInfo();
  }

  @Put('app-secret')
  setAppSecret(@AdminId() adminId: number, @Body() body: { secret?: string }) {
    const secret = String(body?.secret ?? '').trim();
    if (!/^[a-f0-9]{32}$/i.test(secret)) throw new BadRequestException('The app secret is 32 letters and numbers, from the Meta app’s Settings → Basic');
    this.wa.setSecret('wa_app_secret', secret);
    this.audit(adminId, 'Set the WhatsApp app secret');
    return this.wa.secretsInfo();
  }

  @Delete('token')
  removeToken(@AdminId() adminId: number) {
    this.wa.setSecret('wa_token', null);
    this.audit(adminId, 'Removed the WhatsApp access token');
    return this.wa.secretsInfo();
  }

  /** The number's name, quality rating and messaging tier, straight from Meta. */
  @Get('phone')
  phone() {
    return this.wa.phoneInfo();
  }

  @Get('templates')
  templates() {
    return this.wa.templates();
  }

  @Post('templates')
  @HttpCode(200)
  createTemplate(@Body() body: { lang?: string; body?: string }) {
    return this.wa.createTemplate(body?.lang === 'en' ? 'en' : 'hi', body?.body);
  }

  @Get('leads/:id')
  thread(@Param('id', ParseIntPipe) id: number) {
    return this.wa.thread(id);
  }

  @Post('leads/:id/template')
  @HttpCode(200)
  async sendTemplate(@Param('id', ParseIntPipe) id: number) {
    await this.wa.sendTemplate(id);
    return this.wa.thread(id);
  }

  @Post('leads/:id/text')
  @HttpCode(200)
  async sendText(@Param('id', ParseIntPipe) id: number, @Body() body: { text?: string }) {
    await this.wa.sendText(id, String(body?.text ?? ''));
    return this.wa.thread(id);
  }

  @Post('leads/:id/pitch')
  @HttpCode(200)
  async sendPitch(@Param('id', ParseIntPipe) id: number, @Body() body: { lang?: 'hinglish' | 'hindi' }) {
    await this.wa.sendPitch(id, body?.lang);
    return this.wa.thread(id);
  }

  @Post('bulk')
  @HttpCode(200)
  bulk(@Body() body: { count?: number }) {
    return this.wa.sendBulk(Math.min(50, Math.max(1, Math.round(Number(body?.count) || 10))));
  }

  private audit(adminId: number, detail: string) {
    this.db.sql.prepare('INSERT INTO admin_log (admin_id, merchant_id, action, detail) VALUES (?, NULL, ?, ?)').run(adminId, 'whatsapp', detail);
  }
}

// ---------------------------------------------------------------- Meta's webhook (public)

@Controller('api/whatsapp/webhook')
export class WhatsAppWebhookController {
  constructor(private readonly wa: WhatsApp) {}

  /** Meta checks the webhook URL once, with the verify token shown in the admin panel. */
  @Get()
  verify(@Query('hub.mode') mode: string, @Query('hub.verify_token') token: string, @Query('hub.challenge') challenge: string, @Res() res: Response) {
    if (mode === 'subscribe' && token && token === this.wa.settings().verifyToken) return res.type('text').send(challenge);
    return res.status(403).send('Forbidden');
  }

  /** Deliveries, reads and replies. Answers 200 straight away (Meta retries otherwise) and works through it after. */
  @Post()
  @HttpCode(200)
  receive(@Req() req: RawBodyRequest<Request>) {
    if (!this.wa.verifySignature(req.rawBody, req.headers['x-hub-signature-256'] as string | undefined)) {
      console.error('WhatsApp webhook: bad or missing signature (is the app secret set in Admin → Leads?)');
      return 'ignored';
    }
    void this.wa.handleWebhook(req.body as WebhookPayload).catch((e) => console.error('WhatsApp webhook failed:', (e as Error).message));
    return 'ok';
  }
}
