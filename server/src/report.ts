import { Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard, MerchantId } from './auth';
import { Db } from './db';
import { LoyaltyService, tzShift } from './loyalty.service';
import { requirePro } from './plans';

// The monthly report: what the stamp card brought the shop this month, in visits and (with the shop's average bill)
// in money, so it can see Regularhood pays for itself.
//
//  - regular visits: every visit that isn't a customer's first. Those customers came back.
//  - won back: customers who came back after the shop's "not seen" period.
//  - brought back by a reminder (Pro): customers whose next visit came within REMINDER_DAYS of the shop tapping
//    Remind for them in the "Not seen" list. Each counts once, for that one visit, so the number is never inflated.
// Months are calendar months in the shop's time zone (`tz` = minutes ahead of UTC, as for /api/today).

/** A return this many days after a reminder counts as brought back by it. */
export const REMINDER_DAYS = 14;

type Month = { month: string; visits: number; regularVisits: number; regulars: number; newCustomers: number; wonBack: number; reminded: number; broughtBack: number };

@Controller('api')
@UseGuards(AuthGuard)
export class ReportController {
  constructor(
    private readonly db: Db,
    private readonly loyalty: LoyaltyService,
  ) {}

  @Get('report')
  report(@MerchantId() merchantId: number, @Query('tz') tz = '330') {
    const m = this.loyalty.merchant(merchantId);
    const shift = tzShift(tz);
    const { cur, prev } = this.db.sql
      .prepare(`SELECT strftime('%Y-%m', 'now', :s) AS cur, strftime('%Y-%m', 'now', :s, 'start of month', '-1 day') AS prev`)
      .get({ s: shift }) as { cur: string; prev: string };
    const { notSeen } = this.db.sql
      .prepare(`SELECT COUNT(*) AS notSeen FROM customers WHERE merchant_id = ? AND COALESCE(last_visit, created_at) < datetime('now', ?)`)
      .get(m.id, `-${m.inactive_days} days`) as { notSeen: number };
    return {
      avgBill: m.avg_bill,
      inactiveDays: m.inactive_days,
      notSeen,
      reminderDays: REMINDER_DAYS,
      current: this.month(m.id, m.inactive_days, shift, cur),
      previous: this.month(m.id, m.inactive_days, shift, prev),
    };
  }

  /** The shop tapped Remind for this customer (Pro). Taps for the same customer within a day count once. */
  @Post('customers/:id/reminded')
  reminded(@MerchantId() merchantId: number, @Param('id', ParseIntPipe) id: number) {
    requirePro(this.loyalty.merchant(merchantId), 'winback');
    const c = this.loyalty.customer(merchantId, id);
    const recent = this.db.sql.prepare("SELECT 1 FROM reminders WHERE customer_id = ? AND created_at > datetime('now', '-1 day')").get(c.id);
    if (!recent) this.db.sql.prepare('INSERT INTO reminders (merchant_id, customer_id) VALUES (?, ?)').run(merchantId, c.id);
    return { ok: true };
  }

  private month(merchantId: number, gap: number, shift: string, month: string): Month {
    const p = { m: merchantId, s: shift, month };
    const v = this.db.sql
      .prepare(
        `WITH v AS (
           SELECT customer_id, created_at,
                  LAG(created_at) OVER (PARTITION BY customer_id ORDER BY created_at, id) AS prev
           FROM transactions WHERE merchant_id = :m AND type = 'earn' AND reversed = 0
         )
         SELECT COUNT(*) AS visits,
                COALESCE(SUM(prev IS NOT NULL), 0) AS regularVisits,
                COUNT(DISTINCT CASE WHEN prev IS NOT NULL THEN customer_id END) AS regulars,
                COALESCE(SUM(prev IS NULL), 0) AS newCustomers,
                COUNT(DISTINCT CASE WHEN julianday(created_at) - julianday(prev) >= :gap THEN customer_id END) AS wonBack
         FROM v WHERE strftime('%Y-%m', created_at, :s) = :month`,
      )
      .get({ ...p, gap }) as Omit<Month, 'month' | 'reminded' | 'broughtBack'>;
    const { reminded } = this.db.sql
      .prepare(`SELECT COUNT(*) AS reminded FROM reminders WHERE merchant_id = :m AND strftime('%Y-%m', created_at, :s) = :month`)
      .get(p) as { reminded: number };
    // The first visit after each reminder, if it came soon enough, in this month.
    const { broughtBack } = this.db.sql
      .prepare(
        `SELECT COUNT(DISTINCT r.customer_id) AS broughtBack FROM reminders r
         JOIN transactions t ON t.id = (
           SELECT id FROM transactions WHERE customer_id = r.customer_id AND type = 'earn' AND reversed = 0 AND created_at > r.created_at
           ORDER BY created_at, id LIMIT 1
         )
         WHERE r.merchant_id = :m AND t.created_at <= datetime(r.created_at, :days) AND strftime('%Y-%m', t.created_at, :s) = :month`,
      )
      .get({ ...p, days: `+${REMINDER_DAYS} days` }) as { broughtBack: number };
    return { month, ...v, reminded, broughtBack };
  }
}
