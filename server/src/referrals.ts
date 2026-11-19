import type { Db } from './db';

// Shops that bring shops. A shop's share link (/r/<join code>) and its customers' cards record new shops as its
// referrals (merchants.referred_by). There is no reward for it (the standee and ₹100 on UPI were dropped); the shop's
// Share sheet and Admin just see who came from whom, and how far each brought shop got.

export const ACTIVE_VISITS = 20;
export const ACTIVE_DAYS = 3;

export type InvitedShop = { name: string; joined: string; visits: number; days: number; active: boolean };

/** The shops this one brought, newest first, with their visits and the different days they added them on. */
export function invitedShops(db: Db, merchantId: number): InvitedShop[] {
  const rows = db.sql
    .prepare('SELECT id, name, created_at, suspended_at FROM merchants WHERE referred_by = ? ORDER BY created_at DESC')
    .all(merchantId) as { id: number; name: string; created_at: string; suspended_at: string | null }[];
  return rows.map((r) => {
    const u = db.sql
      .prepare(
        `SELECT COUNT(*) AS visits, COUNT(DISTINCT date(created_at)) AS days
         FROM transactions WHERE merchant_id = ? AND type = 'earn' AND reversed = 0`,
      )
      .get(r.id) as { visits: number; days: number };
    return { name: r.name, joined: r.created_at, ...u, active: !r.suspended_at && u.visits >= ACTIVE_VISITS && u.days >= ACTIVE_DAYS };
  });
}
