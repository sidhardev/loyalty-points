import {
  BadRequestException,
  Body,
  CanActivate,
  Controller,
  createParamDecorator,
  ExecutionContext,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import type { Request } from 'express';
import { checkPassword, tokenHash } from './auth';
import { Db } from './db';
import { LoyaltyService } from './loyalty.service';

// Superadmin: the platform owner's view of every shop — how the business is doing, which shops need a call,
// and support actions (reset links, pausing a shop, notes). Admins are created only from the server's terminal
// (npm run create-admin -w server -- <email>), never through the website.
//
// Privacy: admins see counts and totals per shop, never customers' names or phone numbers.

const LOGINS_PER_HOUR = 10;
const RESET_HOURS = 24;

/** Lets only admin tokens through (shop tokens are refused) and puts the admin id on the request. */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly db: Db,
  ) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request & { adminId?: number }>();
    const token = req.headers.authorization?.replace(/^Bearer /, '');
    if (!token) throw new UnauthorizedException('Please log in');
    let payload: { sub: number; role?: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub: number; role?: string }>(token);
    } catch {
      throw new UnauthorizedException('Session expired, please log in again');
    }
    if (payload.role !== 'admin') throw new UnauthorizedException('Please log in');
    if (!this.db.sql.prepare('SELECT 1 FROM admins WHERE id = ?').get(payload.sub)) throw new UnauthorizedException('Please log in');
    req.adminId = payload.sub;
    return true;
  }
}

const AdminId = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<{ adminId: number }>().adminId);

type ShopRow = {
  id: number;
  name: string;
  email: string;
  created_at: string;
  last_seen_at: string | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  customers: number;
  bills30: number;
  sales30: number;
  last_bill: string | null;
};

/** Per-shop numbers used by the list and the detail page. */
const SHOP_SELECT = `
  SELECT m.id, m.name, m.email, m.created_at, m.last_seen_at, m.suspended_at, m.suspended_reason,
         (SELECT COUNT(*) FROM customers c WHERE c.merchant_id = m.id) AS customers,
         (SELECT COUNT(*) FROM transactions t WHERE t.merchant_id = m.id AND t.type = 'earn' AND t.reversed = 0
            AND t.created_at >= datetime('now', '-30 days')) AS bills30,
         (SELECT COALESCE(SUM(amount), 0) FROM transactions t WHERE t.merchant_id = m.id AND t.type = 'earn' AND t.reversed = 0
            AND t.created_at >= datetime('now', '-30 days')) AS sales30,
         (SELECT MAX(created_at) FROM transactions t WHERE t.merchant_id = m.id AND t.type = 'earn' AND t.reversed = 0) AS last_bill
  FROM merchants m`;

/** active: a bill in the last 7 days · sleeping: bills before, none for 7+ days · new: joined in the last 7 days · never: no bill yet. */
function status(s: ShopRow) {
  if (s.suspended_at) return 'paused';
  const daysSince = (t: string | null) => (t ? (Date.now() - Date.parse(`${t.replace(' ', 'T')}Z`)) / 86_400_000 : Infinity);
  if (daysSince(s.last_bill) <= 7) return 'active';
  if (s.last_bill) return 'sleeping';
  return daysSince(s.created_at) <= 2 ? 'new' : 'never';
}

const shopView = (s: ShopRow) => ({ ...s, status: status(s) });

@Controller('api/admin')
export class AdminController {
  private logins = new Map<string, number[]>();

  constructor(
    private readonly db: Db,
    private readonly jwt: JwtService,
    private readonly loyalty: LoyaltyService,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: { email?: string; password?: string }, @Req() req: Request) {
    const ip = req.ip ?? 'unknown';
    const hourAgo = Date.now() - 3_600_000;
    const recent = (this.logins.get(ip) ?? []).filter((t) => t > hourAgo);
    if (recent.length >= LOGINS_PER_HOUR) throw new HttpException('Too many attempts, try again later', HttpStatus.TOO_MANY_REQUESTS);
    this.logins.set(ip, [...recent, Date.now()]);

    const email = String(body?.email ?? '').trim().toLowerCase();
    const admin = this.db.sql.prepare('SELECT id, email, password_hash FROM admins WHERE email = ?').get(email) as
      | { id: number; email: string; password_hash: string }
      | undefined;
    if (!admin || !checkPassword(String(body?.password ?? ''), admin.password_hash)) throw new UnauthorizedException('Wrong email or password');
    this.logins.set(ip, []);
    return { token: await this.jwt.signAsync({ sub: admin.id, role: 'admin' }, { expiresIn: '12h' }), email: admin.email };
  }

