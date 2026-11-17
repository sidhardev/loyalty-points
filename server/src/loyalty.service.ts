import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Db, randomToken } from './db';
import { country, nationalDigits } from './countries';
import { customerLimit } from './plans';

// The stamp card: every visit is one stamp, and every `visits_needed` stamps the customer gets the shop's one reward.
// A customer is just a phone number. customers.points holds their stamps (visits since their last reward).
// In `transactions` a visit is an 'earn' of +1 with no amount, a reward a 'redeem' of -visits_needed with no reward_id,
// and an undo an 'adjust' that reverses one of them. Older rows (with amounts and points) are from the points system.

export type MerchantRow = {
  id: number;
  name: string;
  email: string | null; // null: signed up with a WhatsApp number only
  password_hash: string;
  google_sub: string | null;
  points_per_100: number;
  join_code: string;
  welcome_bonus: number;
  birthday_bonus: number;
  gold_threshold: number;
  gold_multiplier: number;
  inactive_days: number;
  max_visits_per_day: number;
  large_bill: number;
  visits_needed: number;
  reward_name: string;
  welcome_stamps: number; // extra stamps on a new customer's first visit
  created_at: string;
  last_seen_at: string | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  phone: string | null;
  signup_source: string;
  signup_medium: string;
  signup_campaign: string;
  signup_ref: string;
  signup_landing: string;
  referred_by: number | null;
  plan: string; // see plans.ts
  plan_expires_at: string | null;
  founding_no: number | null;
  review_url: string; // Google review link (Pro)
  msg_lang: string;
  logo_at: string | null; // the shop has a logo (Pro), last changed then
  country: string; // countries.ts
};

export type Actor = 'shop' | 'customer' | 'admin';

export const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export type CustomerRow = {
  id: number;
  merchant_id: number;
  name: string; // '' for customers added by phone number only
  phone: string;
  points: number; // stamps
  last_visit: string | null;
  wallet_token: string;
  created_at: string;
};

type TxRow = { id: number; customer_id: number; type: string; points: number; amount: number | null; reward_id: number | null; reversal_of: number | null; reversed: number; created_at: string };

export const cleanPhone = (phone: unknown) => String(phone ?? '').replace(/[\s()-]/g, '');

/** "+05:30"-style SQLite modifier for the shop's time zone (`tz` = minutes ahead of UTC, 330 for India). */
export const tzShift = (tz: unknown) => {
  const minutes = Math.min(840, Math.max(-720, Number(tz ?? 330) || 0));
  return `${minutes >= 0 ? '+' : ''}${minutes} minutes`;
};

@Injectable()
export class LoyaltyService {
  constructor(private readonly db: Db) {}

  merchant(id: number) {
    const m = this.db.sql.prepare('SELECT * FROM merchants WHERE id = ?').get(id) as MerchantRow | undefined;
    if (!m) throw new NotFoundException('Shop not found');
    return m;
  }

  customer(merchantId: number, id: number) {
    const c = this.db.sql
      .prepare('SELECT * FROM customers WHERE id = ? AND merchant_id = ?')
      .get(id, merchantId) as CustomerRow | undefined;
    if (!c) throw new NotFoundException('Customer not found');
    return c;
  }

  customerCount(merchantId: number) {
    return (this.db.sql.prepare('SELECT COUNT(*) AS n FROM customers WHERE merchant_id = ?').get(merchantId) as { n: number }).n;
  }

  /**
   * The customer with this number: the same number written differently (+971, a leading 0, spaces) is the same
   * customer, so it's matched on the number's own digits in the shop's country (10 in India, 9 in the UAE…).
   */
  byNumber(merchantId: number, phone: string) {
    const c = country(this.merchant(merchantId).country);
    const digits = nationalDigits(phone, c) || phone.replace(/\D/g, '');
    return this.db.sql
      .prepare("SELECT * FROM customers WHERE merchant_id = ? AND substr(replace(replace(phone, '+', ''), ' ', ''), ?) = ?")
      .get(merchantId, -c.nsn, digits.slice(-c.nsn)) as CustomerRow | undefined;
  }

  /** A customer's number as typed at the counter, checked for the shop's country: its own digits (no code, no 0). */
  customerPhone(merchantId: number, input: unknown) {
    const c = country(this.merchant(merchantId).country);
    const digits = nationalDigits(cleanPhone(input), c);
    if (!digits) throw new BadRequestException(`Enter the ${c.nsn}-digit phone number`);
    return digits;
  }

