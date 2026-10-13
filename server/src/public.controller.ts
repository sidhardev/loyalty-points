import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { APP_MANIFEST } from './manifest';
import { Db } from './db';
import { LoyaltyService, hashPin, last10, pinMatches, type CustomerRow, type MerchantRow } from './loyalty.service';

// Pages customers open without a shop account:
//  - /w/<token>: their wallet (the random token in the link is what identifies them)
//  - /join/<code>: the shop's counter QR code, to sign up themselves
//  - /login: phone + 4-digit PIN, which opens their wallet(s)
//  - /c/<code>: a bill QR the shop shows; scanning it adds the bill's points

const JOINS_PER_HOUR = 20;
const CLAIMS_PER_HOUR = 60;
const LOGINS_PER_HOUR = 30; // per IP
const MAX_PIN_FAILURES = 5; // per phone, then locked
const LOCK_MINUTES = 15;


@Controller('api/public')
export class PublicController {
  private joins = new Map<string, number[]>();
  private logins = new Map<string, number[]>();
  private claims = new Map<string, number[]>();

  constructor(
    private readonly db: Db,
    private readonly loyalty: LoyaltyService,
  ) {}

  @Get('wallet/:token')
  wallet(@Param('token') token: string) {
    const c = this.db.sql.prepare('SELECT * FROM customers WHERE wallet_token = ?').get(token) as CustomerRow | undefined;
    if (!c) throw new NotFoundException('This link is not valid');
    const m = this.loyalty.merchant(c.merchant_id);
    const rewards = this.db.sql
      .prepare('SELECT id, name, points_cost FROM rewards WHERE merchant_id = ? AND active = 1 ORDER BY points_cost')
      .all(m.id);
    const history = this.db.sql
      .prepare(
        `SELECT id, type, points, amount, note, created_at FROM transactions
         WHERE customer_id = ? AND reversed = 0 AND reversal_of IS NULL
         ORDER BY created_at DESC, id DESC LIMIT 30`,
      )
      .all(c.id);
    const view = this.loyalty.view(m, c);
    return {
      hasPin: view.hasPin,
      cardCode: c.card_code,
      shop: { id: m.id, name: m.name, joinCode: m.join_code, pointsPer100: m.points_per_100, goldThreshold: m.gold_threshold, goldMultiplier: m.gold_multiplier },
      customer: { name: view.name, points: view.points, lifetimePoints: view.lifetimePoints, tier: view.tier, since: view.createdAt },
      rewards,
      history,
      redeemCode: this.loyalty.latestRedeemCode(c.id),
    };
  }

  /** The customer picks a reward; they get a 4-digit code to show at the counter. */
  @Post('wallet/:token/redeem')
  @HttpCode(200)
  redeemCode(@Param('token') token: string, @Body() body: { rewardId?: number }, @Req() req: Request) {
    this.limit(this.claims, req.ip ?? 'unknown', CLAIMS_PER_HOUR, 'Too many attempts, try again later');
    return this.loyalty.createRedeemCode(token, body?.rewardId);
  }

  /** Web app manifest for one wallet, so "Add to Home Screen" opens this wallet rather than the shop app. */
  @Get('wallet/:token/manifest')
  manifest(@Param('token') token: string, @Res({ passthrough: true }) res: Response) {
    const c = this.db.sql.prepare('SELECT merchant_id FROM customers WHERE wallet_token = ?').get(token) as { merchant_id: number } | undefined;
    if (!c) throw new NotFoundException('This link is not valid');
    const shop = this.loyalty.merchant(c.merchant_id).name;
    const start = `/w/${encodeURIComponent(token)}`;
    res.type('application/manifest+json');
    return { ...APP_MANIFEST, id: start, name: `${shop} rewards`, short_name: shop.slice(0, 12), start_url: start, scope: '/' };
  }

  @Get('claim/:code')
  claimInfo(@Param('code') code: string) {
    return this.loyalty.claimInfo(code);
  }

  @Post('claim/:code')
  @HttpCode(200)
  claim(@Param('code') code: string, @Body() body: { walletToken?: string; phone?: string; name?: string }, @Req() req: Request) {
    this.limit(this.claims, req.ip ?? 'unknown', CLAIMS_PER_HOUR, 'Too many attempts, try again later');
    return this.loyalty.claim(code, body ?? {});
  }

  @Get('join/:code')
  joinInfo(@Param('code') code: string) {
    const m = this.shop(code);
    return { shop: m.name, welcomeBonus: m.welcome_bonus, pointsPer100: m.points_per_100 };
  }

