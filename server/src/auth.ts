import {
  BadRequestException,
  Body,
  CanActivate,
  ConflictException,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Get,
  Injectable,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  createParamDecorator,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { Db, randomToken } from './db';
import { CARD_SOURCE, readAttribution, readPhone, SHOP_SOURCE } from './growth';
import { LoyaltyService, type MerchantRow } from './loyalty.service';

// Shop owners sign up with a WhatsApp number (or an email, or both) + password and get a token the website sends with
// every request. They log in with either one.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

export function checkPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  const given = scryptSync(password, salt, 64);
  return timingSafeEqual(given, Buffer.from(hash, 'hex'));
}

export const publicMerchant = (m: MerchantRow) => ({
  id: m.id,
  name: m.name,
  email: m.email ?? '',
  joinCode: m.join_code,
  inactiveDays: m.inactive_days,
  phone: m.phone ?? '',
  visitsNeeded: m.visits_needed,
  rewardName: m.reward_name,
});

type Settings = {
  name?: string;
  phone?: string;
  visitsNeeded?: number;
  rewardName?: string;
  inactiveDays?: number;
};

function wholeNumber(value: unknown, label: string, min: number, max: number) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new BadRequestException(`${label} must be a whole number from ${min} to ${max}`);
  return n;
}

export const SUSPENDED = 'This shop account is paused. Please contact support.';

/** sha256 of a reset-link token; only this is stored, so a database copy can't be used to reset passwords. */
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

/**
 * Lets only signed-in, active shops through and puts their id on the request.
 * Admin tokens (role: 'admin') are refused here — they only work on /api/admin.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly db: Db,
  ) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request & { merchantId?: number }>();
    const token = req.headers.authorization?.replace(/^Bearer /, '');
    if (!token) throw new UnauthorizedException('Please log in');
    let payload: { sub: number; role?: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub: number; role?: string }>(token);
    } catch {
      throw new UnauthorizedException('Session expired, please log in again');
    }
    if (payload.role) throw new UnauthorizedException('Please log in');
    const m = this.db.sql.prepare('SELECT suspended_at, last_seen_at FROM merchants WHERE id = ?').get(payload.sub) as
      | { suspended_at: string | null; last_seen_at: string | null }
      | undefined;
    if (!m) throw new UnauthorizedException('Account not found');
    if (m.suspended_at) throw new ForbiddenException(SUSPENDED);
    // "Last seen" for the superadmin, written at most every 5 minutes.
    if (!m.last_seen_at || Date.parse(`${m.last_seen_at.replace(' ', 'T')}Z`) < Date.now() - 5 * 60_000) {
      this.db.sql.prepare("UPDATE merchants SET last_seen_at = datetime('now') WHERE id = ?").run(payload.sub);
    }
    req.merchantId = payload.sub;
    return true;
  }
}

/** The signed-in shop's id (set by AuthGuard). */
export const MerchantId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<{ merchantId: number }>().merchantId,
);

@Controller('api')
export class AuthController {
  constructor(
    private readonly db: Db,
    private readonly jwt: JwtService,
    private readonly loyalty: LoyaltyService,
  ) {}

