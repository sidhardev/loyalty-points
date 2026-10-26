import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, MerchantId } from './auth';
import { AutoMessages } from './automessages';
import { Db } from './db';
import { LoyaltyService, cleanPhone, tzShift, type CustomerRow } from './loyalty.service';
import { ACTIVE_DAYS, ACTIVE_VISITS, rewardsFor, UPI_AMOUNT, UPI_EVERY } from './referrals';

/** One CSV cell; text that looks like a formula is prefixed so spreadsheets don't run it. */
const cell = (v: unknown) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return String(v);
  let text = String(v);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
/** Excel opens UTF-8 CSV (₹, Hindi names) correctly when it starts with a BOM. */
const csv = (header: string[], rows: unknown[][]) => String.fromCharCode(0xfeff) + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');

// The signed-in shop's stamp card: visits, rewards and customers. Every query is scoped to its merchant_id.

@Controller('api')
@UseGuards(AuthGuard)
export class LoyaltyController {
  constructor(
    private readonly db: Db,
    private readonly loyalty: LoyaltyService,
    private readonly auto: AutoMessages,
  ) {}

  // ---- the counter ----

  /** Today's visits and rewards (in the shop's time zone: `tz` = minutes ahead of UTC). */
  @Get('today')
  today(@MerchantId() merchantId: number, @Query('tz') tz = '330') {
    const shift = tzShift(tz);
    return this.db.sql
      .prepare(
        `SELECT COALESCE(SUM(type = 'earn'), 0) AS visits, COALESCE(SUM(type = 'redeem'), 0) AS rewards
         FROM transactions WHERE merchant_id = ? AND type IN ('earn', 'redeem') AND reversed = 0
           AND date(created_at, ?) = date('now', ?)`,
      )
      .get(merchantId, shift, shift);
  }

  /** `auto`: the WhatsApp message Regularhood is sending the customer by itself (Founding Shop), if any. */
  @Post('visits')
  addVisit(@MerchantId() merchantId: number, @Body() body: { phone?: string; tz?: number }) {
    const result = this.loyalty.addVisit(merchantId, body?.phone, body?.tz);
    return { ...result, auto: this.auto.afterVisit(merchantId, result.customer.id, result.already) };
  }

  @Post('customers/:id/reward')
  giveReward(@MerchantId() merchantId: number, @Param('id', ParseIntPipe) id: number) {
    const result = this.loyalty.giveReward(merchantId, id);
    return { ...result, auto: this.auto.afterReward(merchantId, id) };
  }

  @Post('transactions/:id/undo')
  undo(@MerchantId() merchantId: number, @Param('id', ParseIntPipe) id: number) {
    return this.loyalty.undo(merchantId, id);
  }

  // ---- share ----

  /** How many customers the shop has, the shops it brought, and the rewards that earned it (referrals.ts). */
  @Get('share')
  share(@MerchantId() merchantId: number) {
    const count = (sql: string) => (this.db.sql.prepare(sql).get(merchantId) as { n: number }).n;
    const r = rewardsFor(this.db, merchantId);
    return {
      customers: count('SELECT COUNT(*) AS n FROM customers WHERE merchant_id = ?'),
      referrals: r.invited.length,
      invited: r.invited.map(({ name, visits, days, active }) => ({ name, visits, days, active })),
      active: r.active,
      referred: r.referred,
      own: r.own,
      standee: r.standee,
      upi: r.upi,
      rules: { visits: ACTIVE_VISITS, days: ACTIVE_DAYS, upiEvery: UPI_EVERY, upiAmount: UPI_AMOUNT },
    };
  }

  // ---- activity log and exports ----

  @Get('activity')
  activity(@MerchantId() merchantId: number, @Query('limit') limitParam = '200') {
    const limit = Math.min(1000, Math.max(1, Number(limitParam) || 200));
    return this.db.sql
      .prepare('SELECT id, actor, action, detail, customer_id, customer_name, created_at FROM activity WHERE merchant_id = ? ORDER BY id DESC LIMIT ?')
      .all(merchantId, limit);
  }

  @Get('export/customers.csv')
  @Header('content-type', 'text/csv; charset=utf-8')
  @Header('content-disposition', 'attachment; filename="customers.csv"')
  exportCustomers(@MerchantId() merchantId: number) {
    const rows = this.db.sql
      .prepare(
        `SELECT c.*, (SELECT COUNT(*) FROM transactions t WHERE t.customer_id = c.id AND t.type = 'earn' AND t.reversed = 0) AS visits,
                (SELECT COUNT(*) FROM transactions t WHERE t.customer_id = c.id AND t.type = 'redeem' AND t.reversed = 0) AS rewards
         FROM customers c WHERE c.merchant_id = ? ORDER BY c.created_at`,
      )
      .all(merchantId) as (CustomerRow & { visits: number; rewards: number })[];
    this.loyalty.log(merchantId, 'shop', 'export', `Downloaded customers (${rows.length})`);
    return csv(
      ['Phone', 'Name', 'Stamps now', 'All visits', 'Rewards given', 'Last visit (UTC)', 'Joined (UTC)'],
      rows.map((c) => [c.phone, c.name, c.points, c.visits, c.rewards, c.last_visit, c.created_at]),
    );
  }

