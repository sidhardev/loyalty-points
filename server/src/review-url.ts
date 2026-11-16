import { BadRequestException } from '@nestjs/common';

// The shop's Google review link: checked when a Pro shop saves it (pro.ts), when sign-up brings one from the free review
// QR maker (auth.ts), and before that maker draws a QR code (public.controller.ts). Its own file, since auth.ts and
// pro.ts already depend on each other one way.

/** Google review links shops paste: g.page, maps.app.goo.gl, search.google.com/local/writereview, google.com/maps… */
export function readReviewUrl(input: unknown) {
  const text = String(input ?? '').trim();
  if (!text) return '';
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    throw new BadRequestException('Paste the review link from your Google Business Profile');
  }
  const host = url.hostname.toLowerCase();
  const google = host === 'g.page' || host === 'maps.app.goo.gl' || host === 'goo.gl' || host === 'g.co' || /(^|\.)google\.[a-z.]+$/.test(host);
  if (url.protocol !== 'https:' || !google) throw new BadRequestException('Use your Google review link (it starts with https://g.page/ or https://search.google.com/)');
  return url.toString().slice(0, 500);
}
