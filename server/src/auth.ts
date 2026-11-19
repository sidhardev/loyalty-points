import {
  BadRequestException,
  Body,
  CanActivate,
  ConflictException,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Get,
  HttpCode,
  Injectable,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
  createParamDecorator,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { googleClientId, verifyGoogleToken } from './google';
import { isPro } from './plans';
import { Db, randomToken } from './db';
import { countryFromTz, knownCountry } from './countries';
import { CARD_SOURCE, cleanCode, loginPhones, PARTNER_SOURCE, readAttribution, readPhone, SHOP_SOURCE } from './growth';

/** A new shop's country: the one chosen on the sign-up page, else the browser's time zone, else India. */
const shopCountry = (b: { country?: unknown; tz?: unknown } | undefined) => knownCountry(b?.country) || countryFromTz(b?.tz) || 'IN';
import { LoyaltyService, type MerchantRow } from './loyalty.service';
import { readReviewUrl } from './review-url';
import { emailSettings, MailError, Mailer, resetEmail, welcomeEmail } from './mail';
import { ResetCodes } from './reset-codes';

// Shop owners sign up with a WhatsApp number (or an email, or both) + password and get a token the website sends with
// every request. They log in with either one, or with "Continue with Google" (google.ts).

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
  country: m.country || 'IN', // countries.ts: how customers' numbers are read and shown
  visitsNeeded: m.visits_needed,
  rewardName: m.reward_name,
  welcomeStamps: m.welcome_stamps,
  avgBill: m.avg_bill, // 0 = not told
  pro: isPro(m), // see plans.ts for what Pro adds
  review: Boolean(m.review_url), // has a Google review link
  reviewUrl: m.review_url,
  logo: m.logo_at ? `/api/public/logo/${m.join_code}?v=${encodeURIComponent(m.logo_at)}` : '', // '' = no logo
});

type Settings = {
  name?: string;
  phone?: string;
  country?: string;
  visitsNeeded?: number;
  rewardName?: string;
  welcomeStamps?: number;
  inactiveDays?: number;
  avgBill?: number;
};

function wholeNumber(value: unknown, label: string, min: number, max: number) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new BadRequestException(`${label} must be a whole number from ${min} to ${max}`);
  return n;
}

export const SUSPENDED = 'This shop account is paused. Please contact support.';

/**
 * The card a shop owner made before signing up (the free stamp card maker sends it along). Anything odd is dropped
 * rather than refused: the sign-up itself must never fail because of it.
 */
