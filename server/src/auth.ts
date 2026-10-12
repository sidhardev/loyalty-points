import {
  BadRequestException,
  Body,
  CanActivate,
  ConflictException,
  Controller,
  ExecutionContext,
  Get,
  Injectable,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  createParamDecorator,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { Db, randomToken } from './db';
import { LoyaltyService, type MerchantRow } from './loyalty.service';

// Shop owners sign up with email + password and get a token the website sends with every request.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

function checkPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  const given = scryptSync(password, salt, 64);
  return timingSafeEqual(given, Buffer.from(hash, 'hex'));
}

export const publicMerchant = (m: MerchantRow) => ({
  id: m.id,
  name: m.name,
  email: m.email,
  pointsPer100: m.points_per_100,
  joinCode: m.join_code,
  welcomeBonus: m.welcome_bonus,
  birthdayBonus: m.birthday_bonus,
  goldThreshold: m.gold_threshold,
  goldMultiplier: m.gold_multiplier,
  inactiveDays: m.inactive_days,
  maxVisitsPerDay: m.max_visits_per_day,
  largeBill: m.large_bill,
});

type Settings = {
  name?: string;
  pointsPer100?: number;
  welcomeBonus?: number;
  birthdayBonus?: number;
  goldThreshold?: number;
  goldMultiplier?: number;
  inactiveDays?: number;
  maxVisitsPerDay?: number;
  largeBill?: number;
};

function wholeNumber(value: unknown, label: string, min: number, max: number) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new BadRequestException(`${label} must be a whole number from ${min} to ${max}`);
  return n;
}

/** Lets only signed-in shops through and puts their id on the request. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request & { merchantId?: number }>();
    const token = req.headers.authorization?.replace(/^Bearer /, '');
    if (!token) throw new UnauthorizedException('Please log in');
    try {
      const payload = await this.jwt.verifyAsync<{ sub: number }>(token);
      req.merchantId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException('Session expired, please log in again');
    }
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
  async signup(@Body() body: { name?: string; email?: string; password?: string }) {
    const name = body?.name?.trim();
    const email = body?.email?.trim().toLowerCase();
    const password = body?.password ?? '';
    if (!name) throw new BadRequestException('Shop name is required');
    if (!email || !EMAIL.test(email)) throw new BadRequestException('Enter a valid email');
    if (password.length < 8) throw new BadRequestException('Password must be at least 8 characters');

    const exists = this.db.sql.prepare('SELECT id FROM merchants WHERE email = ?').get(email);
    if (exists) throw new ConflictException('An account with this email already exists');

    const { lastInsertRowid } = this.db.sql
      .prepare('INSERT INTO merchants (name, email, password_hash, join_code) VALUES (?, ?, ?, ?)')
      .run(name, email, hashPassword(password), randomToken(6));
    return this.session(Number(lastInsertRowid));
  }

  @Post('auth/login')
  async login(@Body() body: { email?: string; password?: string }) {
    const email = body?.email?.trim().toLowerCase() ?? '';
    const merchant = this.db.sql.prepare('SELECT * FROM merchants WHERE email = ?').get(email) as MerchantRow | undefined;
    if (!merchant || !checkPassword(body?.password ?? '', merchant.password_hash)) {
      throw new UnauthorizedException('Wrong email or password');
    }
    return this.session(merchant.id);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() req: { merchantId: number }) {
    return publicMerchant(this.find(req.merchantId));
  }

  /** Shop settings: name, earning rate, bonuses, Gold tier and when a customer counts as inactive. */
  @Patch('me')
  @UseGuards(AuthGuard)
  update(@Req() req: { merchantId: number }, @Body() body: Settings) {
    const m = this.find(req.merchantId);
    const b = body ?? {};
    const name = b.name?.trim() || m.name;
    const rate = wholeNumber(b.pointsPer100 ?? m.points_per_100, 'Points per ₹100', 1, 1000);
    const welcome = wholeNumber(b.welcomeBonus ?? m.welcome_bonus, 'Welcome bonus', 0, 100_000);
    const birthday = wholeNumber(b.birthdayBonus ?? m.birthday_bonus, 'Birthday bonus', 0, 100_000);
    const threshold = wholeNumber(b.goldThreshold ?? m.gold_threshold, 'Gold tier points', 1, 10_000_000);
    const inactive = wholeNumber(b.inactiveDays ?? m.inactive_days, 'Inactive days', 7, 365);
    const maxVisits = wholeNumber(b.maxVisitsPerDay ?? m.max_visits_per_day, 'Visits per day', 0, 50);
    const largeBill = wholeNumber(b.largeBill ?? m.large_bill, 'Large bill amount', 0, 10_000_000);
    const multiplier = Number(b.goldMultiplier ?? m.gold_multiplier);
    if (!(multiplier >= 1 && multiplier <= 5)) throw new BadRequestException('Gold multiplier must be between 1 and 5');
    this.db.sql
      .prepare(
        `UPDATE merchants SET name = ?, points_per_100 = ?, welcome_bonus = ?, birthday_bonus = ?,
         gold_threshold = ?, gold_multiplier = ?, inactive_days = ?, max_visits_per_day = ?, large_bill = ? WHERE id = ?`,
      )
      .run(name.slice(0, 80), rate, welcome, birthday, threshold, multiplier, inactive, maxVisits, largeBill, m.id);

    const changed = (
      [
        ['shop name', m.name, name.slice(0, 80)],
        ['points per ₹100', m.points_per_100, rate],
        ['welcome bonus', m.welcome_bonus, welcome],
        ['birthday bonus', m.birthday_bonus, birthday],
        ['Gold after', m.gold_threshold, threshold],
        ['Gold ×', m.gold_multiplier, multiplier],
        ['inactive days', m.inactive_days, inactive],
        ['visits per day', m.max_visits_per_day, maxVisits],
        ['large bill check ₹', m.large_bill, largeBill],
      ] as const
    ).filter(([, before, after]) => before !== after);
    if (changed.length) {
      this.loyalty.log(m.id, 'shop', 'settings', changed.map(([label, before, after]) => `${label} ${before} → ${after}`).join(', '));
    }
    return publicMerchant(this.find(m.id));
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
