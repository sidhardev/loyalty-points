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
// Settings (server/.env, deploy/.env): RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET.

type Kind = 'lifetime' | 'yearly';
type PaymentRow = {
  id: number;
  merchant_id: number;
  kind: Kind;
  amount_paise: number;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  status: string;
};

const keyId = () => process.env.RAZORPAY_KEY_ID ?? '';
const keySecret = () => process.env.RAZORPAY_KEY_SECRET ?? '';

/** Overridable only for local testing against a stand-in server. */
const API_BASE = (process.env.RAZORPAY_API_BASE || 'https://api.razorpay.com').replace(/\/$/, '');

/** One call to Razorpay's API with our key; its JSON answer, or a readable error. */
async function razorpay<T>(path: string, body: object): Promise<T> {
  let res: globalThis.Response;
  try {
    res = await fetch(`${API_BASE}/v1/${path}`, {
      method: 'POST',
      headers: { authorization: `Basic ${Buffer.from(`${keyId()}:${keySecret()}`).toString('base64')}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
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
    this.db.sql
      .prepare('INSERT INTO payments (merchant_id, kind, amount_paise, razorpay_order_id) VALUES (?, ?, ?, ?)')
      .run(merchantId, kind, amount, body.id);
    return { orderId: body.id, amount, keyId: keyId(), shop: m.name, phone: m.phone ?? '', email: m.email ?? '' };
  }

  /** The checkout's answer, signed with our key secret. */
  verify(merchantId: number, b: { orderId?: string; paymentId?: string; signature?: string }) {
    const orderId = String(b?.orderId ?? '');
    const paymentId = String(b?.paymentId ?? '');
    if (!signedBy(keySecret(), `${orderId}|${paymentId}`, b?.signature)) throw new BadRequestException('This payment could not be confirmed');
    const p = this.payment(orderId);
    if (!p || p.merchant_id !== merchantId) throw new BadRequestException('This payment is not for your shop');
    this.activate(p, paymentId);
    return this.status(merchantId);
  }

  /** Razorpay's webhook: payment.captured or order.paid switches the plan on, if /verify hasn't already. */
  webhook(raw: Buffer | undefined, signature: string | undefined, payload: WebhookPayload) {
    if (!raw || !signedBy(process.env.RAZORPAY_WEBHOOK_SECRET ?? '', raw, signature)) return 'ignored';
    if (payload.event !== 'payment.captured' && payload.event !== 'order.paid') return 'ok';
    const pay = payload.payload?.payment?.entity;
    const p = pay?.order_id ? this.payment(pay.order_id) : undefined;
    if (!p || !pay?.id) return 'ok';
    if (pay.amount !== p.amount_paise) {
      console.error(`Razorpay paid ${pay.amount} for order ${p.razorpay_order_id}, expected ${p.amount_paise}`);
      return 'ok';
    }
    this.activate(p, pay.id);
    return 'ok';
  }

  /**
   * Switches the plan on, once per order. Lifetime has no end; a year is added to whatever is left of the current one.
   * A payment that arrives after the last seat went is still honoured: the shop paid.
   */
  private activate(p: PaymentRow, paymentId: string) {
    this.db.transaction(() => {
      const fresh = this.payment(p.razorpay_order_id)!;
      if (fresh.status !== 'created') return;
      this.db.sql
        .prepare("UPDATE payments SET status = 'paid', razorpay_payment_id = ?, paid_at = datetime('now') WHERE id = ?")
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
    });
    return p;
  }

  private payment(orderId: string) {
    return this.db.sql.prepare('SELECT * FROM payments WHERE razorpay_order_id = ?').get(orderId) as PaymentRow | undefined;
  }
}

const sqlNow = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

type WebhookPayload = { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number } } } };

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

  /** Razorpay retries anything but a 2xx, so this always answers 200 and drops what it can't check. */
  @Post('webhook')
  @HttpCode(200)
  webhook(@Req() req: RawBodyRequest<Request>) {
    return this.billing.webhook(req.rawBody, req.headers['x-razorpay-signature'] as string | undefined, (req.body ?? {}) as WebhookPayload);
  }
}

/** Admin → Plans: prices, places and limits; every Founding Shop and payment; refunds and extensions. */
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
           COUNT(*) FILTER (WHERE status = 'created' AND created_at < datetime('now', '-1 hour')) AS abandoned
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
        `SELECT p.id, p.merchant_id AS shopId, m.name, p.kind, p.amount_paise, p.status, p.razorpay_order_id, p.razorpay_payment_id,
           p.razorpay_refund_id, p.created_at, p.paid_at, p.refunded_at
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
    };
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
