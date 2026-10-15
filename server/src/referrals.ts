import type { Db } from './db';

// Shops that bring shops. A shop's share link (/r/<join code>) and its customers' cards record new shops as its
// referrals (merchants.referred_by). A referred shop counts once it really uses Regularhood, so made-up shops earn
// nothing:
//  - a counter standee: once, for the shop's first active referral, and for a referred shop that becomes active itself
//  - ₹100 on UPI: for every 3 active referrals
// The admin sends the rewards by hand (Admin → Growth) and marks each sent in referral_rewards.

export const ACTIVE_VISITS = 20;
export const ACTIVE_DAYS = 3;
export const UPI_EVERY = 3;
export const UPI_AMOUNT = 100;

export type RewardKind = 'standee' | 'upi';
export type InvitedShop = { name: string; joined: string; visits: number; days: number; active: boolean };

type Usage = { visits: number; days: number };

const isActive = (u: Usage) => u.visits >= ACTIVE_VISITS && u.days >= ACTIVE_DAYS;

/** A shop's visits added and the different days they were added on. */
function usage(db: Db, merchantId: number): Usage {
  return db.sql
    .prepare(
      `SELECT COUNT(*) AS visits, COUNT(DISTINCT date(created_at)) AS days
       FROM transactions WHERE merchant_id = ? AND type = 'earn' AND reversed = 0`,
    )
    .get(merchantId) as Usage;
}

/** The shops this one brought, newest first, with how far each is from counting (paused shops never count). */
export function invitedShops(db: Db, merchantId: number): InvitedShop[] {
  const rows = db.sql
    .prepare('SELECT id, name, created_at, suspended_at FROM merchants WHERE referred_by = ? ORDER BY created_at DESC')
    .all(merchantId) as { id: number; name: string; created_at: string; suspended_at: string | null }[];
  return rows.map((r) => {
    const u = usage(db, r.id);
    return { name: r.name, joined: r.created_at, ...u, active: !r.suspended_at && isActive(u) };
  });
}

/** How many of each reward the shop has earned, and how many were sent. */
export function rewardsFor(db: Db, merchantId: number) {
  const m = db.sql.prepare('SELECT referred_by, suspended_at FROM merchants WHERE id = ?').get(merchantId) as
    | { referred_by: number | null; suspended_at: string | null }
    | undefined;
  const invited = invitedShops(db, merchantId);
  const active = invited.filter((s) => s.active).length;
  const own = usage(db, merchantId);
  const ownActive = Boolean(m?.referred_by) && !m?.suspended_at && isActive(own);
  const sent = db.sql.prepare('SELECT kind, COUNT(*) AS n FROM referral_rewards WHERE merchant_id = ? GROUP BY kind').all(merchantId) as {
    kind: RewardKind;
    n: number;
  }[];
  const sentOf = (kind: RewardKind) => sent.find((s) => s.kind === kind)?.n ?? 0;
  return {
    invited,
    active,
    /** This shop came from another shop's link: it gets a standee too once it's active. */
    referred: Boolean(m?.referred_by),
    own,
    standee: { earned: active > 0 || ownActive ? 1 : 0, sent: sentOf('standee') },
    upi: { earned: Math.floor(active / UPI_EVERY), sent: sentOf('upi') },
  };
}

/** Rewards earned but not sent yet, across every shop. */
export function rewardsDue(db: Db) {
  const ids = db.sql
    .prepare(
      `SELECT id FROM merchants WHERE suspended_at IS NULL AND (referred_by IS NOT NULL OR id IN (SELECT referred_by FROM merchants WHERE referred_by IS NOT NULL))`,
    )
    .all() as { id: number }[];
  const shop = db.sql.prepare('SELECT id, name, phone FROM merchants WHERE id = ?');
  const due: { shopId: number; name: string; phone: string | null; kind: RewardKind; n: number; active: number; selfActive: boolean }[] = [];
  for (const { id } of ids) {
    const r = rewardsFor(db, id);
    const m = shop.get(id) as { id: number; name: string; phone: string | null };
    for (const kind of ['standee', 'upi'] as const)
      for (let n = r[kind].sent + 1; n <= r[kind].earned; n++)
        due.push({ shopId: id, name: m.name, phone: m.phone, kind, n, active: r.active, selfActive: r.referred && isActive(r.own) });
  }
  return due;
}
