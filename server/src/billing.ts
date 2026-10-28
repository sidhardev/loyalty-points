import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  Injectable,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  ServiceUnavailableException,
  UseGuards,
  type RawBodyRequest,
} from '@nestjs/common';
import type { Request } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { AdminGuard, AdminId } from './admin';
import { AuthGuard, MerchantId } from './auth';
import { Db } from './db';
import { LoyaltyService, type MerchantRow } from './loyalty.service';
import { customerLimit, effectivePlan, planSettings, prices, savePlanSettings, seatsLeft, seatsTaken, type PlanSettings } from './plans';

// Founding Shop payments through Razorpay Standard Checkout: the shop's page asks for an order, Razorpay's checkout
// takes the money (UPI first), and the plan is switched on from either the checkout's signed answer (/verify) or
// Razorpay's webhook, whichever arrives first. Both are one-time payments; a yearly plan is renewed by paying again.
// Kept on its own so other payment providers can be added next to it.
//
// Every step is kept in payment_events so Admin → Plans can show a payment's whole story, spot a webhook that stopped
// arriving, and ask Razorpay directly (sync) when a shop says it paid but the plan didn't switch on.
//
// Settings (server/.env, deploy/.env): RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET.

type Kind = 'lifetime' | 'yearly';
/**
 * order: the shop opened the checkout · closed: it closed the checkout without paying · failed: a payment attempt failed
 * (the checkout or Razorpay's payment.failed) · verified / verify_failed: the checkout's signed answer · webhook /
 * webhook_rejected: a Razorpay webhook, and one whose signature didn't match · amount_mismatch: paid a different amount ·
 * activated: the plan switched on · refunded · synced: an admin asked Razorpay for the order's payments.
 */
export type PaymentEvent =
  | 'order'
  | 'closed'
  | 'failed'
  | 'verified'
  | 'verify_failed'
  | 'webhook'
  | 'webhook_rejected'
  | 'amount_mismatch'
  | 'activated'
  | 'refunded'
  | 'synced';
type PaymentRow = {
  id: number;
  merchant_id: number;
  kind: Kind;
  amount_paise: number;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  status: string; // created | paid | failed | refunded
};

const keyId = () => process.env.RAZORPAY_KEY_ID ?? '';
const keySecret = () => process.env.RAZORPAY_KEY_SECRET ?? '';

/** Overridable only for local testing against a stand-in server. */
const API_BASE = (process.env.RAZORPAY_API_BASE || 'https://api.razorpay.com').replace(/\/$/, '');