  @Post('auth/signup')
  async signup(@Body() body: { name?: string; email?: string; password?: string; phone?: string; attribution?: unknown }) {
    const name = body?.name?.trim();
    const email = body?.email?.trim().toLowerCase() ?? '';
    const password = body?.password ?? '';
    if (!name) throw new BadRequestException('Shop name is required');
    const phone = readPhone(body?.phone);
    if (!phone && !email) throw new BadRequestException('Enter your WhatsApp number');
    if (email && !EMAIL.test(email)) throw new BadRequestException('Enter a valid email');
    if (password.length < 8) throw new BadRequestException('Password must be at least 8 characters');

    if (email && this.db.sql.prepare('SELECT id FROM merchants WHERE email = ?').get(email)) {
      throw new ConflictException('An account with this email already exists. Log in instead.');
    }
    if (phone && this.phoneTaken(phone)) throw new ConflictException('An account with this WhatsApp number already exists. Log in instead.');

    // Where they came from; a customer card's link and a shop's share link name the shop by its (public) join code.
    const from = readAttribution(body?.attribution);
    const referrer =
      (from.source === CARD_SOURCE || from.source === SHOP_SOURCE) && from.campaign
        ? (this.db.sql.prepare('SELECT id FROM merchants WHERE join_code = ?').get(from.campaign) as { id: number } | undefined)
        : undefined;

    const { lastInsertRowid } = this.db.sql
      .prepare(
        `INSERT INTO merchants (name, email, password_hash, join_code, phone, signup_source, signup_medium, signup_campaign,
           signup_ref, signup_landing, referred_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(name, email || null, hashPassword(password), randomToken(6), phone || null, from.source, from.medium, from.campaign, from.ref, from.landing, referrer?.id ?? null);
    return this.session(Number(lastInsertRowid));
  }

  @Post('auth/login')
  async login(@Body() body: { login?: string; email?: string; password?: string }) {
    // One box for either: anything with an @ is an email, the rest a WhatsApp number.
    const id = String(body?.login ?? body?.email ?? '').trim();
    let candidates: MerchantRow[] = [];
    if (id.includes('@')) {
      candidates = this.db.sql.prepare('SELECT * FROM merchants WHERE email = ?').all(id.toLowerCase()) as MerchantRow[];
    } else if (id) {
      let phone = '';
      try {
        phone = readPhone(id);
      } catch {
        // Not a number either; falls through to "wrong".
      }
      // Numbers given before sign-up by number weren't checked for repeats, so the password picks the account.
      if (phone) candidates = this.db.sql.prepare('SELECT * FROM merchants WHERE phone = ? ORDER BY id').all(phone) as MerchantRow[];
    }
    const merchant = candidates.find((m) => checkPassword(body?.password ?? '', m.password_hash));
    if (!merchant) throw new UnauthorizedException('Wrong WhatsApp number, email or password');
    if (merchant.suspended_at) throw new ForbiddenException(SUSPENDED);
    return this.session(merchant.id);
  }

  /** A reset link made by the superadmin: which shop it's for, if it still works. */
  @Get('auth/reset/:token')
  resetInfo(@Param('token') token: string) {
    const m = this.resetTarget(token);
    return { shop: m.name, email: m.email || m.phone || '' };
  }

  /** Sets a new password from a one-time reset link and logs the shop in. */
  @Post('auth/reset/:token')
  async reset(@Param('token') token: string, @Body() body: { password?: string }) {
    const m = this.resetTarget(token);
    const password = body?.password ?? '';
    if (password.length < 8) throw new BadRequestException('Password must be at least 8 characters');
    this.db.transaction(() => {
      this.db.sql.prepare('UPDATE merchants SET password_hash = ? WHERE id = ?').run(hashPassword(password), m.id);
      this.db.sql.prepare("UPDATE password_resets SET used_at = datetime('now') WHERE merchant_id = ? AND used_at IS NULL").run(m.id);
      this.loyalty.log(m.id, 'shop', 'password', 'Set a new password with a reset link');
    });
    return this.session(m.id);
  }

  private resetTarget(token: string) {
    const row = this.db.sql
      .prepare('SELECT merchant_id FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?')
      .get(tokenHash(String(token ?? '')), new Date().toISOString()) as { merchant_id: number } | undefined;
    if (!row) throw new NotFoundException('This reset link has expired or was already used. Ask support for a new one.');
    const m = this.find(row.merchant_id);
    if (m.suspended_at) throw new ForbiddenException(SUSPENDED);
    return m;
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() req: { merchantId: number }) {
    return publicMerchant(this.find(req.merchantId));
  }

  /** Shop settings: name, the stamp card ("every N visits → reward") and when a customer counts as inactive. */
  @Patch('me')
  @UseGuards(AuthGuard)
  update(@Req() req: { merchantId: number }, @Body() body: Settings) {
    const m = this.find(req.merchantId);
    const b = body ?? {};
    const name = (b.name?.trim() || m.name).slice(0, 80);
    const phone = b.phone === undefined ? (m.phone ?? '') : readPhone(b.phone);
    if (!phone && !m.email) throw new BadRequestException('Keep your WhatsApp number: you log in with it');
    if (phone && phone !== m.phone && this.phoneTaken(phone, m.id)) throw new ConflictException('Another shop account already uses this WhatsApp number');
    const needed = wholeNumber(b.visitsNeeded ?? m.visits_needed, 'Visits', 2, 50);
    const reward = (b.rewardName === undefined ? m.reward_name : String(b.rewardName)).trim().slice(0, 60);
    if (b.rewardName !== undefined && !reward) throw new BadRequestException('Write what the customer gets, e.g. Free chai');
    const inactive = wholeNumber(b.inactiveDays ?? m.inactive_days, 'Inactive days', 7, 365);
    this.db.sql
      .prepare('UPDATE merchants SET name = ?, visits_needed = ?, reward_name = ?, inactive_days = ?, phone = ? WHERE id = ?')
      .run(name, needed, reward, inactive, phone || null, m.id);

    const changed = (
      [
        ['shop name', m.name, name],
        ['visits for a reward', m.visits_needed, needed],
        ['reward', m.reward_name, reward],
        ['inactive days', m.inactive_days, inactive],
      ] as const
    ).filter(([, before, after]) => before !== after);
    if (changed.length) {
      this.loyalty.log(m.id, 'shop', 'settings', changed.map(([label, before, after]) => `${label} ${before} → ${after}`).join(', '));
    }
    return publicMerchant(this.find(m.id));
  }

  private phoneTaken(phone: string, exceptId = 0) {
    return Boolean(this.db.sql.prepare('SELECT id FROM merchants WHERE phone = ? AND id != ?').get(phone, exceptId));
  }

  private find(id: number) {
    const merchant = this.db.sql.prepare('SELECT * FROM merchants WHERE id = ?').get(id) as MerchantRow | undefined;
    if (!merchant) throw new UnauthorizedException('Account not found');
    return merchant;
  }

  private async session(id: number) {
    return { token: await this.jwt.signAsync({ sub: id }), merchant: publicMerchant(this.find(id)) };
  }
}
