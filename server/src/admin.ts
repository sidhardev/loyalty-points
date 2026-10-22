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
import { AnalyticsStore } from './analytics';
import { checkPassword, tokenHash } from './auth';
import { Db } from './db';
import { CARD_SOURCE, sourceLabel } from './growth';
import { LoyaltyService } from './loyalty.service';
import { rewardsDue, UPI_AMOUNT } from './referrals';

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

export const AdminId = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<{ adminId: number }>().adminId);

type ShopRow = {
  id: number;
  name: string;
  email: string | null;
  created_at: string;
  last_seen_at: string | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  customers: number;
  visits30: number;
  rewards30: number;
  last_visit: string | null;
  reward_name: string;
  visits_needed: number;
  phone: string | null;
  signup_source: string;
  signup_medium: string;
  signup_campaign: string;
  signup_ref: string;
  signup_landing: string;
  referred_by: number | null;
  referred_by_name: string | null;
  referrals: number;
  on_landing: number;
  last_contact: string | null;
  last_contact_detail: string | null;
};

/** Per-shop numbers used by the list and the detail page. */
const SHOP_SELECT = `
  SELECT m.id, m.name, m.email, m.created_at, m.last_seen_at, m.suspended_at, m.suspended_reason,
         (SELECT COUNT(*) FROM customers c WHERE c.merchant_id = m.id) AS customers,
         (SELECT COUNT(*) FROM transactions t WHERE t.merchant_id = m.id AND t.type = 'earn' AND t.reversed = 0
            AND t.created_at >= datetime('now', '-30 days')) AS visits30,
         (SELECT COUNT(*) FROM transactions t WHERE t.merchant_id = m.id AND t.type = 'redeem' AND t.reversed = 0
            AND t.created_at >= datetime('now', '-30 days')) AS rewards30,
         (SELECT MAX(created_at) FROM transactions t WHERE t.merchant_id = m.id AND t.type = 'earn' AND t.reversed = 0) AS last_visit,
         m.reward_name, m.visits_needed,
         m.phone, m.signup_source, m.signup_medium, m.signup_campaign, m.signup_ref, m.signup_landing, m.referred_by, m.on_landing,
         (SELECT r.name FROM merchants r WHERE r.id = m.referred_by) AS referred_by_name,
         (SELECT COUNT(*) FROM merchants r WHERE r.referred_by = m.id) AS referrals,
         (SELECT MAX(created_at) FROM admin_log l WHERE l.merchant_id = m.id AND l.action = 'contact') AS last_contact,
         (SELECT detail FROM admin_log l WHERE l.merchant_id = m.id AND l.action = 'contact' ORDER BY id DESC LIMIT 1) AS last_contact_detail
  FROM merchants m`;

/** active: a visit added in the last 7 days · sleeping: visits before, none for 7+ days · new: joined in the last 2 days · never: no visit yet. */
function status(s: ShopRow) {
  if (s.suspended_at) return 'paused';
  const daysSince = (t: string | null) => (t ? (Date.now() - Date.parse(`${t.replace(' ', 'T')}Z`)) / 86_400_000 : Infinity);
  if (daysSince(s.last_visit) <= 7) return 'active';
  if (s.last_visit) return 'sleeping';
  return daysSince(s.created_at) <= 2 ? 'new' : 'never';
}

const shopView = (s: ShopRow) => ({ ...s, status: status(s), source: sourceLabel(s.signup_source, s.signup_ref) });

const CONTACT_CHANNELS = { whatsapp: 'WhatsApp', call: 'a call', email: 'email', visit: 'a visit' } as const;

type FunnelRow = { source: string; visitors: number; signups: number; started: number; active: number };

@Controller('api/admin')
export class AdminController {
  private logins = new Map<string, number[]>();

