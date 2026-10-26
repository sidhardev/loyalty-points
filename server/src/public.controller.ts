import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { APP_MANIFEST } from './manifest';
import { Db } from './db';
import { LoyaltyService, type CustomerRow, type MerchantRow } from './loyalty.service';
import { isFounding, offer } from './plans';
import { SITE } from './seo';

// Pages customers open without an account:
//  - /w/<token>: their stamp card (the random token in the link, sent on WhatsApp by the shop, is what identifies them)
//  - /join/<code>: the counter poster's old QR; now it just says what the shop gives and to tell their number
//  - the homepage's "Shops using Regularhood": only shops the admin ticked (Admin → shop), never paused ones

@Controller('api/public')
export class PublicController {
  constructor(
    private readonly db: Db,
    private readonly loyalty: LoyaltyService,
  ) {}

  /** The homepage's price section: Founding Shop places left and prices. */
  @Get('founding')
  founding() {
    return offer(this.db.sql);
  }

  /**
   * The shop's Google review page, behind a link of ours (/api/public/review/<join code>) so WhatsApp buttons and the
   * customer's card don't need to know it. Unknown codes and shops without a link go to the homepage.
   */
  @Get('review/:code')
  review(@Param('code') code: string, @Res() res: Response) {
    const m = this.db.sql.prepare('SELECT review_url FROM merchants WHERE join_code = ? AND suspended_at IS NULL').get(code) as { review_url: string } | undefined;
    res.redirect(302, m?.review_url || SITE);
  }

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
      shop: { name: m.name, joinCode: m.join_code, visitsNeeded: m.visits_needed, rewardName: m.reward_name, review: Boolean(m.review_url && isFounding(m)) },
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

  @Get('shops')
  shops() {
    return (
      this.db.sql
        .prepare("SELECT name, visits_needed, reward_name FROM merchants WHERE on_landing = 1 AND suspended_at IS NULL ORDER BY created_at")
        .all() as { name: string; visits_needed: number; reward_name: string }[]
    ).map((m) => ({ name: m.name, visitsNeeded: m.visits_needed, rewardName: m.reward_name }));
  }
}
