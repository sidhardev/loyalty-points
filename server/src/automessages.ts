import { BadRequestException, Body, Controller, ForbiddenException, Get, Injectable, OnModuleDestroy, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard, MerchantId } from './auth';
import type { AutoKind, MsgLang } from './customer-templates';
import { Db } from './db';
import { LoyaltyService, type CustomerRow, type MerchantRow } from './loyalty.service';
import { isFounding } from './plans';
import { waDigits, WhatsApp } from './whatsapp';

// Founding Shop extras: Regularhood's WhatsApp number messages the shop's customers by itself, so the shop doesn't have
// to tap "Send card" for every visit or remember who stopped coming.
//  - card: after a visit, their stamps and a button to their card (at most once a day)
//  - reward: instead of the card, on the visit that fills it
//  - missyou: once, when a customer hasn't come for the shop's "inactive" days (sent 11:00–19:00 India time)
//  - review: after a reward is given, the shop's Google review link (once per customer every 180 days)
// Each shop gets a monthly allowance (Admin → Customer WhatsApp). Nothing goes to numbers that replied STOP. Sending needs the admin to switch
// customer messages on (Admin → WhatsApp) once Meta approved the rh_* templates (customer-templates.ts).

type Shop = MerchantRow;
const KINDS: AutoKind[] = ['card', 'reward', 'missyou', 'review'];
const MISSYOU_PER_SHOP_PER_DAY = 30;

/** A 10-digit number is Indian. */
const waPhone = (phone: string) => {
  const d = waDigits(phone);
  return d.length === 10 ? `91${d}` : d;
};

/** Google review links shops paste: g.page, maps.app.goo.gl, search.google.com/local/writereview, google.com/maps… */
export function readReviewUrl(input: unknown) {
  const text = String(input ?? '').trim();
  if (!text) return '';
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    throw new BadRequestException('Paste the review link from your Google Business Profile');
  }
  const host = url.hostname.toLowerCase();
  const google = host === 'g.page' || host === 'maps.app.goo.gl' || host === 'goo.gl' || host === 'g.co' || /(^|\.)google\.[a-z.]+$/.test(host);
  if (url.protocol !== 'https:' || !google) throw new BadRequestException('Use your Google review link (it starts with https://g.page/ or https://search.google.com/)');
  return url.toString().slice(0, 500);
}

@Injectable()
export class AutoMessages implements OnModuleDestroy {
  private timer: NodeJS.Timeout;