  constructor(
    private readonly db: Db,
    private readonly jwt: JwtService,
    private readonly loyalty: LoyaltyService,
    private readonly analytics: AnalyticsStore,
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
           (SELECT COUNT(*) FROM transactions WHERE type = 'earn' AND reversed = 0 AND created_at >= datetime('now', '-1 day')) AS visits24h,
           (SELECT COUNT(*) FROM transactions WHERE type = 'earn' AND reversed = 0 AND created_at >= datetime('now', '-30 days')) AS visits30,
           (SELECT COUNT(*) FROM transactions WHERE type = 'redeem' AND reversed = 0 AND created_at >= datetime('now', '-30 days')) AS rewards30,
           (SELECT COUNT(*) FROM merchants WHERE reward_name = '') AS notSetUp`,
      )
      .get();
    const shops = (sql.prepare(SHOP_SELECT).all() as ShopRow[]).map(shopView);
    const attention = shops
      .filter((s) => s.status === 'sleeping' || s.status === 'never')
      .sort((a, b) => (b.visits30 || 0) - (a.visits30 || 0) || a.created_at.localeCompare(b.created_at))
      .slice(0, 20);
    return { totals, attention };
  }

  /** `filter`: active | sleeping | new | never | paused. */
  @Get('shops')
  @UseGuards(AdminGuard)
  shops(@Query('q') q = '', @Query('filter') filter = '') {
    const like = `%${q.trim().toLowerCase()}%`;
    const rows = (this.db.sql.prepare(`${SHOP_SELECT} WHERE lower(m.name) LIKE ? OR lower(m.email) LIKE ? OR m.phone LIKE ? ORDER BY m.created_at DESC`).all(like, like, like) as ShopRow[]).map(
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
        `SELECT date(created_at, '+330 minutes') AS day, SUM(type = 'earn') AS visits, SUM(type = 'redeem') AS rewards
         FROM transactions WHERE merchant_id = ? AND type IN ('earn', 'redeem') AND reversed = 0 AND created_at >= datetime('now', '-30 days')
         GROUP BY day ORDER BY day`,
      )
      .all(id);
    const counts = sql
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM transactions WHERE merchant_id = :m AND type = 'earn' AND reversed = 0) AS visitsAllTime,
           (SELECT COUNT(*) FROM transactions WHERE merchant_id = :m AND type = 'redeem' AND reversed = 0) AS rewardsAllTime,
           (SELECT COUNT(*) FROM customers WHERE merchant_id = :m AND points >= :needed) AS rewardsWaiting,
           (SELECT COUNT(*) FROM (SELECT customer_id FROM transactions WHERE merchant_id = :m AND type = 'earn' AND reversed = 0
              GROUP BY customer_id HAVING COUNT(*) >= 2)) AS cameBack,
           (SELECT COUNT(*) FROM customers WHERE merchant_id = :m
              AND COALESCE(last_visit, created_at) < datetime('now', :inactive)) AS notSeen`,
      )
      .get({ m: id, needed: m.visits_needed, inactive: `-${m.inactive_days} days` });
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
        visitsNeeded: m.visits_needed,
        rewardName: m.reward_name,
        inactiveDays: m.inactive_days,
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
      this.audit(adminId, id, 'reset_link', `Made a password reset link for ${m.email || m.phone}`);
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

