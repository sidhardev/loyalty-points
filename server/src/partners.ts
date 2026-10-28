import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AdminGuard, AdminId } from './admin';
import { Db, randomToken } from './db';
import { cleanCode, readPhone } from './growth';
import { effectivePlan } from './plans';

// Partners bring shops for a commission. Their link is the homepage with ?p=<code> (web/src/main.tsx tags the visit as
// utm_source=partner), so the shop that signs up from it gets merchants.partner_id; an admin can also give a shop to a
// partner by hand. A partner sees their shops and money on their own page (/partner/<token>, no password: the secret
// link is the login). What they earn:
//  - agents only: ₹50 for each shop of theirs that becomes active (30 different customers, visits on 7 different days)
//  - every paid payment of their shops, renewals too: 20%, or 30% once 6 or more of their shops have paid
// A payment's commission is held 7 days after it was paid, so a refund cancels it before it's sent. Refunded payments
// earn nothing. The admin sends the money by UPI (Admin → Partners) and marks each payout sent.

export const ACTIVE_CUSTOMERS = 30;
export const ACTIVE_DAYS = 7;
export const ACTIVE_BONUS = 5000; // paise
export const HOLD_DAYS = 7;
export const BASE_RATE = 20; // %
export const HIGH_RATE = 30; // %, from the shop after HIGH_AFTER paying shops
export const HIGH_AFTER = 5;

const SIGNUPS_PER_HOUR = 5; // per IP

export type PartnerKind = 'agent' | 'business';
export type PartnerRow = {
  id: number;
  code: string;
  token: string;
  kind: PartnerKind;
  name: string;
  business: string;
  phone: string;
  upi: string;
  city: string;
  created_at: string;
  disabled_at: string | null;
};

export type Earning = {
  kind: 'active' | 'payment';
  refId: number;
  shopId: number;
  shop: string;
  what: string;
  amount: number; // paise
  status: 'hold' | 'due' | 'sent';
  dueAt: string; // UTC, SQLite format
  sentAt: string | null;
};

