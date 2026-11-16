import { BadRequestException, Body, Controller, Delete, Patch, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard, MerchantId, publicMerchant } from './auth';
import { Db } from './db';
import { LoyaltyService } from './loyalty.service';
import { requirePro } from './plans';
import { readReviewUrl } from './review-url';

// Settings that only Pro shops have (plans.ts lists what Pro adds):
//  - the Google review link: a "Review us on Google" button on every customer card, and "Ask for a Google review" on
//    the counter after a reward (that one opens WhatsApp on the shop's phone)
//  - the shop's logo at the top of every customer card (served by public.controller.ts)
// The win-back list and exports are Pro too; loyalty.controller.ts checks those.

/** Logos are made small in the page (at most 512 px a side) before they are sent. */
const MAX_LOGO_BYTES = 300 * 1024;
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export { readReviewUrl };

@Controller('api/pro')
@UseGuards(AuthGuard)
export class ProController {
  constructor(
    private readonly db: Db,
    private readonly loyalty: LoyaltyService,
  ) {}

  /** Saves (or, with '', removes) the Google review link. */
  @Patch('review')
  review(@MerchantId() merchantId: number, @Body() body: { reviewUrl?: string }) {
    const m = this.loyalty.merchant(merchantId);
    requirePro(m, 'review');
    const url = readReviewUrl(body?.reviewUrl);
    this.db.sql.prepare('UPDATE merchants SET review_url = ? WHERE id = ?').run(url, m.id);
    if (url !== m.review_url) this.loyalty.log(m.id, 'shop', 'settings', url ? 'Google review link set' : 'Google review link removed');
    return publicMerchant(this.loyalty.merchant(m.id));
  }

  /** The logo itself is the request body (PNG, JPEG or WebP). */
  @Put('logo')
  setLogo(@MerchantId() merchantId: number, @Req() req: Request) {
    const m = this.loyalty.merchant(merchantId);
    requirePro(m, 'logo');
    const type = String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
    const data = Buffer.isBuffer(req.body) ? req.body : null;
    if (!LOGO_TYPES.includes(type) || !data?.length) throw new BadRequestException('Choose a PNG, JPG or WebP picture');
    if (data.length > MAX_LOGO_BYTES) throw new BadRequestException('This picture is too big. Try a smaller one.');
    this.db.transaction(() => {
      this.db.sql
        .prepare('INSERT INTO merchant_logos (merchant_id, data, type) VALUES (?, ?, ?) ON CONFLICT(merchant_id) DO UPDATE SET data = excluded.data, type = excluded.type')
        .run(m.id, data, type);
      this.db.sql.prepare("UPDATE merchants SET logo_at = strftime('%Y%m%d%H%M%f', 'now') WHERE id = ?").run(m.id);
      this.loyalty.log(m.id, 'shop', 'settings', m.logo_at ? 'Changed the logo' : 'Added a logo');
    });
    return publicMerchant(this.loyalty.merchant(m.id));
  }

  /** Removing works on any plan, so a shop that went back to Free can still take its logo down. */
  @Delete('logo')
  removeLogo(@MerchantId() merchantId: number) {
    const m = this.loyalty.merchant(merchantId);
    this.db.transaction(() => {
      this.db.sql.prepare('DELETE FROM merchant_logos WHERE merchant_id = ?').run(m.id);
      this.db.sql.prepare('UPDATE merchants SET logo_at = NULL WHERE id = ?').run(m.id);
      if (m.logo_at) this.loyalty.log(m.id, 'shop', 'settings', 'Removed the logo');
    });
    return publicMerchant(this.loyalty.merchant(m.id));
  }
}