/** One call to Razorpay's API with our key (a POST with `body`, else a GET); its JSON answer, or a readable error. */
async function razorpay<T>(path: string, body?: object): Promise<T> {
  let res: globalThis.Response;
  try {
    res = await fetch(`${API_BASE}/v1/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { authorization: `Basic ${Buffer.from(`${keyId()}:${keySecret()}`).toString('base64')}`, 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    throw new ServiceUnavailableException(`Could not reach Razorpay: ${(error as Error).message}`);
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: { description?: string } };
  if (!res.ok) throw new ServiceUnavailableException(`Razorpay ${res.status}: ${data.error?.description || 'request failed'}`);
  return data;
}

/** Whether `signature` is the hex HMAC-SHA256 of `data` with `secret`, compared in constant time. */
function signedBy(secret: string, data: string | Buffer, signature: string | undefined) {
  if (!secret || !signature) return false;
  const expected = Buffer.from(createHmac('sha256', secret).update(data).digest('hex'));
  const got = Buffer.from(signature);
  return expected.length === got.length && timingSafeEqual(expected, got);
}

@Injectable()
export class Billing {
  constructor(
    private readonly db: Db,
    private readonly loyalty: LoyaltyService,
  ) {}

  /** What the shop's Plan page shows. */
  status(merchantId: number) {
    const m = this.loyalty.merchant(merchantId);
    return {
      plan: effectivePlan(m),
      paidPlan: m.plan, // 'yearly' even after it ran out, so the page can offer a renewal
      expiresAt: m.plan_expires_at,
      foundingNo: m.founding_no,
      customers: this.loyalty.customerCount(merchantId),
      limit: customerLimit(this.db.sql, m),
      seats: { total: planSettings(this.db.sql).seats, left: seatsLeft(this.db.sql) },
      prices: prices(this.db.sql),
      open: planSettings(this.db.sql).salesOpen, // false: only shops renewing can pay
      keyId: keyId(),
    };
  }

  /** A Razorpay order for this shop. A shop without a seat needs one to be free. */
  async order(merchantId: number, kindInput: unknown) {
    const kind = kindInput === 'lifetime' || kindInput === 'yearly' ? kindInput : null;
    if (!kind) throw new BadRequestException('Pick lifetime or yearly');
    if (!keyId() || !keySecret()) throw new ServiceUnavailableException('Payments are not set up yet. Please try again later.');
    const m = this.loyalty.merchant(merchantId);
    if (m.plan === 'lifetime') throw new ConflictException('You are already a Founding Shop for life');
    const renewing = this.holdsSeat(m);
    if (!renewing && !planSettings(this.db.sql).salesOpen) throw new ConflictException('Founding Shop is not on sale right now');
    if (!renewing && seatsLeft(this.db.sql) === 0) throw new ConflictException('All Founding Shop places are taken');

    const amount = prices(this.db.sql)[kind];
    const body = await razorpay<{ id?: string }>('orders', {
      amount,
      currency: 'INR',
      receipt: `shop-${merchantId}-${Date.now()}`,
      notes: { merchant_id: String(merchantId), kind },
    });
    if (!body.id) throw new ServiceUnavailableException('Razorpay could not start the payment');
    const { lastInsertRowid } = this.db.sql
      .prepare('INSERT INTO payments (merchant_id, kind, amount_paise, razorpay_order_id) VALUES (?, ?, ?, ?)')
      .run(merchantId, kind, amount, body.id);
    this.event(Number(lastInsertRowid), merchantId, 'order', `${kind}, ₹${amount / 100}${renewing ? ', renewal' : ''}`);
    return { orderId: body.id, amount, keyId: keyId(), shop: m.name, phone: m.phone ?? '', email: m.email ?? '' };
  }

  /** The checkout's answer, signed with our key secret. */
  verify(merchantId: number, b: { orderId?: string; paymentId?: string; signature?: string }) {
    const orderId = String(b?.orderId ?? '');
    const paymentId = String(b?.paymentId ?? '');
    const p = this.payment(orderId);
    if (!p || p.merchant_id !== merchantId) throw new BadRequestException('This payment is not for your shop');
    if (!signedBy(keySecret(), `${orderId}|${paymentId}`, b?.signature)) {
      this.event(p.id, merchantId, 'verify_failed', `signature didn't match for ${paymentId || 'no payment id'}`);
      throw new BadRequestException('This payment could not be confirmed');
    }
    this.event(p.id, merchantId, 'verified', paymentId);
    this.activate(p, paymentId, 'checkout');
    return this.status(merchantId);
  }

  /** What happened in the shop's checkout that Razorpay only tells the page: closed without paying, or an attempt failed. */
  checkoutEvent(merchantId: number, b: { orderId?: string; event?: string; reason?: string }) {
    const p = this.payment(String(b?.orderId ?? ''));
    if (!p || p.merchant_id !== merchantId) return { ok: true };
    const reason = String(b?.reason ?? '').slice(0, 300);
    if (b?.event === 'closed') this.event(p.id, merchantId, 'closed', '');
    else if (b?.event === 'failed') this.fail(p, reason || 'Payment failed', 'checkout');
    return { ok: true };
  }

  /**
   * Razorpay's webhook: payment.captured or order.paid switches the plan on, if /verify hasn't already; payment.failed
   * records why. Every webhook is kept as an event, so Admin → Plans can tell when they stop arriving.
   */
  webhook(raw: Buffer | undefined, signature: string | undefined, payload: WebhookPayload) {
    if (!raw || !signedBy(process.env.RAZORPAY_WEBHOOK_SECRET ?? '', raw, signature)) {
      // Anyone can post here, so only a short note is kept.
      this.event(null, null, 'webhook_rejected', `${String(payload?.event ?? 'unknown').slice(0, 40)}${signature ? ", signature didn't match" : ', no signature'}`);
      return 'ignored';
    }
    const pay = payload.payload?.payment?.entity;
    const p = pay?.order_id ? this.payment(pay.order_id) : undefined;
    this.event(p?.id ?? null, p?.merchant_id ?? null, 'webhook', `${payload.event ?? 'unknown'}${pay?.id ? ` · ${pay.id}` : ''}${pay?.method ? ` · ${pay.method}` : ''}`);
    if (!p || !pay?.id) return 'ok';
    if (payload.event === 'payment.failed') {
      this.fail(p, pay.error_description || 'Payment failed', 'webhook');
      return 'ok';
    }
    if (payload.event !== 'payment.captured' && payload.event !== 'order.paid') return 'ok';
    if (pay.amount !== p.amount_paise) {
      console.error(`Razorpay paid ${pay.amount} for order ${p.razorpay_order_id}, expected ${p.amount_paise}`);
      this.event(p.id, p.merchant_id, 'amount_mismatch', `paid ₹${(pay.amount ?? 0) / 100}, expected ₹${p.amount_paise / 100}`);
      return 'ok';
    }
    this.activate(p, pay.id, 'webhook');
    return 'ok';
  }

  /**
   * Asks Razorpay for the order's payments and acts on the answer: a captured payment switches the plan on (a webhook
   * that never came), a failed one records why. For a shop that says it paid but is still on the Free plan.
   */
  async sync(paymentId: number) {
    const p = this.db.sql.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId) as PaymentRow | undefined;
    if (!p) throw new BadRequestException('Payment not found');
    if (!keyId() || !keySecret()) throw new ServiceUnavailableException('Razorpay keys are not set on the server');
    const { items = [] } = await razorpay<{ items?: RazorpayPayment[] }>(`orders/${p.razorpay_order_id}/payments`);
    const captured = items.find((i) => i.status === 'captured' && i.amount === p.amount_paise);
    const authorized = items.some((i) => i.status === 'authorized');
    const summary = items.length ? items.map((i) => `${i.id} ${i.status}${i.method ? ` (${i.method})` : ''}`).join(', ') : 'no payment attempts';
    this.event(p.id, p.merchant_id, 'synced', summary);
    if (captured) this.activate(p, captured.id, 'sync');
    else {
      const failed = items.filter((i) => i.status === 'failed').at(-1);
      if (failed && !authorized) this.fail(p, failed.error_description || 'Payment failed', 'sync');
    }
    return { attempts: items.length, captured: Boolean(captured), authorized };
  }

  /** sync() for every payment of the last 3 days that isn't paid yet. */
  async syncRecent() {
    const open = this.db.sql
      .prepare("SELECT id FROM payments WHERE status IN ('created', 'failed') AND created_at >= datetime('now', '-3 days') ORDER BY id")
      .all() as { id: number }[];
    let fixed = 0;
    for (const { id } of open) if ((await this.sync(id)).captured) fixed++;
    return { checked: open.length, fixed };
  }

  /** A failed attempt. The shop can try again in the same order, so a later success still switches the plan on. */
  private fail(p: PaymentRow, reason: string, from: string) {
    this.db.sql.prepare("UPDATE payments SET status = 'failed', failure_reason = ? WHERE id = ? AND status IN ('created', 'failed')").run(reason.slice(0, 300), p.id);
    this.event(p.id, p.merchant_id, 'failed', `${reason.slice(0, 300)} (${from})`);
  }

  event(paymentId: number | null, merchantId: number | null, event: PaymentEvent, detail: string) {
    this.db.sql.prepare('INSERT INTO payment_events (payment_id, merchant_id, event, detail) VALUES (?, ?, ?, ?)').run(paymentId, merchantId, event, detail);
  }

  /**
   * Switches the plan on, once per order. Lifetime has no end; a year is added to whatever is left of the current one.
   * A payment that arrives after the last seat went is still honoured: the shop paid.
   */
  private activate(p: PaymentRow, paymentId: string, from: 'checkout' | 'webhook' | 'sync') {
    this.db.transaction(() => {
      const fresh = this.payment(p.razorpay_order_id)!;
      if (fresh.status !== 'created' && fresh.status !== 'failed') return;
      this.db.sql
        .prepare("UPDATE payments SET status = 'paid', razorpay_payment_id = ?, paid_at = datetime('now'), failure_reason = NULL WHERE id = ?")
        .run(paymentId, p.id);
      const m = this.loyalty.merchant(p.merchant_id);
      const no = m.founding_no ?? ((this.db.sql.prepare('SELECT MAX(founding_no) AS n FROM merchants').get() as { n: number | null }).n ?? 0) + 1;
      if (p.kind === 'lifetime') {
        this.db.sql.prepare("UPDATE merchants SET plan = 'lifetime', plan_expires_at = NULL, founding_no = ? WHERE id = ?").run(no, m.id);
      } else {
        const from = m.plan === 'yearly' && m.plan_expires_at && m.plan_expires_at > sqlNow() ? m.plan_expires_at : sqlNow();
        this.db.sql
          .prepare("UPDATE merchants SET plan = 'yearly', plan_expires_at = datetime(?, '+1 year'), founding_no = ? WHERE id = ?")
          .run(from, no, m.id);
      }
      this.loyalty.log(m.id, 'shop', 'plan', `Became Founding Shop #${no} (${p.kind}, ₹${p.amount_paise / 100})`);
      this.event(p.id, m.id, 'activated', `Founding Shop #${no}, ${p.kind}, by the ${from}`);
    });
  }

  /** A lifetime shop, or a yearly one that is paid up or within its grace days, already has a seat. */
  private holdsSeat(m: MerchantRow) {
    return seatsTaken(this.db.sql, m.id) !== seatsTaken(this.db.sql);
  }

  /**
   * Refunds a paid payment in full through Razorpay (it reaches the shop in 5–7 working days). `toFree`: the shop also
   * goes back to the Free plan; its Founding number is kept for the record.
   */
  async refund(paymentId: number, toFree: boolean) {
    const p = this.db.sql.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId) as PaymentRow | undefined;
    if (!p) throw new BadRequestException('Payment not found');
    if (p.status !== 'paid' || !p.razorpay_payment_id) throw new BadRequestException('Only a paid payment can be refunded');
    const r = await razorpay<{ id?: string }>(`payments/${p.razorpay_payment_id}/refund`, { amount: p.amount_paise, speed: 'normal', notes: { reason: 'Refund from Regularhood admin' } });
    this.db.transaction(() => {
      this.db.sql.prepare("UPDATE payments SET status = 'refunded', razorpay_refund_id = ?, refunded_at = datetime('now') WHERE id = ?").run(r.id ?? null, p.id);
      if (toFree) this.db.sql.prepare("UPDATE merchants SET plan = 'free', plan_expires_at = NULL WHERE id = ?").run(p.merchant_id);
      this.loyalty.log(p.merchant_id, 'admin', 'plan', `Support refunded ₹${p.amount_paise / 100}${toFree ? ' and moved the shop to the Free plan' : ''}`);
      this.event(p.id, p.merchant_id, 'refunded', `${r.id ?? 'refund'}${toFree ? ', shop moved to Free' : ''}`);
    });
    return p;
  }

  private payment(orderId: string) {
    return this.db.sql.prepare('SELECT * FROM payments WHERE razorpay_order_id = ?').get(orderId) as PaymentRow | undefined;
  }
}

