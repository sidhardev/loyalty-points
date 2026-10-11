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
import { Db } from './db';

// Shop owners sign up with email + password and get a token the website sends with every request.

type MerchantRow = { id: number; name: string; email: string; password_hash: string; points_per_100: number };

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
});

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
      .prepare('INSERT INTO merchants (name, email, password_hash) VALUES (?, ?, ?)')
      .run(name, email, hashPassword(password));
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

  /** Shop settings: name and how many points every ₹100 spent earns. */
  @Patch('me')
  @UseGuards(AuthGuard)
  update(@Req() req: { merchantId: number }, @Body() body: { name?: string; pointsPer100?: number }) {
    const merchant = this.find(req.merchantId);
    const name = body?.name?.trim() || merchant.name;
    const rate = body?.pointsPer100 ?? merchant.points_per_100;
    if (!Number.isInteger(rate) || rate < 1 || rate > 1000) {
      throw new BadRequestException('Points per ₹100 must be a whole number from 1 to 1000');
    }
    this.db.sql.prepare('UPDATE merchants SET name = ?, points_per_100 = ? WHERE id = ?').run(name, rate, merchant.id);
    return publicMerchant(this.find(merchant.id));
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