function readRule(value: unknown): { visits: number; reward: string } | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as { visitsNeeded?: unknown; rewardName?: unknown };
  const visits = Number(v.visitsNeeded);
  const reward = String(v.rewardName ?? '').trim().slice(0, 60);
  if (!Number.isInteger(visits) || visits < 2 || visits > 50 || !reward) return null;
  return { visits, reward };
}

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
    private readonly codes: ResetCodes,
    private readonly mailer: Mailer,
  ) {}

  @Post('auth/signup')
  async signup(@Body() body: { name?: string; email?: string; password?: string; phone?: string; country?: string; tz?: string; attribution?: unknown; rule?: unknown; reviewUrl?: unknown }) {
    const name = body?.name?.trim();
    const email = body?.email?.trim().toLowerCase() ?? '';
    const password = body?.password ?? '';
    if (!name) throw new BadRequestException('Shop name is required');
    const country = shopCountry(body);
    const phone = readPhone(body?.phone, country);
    if (!phone && !email) throw new BadRequestException('Enter your WhatsApp number');
    if (email && !EMAIL.test(email)) throw new BadRequestException('Enter a valid email');
    if (password.length < 8) throw new BadRequestException('Password must be at least 8 characters');

    if (email && this.db.sql.prepare('SELECT id FROM merchants WHERE email = ?').get(email)) {
      throw new ConflictException('An account with this email already exists. Log in instead.');
    }
    if (phone && this.phoneTaken(phone)) throw new ConflictException('An account with this WhatsApp number already exists. Log in instead.');

    return this.session(this.createShop({ name, email, phone, country, passwordHash: hashPassword(password), attribution: body?.attribution, rule: body?.rule, reviewUrl: body?.reviewUrl }));
  }

  /** The website shows "Continue with Google" only when the server has a Google client id. */
  @Get('auth/google')
  googleConfig() {
    return { clientId: googleClientId() };
  }

  /**
   * Log in or sign up with a Google ID token. A known Google account (or a shop with its email) logs straight in; a new
   * one first needs a shop name and WhatsApp number, so the answer is { needs: 'details' } and the website asks for them
   * and sends the same token again.
   */
  @Post('auth/google')
  async google(@Body() body: { credential?: string; name?: string; phone?: string; country?: string; tz?: string; attribution?: unknown; rule?: unknown; reviewUrl?: unknown }) {
    const g = await verifyGoogleToken(String(body?.credential ?? ''));
    if (!g) throw new UnauthorizedException('Google sign-in did not work. Please try again.');

    const known =
      (this.db.sql.prepare('SELECT * FROM merchants WHERE google_sub = ?').get(g.sub) as MerchantRow | undefined) ??
      (this.db.sql.prepare('SELECT * FROM merchants WHERE email = ? ORDER BY id').get(g.email) as MerchantRow | undefined);
    if (known) {
      if (known.suspended_at) throw new ForbiddenException(SUSPENDED);
      if (!known.google_sub) {
        this.db.sql.prepare('UPDATE merchants SET google_sub = ? WHERE id = ?').run(g.sub, known.id);
        this.loyalty.log(known.id, 'shop', 'google', `Logged in with Google (${g.email})`);
      }
      return this.session(known.id);
    }

    const name = body?.name?.trim().slice(0, 80);
    const country = shopCountry(body);
    const phone = readPhone(body?.phone, country);
    if (!name || !phone) return { needs: 'details', email: g.email, name: g.name };
    if (this.phoneTaken(phone)) throw new ConflictException('An account with this WhatsApp number already exists. Log in with your number and password.');
    // Nobody knows this password; a reset link from support can set one later.
    const id = this.createShop({ name, email: g.email, phone, country, passwordHash: hashPassword(randomBytes(24).toString('hex')), attribution: body?.attribution, googleSub: g.sub, rule: body?.rule, reviewUrl: body?.reviewUrl });
    return this.session(id);
  }

  private createShop(s: { name: string; email: string; phone: string; country: string; passwordHash: string; attribution: unknown; googleSub?: string; rule?: unknown; reviewUrl?: unknown }) {
    // Where they came from; a customer card's link and a shop's share link name the shop by its (public) join code.
    const from = readAttribution(s.attribution);
    const referrer =
      (from.source === CARD_SOURCE || from.source === SHOP_SOURCE) && from.campaign
        ? (this.db.sql.prepare('SELECT id FROM merchants WHERE join_code = ?').get(from.campaign) as { id: number } | undefined)
        : undefined;

    // A partner's link makes the shop theirs (partners.ts); an unknown or stopped code counts for nobody.
    const partner =
      from.source === PARTNER_SOURCE && from.campaign
        ? (this.db.sql.prepare('SELECT id FROM partners WHERE code = ? AND disabled_at IS NULL').get(cleanCode(from.campaign)) as { id: number } | undefined)
        : undefined;

    const { lastInsertRowid } = this.db.sql
      .prepare(
        `INSERT INTO merchants (name, email, password_hash, join_code, phone, signup_source, signup_medium, signup_campaign,
           signup_ref, signup_landing, referred_by, partner_id, google_sub, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(s.name, s.email || null, s.passwordHash, randomToken(6), s.phone || null, from.source, from.medium, from.campaign, from.ref, from.landing, referrer?.id ?? null, partner?.id ?? null, s.googleSub ?? null, s.country);
    const id = Number(lastInsertRowid);
    // The card they made in the stamp card maker becomes the shop's rule, so the app opens on their own card.
    const rule = readRule(s.rule);
    if (rule) this.db.sql.prepare('UPDATE merchants SET visits_needed = ?, reward_name = ? WHERE id = ?').run(rule.visits, rule.reward, id);
    // The review link from the review QR maker; a bad one is dropped, like the rule.
    let review = '';
    try {
      review = readReviewUrl(s.reviewUrl);
    } catch {
      // Not a Google review link: not kept.
    }
    if (review) this.db.sql.prepare('UPDATE merchants SET review_url = ? WHERE id = ?').run(review, id);
    this.welcome(id);
    return id;
  }

  /** The welcome email, when the new shop gave an email and it's switched on in Admin → Emails. Never holds up sign-up. */
  private welcome(id: number) {
    const m = this.find(id);
    if (!m.email || !this.mailer.ready || !emailSettings(this.db).welcome) return;
    void this.mailer
      .send(m.email, welcomeEmail(m.name, m.visits_needed, m.reward_name), { kind: 'welcome', merchantId: id, automatic: true })
      .catch((e) => console.error('Welcome email failed:', (e as Error).message));
  }

  @Post('auth/login')
  async login(@Body() body: { login?: string; email?: string; password?: string }) {
    // One box for either: anything with an @ is an email, the rest a WhatsApp number.
    const candidates = this.accountsFor(String(body?.login ?? body?.email ?? ''));
    const merchant = candidates.find((m) => checkPassword(body?.password ?? '', m.password_hash));
    if (!merchant) throw new UnauthorizedException('Wrong WhatsApp number, email or password');
    if (merchant.suspended_at) throw new ForbiddenException(SUSPENDED);
    return this.session(merchant.id);
  }

  /** The shops a login box value can mean: an email, or a WhatsApp number written any way. */
  private accountsFor(login: string): MerchantRow[] {
    const id = login.trim();
    if (id.includes('@')) return this.db.sql.prepare('SELECT * FROM merchants WHERE email = ?').all(id.toLowerCase()) as MerchantRow[];
    // The login page doesn't know the shop's country, so the number is tried as written in each one.
    const phones = id ? loginPhones(id) : [];
    // Numbers given before sign-up by number weren't checked for repeats, so the password (or the code) picks the account.
    if (!phones.length) return [];
    return this.db.sql.prepare(`SELECT * FROM merchants WHERE phone IN (${phones.map(() => '?').join(',')}) ORDER BY id`).all(...phones) as MerchantRow[];
  }

  /**
   * "Forgot password", step 1. An email gets a 6-digit code by mail (mail.ts). For a WhatsApp number the page gets a
   * wa.me link: the owner sends RESET to our number and the reply has the code (whatsapp.ts). That proves the number is
   * theirs and costs nothing, because they wrote first. Sign-up already tells whether an account exists, so these
   * messages can too.
   */
  @Post('auth/forgot')
  @HttpCode(200)
  async forgot(@Body() body: { login?: string }) {
    const login = String(body?.login ?? '').trim();
    if (!login) throw new BadRequestException('Enter your WhatsApp number or email');
    if (login.includes('@')) {
      if (!this.mailer.ready) throw new ServiceUnavailableException('Reset by email isn’t on yet. Use your WhatsApp number instead.');
      const m = this.accountsFor(login).find((a) => !a.suspended_at);
      if (!m) throw new NotFoundException('No shop account uses this email. Try your WhatsApp number.');
      const code = this.codes.create(m.id, 'email');
      if (!code) throw new BadRequestException('We just sent a code. Check your inbox (and spam), or try again in a minute.');
      try {
        this.codes.attachEmail(m.id, await this.mailer.send(m.email ?? login, resetEmail(m.name, code), { kind: 'reset', merchantId: m.id }));
      } catch (e) {
        if (e instanceof MailError) this.codes.attachEmail(m.id, e.emailId);
        console.error('Reset email failed:', (e as Error).message);
        throw new ServiceUnavailableException('Could not send the email right now. Try your WhatsApp number instead.');
      }
      this.loyalty.log(m.id, 'shop', 'password', 'Asked for a password reset code by email');
      return { channel: 'email' as const };
    }
    if (!loginPhones(login).length) throw new BadRequestException('Enter a valid WhatsApp number or email');
    if (!this.accountsFor(login).length) throw new NotFoundException('No shop account uses this WhatsApp number. Check it, or try your email.');
    const number = (await this.codes.whatsappNumber?.()) ?? '';
    if (!number) throw new ServiceUnavailableException('Reset on WhatsApp isn’t available right now. Use your email, or contact support.');
    return { channel: 'whatsapp' as const, link: `https://wa.me/${number}?text=RESET` };
  }

  /** "Forgot password", step 2: the code and a new password. Logs the shop in. */
  @Post('auth/forgot/verify')
  @HttpCode(200)
  verifyReset(@Body() body: { login?: string; code?: string; password?: string }) {
    const code = String(body?.code ?? '').replace(/\D/g, '');
    const password = body?.password ?? '';
    if (code.length !== 6) throw new BadRequestException('Enter the 6-digit code');
    if (password.length < 8) throw new BadRequestException('Password must be at least 8 characters');
    const accounts = this.accountsFor(String(body?.login ?? '')).filter((a) => !a.suspended_at);
    const r = this.codes.use(
      accounts.map((a) => a.id),
      code,
    );
    if (r === 'none') throw new BadRequestException('This code has expired or was used up. Ask for a new one.');
    if (r === 'wrong') throw new BadRequestException('Wrong code. Check it and try again.');
    this.db.sql.prepare('UPDATE merchants SET password_hash = ? WHERE id = ?').run(hashPassword(password), r);
    this.db.sql.prepare("UPDATE password_resets SET used_at = datetime('now') WHERE merchant_id = ? AND used_at IS NULL").run(r);
    this.loyalty.log(r, 'shop', 'password', 'Set a new password with a reset code');
    return this.session(r);
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
    const country = b.country === undefined ? m.country || 'IN' : knownCountry(b.country);
    if (!country) throw new BadRequestException('Choose your country');
    const phone = b.phone === undefined ? (m.phone ?? '') : readPhone(b.phone, country);
    if (!phone && !m.email) throw new BadRequestException('Keep your WhatsApp number: you log in with it');
    if (phone && phone !== m.phone && this.phoneTaken(phone, m.id)) throw new ConflictException('Another shop account already uses this WhatsApp number');
    const needed = wholeNumber(b.visitsNeeded ?? m.visits_needed, 'Visits', 2, 50);
    const reward = (b.rewardName === undefined ? m.reward_name : String(b.rewardName)).trim().slice(0, 60);
    if (b.rewardName !== undefined && !reward) throw new BadRequestException('Write what the customer gets, e.g. Free chai');
    const inactive = wholeNumber(b.inactiveDays ?? m.inactive_days, 'Inactive days', 7, 365);
    // Welcome stamps leave at least one real visit before the reward; fewer visits than that brings them down.
    const welcome = Math.min(wholeNumber(b.welcomeStamps ?? m.welcome_stamps, 'Welcome stamps', 0, 2), needed - 2);
    const avgBill = wholeNumber(b.avgBill ?? m.avg_bill, 'Average bill', 0, 1_000_000);
    this.db.sql
      .prepare('UPDATE merchants SET name = ?, visits_needed = ?, reward_name = ?, welcome_stamps = ?, inactive_days = ?, phone = ?, country = ?, avg_bill = ? WHERE id = ?')
      .run(name, needed, reward, welcome, inactive, phone || null, country, avgBill, m.id);

    const changed = (
      [
        ['shop name', m.name, name],
        ['country', m.country || 'IN', country],
        ['visits for a reward', m.visits_needed, needed],
        ['reward', m.reward_name, reward],
        ['welcome stamps', m.welcome_stamps, welcome],
        ['inactive days', m.inactive_days, inactive],
        ['average bill', m.avg_bill, avgBill],
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
