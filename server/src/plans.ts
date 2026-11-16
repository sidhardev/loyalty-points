import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { DatabaseSync } from 'node:sqlite';

// The two plans, and everything that differs between them. Change what a plan gives here, nowhere else.
//
//                         Free                         Pro
//   customers             up to `freeCustomers`        no limit
//   stamp card, counter, poster, status image, "Send card" on WhatsApp: both
//   winback               -                            "Not seen" list with one-tap WhatsApp reminders
//   review                -                            Google review link: button on the card, ask at the counter
//   export                -                            download customers and visit history (CSV)
//   logo                  -                            the shop's logo on every customer card
//
// Pro is paid through Razorpay (billing.ts) as one-time payments, so nothing is debited automatically:
//  - monthly / yearly: a month or a year from the payment (added to what is left). Once it ends the shop is Free again.
//  - lifetime: the Founding offer, only `seats` shops ever, while sales are open.
//  - grandfathered: shops from before plans existed keep unlimited customers (the terms promised nothing free would
//    start costing), but not the Pro features.
// Every WhatsApp message to a shop's customers is sent by the shop from its own phone; Regularhood's number never
// messages customers. Prices and numbers are set in Admin → Plans (app_settings 'plans'); .env gives the defaults.

export type Plan = 'free' | 'grandfathered' | 'monthly' | 'yearly' | 'lifetime';
export type PaidKind = 'monthly' | 'yearly' | 'lifetime';
export type PlanFields = { plan: string; plan_expires_at: string | null };

export const PRO_FEATURES = ['winback', 'review', 'export', 'logo'] as const;
export type ProFeature = (typeof PRO_FEATURES)[number];

/** What the shop sees when it tries a Pro feature on Free. */
const LOCKED: Record<ProFeature, string> = {
  winback: 'The “Not seen” list and reminders are part of Pro',
  review: 'Google reviews are part of Pro',
  export: 'Downloading your customers is part of Pro. Write to us if you need your list.',
  logo: 'Your logo on the card is part of Pro',
};

export type PlanSettings = {
  salesOpen: boolean; // the lifetime Founding offer is on sale (monthly and yearly always are)
  seats: number; // lifetime places, ever
  monthlyPaise: number;
  yearlyPaise: number;
  lifetimePaise: number;
  freeCustomers: number;
};

const DEFAULTS: PlanSettings = {
  salesOpen: true,
  seats: Number(process.env.FOUNDING_SEATS) || 100,
  monthlyPaise: Number(process.env.PRO_MONTHLY_PAISE) || 9_900,
  yearlyPaise: Number(process.env.PRO_YEARLY_PAISE) || 79_900,
  lifetimePaise: Number(process.env.FOUNDING_LIFETIME_PAISE) || 149_900,
  freeCustomers: 50,
};

export function planSettings(sql: DatabaseSync): PlanSettings {
  const row = sql.prepare("SELECT value FROM app_settings WHERE key = 'plans'").get() as { value: string } | undefined;
  const saved = row ? (JSON.parse(row.value) as Partial<PlanSettings>) : {};
  const s = { ...DEFAULTS };
  for (const k of Object.keys(DEFAULTS) as (keyof PlanSettings)[]) if (saved[k] !== undefined) (s[k] as unknown) = saved[k];
  return s;
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
  if (input.seats !== undefined) s.seats = whole(input.seats, 'Lifetime places', 0, 100_000);
  // Razorpay's smallest payment is ₹1.
  if (input.monthlyPaise !== undefined) s.monthlyPaise = whole(input.monthlyPaise, 'Monthly price (paise)', 100, 10_000_000);
  if (input.yearlyPaise !== undefined) s.yearlyPaise = whole(input.yearlyPaise, 'Yearly price (paise)', 100, 10_000_000);
  if (input.lifetimePaise !== undefined) s.lifetimePaise = whole(input.lifetimePaise, 'Lifetime price (paise)', 100, 10_000_000);
  if (input.freeCustomers !== undefined) s.freeCustomers = whole(input.freeCustomers, 'Free plan customers', 1, 100_000);
  sql.prepare("INSERT INTO app_settings (key, value) VALUES ('plans', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(JSON.stringify(s));
  return { before, after: s };
}

export const prices = (sql: DatabaseSync): Record<PaidKind, number> => {
  const s = planSettings(sql);
  return { monthly: s.monthlyPaise, yearly: s.yearlyPaise, lifetime: s.lifetimePaise };
};

/** SQLite's "YYYY-MM-DD HH:MM:SS" (UTC) as a time. */
const at = (sqlTime: string) => Date.parse(`${sqlTime.replace(' ', 'T')}Z`);

/** The plan in force now: a monthly or yearly plan past its end is Free. */
export function effectivePlan(m: PlanFields): Plan {
  if (m.plan === 'monthly' || m.plan === 'yearly') return m.plan_expires_at && at(m.plan_expires_at) > Date.now() ? m.plan : 'free';
  return m.plan === 'lifetime' || m.plan === 'grandfathered' ? m.plan : 'free';
}

export const isPro = (m: PlanFields) => ['monthly', 'yearly', 'lifetime'].includes(effectivePlan(m));

/** Throws the shop-facing "this is Pro" error unless the shop is on Pro. */
export function requirePro(m: PlanFields, feature: ProFeature) {
  if (!isPro(m)) throw new ForbiddenException(LOCKED[feature]);
}

/** How many customers this shop may have; null = no limit. */
export const customerLimit = (sql: DatabaseSync, m: PlanFields) => {
  const p = effectivePlan(m);
  return p === 'free' ? planSettings(sql).freeCustomers : null;
};

/** Lifetime places taken. */
export function seatsTaken(sql: DatabaseSync) {
  return (sql.prepare("SELECT COUNT(*) AS n FROM merchants WHERE plan = 'lifetime'").get() as { n: number }).n;
}

export const seatsLeft = (sql: DatabaseSync) => Math.max(0, planSettings(sql).seats - seatsTaken(sql));

/** The homepage, the Plan page and the reply bot all read the offer from here. */
export function offer(sql: DatabaseSync) {
  const s = planSettings(sql);
  return { open: s.salesOpen, total: s.seats, left: seatsLeft(sql), prices: prices(sql), freeCustomers: s.freeCustomers };
}
