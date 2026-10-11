import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, MerchantId } from './auth';
import { Db } from './db';

// Customers, points and rewards for the signed-in shop. Every query is scoped to its merchant_id.

type Customer = { id: number; name: string; phone: string; points: number; created_at: string };
type Reward = { id: number; name: string; points_cost: number };

const PHONE = /^[0-9+\-\s]{7,20}$/;

const cleanPhone = (phone: string) => phone.replace(/[\s-]/g, '');

@Controller('api')
@UseGuards(AuthGuard)
export class LoyaltyController {
  constructor(private readonly db: Db) {}

  // ---- dashboard ----

  @Get('dashboard')
  dashboard(@MerchantId() merchantId: number) {
    const sql = this.db.sql;
    const totals = sql
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM customers WHERE merchant_id = ?) AS customers,
           (SELECT COALESCE(SUM(points), 0) FROM transactions WHERE merchant_id = ? AND type = 'earn') AS issued,
           (SELECT COALESCE(SUM(points), 0) FROM transactions WHERE merchant_id = ? AND type = 'redeem') AS redeemed,
           (SELECT COUNT(*) FROM transactions WHERE merchant_id = ? AND type = 'redeem') AS redemptions,
           (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE merchant_id = ? AND type = 'earn') AS sales`,
      )
      .get(merchantId, merchantId, merchantId, merchantId, merchantId);
    return { totals, recent: this.transactions(merchantId, undefined, 10) };
  }

  // ---- customers ----

  @Get('customers')
  customers(@MerchantId() merchantId: number, @Query('q') q = '') {
    const like = `%${q.trim()}%`;
    return this.db.sql
      .prepare(
        `SELECT id, name, phone, points, created_at FROM customers
         WHERE merchant_id = ? AND (name LIKE ? OR phone LIKE ?)
         ORDER BY created_at DESC LIMIT 200`,
      )
      .all(merchantId, like, like);
  }

  @Post('customers')
  addCustomer(@MerchantId() merchantId: number, @Body() body: { name?: string; phone?: string }) {
    const { name, phone } = this.validCustomer(body);
    const exists = this.db.sql
      .prepare('SELECT id FROM customers WHERE merchant_id = ? AND phone = ?')
      .get(merchantId, phone);
    if (exists) throw new BadRequestException('A customer with this phone number already exists');
    const { lastInsertRowid } = this.db.sql
      .prepare('INSERT INTO customers (merchant_id, name, phone) VALUES (?, ?, ?)')
      .run(merchantId, name, phone);
    return this.customer(merchantId, Number(lastInsertRowid));
  }

  @Get('customers/:id')
  customerDetail(@MerchantId() merchantId: number, @Param('id', ParseIntPipe) id: number) {
    return { customer: this.customer(merchantId, id), history: this.transactions(merchantId, id, 100) };
  }

  // ---- points ----

  /**
   * Adds points for a purchase: points = bill amount / 100 x the shop's rate (rounded down).
   * Finds the customer by phone, creating them on their first visit when a name is given.
   */
  @Post('points/earn')
  earn(@MerchantId() merchantId: number, @Body() body: { phone?: string; name?: string; amount?: number }) {
    const phone = cleanPhone(body?.phone ?? '');
    const amount = Number(body?.amount);
    if (!PHONE.test(phone)) throw new BadRequestException('Enter a valid phone number');
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) {
      throw new BadRequestException('Enter the bill amount');
    }

    const { points_per_100: rate } = this.db.sql
      .prepare('SELECT points_per_100 FROM merchants WHERE id = ?')
      .get(merchantId) as { points_per_100: number };
    const points = Math.floor((amount / 100) * rate);

    return this.db.transaction(() => {
      let customer = this.db.sql
        .prepare('SELECT * FROM customers WHERE merchant_id = ? AND phone = ?')
        .get(merchantId, phone) as Customer | undefined;
      let isNew = false;
      if (!customer) {
        const name = body?.name?.trim();
        if (!name) throw new BadRequestException('New customer — please enter their name');
        const { lastInsertRowid } = this.db.sql
          .prepare('INSERT INTO customers (merchant_id, name, phone) VALUES (?, ?, ?)')
          .run(merchantId, name.slice(0, 80), phone);
        customer = this.customer(merchantId, Number(lastInsertRowid));
        isNew = true;
      }
      if (points > 0) {
        this.db.sql
          .prepare('INSERT INTO transactions (merchant_id, customer_id, type, points, amount) VALUES (?, ?, ?, ?, ?)')
          .run(merchantId, customer.id, 'earn', points, amount);
        this.db.sql.prepare('UPDATE customers SET points = points + ? WHERE id = ?').run(points, customer.id);
      }
      return { points, isNew, customer: this.customer(merchantId, customer.id) };
    });
  }

  /** Spends a customer's points on a reward. */
  @Post('points/redeem')
  redeem(@MerchantId() merchantId: number, @Body() body: { customerId?: number; rewardId?: number }) {
    return this.db.transaction(() => {
      const customer = this.customer(merchantId, Number(body?.customerId));
      const reward = this.db.sql
        .prepare('SELECT id, name, points_cost FROM rewards WHERE id = ? AND merchant_id = ? AND active = 1')
        .get(Number(body?.rewardId), merchantId) as Reward | undefined;
      if (!reward) throw new NotFoundException('Reward not found');
      if (customer.points < reward.points_cost) {
        throw new BadRequestException(
          `${customer.name} has ${customer.points} points; ${reward.name} needs ${reward.points_cost}`,
        );
      }
      this.db.sql
        .prepare('INSERT INTO transactions (merchant_id, customer_id, type, points, reward_id, note) VALUES (?, ?, ?, ?, ?, ?)')
        .run(merchantId, customer.id, 'redeem', reward.points_cost, reward.id, reward.name);
      this.db.sql.prepare('UPDATE customers SET points = points - ? WHERE id = ?').run(reward.points_cost, customer.id);
      return { reward: reward.name, customer: this.customer(merchantId, customer.id) };
    });
  }

  // ---- rewards ----

  @Get('rewards')
  rewards(@MerchantId() merchantId: number) {
    return this.db.sql
      .prepare('SELECT id, name, points_cost FROM rewards WHERE merchant_id = ? AND active = 1 ORDER BY points_cost')
      .all(merchantId);
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
    return { id: Number(lastInsertRowid), name, points_cost: cost };
  }

  /** Hides a reward; past redemptions keep pointing at it. */
  @Delete('rewards/:id')
  removeReward(@MerchantId() merchantId: number, @Param('id', ParseIntPipe) id: number) {
    const { changes } = this.db.sql
      .prepare('UPDATE rewards SET active = 0 WHERE id = ? AND merchant_id = ?')
      .run(id, merchantId);
    if (!changes) throw new NotFoundException('Reward not found');
    return { ok: true };
  }

  // ---- helpers ----

  private validCustomer(body: { name?: string; phone?: string }) {
    const name = body?.name?.trim();
    const phone = cleanPhone(body?.phone ?? '');
    if (!name) throw new BadRequestException('Name is required');
    if (!PHONE.test(phone)) throw new BadRequestException('Enter a valid phone number');
    return { name: name.slice(0, 80), phone };
  }

  private customer(merchantId: number, id: number) {
    const customer = this.db.sql
      .prepare('SELECT id, name, phone, points, created_at FROM customers WHERE id = ? AND merchant_id = ?')
      .get(id, merchantId) as Customer | undefined;
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  private transactions(merchantId: number, customerId: number | undefined, limit: number) {
    return this.db.sql
      .prepare(
        `SELECT t.id, t.type, t.points, t.amount, t.note, t.created_at, c.id AS customer_id, c.name AS customer_name
         FROM transactions t JOIN customers c ON c.id = t.customer_id
         WHERE t.merchant_id = ? AND (? IS NULL OR t.customer_id = ?)
         ORDER BY t.created_at DESC, t.id DESC LIMIT ?`,
      )
      .all(merchantId, customerId ?? null, customerId ?? null, limit);
  }
}
