import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { Db, randomToken } from './db';

// All point rules live here, shared by the shop's screens and the public join page.
// Points in `transactions` are signed: + earned/bonus, - redeemed, ± adjustments and undos.

export type MerchantRow = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  points_per_100: number;
  join_code: string;
  welcome_bonus: number;
  birthday_bonus: number;
  gold_threshold: number;
  gold_multiplier: number;
  inactive_days: number;
};

export type CustomerRow = {
  id: number;
  merchant_id: number;
  name: string;
  phone: string;
  points: number;
  lifetime_points: number;
  birthday: string | null; // MM-DD
  birthday_bonus_year: number | null;
  last_visit: string | null;
  wallet_token: string;
  pin_hash: string | null;
  created_at: string;
};

type TxRow = { id: number; customer_id: number; type: string; points: number; amount: number | null; note: string | null; reversal_of: number | null; reversed: number };

export type Bonus = { label: string; points: number };

const PHONE = /^\+?[0-9]{7,15}$/;
const BIRTHDAY = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;

export const cleanPhone = (phone: unknown) => String(phone ?? '').replace(/[\s()-]/g, '');

const PIN = /^[0-9]{4}$/;

export function hashPin(pin: unknown) {
  if (!PIN.test(String(pin ?? ''))) throw new BadRequestException('PIN must be exactly 4 digits');
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(String(pin), salt, 32).toString('hex')}`;
}

export function pinMatches(pin: string, stored: string | null) {
  if (!stored || !PIN.test(pin)) return false;
  const [salt, hash] = stored.split(':');
  return timingSafeEqual(scryptSync(pin, salt, 32), Buffer.from(hash, 'hex'));
}

/** Days between today and this year's (or the nearest) birthday, ignoring the year. */
function daysFromBirthday(mmdd: string, today = new Date()) {
  const [m, d] = mmdd.split('-').map(Number);
  const year = today.getFullYear();
  const diffs = [year - 1, year, year + 1].map((y) => Math.abs(Date.UTC(y, m - 1, d) - Date.UTC(year, today.getMonth(), today.getDate())));
  return Math.round(Math.min(...diffs) / 86_400_000);
}

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

  byPhone(merchantId: number, phone: string) {
    return this.db.sql
      .prepare('SELECT * FROM customers WHERE merchant_id = ? AND phone = ?')
      .get(merchantId, phone) as CustomerRow | undefined;
  }

  /** Gold once lifetime points reach the shop's threshold; Gold earns with a multiplier. */
  tier(m: MerchantRow, c: Pick<CustomerRow, 'lifetime_points'>) {
    const gold = c.lifetime_points >= m.gold_threshold;
    return {
      name: gold ? 'Gold' : 'Member',
      multiplier: gold ? m.gold_multiplier : 1,
      toGold: gold ? 0 : m.gold_threshold - c.lifetime_points,
    };
  }

  /** Shape sent to the website (never includes other shops' data). */
  view(m: MerchantRow, c: CustomerRow) {
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      points: c.points,
      lifetimePoints: c.lifetime_points,
      birthday: c.birthday,
      lastVisit: c.last_visit,
      walletToken: c.wallet_token,
      hasPin: Boolean(c.pin_hash),
      createdAt: c.created_at,
      tier: this.tier(m, c),
    };
  }

  validate(input: { name?: unknown; phone?: unknown; birthday?: unknown }) {
    const name = String(input.name ?? '').trim().slice(0, 80);
    const phone = cleanPhone(input.phone);
    const birthday = input.birthday ? String(input.birthday) : null;
    if (!name) throw new BadRequestException('Name is required');
    if (!PHONE.test(phone)) throw new BadRequestException('Enter a valid phone number');
    if (birthday && !BIRTHDAY.test(birthday)) throw new BadRequestException('Birthday must look like MM-DD, e.g. 08-24');
    return { name, phone, birthday };
  }

  /** New customer, with the shop's welcome bonus if it has one. A PIN is optional (set when they join themselves). */
  createCustomer(merchantId: number, input: { name?: unknown; phone?: unknown; birthday?: unknown; pin?: unknown }) {
    const { name, phone, birthday } = this.validate(input);
    const pinHash = input.pin ? hashPin(input.pin) : null;
    return this.db.transaction(() => {
      if (this.byPhone(merchantId, phone)) throw new ConflictException('A customer with this phone number already exists');
      const { lastInsertRowid } = this.db.sql
        .prepare('INSERT INTO customers (merchant_id, name, phone, birthday, wallet_token, pin_hash) VALUES (?, ?, ?, ?, ?, ?)')
        .run(merchantId, name, phone, birthday, randomToken(), pinHash);
      const id = Number(lastInsertRowid);
      const m = this.merchant(merchantId);
      const bonuses: Bonus[] = [];
      if (m.welcome_bonus > 0) {
        this.add(merchantId, id, 'bonus', m.welcome_bonus, { note: 'Welcome bonus', lifetime: true });
        bonuses.push({ label: 'Welcome bonus', points: m.welcome_bonus });
      }
      return { customer: this.customer(merchantId, id), bonuses };
    });
  }

  /**
   * Points for a purchase: bill / 100 x the shop's rate, x the Gold multiplier, rounded down.
   * Creates the customer on their first visit (name needed) and adds a birthday bonus near their
   * birthday, once a year.
   */
  earn(merchantId: number, input: { phone?: unknown; amount?: unknown; name?: unknown; birthday?: unknown }) {
    const phone = cleanPhone(input.phone);
    const amount = Number(input.amount);
    if (!PHONE.test(phone)) throw new BadRequestException('Enter a valid phone number');
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) throw new BadRequestException('Enter the bill amount');

    return this.db.transaction(() => {
      const m = this.merchant(merchantId);
      let customer = this.byPhone(merchantId, phone);
      const bonuses: Bonus[] = [];
      const isNew = !customer;
      if (!customer) {
        if (!String(input.name ?? '').trim()) throw new BadRequestException('New customer — please enter their name');
        const created = this.createCustomer(merchantId, { name: input.name, phone, birthday: input.birthday });
        customer = created.customer;
        bonuses.push(...created.bonuses);
      }

      const tier = this.tier(m, customer);
      const points = Math.floor((amount / 100) * m.points_per_100 * tier.multiplier);
      this.add(merchantId, customer.id, 'earn', points, {
        amount,
        note: tier.multiplier > 1 ? `${tier.name} ×${tier.multiplier}` : null,
        lifetime: true,
      });
      this.db.sql.prepare("UPDATE customers SET last_visit = datetime('now') WHERE id = ?").run(customer.id);

      const year = new Date().getFullYear();
      if (m.birthday_bonus > 0 && customer.birthday && customer.birthday_bonus_year !== year && daysFromBirthday(customer.birthday) <= 7) {
        this.add(merchantId, customer.id, 'bonus', m.birthday_bonus, { note: 'Birthday bonus', lifetime: true });
        this.db.sql.prepare('UPDATE customers SET birthday_bonus_year = ? WHERE id = ?').run(year, customer.id);
        bonuses.push({ label: 'Birthday bonus', points: m.birthday_bonus });
      }

      const after = this.customer(merchantId, customer.id);
      return { points, bonuses, isNew, customer: this.view(m, after), tierUp: tier.name !== this.tier(m, after).name };
    });
  }

  redeem(merchantId: number, customerId: number, rewardId: number) {
    return this.db.transaction(() => {
      const m = this.merchant(merchantId);
      const customer = this.customer(merchantId, customerId);
      const reward = this.db.sql
        .prepare('SELECT id, name, points_cost FROM rewards WHERE id = ? AND merchant_id = ? AND active = 1')
        .get(rewardId, merchantId) as { id: number; name: string; points_cost: number } | undefined;
      if (!reward) throw new NotFoundException('Reward not found');
      if (customer.points < reward.points_cost) {
        throw new BadRequestException(`${customer.name} has ${customer.points} points; ${reward.name} needs ${reward.points_cost}`);
      }
      this.add(merchantId, customer.id, 'redeem', -reward.points_cost, { rewardId: reward.id, note: reward.name });
      return { reward: reward.name, customer: this.view(m, this.customer(merchantId, customer.id)) };
    });
  }

  /** Manual correction, e.g. points given to the wrong person. */
  adjust(merchantId: number, customerId: number, points: unknown, reason: unknown) {
    const delta = Number(points);
    const note = String(reason ?? '').trim().slice(0, 120);
    if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 1_000_000) {
      throw new BadRequestException('Enter a whole number of points to add (or a negative number to remove)');
    }
    if (!note) throw new BadRequestException('Add a reason for the adjustment');
    return this.db.transaction(() => {
      const customer = this.customer(merchantId, customerId);
      if (customer.points + delta < 0) throw new BadRequestException(`${customer.name} only has ${customer.points} points`);
      this.add(merchantId, customer.id, 'adjust', delta, { note });
      return this.view(this.merchant(merchantId), this.customer(merchantId, customer.id));
    });
  }

  /** Reverses one entry (earn, bonus, redeem or adjustment) with an opposite entry. */
  undo(merchantId: number, txId: number) {
    return this.db.transaction(() => {
      const tx = this.db.sql
        .prepare('SELECT * FROM transactions WHERE id = ? AND merchant_id = ?')
        .get(txId, merchantId) as TxRow | undefined;
      if (!tx) throw new NotFoundException('Entry not found');
      if (tx.reversed) throw new BadRequestException('This entry was already undone');
      if (tx.reversal_of) throw new BadRequestException('An undo can’t be undone — add an adjustment instead');

      const customer = this.customer(merchantId, tx.customer_id);
      if (customer.points - tx.points < 0) {
        throw new BadRequestException(`${customer.name} has already spent these points (balance ${customer.points})`);
      }
      const label = tx.type === 'earn' ? `₹${tx.amount} bill` : tx.note || tx.type;
      this.add(merchantId, customer.id, 'adjust', -tx.points, {
        note: `Undo: ${label}`,
        reversalOf: tx.id,
        lifetime: tx.type === 'earn' || tx.type === 'bonus',
      });
      this.db.sql.prepare('UPDATE transactions SET reversed = 1 WHERE id = ?').run(tx.id);
      return this.view(this.merchant(merchantId), this.customer(merchantId, customer.id));
    });
  }

  /** Writes one entry and moves the customer's balance (and lifetime points, for earning). */
  private add(
    merchantId: number,
    customerId: number,
    type: 'earn' | 'redeem' | 'bonus' | 'adjust',
    points: number,
    opts: { amount?: number; rewardId?: number; note?: string | null; reversalOf?: number; lifetime?: boolean } = {},
  ) {
    this.db.sql
      .prepare(
        'INSERT INTO transactions (merchant_id, customer_id, type, points, amount, reward_id, note, reversal_of) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(merchantId, customerId, type, points, opts.amount ?? null, opts.rewardId ?? null, opts.note ?? null, opts.reversalOf ?? null);
    this.db.sql
      .prepare('UPDATE customers SET points = points + ?, lifetime_points = lifetime_points + ? WHERE id = ?')
      .run(points, opts.lifetime ? points : 0, customerId);
  }
}