/** A new partner's code: the first letters of their name and two digits (DIVU42), unused so far. */
function newCode(db: Db, name: string) {
  const base = (cleanCode(name).replace(/\d/g, '').slice(0, 4) || 'RH').padEnd(2, 'X');
  const taken = db.sql.prepare('SELECT 1 FROM partners WHERE code = ?');
  for (let i = 0; i < 50; i++) {
    const code = `${base}${10 + Math.floor(Math.random() * (i < 20 ? 90 : 900))}`;
    if (!taken.get(code)) return code;
  }
  return `${base}${randomToken(4).toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
}

type ShopUsage = { id: number; name: string; created_at: string; plan: string; plan_expires_at: string | null; suspended_at: string | null; customers: number; days: number };

/** A partner's shops, newest first, with how far each is from counting as active. */
function shopsOf(db: Db, partnerId: number) {
  const rows = db.sql
    .prepare(
      `SELECT m.id, m.name, m.created_at, m.plan, m.plan_expires_at, m.suspended_at,
         (SELECT COUNT(DISTINCT customer_id) FROM transactions t WHERE t.merchant_id = m.id AND t.type = 'earn' AND t.reversed = 0) AS customers,
         (SELECT COUNT(DISTINCT date(created_at)) FROM transactions t WHERE t.merchant_id = m.id AND t.type = 'earn' AND t.reversed = 0) AS days
       FROM merchants m WHERE m.partner_id = ? ORDER BY m.created_at DESC, m.id DESC`,
    )
    .all(partnerId) as ShopUsage[];
  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    joined: s.created_at,
    plan: effectivePlan(s),
    customers: s.customers,
    days: s.days,
    paused: Boolean(s.suspended_at),
    active: !s.suspended_at && s.customers >= ACTIVE_CUSTOMERS && s.days >= ACTIVE_DAYS,
  }));
}

/** Everything a partner has earned: sent, due now, or still on hold. Newest first. */
export function earningsOf(db: Db, partner: PartnerRow): Earning[] {
  const sent = new Map(
    (
      db.sql.prepare('SELECT kind, ref_id, amount_paise, sent_at FROM partner_payouts WHERE partner_id = ?').all(partner.id) as {
        kind: Earning['kind'];
        ref_id: number;
        amount_paise: number;
        sent_at: string;
      }[]
    ).map((p) => [`${p.kind}:${p.ref_id}`, p]),
  );
  const now = db.sql.prepare("SELECT datetime('now') AS t").get() as { t: string };
  const out: Earning[] = [];
  const add = (e: Omit<Earning, 'status' | 'sentAt'>) => {
    const s = sent.get(`${e.kind}:${e.refId}`);
    out.push({ ...e, amount: s?.amount_paise ?? e.amount, status: s ? 'sent' : e.dueAt <= now.t ? 'due' : 'hold', sentAt: s?.sent_at ?? null });
  };

  if (partner.kind === 'agent') {
    for (const s of shopsOf(db, partner.id)) {
      const wasSent = sent.has(`active:${s.id}`);
      if (s.active || wasSent) add({ kind: 'active', refId: s.id, shopId: s.id, shop: s.name, what: 'Active shop bonus', amount: ACTIVE_BONUS, dueAt: s.joined });
    }
  }

  // Paid payments in the order they were paid; the rate goes up once more than HIGH_AFTER different shops have paid.
  const payments = db.sql
    .prepare(
      `SELECT p.id, p.merchant_id, p.kind, p.amount_paise, p.paid_at, m.name, datetime(p.paid_at, '+${HOLD_DAYS} days') AS due_at
       FROM payments p JOIN merchants m ON m.id = p.merchant_id
       WHERE m.partner_id = ? AND p.status = 'paid' AND p.paid_at IS NOT NULL ORDER BY p.paid_at, p.id`,
    )
    .all(partner.id) as { id: number; merchant_id: number; kind: string; amount_paise: number; paid_at: string; name: string; due_at: string }[];
  const paying = new Set<number>();
  const seen = new Set<number>();
  for (const p of payments) {
    const renewal = seen.has(p.merchant_id);
    seen.add(p.merchant_id);
    paying.add(p.merchant_id);
    const rate = paying.size > HIGH_AFTER ? HIGH_RATE : BASE_RATE;
    add({
      kind: 'payment',
      refId: p.id,
      shopId: p.merchant_id,
      shop: p.name,
      what: `${rate}% of ₹${p.amount_paise / 100} ${p.kind === 'lifetime' ? 'lifetime' : 'yearly'}${renewal ? ' renewal' : ''}`,
      amount: Math.round((p.amount_paise * rate) / 10_000) * 100, // whole rupees: 20% of ₹1,499 is ₹300
      dueAt: p.due_at,
    });
  }
  return out.sort((a, b) => (a.dueAt < b.dueAt ? 1 : -1));
}

const sum = (list: Earning[], status: Earning['status']) => list.filter((e) => e.status === status).reduce((n, e) => n + e.amount, 0);

function summary(db: Db, p: PartnerRow) {
  const shops = shopsOf(db, p.id);
  const earnings = earningsOf(db, p);
  return {
    shops,
    earnings,
    totals: {
      shops: shops.length,
      active: shops.filter((s) => s.active).length,
      paying: shops.filter((s) => s.plan === 'lifetime' || s.plan === 'yearly').length,
      sent: sum(earnings, 'sent'),
      due: sum(earnings, 'due'),
      hold: sum(earnings, 'hold'),
    },
  };
}

const terms = (kind: PartnerKind) => ({
  activeBonus: kind === 'agent' ? ACTIVE_BONUS : 0,
  activeCustomers: ACTIVE_CUSTOMERS,
  activeDays: ACTIVE_DAYS,
  baseRate: BASE_RATE,
  highRate: HIGH_RATE,
  highAfter: HIGH_AFTER,
  holdDays: HOLD_DAYS,
});

function readPartner(body: Record<string, unknown> | undefined) {
  const text = (key: string, max: number) => (typeof body?.[key] === 'string' ? (body[key] as string).trim().slice(0, max) : '');
  const name = text('name', 80);
  if (!name) throw new BadRequestException('Enter your name');
  const phone = readPhone(body?.phone);
  if (!phone) throw new BadRequestException('Enter your WhatsApp number');
  const kind: PartnerKind = body?.kind === 'business' ? 'business' : 'agent';
  return { name, phone, kind, business: text('business', 100), upi: text('upi', 80), city: text('city', 60) };
}

/** Public: becoming a partner, and a partner's own page. */
@Controller('api/public/partners')
export class PartnersController {
  private readonly signups = new Map<string, number[]>();

  constructor(private readonly db: Db) {}

  @Post()
  signup(@Req() req: Request, @Body() body: Record<string, unknown>) {
    const ip = req.ip ?? '';
    const recent = (this.signups.get(ip) ?? []).filter((t) => t > Date.now() - 3_600_000);
    if (recent.length >= SIGNUPS_PER_HOUR) throw new HttpException('Too many sign-ups, try again later', HttpStatus.TOO_MANY_REQUESTS);
    const p = readPartner(body);
    if (this.db.sql.prepare('SELECT 1 FROM partners WHERE phone = ?').get(p.phone)) {
      throw new ConflictException('This WhatsApp number is already a partner. Message us on WhatsApp and we will send your link again.');
    }
    this.signups.set(ip, [...recent, Date.now()]);
    const token = randomToken(18);
    this.db.sql
      .prepare('INSERT INTO partners (code, token, kind, name, business, phone, upi, city) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(newCode(this.db, p.name), token, p.kind, p.name, p.business, p.phone, p.upi, p.city);
    return { token };
  }

  @Get(':token')
  page(@Param('token') token: string) {
    const p = this.db.sql.prepare('SELECT * FROM partners WHERE token = ?').get(token) as PartnerRow | undefined;
    if (!p) throw new NotFoundException('This link is not valid');
    const { shops, earnings, totals } = summary(this.db, p);
    return {
      partner: { name: p.name, code: p.code, kind: p.kind, business: p.business, upi: p.upi, stopped: Boolean(p.disabled_at) },
      terms: terms(p.kind),
      totals,
      // Partners see their shops' names and how far along they are, never the shops' customers.
      shops: shops.map(({ id: _id, ...s }) => s),
      earnings: earnings.map(({ refId: _r, shopId: _s, ...e }) => e),
    };
  }
}

/** Admin → Partners: every partner and their numbers, payouts to send, adding and stopping partners, giving a shop to one. */
@Controller('api/admin/partners')
@UseGuards(AdminGuard)
export class PartnersAdminController {
  constructor(private readonly db: Db) {}

  @Get()
  list() {
    const partners = this.db.sql.prepare('SELECT * FROM partners ORDER BY disabled_at IS NOT NULL, id DESC').all() as PartnerRow[];
    const due: (Earning & { partnerId: number; partner: string; phone: string; upi: string })[] = [];
    const rows = partners.map((p) => {
      const { totals, earnings, shops } = summary(this.db, p);
      for (const e of earnings) if (e.status === 'due') due.push({ ...e, partnerId: p.id, partner: p.name, phone: p.phone, upi: p.upi });
      return { ...p, totals, shops: shops.map((s) => ({ id: s.id, name: s.name, plan: s.plan, active: s.active, customers: s.customers, days: s.days })) };
    });
    const sent = this.db.sql
      .prepare(
        `SELECT o.kind, o.amount_paise, o.sent_at, p.name AS partner FROM partner_payouts o JOIN partners p ON p.id = o.partner_id
         ORDER BY o.id DESC LIMIT 30`,
      )
      .all();
    return { partners: rows, due, sent, terms: terms('agent') };
  }

  @Post()
  create(@AdminId() adminId: number, @Body() body: Record<string, unknown>) {
    const p = readPartner(body);
    if (this.db.sql.prepare('SELECT 1 FROM partners WHERE phone = ?').get(p.phone)) throw new ConflictException('A partner with this WhatsApp number already exists');
    const code = newCode(this.db, p.name);
    this.db.sql
      .prepare('INSERT INTO partners (code, token, kind, name, business, phone, upi, city) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(code, randomToken(18), p.kind, p.name, p.business, p.phone, p.upi, p.city);
    this.audit(adminId, null, `Added partner ${p.name} (${code}, ${p.kind})`);
    return { ok: true };
  }

  @Post(':id')
  update(@AdminId() adminId: number, @Param('id', ParseIntPipe) id: number, @Body() body: { upi?: string; stopped?: boolean }) {
    const p = this.partner(id);
    if (typeof body?.upi === 'string') this.db.sql.prepare('UPDATE partners SET upi = ? WHERE id = ?').run(body.upi.trim().slice(0, 80), id);
    if (typeof body?.stopped === 'boolean') {
      this.db.sql.prepare(`UPDATE partners SET disabled_at = ${body.stopped ? "datetime('now')" : 'NULL'} WHERE id = ?`).run(id);
      this.audit(adminId, null, `${body.stopped ? 'Stopped' : 'Restarted'} partner ${p.name} (${p.code})`);
    }
    return { ok: true };
  }

  /** Gives a shop to a partner (or takes it away with partnerId null), for shops that signed up without the link. */
  @Post('shops/:shopId')
  assign(@AdminId() adminId: number, @Param('shopId', ParseIntPipe) shopId: number, @Body() body: { partnerId?: number | null }) {
    const m = this.db.sql.prepare('SELECT id, name FROM merchants WHERE id = ?').get(shopId) as { id: number; name: string } | undefined;
    if (!m) throw new NotFoundException('Shop not found');
    const p = body?.partnerId ? this.partner(Number(body.partnerId)) : null;
    this.db.sql.prepare('UPDATE merchants SET partner_id = ? WHERE id = ?').run(p?.id ?? null, shopId);
    this.audit(adminId, shopId, p ? `Gave ${m.name} to partner ${p.name} (${p.code})` : `Took ${m.name} away from its partner`);
    return { ok: true };
  }

  @Post(':id/payouts')
  markSent(@AdminId() adminId: number, @Param('id', ParseIntPipe) id: number, @Body() body: { kind?: string; refId?: number }) {
    const p = this.partner(id);
    const e = earningsOf(this.db, p).find((x) => x.kind === body?.kind && x.refId === Number(body?.refId));
    if (!e || e.status !== 'due') throw new BadRequestException('This payout is not due, or was already marked sent');
    this.db.sql.prepare('INSERT INTO partner_payouts (partner_id, kind, ref_id, amount_paise, admin_id) VALUES (?, ?, ?, ?, ?)').run(p.id, e.kind, e.refId, e.amount, adminId);
    this.audit(adminId, e.shopId, `Sent partner ${p.name} ₹${e.amount / 100} on UPI: ${e.what} for ${e.shop}`);
    return { ok: true };
  }

  private partner(id: number) {
    const p = this.db.sql.prepare('SELECT * FROM partners WHERE id = ?').get(id) as PartnerRow | undefined;
    if (!p) throw new NotFoundException('Partner not found');
    return p;
  }

  private audit(adminId: number, merchantId: number | null, detail: string) {
    this.db.sql.prepare('INSERT INTO admin_log (admin_id, merchant_id, action, detail) VALUES (?, ?, ?, ?)').run(adminId, merchantId, 'partner', detail);
  }
}