const sqlNow = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

type RazorpayPayment = { id: string; status: string; amount: number; method?: string; error_description?: string };
type WebhookPayload = {
  event?: string;
  payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number; method?: string; error_description?: string } } };
};

@Controller('api/billing')
export class BillingController {
  constructor(private readonly billing: Billing) {}

  @Get()
  @UseGuards(AuthGuard)
  status(@MerchantId() merchantId: number) {
    return this.billing.status(merchantId);
  }

  @Post('order')
  @UseGuards(AuthGuard)
  order(@MerchantId() merchantId: number, @Body() body: { kind?: string }) {
    return this.billing.order(merchantId, body?.kind);
  }

  @Post('verify')
  @UseGuards(AuthGuard)
  verify(@MerchantId() merchantId: number, @Body() body: { orderId?: string; paymentId?: string; signature?: string }) {
    return this.billing.verify(merchantId, body);
  }

  @Post('checkout-event')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  checkoutEvent(@MerchantId() merchantId: number, @Body() body: { orderId?: string; event?: string; reason?: string }) {
    return this.billing.checkoutEvent(merchantId, body);
  }

  /** Razorpay retries anything but a 2xx, so this always answers 200 and drops what it can't check. */
  @Post('webhook')
  @HttpCode(200)
  webhook(@Req() req: RawBodyRequest<Request>) {
    return this.billing.webhook(req.rawBody, req.headers['x-razorpay-signature'] as string | undefined, (req.body ?? {}) as WebhookPayload);
  }
}