  /** Shape sent to the website (never includes other shops' data). */
  view(m: MerchantRow, c: CustomerRow) {
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      stamps: c.points,
      rewardDue: c.points >= m.visits_needed,
      lastVisit: c.last_visit,
      walletToken: c.wallet_token,
      createdAt: c.created_at,
    };
  }

  /** Customers whose number starts with these digits (at least 4), for the keypad's suggestions. */
  suggest(merchantId: number, digits: string) {
    const m = this.merchant(merchantId);
    const c = country(m.country);
    // A leading 0 (how UAE and UK numbers are often typed) isn't part of the number.
    const d = String(digits ?? '').replace(/\D/g, '').replace(/^0/, '').slice(0, c.nsn);
    if (d.length < 4) return [];
    const rows = this.db.sql
      .prepare(
        `SELECT * FROM customers WHERE merchant_id = ? AND substr(replace(replace(phone, '+', ''), ' ', ''), ?) LIKE ?
         ORDER BY COALESCE(last_visit, created_at) DESC LIMIT 4`,
      )
      .all(merchantId, -c.nsn, `${d}%`) as CustomerRow[];
    return rows.map((c) => this.view(m, c));
  }

  /**
   * One visit for this phone number: a stamp, and the reward when the stamps reach the shop's number. A new number
   * becomes a customer on the spot. A number counts once per day (in the shop's time zone); a second try that day
   * adds nothing and says so, but still shows whether a reward is due.
   */
  addVisit(merchantId: number, phoneInput: unknown, tz: unknown) {
    const phone = this.customerPhone(merchantId, phoneInput);
    const shift = tzShift(tz);

    // A new number on the Free plan needs room under its customer limit (checked outside the transaction, so the
    // activity log keeps the refusal).
    const limit = customerLimit(this.db.sql, this.merchant(merchantId));
    if (limit !== null && !this.byNumber(merchantId, phone) && this.customerCount(merchantId) >= limit) {
      this.log(merchantId, 'shop', 'limit_blocked', `New customer not added: the Free plan keeps up to ${limit} customers`);
      throw new ForbiddenException({ statusCode: 403, code: 'customer_limit', limit, message: 'The Free plan’s customer limit is reached. Get Pro to add more.' });
    }

    return this.db.transaction(() => {
      const m = this.merchant(merchantId);
      let c = this.byNumber(merchantId, phone);
      const isNew = !c;
      if (!c) {
        const { lastInsertRowid } = this.db.sql
          .prepare("INSERT INTO customers (merchant_id, name, phone, wallet_token, card_code) VALUES (?, '', ?, ?, ?)")
          .run(merchantId, phone, randomToken(), randomToken(9));
        c = this.customer(merchantId, Number(lastInsertRowid));
      }

      const today = this.db.sql
        .prepare(
          `SELECT id FROM transactions WHERE customer_id = ? AND type = 'earn' AND reversed = 0
             AND date(created_at, ?) = date('now', ?) LIMIT 1`,
        )
        .get(c.id, shift, shift);
      if (today) return { already: true, isNew, welcome: 0, visitId: null, customer: this.view(m, c) };

      const visitId = this.add(merchantId, c.id, 'earn', 1);
      // A new customer's card starts with the shop's welcome stamps, kept as a 'bonus' so it never counts as a visit.
      // Always at least one real visit short of the reward (settings keep it so; this is a second guard).
      const welcome = isNew ? Math.max(0, Math.min(m.welcome_stamps, m.visits_needed - 2)) : 0;
      if (welcome) this.add(merchantId, c.id, 'bonus', welcome, 'Welcome stamp');
      this.db.sql.prepare("UPDATE customers SET last_visit = datetime('now') WHERE id = ?").run(c.id);
      return { already: false, isNew, welcome, visitId, customer: this.view(m, this.customer(merchantId, c.id)) };
    });
  }

  /** The shop handed over the reward: the stamps start again (any extra visits carry over). */
  giveReward(merchantId: number, customerId: number) {
    return this.db.transaction(() => {
      const m = this.merchant(merchantId);
      const c = this.customer(merchantId, customerId);
      if (c.points < m.visits_needed) throw new BadRequestException(`Not yet — ${c.points} of ${m.visits_needed} visits`);
      const rewardId = this.add(merchantId, c.id, 'redeem', -m.visits_needed, m.reward_name || 'Reward');
      this.log(merchantId, 'shop', 'redeem', `Gave ${m.reward_name || 'the reward'}`, this.who(c));
      return { rewardId, customer: this.view(m, this.customer(merchantId, c.id)) };
    });
  }

  /** Takes back one visit or one reward (points-system entries from before the stamp card can't be undone). */
  undo(merchantId: number, txId: number) {
    return this.db.transaction(() => {
      const tx = this.db.sql.prepare('SELECT * FROM transactions WHERE id = ? AND merchant_id = ?').get(txId, merchantId) as TxRow | undefined;
      if (!tx) throw new NotFoundException('Entry not found');
      if (tx.reversed) throw new BadRequestException('This was already undone');
      const visit = tx.type === 'earn' && tx.amount === null && tx.points === 1;
      const reward = tx.type === 'redeem' && tx.reward_id === null;
      if (!visit && !reward) throw new BadRequestException('Only visits and rewards can be undone');

      const c = this.customer(merchantId, tx.customer_id);
      if (c.points - tx.points < 0) throw new BadRequestException('The reward for this visit was already given — undo the reward first');
      this.add(merchantId, c.id, 'adjust', -tx.points, `Undo ${visit ? 'visit' : 'reward'}`, tx.id);
      this.db.sql.prepare('UPDATE transactions SET reversed = 1 WHERE id = ?').run(tx.id);
      if (visit) {
        const { last } = this.db.sql
          .prepare("SELECT MAX(created_at) AS last FROM transactions WHERE customer_id = ? AND type = 'earn' AND reversed = 0")
          .get(c.id) as { last: string | null };
        this.db.sql.prepare('UPDATE customers SET last_visit = ? WHERE id = ?').run(last, c.id);
      }
      this.log(merchantId, 'shop', 'undo', visit ? 'Undid a visit' : 'Undid a reward', this.who(c));
      return this.view(this.merchant(merchantId), this.customer(merchantId, c.id));
    });
  }

  /** Who changed what, for the shop's activity log. */
  log(merchantId: number, actor: Actor, action: string, detail: string, customer?: { id: number; name: string } | null) {
    this.db.sql
      .prepare('INSERT INTO activity (merchant_id, actor, action, detail, customer_id, customer_name) VALUES (?, ?, ?, ?, ?, ?)')
      .run(merchantId, actor, action, detail.slice(0, 300), customer?.id ?? null, customer?.name ?? null);
  }

  /** How the activity log names a customer: their name if the shop ever had one, else their number. */
  who(c: Pick<CustomerRow, 'id' | 'name' | 'phone'>) {
    return { id: c.id, name: c.name || c.phone };
  }

  /**
   * Returning customers over 30 days, ending `daysAgo` days ago. A return visit is any visit after a customer's first;
   * "won back" is a return after the shop's inactive period. Old points-system bills count as visits too.
   */
  comeback(m: { id: number; inactive_days: number }, daysAgo: number) {
    const range = { m: m.id, from: `-${daysAgo + 30} days`, to: `-${daysAgo} days`, gap: m.inactive_days };
    const visits = this.db.sql
      .prepare(
        `WITH v AS (
           SELECT customer_id, created_at,
                  LAG(created_at) OVER (PARTITION BY customer_id ORDER BY created_at, id) AS prev
           FROM transactions WHERE merchant_id = :m AND type = 'earn' AND reversed = 0
         )
         SELECT COUNT(DISTINCT CASE WHEN prev IS NOT NULL THEN customer_id END) AS customers,
                COALESCE(SUM(prev IS NOT NULL), 0) AS visits,
                COUNT(DISTINCT CASE WHEN julianday(created_at) - julianday(prev) >= :gap THEN customer_id END) AS wonBack,
                COUNT(*) AS allVisits
         FROM v WHERE created_at >= datetime('now', :from) AND created_at < datetime('now', :to)`,
      )
      .get(range) as { customers: number; visits: number; wonBack: number; allVisits: number };
    const { rewards } = this.db.sql
      .prepare(
        `SELECT COUNT(*) AS rewards FROM transactions WHERE merchant_id = :m AND type = 'redeem' AND reversed = 0
           AND created_at >= datetime('now', :from) AND created_at < datetime('now', :to)`,
      )
      .get({ m: m.id, from: range.from, to: range.to }) as { rewards: number };
    return { ...visits, rewards };
  }

  /** Writes one entry and moves the customer's stamps. Returns the entry's id. */
  private add(merchantId: number, customerId: number, type: 'earn' | 'redeem' | 'bonus' | 'adjust', points: number, note: string | null = null, reversalOf?: number) {
    const { lastInsertRowid } = this.db.sql
      .prepare('INSERT INTO transactions (merchant_id, customer_id, type, points, note, reversal_of) VALUES (?, ?, ?, ?, ?, ?)')
      .run(merchantId, customerId, type, points, note, reversalOf ?? null);
    this.db.sql.prepare('UPDATE customers SET points = points + ? WHERE id = ?').run(points, customerId);
    return Number(lastInsertRowid);
  }
}