  /** Self sign-up from the counter QR, with a PIN for logging in later. Returns the wallet link token. */
  @Post('join/:code')
  join(@Param('code') code: string, @Body() body: { name?: string; phone?: string; birthday?: string; pin?: string }, @Req() req: Request) {
    this.limit(this.joins, req.ip ?? 'unknown', JOINS_PER_HOUR, 'Too many sign-ups, try again later');
    const m = this.shop(code);
    if (!body?.pin) throw new BadRequestException('Choose a 4-digit PIN');
    const { customer, bonuses } = this.loyalty.createCustomer(m.id, body);
    return { walletToken: customer.wallet_token, bonuses };
  }

  /** Sets or changes the PIN. Having the wallet link is what proves it's the customer. */
  @Post('wallet/:token/pin')
  @HttpCode(200)
  setPin(@Param('token') token: string, @Body() body: { pin?: string }) {
    const c = this.db.sql.prepare('SELECT id, name, phone, merchant_id, pin_hash FROM customers WHERE wallet_token = ?').get(token) as
      | { id: number; name: string; phone: string; merchant_id: number; pin_hash: string | null }
      | undefined;
    if (!c) throw new NotFoundException('This link is not valid');
    this.db.sql.prepare('UPDATE customers SET pin_hash = ? WHERE id = ?').run(hashPin(body?.pin), c.id);
    this.loyalty.log(c.merchant_id, 'customer', 'pin', c.pin_hash ? 'Changed their PIN' : 'Set a PIN', c);
    this.db.sql.prepare('DELETE FROM pin_attempts WHERE phone = ?').run(last10(c.phone)); // a fresh PIN lifts any lock
    return { ok: true };
  }

  /**
   * Phone + PIN → every shop where this phone is a member with that PIN.
   * Wrong PINs are counted per phone number and lock it for a while, so PINs can't be guessed.
   */
  @Post('login')
  @HttpCode(200)
  login(@Body() body: { phone?: string; pin?: string }, @Req() req: Request) {
    this.limit(this.logins, req.ip ?? 'unknown', LOGINS_PER_HOUR, 'Too many attempts, try again later');
    const phone = last10(body?.phone);
    const pin = String(body?.pin ?? '');
    if (phone.length < 7) throw new BadRequestException('Enter your phone number');

    const attempt = this.db.sql.prepare('SELECT failures, locked_until FROM pin_attempts WHERE phone = ?').get(phone) as
      | { failures: number; locked_until: string | null }
      | undefined;
    if (attempt?.locked_until && attempt.locked_until > new Date().toISOString()) {
      throw new HttpException(`Too many wrong PINs. Try again in ${LOCK_MINUTES} minutes, or ask the shop to reset your PIN.`, HttpStatus.TOO_MANY_REQUESTS);
    }

    const members = this.db.sql
      .prepare("SELECT * FROM customers WHERE substr(replace(replace(phone, '+', ''), ' ', ''), -10) = ?")
      .all(phone) as CustomerRow[];
    const matched = members.filter((c) => pinMatches(pin, c.pin_hash));

    if (!matched.length) {
      const failures = (attempt?.failures ?? 0) + 1;
      const locked = failures >= MAX_PIN_FAILURES ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null;
      this.db.sql
        .prepare('INSERT INTO pin_attempts (phone, failures, locked_until) VALUES (?, ?, ?) ON CONFLICT(phone) DO UPDATE SET failures = excluded.failures, locked_until = excluded.locked_until')
        .run(phone, locked ? 0 : failures, locked);
      if (members.length && members.every((c) => !c.pin_hash)) {
        throw new UnauthorizedException("You haven't set a PIN yet — open your points link from the shop and set one there.");
      }
      throw new UnauthorizedException('Wrong phone number or PIN');
    }

    this.db.sql.prepare('DELETE FROM pin_attempts WHERE phone = ?').run(phone);
    return {
      wallets: matched.map((c) => ({
        token: c.wallet_token,
        shop: this.loyalty.merchant(c.merchant_id).name,
        name: c.name,
        points: c.points,
      })),
    };
  }

  private shop(code: string) {
    const m = this.db.sql.prepare('SELECT * FROM merchants WHERE join_code = ?').get(code) as MerchantRow | undefined;
    if (!m) throw new NotFoundException('This QR code is not valid');
    if (m.suspended_at) throw new NotFoundException("This shop isn't taking new members right now");
    return m;
  }

  /** Simple per-IP caps so the open forms can't be used to flood a shop or guess PINs. */
  private limit(log: Map<string, number[]>, ip: string, perHour: number, message: string) {
    const hourAgo = Date.now() - 3_600_000;
    const recent = (log.get(ip) ?? []).filter((t) => t > hourAgo);
    if (recent.length >= perHour) throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
    log.set(ip, [...recent, Date.now()]);
  }
}
