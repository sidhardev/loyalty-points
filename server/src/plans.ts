import { BadRequestException } from '@nestjs/common';
import type { DatabaseSync } from 'node:sqlite';

// What each shop may do, by plan:
//  - free: up to `freeCustomers` customers (existing customers always keep getting visits and rewards)
//  - grandfathered: shops from before plans existed, no limit (the terms promised nothing free would start costing)
//  - lifetime / yearly: Founding Shop, paid through Razorpay (billing.ts), no limit. Only `seats` shops can hold one at
//    a time. A yearly plan past plan_expires_at counts as free; its seat is kept for `graceDays` so the shop can renew.
// The numbers and prices are set in Admin → Plans (app_settings 'plans'); the server's .env gives the defaults.

export type Plan = 'free' | 'grandfathered' | 'lifetime' | 'yearly';
export type PlanFields = { plan: string; plan_expires_at: string | null };

export type PlanSettings = {
  salesOpen: boolean; // new shops can buy Founding Shop (renewals always can)
  seats: number;
  lifetimePaise: number;
  yearlyPaise: number;
  freeCustomers: number;
  graceDays: number;
};

const DEFAULTS: PlanSettings = {
  salesOpen: true,
  seats: Number(process.env.FOUNDING_SEATS) || 100,
  lifetimePaise: Number(process.env.FOUNDING_LIFETIME_PAISE) || 149_900,
  yearlyPaise: Number(process.env.FOUNDING_YEARLY_PAISE) || 49_900,
  freeCustomers: 50,
  graceDays: 30,
};

export function planSettings(sql: DatabaseSync): PlanSettings {
  const row = sql.prepare("SELECT value FROM app_settings WHERE key = 'plans'").get() as { value: string } | undefined;
  return { ...DEFAULTS, ...(row ? (JSON.parse(row.value) as Partial<PlanSettings>) : {}) };
}

/** Checks and saves what Admin → Plans changed; returns the settings before and after. */
export function savePlanSettings(sql: DatabaseSync, input: Partial<PlanSettings>) {
  const before = planSettings(sql);
  const s = { ...before };
  const whole = (v: unknown, label: string, min: number, max: number) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > max) throw new BadRequestException(`${label} must be a whole number from ${min} to ${max}`);
    return n;
  };
  if (input.salesOpen !== undefined) s.salesOpen = Boolean(input.salesOpen);
  if (input.seats !== undefined) s.seats = whole(input.seats, 'Founding places', 0, 100_000);
  // Razorpay's smallest payment is ₹1.
  if (input.lifetimePaise !== undefined) s.lifetimePaise = whole(input.lifetimePaise, 'Lifetime price (paise)', 100, 10_000_000);
  if (input.yearlyPaise !== undefined) s.yearlyPaise = whole(input.yearlyPaise, 'Yearly price (paise)', 100, 10_000_000);
  if (input.freeCustomers !== undefined) s.freeCustomers = whole(input.freeCustomers, 'Free plan customers', 1, 100_000);
  if (input.graceDays !== undefined) s.graceDays = whole(input.graceDays, 'Grace days', 0, 365);
  sql.prepare("INSERT INTO app_settings (key, value) VALUES ('plans', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(JSON.stringify(s));
  return { before, after: s };
}

export const prices = (sql: DatabaseSync) => {
  const s = planSettings(sql);
  return { lifetime: s.lifetimePaise, yearly: s.yearlyPaise };
};

/** SQLite's "YYYY-MM-DD HH:MM:SS" (UTC) as a time. */
const at = (sqlTime: string) => Date.parse(`${sqlTime.replace(' ', 'T')}Z`);

/** The plan in force now: an expired yearly plan is free. */
export function effectivePlan(m: PlanFields): Plan {
  if (m.plan === 'yearly') return m.plan_expires_at && at(m.plan_expires_at) > Date.now() ? 'yearly' : 'free';
  return m.plan === 'lifetime' || m.plan === 'grandfathered' ? m.plan : 'free';
}

/** Founding Shop extras (automatic WhatsApp, Google review requests) are for paying shops only, not grandfathered ones. */
export const isFounding = (m: PlanFields) => ['lifetime', 'yearly'].includes(effectivePlan(m));

/** How many customers this shop may have; null = no limit. */
export const customerLimit = (sql: DatabaseSync, m: PlanFields) => (effectivePlan(m) === 'free' ? planSettings(sql).freeCustomers : null);

/** Founding seats held: every lifetime shop, and yearly shops that are paid up or still within the grace days. */
export function seatsTaken(sql: DatabaseSync, exceptId = 0) {
  const row = sql
    .prepare(
      `SELECT COUNT(*) AS n FROM merchants WHERE id != ? AND (plan = 'lifetime'
         OR (plan = 'yearly' AND plan_expires_at > datetime('now', ?)))`,
    )
    .get(exceptId, `-${planSettings(sql).graceDays} days`) as { n: number };
  return row.n;
}

export const seatsLeft = (sql: DatabaseSync) => Math.max(0, planSettings(sql).seats - seatsTaken(sql));

/** The homepage, the Plan page and the counter's upgrade prompts all read the offer from here. */
export function offer(sql: DatabaseSync) {
  const s = planSettings(sql);
  return { open: s.salesOpen, total: s.seats, left: seatsLeft(sql), prices: prices(sql), freeCustomers: s.freeCustomers };
}