  @Get('export/transactions.csv')
  @Header('content-type', 'text/csv; charset=utf-8')
  @Header('content-disposition', 'attachment; filename="history.csv"')
  exportTransactions(@MerchantId() merchantId: number) {
    const rows = this.db.sql
      .prepare(
        `SELECT t.created_at, c.phone, c.name, t.type, t.note, t.reversed
         FROM transactions t JOIN customers c ON c.id = t.customer_id
         WHERE t.merchant_id = ? AND t.type IN ('earn', 'redeem') ORDER BY t.id`,
      )
      .all(merchantId) as { created_at: string; phone: string; name: string; type: string; note: string | null; reversed: number }[];
    this.loyalty.log(merchantId, 'shop', 'export', `Downloaded visit history (${rows.length} entries)`);
    return csv(
      ['Date (UTC)', 'Phone', 'Name', 'What', 'Undone'],
      rows.map((t) => [t.created_at, t.phone, t.name, t.type === 'earn' ? 'Visit' : `Reward: ${t.note ?? ''}`, t.reversed ? 'yes' : '']),
    );
  }

  // ---- customers ----

  /** Numbers starting with these digits, for the keypad. */
  @Get('customers/suggest')
  suggest(@MerchantId() merchantId: number, @Query('digits') digits = '') {
    return this.loyalty.suggest(merchantId, digits);
  }

  /** `filter=inactive`: not seen for the shop's inactive period. `filter=reward`: a reward is waiting. */
  @Get('customers')
  customers(@MerchantId() merchantId: number, @Query('q') q = '', @Query('filter') filter = '') {
    const m = this.loyalty.merchant(merchantId);
    const rows = this.db.sql
      .prepare(
        `SELECT * FROM customers
         WHERE merchant_id = :m AND (name LIKE :q OR phone LIKE :q)
           AND (:inactive IS NULL OR COALESCE(last_visit, created_at) < datetime('now', :inactive))
           AND (:reward = 0 OR points >= :needed)
         ORDER BY COALESCE(last_visit, created_at) ${filter === 'inactive' ? 'ASC' : 'DESC'}
         LIMIT 500`,
      )
      .all({
        m: merchantId,
        q: `%${q.trim()}%`,
        inactive: filter === 'inactive' ? `-${m.inactive_days} days` : null,
        reward: filter === 'reward' ? 1 : 0,
        needed: m.visits_needed,
      }) as CustomerRow[];
    return rows.map((c) => this.loyalty.view(m, c));
  }

  @Get('customers/:id')
  customerDetail(@MerchantId() merchantId: number, @Param('id', ParseIntPipe) id: number) {
    const m = this.loyalty.merchant(merchantId);
    const c = this.loyalty.customer(merchantId, id);
    const history = this.db.sql
      .prepare(
        `SELECT id, type, points, amount, reward_id, note, reversed, created_at FROM transactions
         WHERE customer_id = ? AND type IN ('earn', 'redeem') ORDER BY created_at DESC, id DESC LIMIT 200`,
      )
      .all(c.id) as { id: number; type: string; points: number; amount: number | null; reward_id: number | null; note: string | null; reversed: number; created_at: string }[];
    return {
      customer: this.loyalty.view(m, c),
      visits: history.filter((t) => t.type === 'earn' && !t.reversed).length,
      rewards: history.filter((t) => t.type === 'redeem' && !t.reversed).length,
      history: history.map((t) => ({
        id: t.id,
        kind: t.type === 'earn' ? 'visit' : 'reward',
        note: t.type === 'redeem' ? t.note : null,
        reversed: Boolean(t.reversed),
        // Entries from the points system (a bill amount, or a reward from the old list) can't be undone.
        canUndo: !t.reversed && (t.type === 'earn' ? t.amount === null && t.points === 1 : t.reward_id === null),
        createdAt: t.created_at,
      })),
    };
  }

  /** Fixes a mistyped number. */
  @Patch('customers/:id')
  editCustomer(@MerchantId() merchantId: number, @Param('id', ParseIntPipe) id: number, @Body() body: { phone?: string }) {
    const c = this.loyalty.customer(merchantId, id);
    const phone = cleanPhone(body?.phone);
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 13) throw new BadRequestException('Enter the 10-digit phone number');
    const other = this.loyalty.byLast10(merchantId, phone);
    if (other && other.id !== c.id) throw new BadRequestException('Another customer already has this phone number');
    const next = digits.length === 10 ? digits : phone;
    this.db.sql.prepare('UPDATE customers SET phone = ? WHERE id = ?').run(next, c.id);
    if (next !== c.phone) this.loyalty.log(merchantId, 'shop', 'edit_customer', `Changed phone ${c.phone} → ${next}`, this.loyalty.who({ ...c, phone: next }));
    return this.loyalty.view(this.loyalty.merchant(merchantId), this.loyalty.customer(merchantId, c.id));
  }

  /** Removes the customer and their history. */
  @Delete('customers/:id')
  deleteCustomer(@MerchantId() merchantId: number, @Param('id', ParseIntPipe) id: number) {
    const c = this.loyalty.customer(merchantId, id);
    this.db.transaction(() => {
      this.db.sql.prepare('DELETE FROM transactions WHERE customer_id = ?').run(c.id);
      this.db.sql.prepare('DELETE FROM customers WHERE id = ?').run(c.id);
      this.loyalty.log(merchantId, 'shop', 'delete_customer', `Deleted ${c.phone} with ${c.points} stamps`, this.loyalty.who(c));
    });
    return { ok: true };
  }
}