  /** Shows or hides the shop on the homepage's "Shops using Regularhood" list. */
  @Post('shops/:id/landing')
  @UseGuards(AdminGuard)
  landing(@AdminId() adminId: number, @Param('id', ParseIntPipe) id: number, @Body() body: { on?: boolean }) {
    const m = this.loyalty.merchant(id);
    const on = body?.on === true;
    this.db.sql.prepare('UPDATE merchants SET on_landing = ? WHERE id = ?').run(on ? 1 : 0, id);
    this.audit(adminId, id, 'landing', on ? `Showed ${m.name} on the homepage` : `Took ${m.name} off the homepage`);
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

  /** Records that an admin reached out to a shop (shown on the follow-up list and in the admin log). */
  @Post('shops/:id/contacted')
  @UseGuards(AdminGuard)
  contacted(@AdminId() adminId: number, @Param('id', ParseIntPipe) id: number, @Body() body: { channel?: string; note?: string }) {
    const m = this.loyalty.merchant(id);
    const channel = CONTACT_CHANNELS[body?.channel as keyof typeof CONTACT_CHANNELS];
    if (!channel) throw new BadRequestException('Pick how you contacted them');
    const note = String(body?.note ?? '').trim().slice(0, 300);
    this.audit(adminId, id, 'contact', `Contacted ${m.name} by ${channel}${note ? `: ${note}` : ''}`);
    return { ok: true };
  }

  /**
   * The growth funnel for the last `days` days, per source: homepage visitors → sign-ups → shops that added their first
   * visit → shops active in the last 7 days. Also which shops' customer cards brought visitors and sign-ups.
   */
  @Get('growth')
  @UseGuards(AdminGuard)
  growth(@Query('days') daysParam = '30') {
    const days = Math.min(400, Math.max(1, Number.parseInt(daysParam, 10) || 30));
    const sql = this.db.sql;
    const rows = new Map<string, FunnelRow>();
    const row = (source: string) => {
      let r = rows.get(source);
      if (!r) rows.set(source, (r = { source, visitors: 0, signups: 0, started: 0, active: 0 }));
      return r;
    };

    // A visitor is a browser on a day (ids renew daily); counted under the source of their first view of the homepage or
    // an SEO page (/for/…), or a shop's share link (/r/…).
    const views = sql
      .prepare(
        `SELECT day, vid, utm_source, utm_campaign, ref FROM page_views
         WHERE (path = '/' OR path LIKE '/r/%' OR path = '/for' OR path LIKE '/for/%' OR path = '/hi/for' OR path LIKE '/hi/for/%') AND day >= date('now', ?) ORDER BY ts`,
      )
      .all(`-${days - 1} days`) as { day: string; vid: string; utm_source: string; utm_campaign: string; ref: string }[];
    const seen = new Set<string>();
    const cardVisits = new Map<string, number>();
    for (const v of views) {
      const key = `${v.day}|${v.vid}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const source = sourceLabel(v.utm_source, v.ref);
      row(source).visitors++;
      if (source === CARD_SOURCE && v.utm_campaign) cardVisits.set(v.utm_campaign, (cardVisits.get(v.utm_campaign) ?? 0) + 1);
    }

    const shops = (sql.prepare(`${SHOP_SELECT} WHERE m.created_at >= datetime('now', ?) ORDER BY m.created_at DESC`).all(`-${days} days`) as ShopRow[]).map(
      shopView,
    );
    for (const s of shops) {
      const r = row(s.source);
      r.signups++;
      if (s.last_visit) r.started++;
      if (s.status === 'active') r.active++;
    }

    // Shops whose customer cards brought people here, by join code.
    const codes = new Set([...cardVisits.keys(), ...shops.filter((s) => s.source === CARD_SOURCE && s.signup_campaign).map((s) => s.signup_campaign)]);
    const byCode = sql.prepare('SELECT id, name FROM merchants WHERE join_code = ?');
    const cards = [...codes]
      .map((code) => {
        const shop = byCode.get(code) as { id: number; name: string } | undefined;
        return {
          shopId: shop?.id ?? null,
          shop: shop?.name ?? 'Unknown shop',
          visitors: cardVisits.get(code) ?? 0,
          signups: shops.filter((s) => s.source === CARD_SOURCE && s.signup_campaign === code).length,
        };
      })
      .sort((a, b) => b.signups - a.signups || b.visitors - a.visitors);

    const sources = [...rows.values()].sort((a, b) => b.signups - a.signups || b.visitors - a.visitors);
    const total = (k: keyof Omit<FunnelRow, 'source'>) => sources.reduce((n, r) => n + r[k], 0);
    return {
      days,
      totals: { visitors: total('visitors'), signups: total('signups'), started: total('started'), active: total('active') },
      sources,
      cards,
      signups: shops.slice(0, 50),
    };
  }

  /** Referral rewards earned but not sent yet, and the last ones sent (referrals.ts). */
  @Get('referral-rewards')
  @UseGuards(AdminGuard)
  referralRewards() {
    const sent = this.db.sql
      .prepare(
        `SELECT r.merchant_id AS shopId, m.name, r.kind, r.n, r.sent_at FROM referral_rewards r
         JOIN merchants m ON m.id = r.merchant_id ORDER BY r.id DESC LIMIT 30`,
      )
      .all();
    return { due: rewardsDue(this.db), sent, upiAmount: UPI_AMOUNT };
  }

  @Post('referral-rewards')
  @UseGuards(AdminGuard)
  markRewardSent(@AdminId() adminId: number, @Body() body: { shopId?: number; kind?: string; n?: number }) {
    const due = rewardsDue(this.db).find((d) => d.shopId === Number(body?.shopId) && d.kind === body?.kind && d.n === Number(body?.n));
    if (!due) throw new BadRequestException('This reward is not due, or was already marked sent');
    this.db.sql.prepare('INSERT INTO referral_rewards (merchant_id, kind, n, admin_id) VALUES (?, ?, ?, ?)').run(due.shopId, due.kind, due.n, adminId);
    const what = due.kind === 'standee' ? 'a counter standee' : `₹${UPI_AMOUNT} on UPI`;
    this.audit(adminId, due.shopId, 'referral_reward', `Sent ${due.name} ${what} for bringing shops`);
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

  /** Website page views on the UTC days from..to (YYYY-MM-DD); the dashboard does the counting. */
  @Get('analytics')
  @UseGuards(AdminGuard)
  pageViews(@Query('from') from = '', @Query('to') to = '') {
    const day = /^\d{4}-\d{2}-\d{2}$/;
    if (!day.test(from) || !day.test(to) || from > to) throw new BadRequestException('Pick a valid date range');
    if (Date.parse(to) - Date.parse(from) > 400 * 86_400_000) throw new BadRequestException('Pick at most 400 days');
    return { views: this.analytics.views(from, to), events: this.analytics.events(from, to) };
  }

  private audit(adminId: number, merchantId: number | null, action: string, detail: string) {
    this.db.sql.prepare('INSERT INTO admin_log (admin_id, merchant_id, action, detail) VALUES (?, ?, ?, ?)').run(adminId, merchantId, action, detail);
  }
}

