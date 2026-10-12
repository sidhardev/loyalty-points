import { Body, Controller, Get, HttpException, HttpStatus, NotFoundException, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Db } from './db';
import { LoyaltyService, type CustomerRow, type MerchantRow } from './loyalty.service';

// Pages customers open without logging in:
//  - /w/<token>: their wallet (the random token in the link is what identifies them)
//  - /join/<code>: the shop's counter QR code, to sign up themselves

const JOINS_PER_HOUR = 20;

@Controller('api/public')
export class PublicController {
  private joins = new Map<string, number[]>();

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
      shop: { name: m.name, pointsPer100: m.points_per_100, goldThreshold: m.gold_threshold, goldMultiplier: m.gold_multiplier },
      customer: { name: view.name, points: view.points, lifetimePoints: view.lifetimePoints, tier: view.tier, since: view.createdAt },
      rewards,
      history,
    };
  }

  @Get('join/:code')
  joinInfo(@Param('code') code: string) {
    const m = this.shop(code);
    return { shop: m.name, welcomeBonus: m.welcome_bonus, pointsPer100: m.points_per_100 };
  }

  /** Self sign-up from the counter QR. Returns the new customer's wallet link token. */
  @Post('join/:code')
  join(@Param('code') code: string, @Body() body: { name?: string; phone?: string; birthday?: string }, @Req() req: Request) {
    this.limit(req.ip ?? 'unknown');
    const m = this.shop(code);
    const { customer, bonuses } = this.loyalty.createCustomer(m.id, body ?? {});
    return { walletToken: customer.wallet_token, bonuses };
  }

  private shop(code: string) {
    const m = this.db.sql.prepare('SELECT * FROM merchants WHERE join_code = ?').get(code) as MerchantRow | undefined;
    if (!m) throw new NotFoundException('This QR code is not valid');
    return m;
  }

  /** A simple per-IP cap so the open join form can't be used to flood a shop with fake customers. */
  private limit(ip: string) {
    const hourAgo = Date.now() - 3_600_000;
    const recent = (this.joins.get(ip) ?? []).filter((t) => t > hourAgo);
    if (recent.length >= JOINS_PER_HOUR) throw new HttpException('Too many sign-ups, try again later', HttpStatus.TOO_MANY_REQUESTS);
    this.joins.set(ip, [...recent, Date.now()]);
  }
}
