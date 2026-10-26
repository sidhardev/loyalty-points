import type { DatabaseSync } from 'node:sqlite';

// What each shop may do, by plan:
//  - free: up to FREE_CUSTOMERS customers (existing customers always keep getting visits and rewards)
//  - grandfathered: shops from before plans existed, no limit (the terms promised nothing free would start costing)
//  - lifetime / yearly: Founding Shop, paid through Razorpay (billing.ts), no limit. Only FOUNDING_SEATS shops can
//    hold one at a time. A yearly plan past plan_expires_at counts as free; its seat is kept for GRACE_DAYS so the
//    shop can renew.

export type Plan = 'free' | 'grandfathered' | 'lifetime' | 'yearly';
export type PlanFields = { plan: string; plan_expires_at: string | null };

export const FREE_CUSTOMERS = 50;
export const GRACE_DAYS = 30;
export const FOUNDING_SEATS = Number(process.env.FOUNDING_SEATS) || 100;
export const PRICES = {
  lifetime: Number(process.env.FOUNDING_LIFETIME_PAISE) || 149_900,
  yearly: Number(process.env.FOUNDING_YEARLY_PAISE) || 49_900,
} as const;

/** SQLite's "YYYY-MM-DD HH:MM:SS" (UTC) as a time. */
const at = (sqlTime: string) => Date.parse(`${sqlTime.replace(' ', 'T')}Z`);

/** The plan in force now: an expired yearly plan is free. */
export function effectivePlan(m: PlanFields): Plan {
  if (m.plan === 'yearly') return m.plan_expires_at && at(m.plan_expires_at) > Date.now() ? 'yearly' : 'free';
  return m.plan === 'lifetime' || m.plan === 'grandfathered' ? m.plan : 'free';
}

/** How many customers this shop may have; null = no limit. */
export const customerLimit = (m: PlanFields) => (effectivePlan(m) === 'free' ? FREE_CUSTOMERS : null);

/** Founding seats held: every lifetime shop, and yearly shops that are paid up or still within the grace days. */
export function seatsTaken(sql: DatabaseSync, exceptId = 0) {
  const row = sql
    .prepare(
      `SELECT COUNT(*) AS n FROM merchants WHERE id != ? AND (plan = 'lifetime'
         OR (plan = 'yearly' AND plan_expires_at > datetime('now', ?)))`,
    )
    .get(exceptId, `-${GRACE_DAYS} days`) as { n: number };
  return row.n;
}

export const seatsLeft = (sql: DatabaseSync) => Math.max(0, FOUNDING_SEATS - seatsTaken(sql));