  constructor(
    private readonly db: Db,
    private readonly wa: WhatsApp,
    private readonly loyalty: LoyaltyService,
  ) {
    this.timer = setInterval(() => void this.missYouRound().catch((e) => console.error('Miss-you messages failed:', (e as Error).message)), 30 * 60_000);
    this.timer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  /** Messages this shop's automatic messages used this calendar month (failed sends don't count). */
  used(merchantId: number) {
    return (
      this.db.sql
        .prepare("SELECT COUNT(*) AS n FROM wa_messages WHERE merchant_id = ? AND auto IS NOT NULL AND status != 'failed' AND created_at >= date('now', 'start of month')")
        .get(merchantId) as { n: number }
    ).n;
  }

  /** Whether this shop's automatic message of this kind can go out now (to this customer, if given). */
  private allowed(m: Shop, kind: AutoKind, c?: CustomerRow) {
    const on = { card: m.auto_card, reward: m.auto_reward, missyou: m.auto_missyou, review: m.auto_review && m.review_url }[kind];
    if (!on || !isFounding(m) || !this.wa.customerReady || this.used(m.id) >= this.wa.settings().customerQuota) return false;
    return !c || !this.wa.optedOut(waPhone(c.phone)); // they replied STOP
  }

  /** When this customer last got this kind of message (that didn't fail). */
  private lastSent(customerId: number, kind: AutoKind) {
    const row = this.db.sql
      .prepare("SELECT MAX(created_at) AS at FROM wa_messages WHERE customer_id = ? AND auto = ? AND status != 'failed'")
      .get(customerId, kind) as { at: string | null };
    return row.at;
  }

  private async send(m: Shop, c: CustomerRow, kind: AutoKind) {
    const phone = waPhone(c.phone);
    const left = Math.max(0, m.visits_needed - c.points);
    const values =
      kind === 'reward' ? [m.name, m.reward_name] : kind === 'review' ? [m.name] : [m.name, String(Math.min(c.points, m.visits_needed)), String(m.visits_needed), String(left), m.reward_name];
    await this.wa.sendCustomerTemplate(phone, {
      kind,
      lang: (m.msg_lang === 'en' ? 'en' : 'hi') as MsgLang,
      values,
      urlParam: kind === 'review' ? m.join_code : c.wallet_token,
      merchantId: m.id,
      customerId: c.id,
    });
  }

  /**
   * After a visit: which message goes out ('reward' on the visit that fills the card, else 'card'), or null. It is
   * decided here so the counter can say so, and sent in the background so the counter doesn't wait for Meta.
   */
  afterVisit(merchantId: number, customerId: number, already: boolean): AutoKind | null {
    if (already) return null;
    const m = this.loyalty.merchant(merchantId);
    const c = this.loyalty.customer(merchantId, customerId);
    let kind: AutoKind | null = null;
    if (c.points >= m.visits_needed) kind = this.allowed(m, 'reward', c) ? 'reward' : null;
    else if (this.allowed(m, 'card', c)) {
      const last = this.lastSent(c.id, 'card');
      kind = last && Date.parse(`${last.replace(' ', 'T')}Z`) > Date.now() - 20 * 3_600_000 ? null : 'card';
    }
    if (kind) this.later(m, c, kind);
    return kind;
  }

  /** After the shop gives the reward: the Google review request, at most every 180 days per customer. */
  afterReward(merchantId: number, customerId: number): AutoKind | null {
    const m = this.loyalty.merchant(merchantId);
    const c = this.loyalty.customer(merchantId, customerId);
    if (!this.allowed(m, 'review', c)) return null;
    const last = this.lastSent(c.id, 'review');
    if (last && Date.parse(`${last.replace(' ', 'T')}Z`) > Date.now() - 180 * 86_400_000) return null;
    this.later(m, c, 'review');
    return 'review';
  }

  private later(m: Shop, c: CustomerRow, kind: AutoKind) {
    void this.send(m, c, kind).catch((e) => console.error(`Automatic ${kind} message for shop ${m.id} failed:`, (e as Error).message));
  }

  /**
   * Once a day between 11:00 and 19:00 India time: "we miss you" to customers who haven't come for the shop's inactive
   * days (but came in the last 120), once since their last visit, up to MISSYOU_PER_SHOP_PER_DAY per shop.
   */
  async missYouRound() {
    if (!this.wa.customerReady) return;
    const india = new Date(Date.now() + 330 * 60_000);
    const hour = india.getUTCHours();
    const day = india.toISOString().slice(0, 10);
    if (hour < 11 || hour >= 19) return;
    const done = this.db.sql.prepare("SELECT value FROM app_settings WHERE key = 'auto_missyou_day'").get() as { value: string } | undefined;
    if (done?.value === day) return;
    this.db.sql.prepare("INSERT INTO app_settings (key, value) VALUES ('auto_missyou_day', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(day);

    const shops = this.db.sql.prepare("SELECT * FROM merchants WHERE plan IN ('lifetime', 'yearly') AND auto_missyou = 1 AND suspended_at IS NULL").all() as Shop[];
    for (const m of shops) {
      const due = this.db.sql
        .prepare(
          `SELECT c.* FROM customers c
           WHERE c.merchant_id = ? AND c.last_visit IS NOT NULL
             AND c.last_visit < datetime('now', ?) AND c.last_visit >= datetime('now', '-120 days')
             AND NOT EXISTS (SELECT 1 FROM wa_messages w WHERE w.customer_id = c.id AND w.auto = 'missyou' AND w.status != 'failed' AND w.created_at > c.last_visit)
           ORDER BY c.last_visit DESC LIMIT ?`,
        )
        .all(m.id, `-${m.inactive_days} days`, MISSYOU_PER_SHOP_PER_DAY) as CustomerRow[];
      for (const c of due) {
        if (!this.allowed(m, 'missyou')) break;
        if (!this.allowed(m, 'missyou', c)) continue;
        try {
          await this.send(m, c, 'missyou');
        } catch (e) {
          console.error(`Miss-you message for shop ${m.id} failed:`, (e as Error).message);
          if (/\(190\)|\(131031\)|\(132001\)|token/i.test((e as Error).message)) return; // won't get better for the next one
        }
      }
    }
  }

  /** What the shop's Settings show. */
  status(merchantId: number) {
    const m = this.loyalty.merchant(merchantId);
    const recent = this.db.sql
      .prepare(
        `SELECT w.auto AS kind, w.status, w.created_at, c.phone, c.name FROM wa_messages w LEFT JOIN customers c ON c.id = w.customer_id
         WHERE w.merchant_id = ? AND w.auto IS NOT NULL ORDER BY w.id DESC LIMIT 20`,
      )
      .all(merchantId);
    return {
      founding: isFounding(m),
      live: this.wa.customerReady, // Regularhood's number is set up to send
      quota: this.wa.settings().customerQuota,
      used: this.used(merchantId),
      settings: { card: !!m.auto_card, reward: !!m.auto_reward, missyou: !!m.auto_missyou, review: !!m.auto_review, lang: m.msg_lang, reviewUrl: m.review_url },
      recent,
    };
  }

  save(merchantId: number, b: { card?: boolean; reward?: boolean; missyou?: boolean; review?: boolean; lang?: string; reviewUrl?: string }) {
    const m = this.loyalty.merchant(merchantId);
    if (!isFounding(m)) throw new ForbiddenException('Automatic WhatsApp and Google reviews are part of Founding Shop');
    const flag = (v: unknown, now: number) => (v === undefined ? now : v ? 1 : 0);
    const lang = b?.lang === 'en' || b?.lang === 'hi' ? b.lang : m.msg_lang;
    const reviewUrl = b?.reviewUrl === undefined ? m.review_url : readReviewUrl(b.reviewUrl);
    this.db.sql
      .prepare('UPDATE merchants SET auto_card = ?, auto_reward = ?, auto_missyou = ?, auto_review = ?, msg_lang = ?, review_url = ? WHERE id = ?')
      .run(flag(b?.card, m.auto_card), flag(b?.reward, m.auto_reward), flag(b?.missyou, m.auto_missyou), flag(b?.review, m.auto_review), lang, reviewUrl, m.id);
    const after = this.loyalty.merchant(merchantId);
    const changes = KINDS.filter((k) => m[`auto_${k}`] !== after[`auto_${k}`]).map((k) => `${k} ${after[`auto_${k}`] ? 'on' : 'off'}`);
    if (m.msg_lang !== after.msg_lang) changes.push(`language ${after.msg_lang}`);
    if (m.review_url !== after.review_url) changes.push(after.review_url ? 'Google review link set' : 'Google review link removed');
    if (changes.length) this.loyalty.log(m.id, 'shop', 'settings', `Automatic WhatsApp: ${changes.join(', ')}`);
    return this.status(merchantId);
  }
}

@Controller('api/auto-messages')
@UseGuards(AuthGuard)
export class AutoMessagesController {
  constructor(private readonly auto: AutoMessages) {}

  @Get()
  status(@MerchantId() merchantId: number) {
    return this.auto.status(merchantId);
  }

  @Patch()
  save(@MerchantId() merchantId: number, @Body() body: Parameters<AutoMessages['save']>[1]) {
    return this.auto.save(merchantId, body ?? {});
  }
}
