import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, MerchantId } from './auth';
import { Db } from './db';
import { LoyaltyService, type CustomerRow } from './loyalty.service';

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

// The signed-in shop's customers, points, rewards and numbers. Every query is scoped to its merchant_id.

@Controller('api')
@UseGuards(AuthGuard)
export class LoyaltyController {
  constructor(
    private readonly db: Db,
    private readonly loyalty: LoyaltyService,
  ) {}

  // ---- dashboard ----

  /** Totals, today's numbers (in the shop's time zone: `tz` = minutes ahead of UTC), birthdays and recent activity. */
  @Get('dashboard')
  dashboard(@MerchantId() merchantId: number, @Query('tz') tzParam = '330') {
    const m = this.loyalty.merchant(merchantId);
    const tz = Math.min(840, Math.max(-720, Number(tzParam) || 0));
    const shift = `${tz >= 0 ? '+' : ''}${tz} minutes`;
    const today = this.db.sql
      .prepare(
        `SELECT COUNT(*) AS visits, COALESCE(SUM(points), 0) AS points, COALESCE(SUM(amount), 0) AS sales
         FROM transactions
         WHERE merchant_id = ? AND type = 'earn' AND reversed = 0
           AND date(created_at, ?) = date('now', ?)`,
      )
      .get(merchantId, shift, shift);
    const totals = this.db.sql
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM customers WHERE merchant_id = :m) AS customers,
           (SELECT COALESCE(SUM(points), 0) FROM transactions WHERE merchant_id = :m AND type IN ('earn', 'bonus') AND reversed = 0) AS issued,
           (SELECT COALESCE(-SUM(points), 0) FROM transactions WHERE merchant_id = :m AND type = 'redeem' AND reversed = 0) AS redeemed,
           (SELECT COUNT(*) FROM transactions WHERE merchant_id = :m AND type = 'redeem' AND reversed = 0) AS redemptions,
           (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE merchant_id = :m AND type = 'earn' AND reversed = 0) AS sales,
           (SELECT COUNT(*) FROM customers WHERE merchant_id = :m
              AND COALESCE(last_visit, created_at) < datetime('now', :inactive)) AS inactive`,
      )
      .get({ m: merchantId, inactive: `-${m.inactive_days} days` });

    // Birthdays in the next 7 days (birthday bonus is added on their visit).
    const soon = (this.db.sql.prepare('SELECT * FROM customers WHERE merchant_id = ? AND birthday IS NOT NULL').all(merchantId) as CustomerRow[])
      .map((c) => ({ c, days: this.daysUntil(c.birthday!) }))
      .filter((x) => x.days <= 7)
      .sort((a, b) => a.days - b.days)
      .map(({ c, days }) => ({ ...this.loyalty.view(m, c), daysUntilBirthday: days }));

    return {
      totals,
      today,
      birthdays: soon,
      recent: this.transactions(merchantId, undefined, 12),
      comeback: { current: this.loyalty.comeback(m, 0), previous: this.loyalty.comeback(m, 30) },
    };
  }

  // ---- bill QR ----

  @Post('claims')
  createClaim(@MerchantId() merchantId: number, @Body() body: { amount?: number }) {
    return this.loyalty.createClaim(merchantId, body?.amount);
  }

  @Get('claims/:code')
  claimStatus(@MerchantId() merchantId: number, @Param('code') code: string) {
    return this.loyalty.claimStatus(merchantId, code);
  }

  @Delete('claims/:code')
  cancelClaim(@MerchantId() merchantId: number, @Param('code') code: string) {
    this.loyalty.cancelClaim(merchantId, code);
    return { ok: true };
  }

  // ---- reward codes customers make in their wallet ----

  @Get('redeem-codes/:code')
  findRedeemCode(@MerchantId() merchantId: number, @Param('code') code: string) {
    return this.loyalty.findRedeemCode(merchantId, code);
  }

  @Post('redeem-codes/:code')
  useRedeemCode(@MerchantId() merchantId: number, @Param('code') code: string) {
    return this.loyalty.useRedeemCode(merchantId, code);
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
    const m = this.loyalty.merchant(merchantId);
    const rows = this.db.sql
      .prepare(
        `SELECT c.*, (SELECT COUNT(*) FROM transactions t WHERE t.customer_id = c.id AND t.type = 'earn' AND t.reversed = 0) AS visits,
                (SELECT COALESCE(SUM(amount), 0) FROM transactions t WHERE t.customer_id = c.id AND t.type = 'earn' AND t.reversed = 0) AS spent
         FROM customers c WHERE c.merchant_id = ? ORDER BY c.created_at`,
      )
      .all(merchantId) as (CustomerRow & { visits: number; spent: number })[];
    this.loyalty.log(merchantId, 'shop', 'export', `Downloaded customers (${rows.length})`);
    return csv(
      ['Name', 'Phone', 'Points', 'Lifetime points', 'Tier', 'Visits', 'Total spent (₹)', 'Birthday (MM-DD)', 'Last visit (UTC)', 'Joined (UTC)'],
      rows.map((c) => [c.name, c.phone, c.points, c.lifetime_points, this.loyalty.tier(m, c).name, c.visits, c.spent, c.birthday, c.last_visit, c.created_at]),
    );
  }

  @Get('export/transactions.csv')
  @Header('content-type', 'text/csv; charset=utf-8')
  @Header('content-disposition', 'attachment; filename="history.csv"')
  exportTransactions(@MerchantId() merchantId: number) {
    const rows = this.db.sql
      .prepare(
        `SELECT t.created_at, c.name, c.phone, t.type, t.amount, t.points, t.note, t.reversed
         FROM transactions t JOIN customers c ON c.id = t.customer_id WHERE t.merchant_id = ? ORDER BY t.id`,
      )
      .all(merchantId) as { created_at: string; name: string; phone: string; type: string; amount: number | null; points: number; note: string | null; reversed: number }[];
    this.loyalty.log(merchantId, 'shop', 'export', `Downloaded points history (${rows.length} entries)`);
    return csv(
      ['Date (UTC)', 'Customer', 'Phone', 'Type', 'Bill (₹)', 'Points', 'Note', 'Undone'],
      rows.map((t) => [t.created_at, t.name, t.phone, t.type, t.amount, t.points, t.note, t.reversed ? 'yes' : '']),
    );
  }

  // ---- customers ----

  /** A scanned member card (or wallet link QR) → that customer. */
  @Get('customers/scan')
  scan(@MerchantId() merchantId: number, @Query('code') code = '') {
    const c = this.loyalty.byScan(merchantId, code);
    if (!c) throw new NotFoundException('This QR is not a member card of your shop');
    return this.loyalty.view(this.loyalty.merchant(merchantId), c);
  }

  /** `filter=inactive` lists customers who haven't visited for the shop's inactive period. */
  @Get('customers')
  customers(@MerchantId() merchantId: number, @Query('q') q = '', @Query('filter') filter = '') {
    const m = this.loyalty.merchant(merchantId);
    const like = `%${q.trim()}%`;
    const rows = this.db.sql
      .prepare(
        `SELECT * FROM customers
         WHERE merchant_id = :m AND (name LIKE :q OR phone LIKE :q)
           AND (:inactive IS NULL OR COALESCE(last_visit, created_at) < datetime('now', :inactive))
         ORDER BY ${filter === 'inactive' ? 'COALESCE(last_visit, created_at) ASC' : 'created_at DESC'}
         LIMIT 500`,
      )
      .all({ m: merchantId, q: like, inactive: filter === 'inactive' ? `-${m.inactive_days} days` : null }) as CustomerRow[];
    return rows.map((c) => this.loyalty.view(m, c));
  }

  @Post('customers')
  addCustomer(@MerchantId() merchantId: number, @Body() body: { name?: string; phone?: string; birthday?: string }) {
    const { customer, bonuses } = this.loyalty.createCustomer(merchantId, body ?? {});
    return { customer: this.loyalty.view(this.loyalty.merchant(merchantId), customer), bonuses };
  }

  @Get('customers/:id')
  customerDetail(@MerchantId() merchantId: number, @Param('id', ParseIntPipe) id: number) {
    const m = this.loyalty.merchant(merchantId);
    const c = this.loyalty.customer(merchantId, id);
    const stats = this.db.sql
      .prepare(
        `SELECT COUNT(*) AS visits, COALESCE(SUM(amount), 0) AS spent
         FROM transactions WHERE customer_id = ? AND type = 'earn' AND reversed = 0`,
      )
      .get(c.id);
    return { customer: this.loyalty.view(m, c), stats, history: this.transactions(merchantId, id, 200) };
  }

  @Patch('customers/:id')
  editCustomer(
    @MerchantId() merchantId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; phone?: string; birthday?: string },
  ) {
    const c = this.loyalty.customer(merchantId, id);
    const { name, phone, birthday } = this.loyalty.validate({ name: body?.name ?? c.name, phone: body?.phone ?? c.phone, birthday: body?.birthday === undefined ? c.birthday : body.birthday });
    const other = this.loyalty.byPhone(merchantId, phone);
    if (other && other.id !== c.id) throw new BadRequestException('Another customer already has this phone number');
    this.db.sql.prepare('UPDATE customers SET name = ?, phone = ?, birthday = ? WHERE id = ?').run(name, phone, birthday, c.id);
    const changes = [
      name !== c.name && `name ${c.name} → ${name}`,
      phone !== c.phone && `phone ${c.phone} → ${phone}`,
      birthday !== c.birthday && `birthday ${c.birthday ?? '—'} → ${birthday ?? '—'}`,
    ].filter(Boolean);
    if (changes.length) this.loyalty.log(merchantId, 'shop', 'edit_customer', `Changed ${changes.join(', ')}`, { id: c.id, name });
    return this.loyalty.view(this.loyalty.merchant(merchantId), this.loyalty.customer(merchantId, c.id));
  }

  /** Removes the customer and their history. */
  @Delete('customers/:id')
  deleteCustomer(@MerchantId() merchantId: number, @Param('id', ParseIntPipe) id: number) {
    const c = this.loyalty.customer(merchantId, id);
    this.db.transaction(() => {
      this.db.sql.prepare('DELETE FROM transactions WHERE customer_id = ?').run(c.id);
      this.db.sql.prepare('DELETE FROM customers WHERE id = ?').run(c.id);
      this.loyalty.log(merchantId, 'shop', 'delete_customer', `Deleted ${c.name} (${c.phone}) with ${c.points} points`, { id: c.id, name: c.name });
    });
    return { ok: true };
  }

  /** Clears a forgotten PIN; the customer sets a new one from their wallet link. */
  @Post('customers/:id/reset-pin')
  resetPin(@MerchantId() merchantId: number, @Param('id', ParseIntPipe) id: number) {
    const c = this.loyalty.customer(merchantId, id);
    this.db.sql.prepare('UPDATE customers SET pin_hash = NULL WHERE id = ?').run(c.id);
    this.db.sql.prepare('DELETE FROM pin_attempts WHERE phone = ?').run(c.phone.replace(/\D/g, '').slice(-10));
    this.loyalty.log(merchantId, 'shop', 'reset_pin', 'Reset the PIN', c);
    return { ok: true };
  }

  @Post('customers/:id/adjust')
  adjust(@MerchantId() merchantId: number, @Param('id', ParseIntPipe) id: number, @Body() body: { points?: number; reason?: string }) {
    return this.loyalty.adjust(merchantId, id, body?.points, body?.reason);
  }

  // ---- points ----

  @Post('points/earn')
  earn(@MerchantId() merchantId: number, @Body() body: { phone?: string; name?: string; amount?: number; birthday?: string }) {
    return this.loyalty.earn(merchantId, body ?? {});
  }

  @Post('points/redeem')
  redeem(@MerchantId() merchantId: number, @Body() body: { customerId?: number; rewardId?: number }) {
    return this.loyalty.redeem(merchantId, Number(body?.customerId), Number(body?.rewardId));
  }

  @Post('transactions/:id/undo')
  undo(@MerchantId() merchantId: number, @Param('id', ParseIntPipe) id: number) {
    return this.loyalty.undo(merchantId, id);
  }

  // ---- rewards ----

  @Get('rewards')
  rewards(@MerchantId() merchantId: number) {
    return this.db.sql
      .prepare(
        `SELECT r.id, r.name, r.points_cost,
                (SELECT COUNT(*) FROM transactions t WHERE t.reward_id = r.id AND t.type = 'redeem' AND t.reversed = 0) AS redeemed
         FROM rewards r WHERE r.merchant_id = ? AND r.active = 1 ORDER BY r.points_cost`,
      )
      .all(merchantId);
  }

  @Patch('rewards/:id')
  editReward(@MerchantId() merchantId: number, @Param('id', ParseIntPipe) id: number, @Body() body: { name?: string; pointsCost?: number }) {
    const name = body?.name?.trim();
    const cost = Number(body?.pointsCost);
    if (!name) throw new BadRequestException('Reward name is required');
    if (!Number.isInteger(cost) || cost < 1) throw new BadRequestException('Points needed must be a whole number above 0');
    const { changes } = this.db.sql
      .prepare('UPDATE rewards SET name = ?, points_cost = ? WHERE id = ? AND merchant_id = ? AND active = 1')
      .run(name.slice(0, 80), cost, id, merchantId);
    if (!changes) throw new NotFoundException('Reward not found');
    this.loyalty.log(merchantId, 'shop', 'reward', `Changed reward ${name} (${cost} points)`);
    return { id, name, points_cost: cost };
  }

  @Post('rewards')
  addReward(@MerchantId() merchantId: number, @Body() body: { name?: string; pointsCost?: number }) {
    const name = body?.name?.trim();
    const cost = Number(body?.pointsCost);
    if (!name) throw new BadRequestException('Reward name is required');
    if (!Number.isInteger(cost) || cost < 1) throw new BadRequestException('Points needed must be a whole number above 0');
    const { lastInsertRowid } = this.db.sql
      .prepare('INSERT INTO rewards (merchant_id, name, points_cost) VALUES (?, ?, ?)')
      .run(merchantId, name.slice(0, 80), cost);
    this.loyalty.log(merchantId, 'shop', 'reward', `Added reward ${name} (${cost} points)`);
    return { id: Number(lastInsertRowid), name, points_cost: cost };
  }

  /** Hides a reward; past redemptions keep pointing at it. */
  @Delete('rewards/:id')
  removeReward(@MerchantId() merchantId: number, @Param('id', ParseIntPipe) id: number) {
    const { changes } = this.db.sql
      .prepare('UPDATE rewards SET active = 0 WHERE id = ? AND merchant_id = ?')
      .run(id, merchantId);
    if (!changes) throw new NotFoundException('Reward not found');
    const { name } = this.db.sql.prepare('SELECT name FROM rewards WHERE id = ?').get(id) as { name: string };
    this.loyalty.log(merchantId, 'shop', 'reward', `Removed reward ${name}`);
    return { ok: true };
  }

  // ---- insights ----

  /**
   * Visits, points and customers over the last `days` days, grouped by day in the shop's time zone
   * (`tz` = minutes ahead of UTC, e.g. 330 for India). A visit is a purchase that earned points.
   */
  @Get('insights')
  insights(@MerchantId() merchantId: number, @Query('days') daysParam = '30', @Query('tz') tzParam = '330') {
    const days = Math.min(365, Math.max(1, Number(daysParam) || 30));
    const tz = Math.min(840, Math.max(-720, Number(tzParam) || 0));
    const shift = `${tz >= 0 ? '+' : ''}${tz} minutes`;
    const since = `-${days} days`;
    const sql = this.db.sql;
    const p = { m: merchantId, shift, since };

    const daily = sql
      .prepare(
        `WITH first_visit AS (
           SELECT customer_id, MIN(id) AS first_id FROM transactions
           WHERE merchant_id = :m AND type = 'earn' AND reversed = 0 GROUP BY customer_id
         )
         SELECT date(t.created_at, :shift) AS day,
                COUNT(*) AS visits,
                SUM(CASE WHEN t.id = f.first_id THEN 1 ELSE 0 END) AS new_customers,
                COALESCE(SUM(t.amount), 0) AS sales,
                COALESCE(SUM(t.points), 0) AS points
         FROM transactions t JOIN first_visit f ON f.customer_id = t.customer_id
         WHERE t.merchant_id = :m AND t.type = 'earn' AND t.reversed = 0 AND t.created_at >= datetime('now', :since)
         GROUP BY day ORDER BY day`,
      )
      .all(p);

    const top = sql
      .prepare(
        `SELECT c.id, c.name, c.phone, c.points, COUNT(*) AS visits, COALESCE(SUM(t.amount), 0) AS spent
         FROM transactions t JOIN customers c ON c.id = t.customer_id
         WHERE t.merchant_id = :m AND t.type = 'earn' AND t.reversed = 0 AND t.created_at >= datetime('now', :since)
         GROUP BY c.id ORDER BY visits DESC, spent DESC LIMIT 10`,
      )
      .all({ m: merchantId, since });

    const repeat = sql
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM (SELECT customer_id FROM transactions WHERE merchant_id = :m AND type = 'earn' AND reversed = 0
              AND created_at >= datetime('now', :since) GROUP BY customer_id)) AS active,
           (SELECT COUNT(*) FROM (SELECT customer_id FROM transactions WHERE merchant_id = :m AND type = 'earn' AND reversed = 0
              AND created_at >= datetime('now', :since) GROUP BY customer_id HAVING COUNT(*) >= 2)) AS "returning",
           (SELECT COUNT(*) FROM (SELECT customer_id FROM transactions WHERE merchant_id = :m AND type = 'earn' AND reversed = 0
              GROUP BY customer_id)) AS everVisited,
           (SELECT COUNT(*) FROM (SELECT customer_id FROM transactions WHERE merchant_id = :m AND type = 'earn' AND reversed = 0
              GROUP BY customer_id HAVING COUNT(*) >= 2)) AS everReturned`,
      )
      .get({ m: merchantId, since });

    return { days, daily, top, repeat };
  }

  // ---- helpers ----

  private daysUntil(mmdd: string) {
    const now = new Date();
    const [m, d] = mmdd.split('-').map(Number);
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    let next = Date.UTC(now.getFullYear(), m - 1, d);
    if (next < today) next = Date.UTC(now.getFullYear() + 1, m - 1, d);
    return Math.round((next - today) / 86_400_000);
  }

  private transactions(merchantId: number, customerId: number | undefined, limit: number) {
    return this.db.sql
      .prepare(
        `SELECT t.id, t.type, t.points, t.amount, t.note, t.reversed, t.reversal_of, t.created_at,
                c.id AS customer_id, c.name AS customer_name
         FROM transactions t JOIN customers c ON c.id = t.customer_id
         WHERE t.merchant_id = ? AND (? IS NULL OR t.customer_id = ?)
         ORDER BY t.created_at DESC, t.id DESC LIMIT ?`,
      )
      .all(merchantId, customerId ?? null, customerId ?? null, limit);
  }
}
