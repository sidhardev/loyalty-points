import { BadRequestException } from '@nestjs/common';

// Where new shops come from. The website remembers a visitor's first arrival (web/src/attribution.ts) and sends it
// with the sign-up; page views carry the same fields, so visits and sign-ups can be counted per source.

/** Tracking links and customer cards use these sources; anything else is shown as typed. */
export const CARD_SOURCE = 'card';
/** A shop's own share link (/r/<join code>), from its status images and WhatsApp messages. */
export const SHOP_SOURCE = 'shop';

export type Attribution = { source: string; medium: string; campaign: string; ref: string; landing: string };

const clip = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

/** Cleans what the browser sent at sign-up. */
export function readAttribution(body: unknown): Attribution {
  const a = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  return {
    source: clip(a.source, 60).toLowerCase(),
    medium: clip(a.medium, 60).toLowerCase(),
    campaign: clip(a.campaign, 80),
    ref: clip(a.ref, 100).toLowerCase().replace(/^www\./, ''),
    landing: clip(a.landing, 200),
  };
}

const SITES: [RegExp, string][] = [
  [/(^|\.)google\./, 'google'],
  [/(^|\.)bing\.com$/, 'bing'],
  [/duckduckgo\.com$/, 'duckduckgo'],
  [/(^|\.)yahoo\./, 'yahoo'],
  [/(whatsapp\.com|wa\.me)$/, 'whatsapp'],
  [/(facebook\.com|fb\.com|fb\.me)$/, 'facebook'],
  [/instagram\.com$/, 'instagram'],
  [/(^|\.)(t\.co|x\.com|twitter\.com)$/, 'x'],
  [/linkedin\.com$|lnkd\.in$/, 'linkedin'],
  [/(youtube\.com|youtu\.be)$/, 'youtube'],
  [/(^|\.)reddit\.com$/, 'reddit'],
  [/producthunt\.com$/, 'producthunt'],
];

/** One label per source: the utm_source (or ?ref=) if there was one, else the referring site, else "direct". */
export function sourceLabel(source: string, ref: string) {
  const s = source.trim().toLowerCase();
  if (s) return s;
  const host = ref.trim().toLowerCase().replace(/^www\./, '');
  if (!host) return 'direct';
  return SITES.find(([re]) => re.test(host))?.[1] ?? host;
}

/** The owner's WhatsApp number: 10-digit Indian numbers get +91; other countries need their + code. '' = none. */
export function readPhone(value: unknown) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (!raw.startsWith('+')) {
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    if (digits.length === 10) digits = `91${digits}`;
  }
  if (digits.length < 10 || digits.length > 15) throw new BadRequestException('Enter a valid WhatsApp number, like 98765 43210');
  return `+${digits}`;
}
