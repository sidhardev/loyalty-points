import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  Injectable,
  Post,
  Req,
  ServiceUnavailableException,
  UseGuards,
  type RawBodyRequest,
} from '@nestjs/common';
import type { Request } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { AuthGuard, MerchantId } from './auth';
import { Db } from './db';
import { LoyaltyService, type MerchantRow } from './loyalty.service';
import { customerLimit, effectivePlan, FOUNDING_SEATS, PRICES, seatsLeft, seatsTaken } from './plans';

// Founding Shop payments through Razorpay Standard Checkout: the shop's page asks for an order, Razorpay's checkout
// takes the money (UPI first), and the plan is switched on from either the checkout's signed answer (/verify) or
// Razorpay's webhook, whichever arrives first. Both are one-time payments; a yearly plan is renewed by paying again.
// Kept on its own so other payment providers can be added next to it.
//
// Settings (server/.env, deploy/.env): RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET.

type Kind = keyof typeof PRICES;
type PaymentRow = { id: number; merchant_id: number; kind: Kind; amount_paise: number; razorpay_order_id: string; status: string };

const keyId = () => process.env.RAZORPAY_KEY_ID ?? '';
const keySecret = () => process.env.RAZORPAY_KEY_SECRET ?? '';

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
      limit: customerLimit(m),
      seats: { total: FOUNDING_SEATS, left: seatsLeft(this.db.sql) },
      prices: PRICES,
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
    if (!this.holdsSeat(m) && seatsLeft(this.db.sql) === 0) throw new ConflictException('All Founding Shop places are taken');

    const amount = PRICES[kind];
    let res: globalThis.Response;
    try {
      res = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: { authorization: `Basic ${Buffer.from(`${keyId()}:${keySecret()}`).toString('base64')}`, 'content-type': 'application/json' },
        body: JSON.stringify({ amount, currency: 'INR', receipt: `shop-${merchantId}-${Date.now()}`, notes: { merchant_id: String(merchantId), kind } }),
        signal: AbortSignal.timeout(20_000),
      });
    } catch (error) {
      throw new ServiceUnavailableException(`Could not reach Razorpay: ${(error as Error).message}`);
    }
    const body = (await res.json().catch(() => ({}))) as { id?: string; error?: { description?: string } };
    if (!res.ok || !body.id) throw new ServiceUnavailableException(`Razorpay ${res.status}: ${body.error?.description || 'could not start the payment'}`);
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
