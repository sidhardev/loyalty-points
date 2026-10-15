import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { APP_MANIFEST } from './manifest';
import { Db } from './db';
import { LoyaltyService, type CustomerRow, type MerchantRow } from './loyalty.service';

// Pages customers open without an account:
//  - /w/<token>: their stamp card (the random token in the link, sent on WhatsApp by the shop, is what identifies them)
//  - /join/<code>: the counter poster's old QR; now it just says what the shop gives and to tell their number

@Controller('api/public')
export class PublicController {
  constructor(
    private readonly db: Db,
    private readonly loyalty: LoyaltyService,
  ) {}

  @Get('wallet/:token')
  wallet(@Param('token') token: string) {
    const c = this.db.sql.prepare('SELECT * FROM customers WHERE wallet_token = ?').get(token) as CustomerRow | undefined;
    if (!c) throw new NotFoundException('This link is not valid');
    const m = this.loyalty.merchant(c.merchant_id);
    const history = this.db.sql
      .prepare(
        `SELECT type, note, created_at FROM transactions
         WHERE customer_id = ? AND type IN ('earn', 'redeem') AND reversed = 0
         ORDER BY created_at DESC, id DESC LIMIT 30`,
      )
      .all(c.id) as { type: string; note: string | null; created_at: string }[];
    return {
      shop: { name: m.name, joinCode: m.join_code, visitsNeeded: m.visits_needed, rewardName: m.reward_name },
      stamps: c.points,
      since: c.created_at,
      history: history.map((h) => ({ kind: h.type === 'earn' ? 'visit' : 'reward', note: h.note, createdAt: h.created_at })),
    };
  }

  /** Web app manifest for one card, so "Add to Home Screen" opens this card rather than the shop app. */
  @Get('wallet/:token/manifest')
  manifest(@Param('token') token: string, @Res({ passthrough: true }) res: Response) {
    const c = this.db.sql.prepare('SELECT merchant_id FROM customers WHERE wallet_token = ?').get(token) as { merchant_id: number } | undefined;
    if (!c) throw new NotFoundException('This link is not valid');
    const shop = this.loyalty.merchant(c.merchant_id).name;
    const start = `/w/${encodeURIComponent(token)}`;
    res.type('application/manifest+json');
    return { ...APP_MANIFEST, id: start, name: `${shop} card`, short_name: shop.slice(0, 12), start_url: start, scope: '/' };
  }

  @Get('join/:code')
  joinInfo(@Param('code') code: string) {
    const m = this.db.sql.prepare('SELECT * FROM merchants WHERE join_code = ?').get(code) as MerchantRow | undefined;
    if (!m || m.suspended_at) throw new NotFoundException('This QR code is not valid');
    return { shop: m.name, visitsNeeded: m.visits_needed, rewardName: m.reward_name };
  }
}