  @Get('me')
  @UseGuards(AdminGuard)
  me(@AdminId() adminId: number) {
    return this.db.sql.prepare('SELECT id, email FROM admins WHERE id = ?').get(adminId);
  }

  /** The whole business at a glance, plus the shops that need a call. */
  @Get('overview')
  @UseGuards(AdminGuard)
  overview() {
    const sql = this.db.sql;
    const totals = sql
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM merchants) AS shops,
           (SELECT COUNT(*) FROM merchants WHERE created_at >= datetime('now', '-7 days')) AS newShops,
           (SELECT COUNT(*) FROM merchants WHERE suspended_at IS NOT NULL) AS paused,
           (SELECT COUNT(DISTINCT merchant_id) FROM transactions WHERE type = 'earn' AND reversed = 0
              AND created_at >= datetime('now', '-7 days')) AS activeShops,
           (SELECT COUNT(*) FROM customers) AS customers,
           (SELECT COUNT(*) FROM customers WHERE created_at >= datetime('now', '-7 days')) AS newCustomers,
           (SELECT COUNT(*) FROM transactions WHERE type = 'earn' AND reversed = 0 AND created_at >= datetime('now', '-1 day')) AS bills24h,
           (SELECT COUNT(*) FROM transactions WHERE type = 'earn' AND reversed = 0 AND created_at >= datetime('now', '-30 days')) AS bills30,
           (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'earn' AND reversed = 0
              AND created_at >= datetime('now', '-30 days')) AS sales30`,
      )
      .get();
    const shops = (sql.prepare(SHOP_SELECT).all() as ShopRow[]).map(shopView);
    const attention = shops
      .filter((s) => s.status === 'sleeping' || s.status === 'never')
      .sort((a, b) => (b.bills30 || 0) - (a.bills30 || 0) || a.created_at.localeCompare(b.created_at))
      .slice(0, 20);
    return { totals, attention };
  }

  /** `filter`: active | sleeping | new | never | paused. */
  @Get('shops')
  @UseGuards(AdminGuard)
  shops(@Query('q') q = '', @Query('filter') filter = '') {
    const like = `%${q.trim().toLowerCase()}%`;
    const rows = (this.db.sql.prepare(`${SHOP_SELECT} WHERE lower(m.name) LIKE ? OR lower(m.email) LIKE ? ORDER BY m.created_at DESC`).all(like, like) as ShopRow[]).map(
      shopView,
    );
    return filter ? rows.filter((s) => s.status === filter) : rows;
  }

  @Get('shops/:id')
  @UseGuards(AdminGuard)
  shop(@Param('id', ParseIntPipe) id: number) {
    const sql = this.db.sql;
    const row = sql.prepare(`${SHOP_SELECT} WHERE m.id = ?`).get(id) as ShopRow | undefined;
    if (!row) throw new NotFoundException('Shop not found');
    const m = this.loyalty.merchant(id);
    const daily = sql
      .prepare(
        `SELECT date(created_at, '+330 minutes') AS day, COUNT(*) AS bills, COALESCE(SUM(amount), 0) AS sales
         FROM transactions WHERE merchant_id = ? AND type = 'earn' AND reversed = 0 AND created_at >= datetime('now', '-30 days')
         GROUP BY day ORDER BY day`,
      )
      .all(id);
    const counts = sql
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM rewards WHERE merchant_id = :m AND active = 1) AS rewards,
           (SELECT COUNT(*) FROM transactions WHERE merchant_id = :m AND type = 'earn' AND reversed = 0) AS billsAllTime,
           (SELECT COUNT(*) FROM transactions WHERE merchant_id = :m AND type = 'redeem' AND reversed = 0) AS redemptions,
           (SELECT COUNT(*) FROM customers WHERE merchant_id = :m AND pin_hash IS NOT NULL) AS customersWithPin,
           (SELECT COUNT(*) FROM activity WHERE merchant_id = :m AND action = 'limit_blocked' AND created_at >= datetime('now', '-30 days')) AS blocked30`,
      )
      .get({ m: id });
    const notes = sql
      .prepare(
        `SELECT n.id, n.note, n.created_at, a.email AS admin FROM admin_notes n JOIN admins a ON a.id = n.admin_id
         WHERE n.merchant_id = ? ORDER BY n.id DESC`,
      )
      .all(id);
    const log = sql
      .prepare(`SELECT l.id, l.action, l.detail, l.created_at, a.email AS admin FROM admin_log l JOIN admins a ON a.id = l.admin_id WHERE l.merchant_id = ? ORDER BY l.id DESC LIMIT 50`)
      .all(id);
    return {
      shop: shopView(row),
      settings: {
        pointsPer100: m.points_per_100,
        welcomeBonus: m.welcome_bonus,
        birthdayBonus: m.birthday_bonus,
        goldThreshold: m.gold_threshold,
        goldMultiplier: m.gold_multiplier,
        maxVisitsPerDay: m.max_visits_per_day,
        largeBill: m.large_bill,
      },
      counts,
      comeback: { current: this.loyalty.comeback(m, 0), previous: this.loyalty.comeback(m, 30) },
      daily,
      notes,
      log,
    };
  }

  /** A one-time link (24 hours) the shop opens to choose a new password. Any older unused link stops working. */
  @Post('shops/:id/reset-link')
  @UseGuards(AdminGuard)
  resetLink(@AdminId() adminId: number, @Param('id', ParseIntPipe) id: number) {
    const m = this.loyalty.merchant(id);
    const token = randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + RESET_HOURS * 3_600_000).toISOString();
    this.db.transaction(() => {
      this.db.sql.prepare("UPDATE password_resets SET used_at = datetime('now') WHERE merchant_id = ? AND used_at IS NULL").run(id);
      this.db.sql.prepare('INSERT INTO password_resets (token_hash, merchant_id, expires_at) VALUES (?, ?, ?)').run(tokenHash(token), id, expiresAt);
      this.audit(adminId, id, 'reset_link', `Made a password reset link for ${m.email}`);
      this.loyalty.log(id, 'admin', 'password', 'Support made a password reset link');
    });
    return { path: `/reset/${token}`, expiresAt };
  }

  @Post('shops/:id/suspend')
  @UseGuards(AdminGuard)
  suspend(@AdminId() adminId: number, @Param('id', ParseIntPipe) id: number, @Body() body: { reason?: string }) {
    const m = this.loyalty.merchant(id);
    const reason = String(body?.reason ?? '').trim().slice(0, 200);
    if (!reason) throw new BadRequestException('Add a reason — it is kept in the admin log');
    this.db.sql.prepare("UPDATE merchants SET suspended_at = datetime('now'), suspended_reason = ? WHERE id = ?").run(reason, id);
    this.audit(adminId, id, 'suspend', `Paused ${m.name}: ${reason}`);
    return { ok: true };
  }

  @Post('shops/:id/unsuspend')
  @UseGuards(AdminGuard)
  unsuspend(@AdminId() adminId: number, @Param('id', ParseIntPipe) id: number) {
    const m = this.loyalty.merchant(id);
    this.db.sql.prepare('UPDATE merchants SET suspended_at = NULL, suspended_reason = NULL WHERE id = ?').run(id);
    this.audit(adminId, id, 'unsuspend', `Turned ${m.name} back on`);
    return { ok: true };
  }

  @Post('shops/:id/notes')
  @UseGuards(AdminGuard)
  addNote(@AdminId() adminId: number, @Param('id', ParseIntPipe) id: number, @Body() body: { note?: string }) {
    this.loyalty.merchant(id);
    const note = String(body?.note ?? '').trim().slice(0, 1000);
    if (!note) throw new BadRequestException('Write a note');
    this.db.sql.prepare('INSERT INTO admin_notes (merchant_id, admin_id, note) VALUES (?, ?, ?)').run(id, adminId, note);
    return { ok: true };
  }

  /** Every admin action across all shops. */
  @Get('log')
  @UseGuards(AdminGuard)
  allLog() {
    return this.db.sql
      .prepare(
        `SELECT l.id, l.action, l.detail, l.created_at, l.merchant_id, a.email AS admin FROM admin_log l
         JOIN admins a ON a.id = l.admin_id ORDER BY l.id DESC LIMIT 300`,
      )
      .all();
  }

  private audit(adminId: number, merchantId: number | null, action: string, detail: string) {
    this.db.sql.prepare('INSERT INTO admin_log (admin_id, merchant_id, action, detail) VALUES (?, ?, ?, ?)').run(adminId, merchantId, action, detail);
  }
}