/**
 * Admin → Plans: prices, places and limits; every Founding Shop and payment; refunds and extensions; and watching the
 * payments themselves: whether Razorpay is live and its webhooks arrive, how many checkouts end in a payment, each
 * payment's story, and a sync with Razorpay for one that didn't switch the plan on.
 */
@Controller('api/admin/plans')
@UseGuards(AdminGuard)
export class BillingAdminController {
  constructor(
    private readonly billing: Billing,
    private readonly db: Db,
    private readonly loyalty: LoyaltyService,
  ) {}

  @Get()
  overview() {
    const sql = this.db.sql;
    const settings = planSettings(sql);
    const money = sql
      .prepare(
        `SELECT COALESCE(SUM(amount_paise) FILTER (WHERE status = 'paid'), 0) AS paid,
           COALESCE(SUM(amount_paise) FILTER (WHERE status = 'paid' AND paid_at >= date('now', 'start of month')), 0) AS month,
           COALESCE(SUM(amount_paise) FILTER (WHERE status = 'refunded'), 0) AS refunded,
           COUNT(*) FILTER (WHERE status = 'created' AND created_at < datetime('now', '-1 hour')) AS abandoned,
           COUNT(*) FILTER (WHERE status = 'failed') AS failed
         FROM payments`,
      )
      .get();
    const shops = sql
      .prepare(
        `SELECT m.id, m.name, m.phone, m.plan, m.plan_expires_at, m.founding_no,
           (SELECT MIN(paid_at) FROM payments p WHERE p.merchant_id = m.id AND p.status = 'paid') AS since,
           (SELECT COALESCE(SUM(amount_paise), 0) FROM payments p WHERE p.merchant_id = m.id AND p.status = 'paid') AS paid,
           (SELECT COUNT(*) FROM customers c WHERE c.merchant_id = m.id) AS customers
         FROM merchants m WHERE m.plan IN ('lifetime', 'yearly') ORDER BY m.founding_no`,
      )
      .all() as { plan: string; plan_expires_at: string | null }[];
    const graceUntil = (exp: string) => Date.parse(`${exp.replace(' ', 'T')}Z`) + settings.graceDays * 86_400_000;
    const founding = shops.map((m) => ({
      ...m,
      state:
        m.plan === 'lifetime'
          ? 'lifetime'
          : effectivePlan(m) === 'yearly'
            ? 'active'
            : m.plan_expires_at && graceUntil(m.plan_expires_at) > Date.now()
              ? 'grace'
              : 'lapsed',
    }));
    const payments = sql
      .prepare(
        `SELECT p.id, p.merchant_id AS shopId, m.name, m.phone, p.kind, p.amount_paise, p.status, p.razorpay_order_id, p.razorpay_payment_id,
           p.razorpay_refund_id, p.failure_reason, p.created_at, p.paid_at, p.refunded_at
         FROM payments p JOIN merchants m ON m.id = p.merchant_id ORDER BY p.id DESC LIMIT 300`,
      )
      .all();
    // Free shops near their limit: the ones most likely to pay.
    const nearLimit = sql
      .prepare(
        `SELECT m.id, m.name, m.phone, COUNT(c.id) AS customers FROM merchants m JOIN customers c ON c.merchant_id = m.id
         WHERE m.suspended_at IS NULL AND (m.plan = 'free' OR (m.plan = 'yearly' AND m.plan_expires_at <= datetime('now')))
         GROUP BY m.id HAVING COUNT(c.id) >= ? ORDER BY customers DESC LIMIT 50`,
      )
      .all(Math.ceil(settings.freeCustomers * 0.7));
    return {
      settings,
      seats: { total: settings.seats, left: seatsLeft(sql), taken: seatsTaken(sql) },
      money,
      founding,
      payments,
      nearLimit,
      razorpay: { keyId: keyId(), test: keyId().startsWith('rzp_test_'), webhook: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET) },
      health: sql
        .prepare(
          `SELECT (SELECT MAX(created_at) FROM payment_events WHERE event = 'webhook') AS lastWebhook,
             COUNT(*) FILTER (WHERE event = 'webhook') AS webhooks,
             COUNT(*) FILTER (WHERE event = 'webhook_rejected') AS rejected,
             COUNT(*) FILTER (WHERE event = 'verify_failed') AS verifyFailed,
             COUNT(*) FILTER (WHERE event = 'amount_mismatch') AS mismatched
           FROM payment_events WHERE created_at >= datetime('now', '-7 days')`,
        )
        .get(),
      // The last 30 days of checkouts: how many were opened and how they ended.
      funnel: sql
        .prepare(
          `SELECT COUNT(*) AS started,
             COUNT(*) FILTER (WHERE status IN ('paid', 'refunded')) AS paid,
             COUNT(*) FILTER (WHERE status = 'failed') AS failed,
             COUNT(*) FILTER (WHERE status = 'created' AND EXISTS (SELECT 1 FROM payment_events e WHERE e.payment_id = p.id AND e.event = 'closed')) AS closed,
             COUNT(DISTINCT merchant_id) AS shops
           FROM payments p WHERE created_at >= datetime('now', '-30 days')`,
        )
        .get(),
      events: sql
        .prepare(
          `SELECT e.id, e.created_at, e.event, e.detail, e.payment_id AS paymentId, e.merchant_id AS shopId, m.name
           FROM payment_events e LEFT JOIN merchants m ON m.id = e.merchant_id ORDER BY e.id DESC LIMIT 100`,
        )
        .all(),
    };
  }

  /** One payment's story, oldest first. */
  @Get('payments/:id/events')
  paymentEvents(@Param('id', ParseIntPipe) id: number) {
    return this.db.sql.prepare('SELECT id, created_at, event, detail FROM payment_events WHERE payment_id = ? ORDER BY id').all(id);
  }

  /** Asks Razorpay what happened to this payment's order, and switches the plan on if it was paid. */
  @Post('payments/:id/sync')
  @HttpCode(200)
  async sync(@AdminId() adminId: number, @Param('id', ParseIntPipe) id: number) {
    const r = await this.billing.sync(id);
    const p = this.db.sql.prepare('SELECT merchant_id FROM payments WHERE id = ?').get(id) as { merchant_id: number };
    this.audit(adminId, p.merchant_id, 'plan', `Checked payment ${id} with Razorpay: ${r.attempts} attempt(s)${r.captured ? ', paid: plan switched on' : ''}`);
    return { result: r, overview: this.overview() };
  }

  /** The same for every unpaid payment of the last 3 days. */
  @Post('sync')
  @HttpCode(200)
  async syncRecent(@AdminId() adminId: number) {
    const r = await this.billing.syncRecent();
    if (r.fixed) this.audit(adminId, null, 'plan', `Checked ${r.checked} unpaid payments with Razorpay: ${r.fixed} were paid, plans switched on`);
    return { result: r, overview: this.overview() };
  }

  @Put('settings')
  save(@AdminId() adminId: number, @Body() body: Partial<PlanSettings>) {
    const { before, after } = savePlanSettings(this.db.sql, body ?? {});
    const label: Record<keyof PlanSettings, string> = {
      salesOpen: 'sales open',
      seats: 'places',
      lifetimePaise: 'lifetime ₹',
      yearlyPaise: 'yearly ₹',
      freeCustomers: 'free customers',
      graceDays: 'grace days',
    };
    const show = (k: keyof PlanSettings, v: number | boolean) => (k.endsWith('Paise') ? Number(v) / 100 : v);
    const changes = (Object.keys(after) as (keyof PlanSettings)[]).filter((k) => before[k] !== after[k]).map((k) => `${label[k]} ${show(k, before[k])} → ${show(k, after[k])}`);
    if (changes.length) this.audit(adminId, null, 'plans', `Plans: ${changes.join(', ')}`);
    return this.overview();
  }

  @Post('payments/:id/refund')
  @HttpCode(200)
  async refund(@AdminId() adminId: number, @Param('id', ParseIntPipe) id: number, @Body() body: { toFree?: boolean }) {
    const p = await this.billing.refund(id, body?.toFree !== false);
    this.audit(adminId, p.merchant_id, 'refund', `Refunded ₹${p.amount_paise / 100} (${p.kind}, ${p.razorpay_payment_id})${body?.toFree !== false ? ', shop moved to Free' : ''}`);
    return this.overview();
  }

  /** A year more for a yearly shop (from its end date, or from today if it ran out), e.g. as a goodwill gesture. */
  @Post('shops/:id/extend')
  @HttpCode(200)
  extend(@AdminId() adminId: number, @Param('id', ParseIntPipe) id: number) {
    const m = this.loyalty.merchant(id);
    if (m.plan !== 'yearly') throw new BadRequestException('Only a yearly Founding Shop can be extended');
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const from = m.plan_expires_at && m.plan_expires_at > now ? m.plan_expires_at : now;
    this.db.sql.prepare("UPDATE merchants SET plan_expires_at = datetime(?, '+1 year') WHERE id = ?").run(from, id);
    const to = (this.db.sql.prepare('SELECT plan_expires_at AS t FROM merchants WHERE id = ?').get(id) as { t: string }).t;
    this.audit(adminId, id, 'plan', `Gave ${m.name} one more year (until ${to.slice(0, 10)})`);
    this.loyalty.log(id, 'admin', 'plan', `Support added a year to the plan (until ${to.slice(0, 10)})`);
    return this.overview();
  }

  private audit(adminId: number, merchantId: number | null, action: string, detail: string) {
    this.db.sql.prepare('INSERT INTO admin_log (admin_id, merchant_id, action, detail) VALUES (?, ?, ?, ?)').run(adminId, merchantId, action, detail);
  }
}
