import { BadRequestException } from '@nestjs/common';
import { COUNTRIES, country, e164 } from './countries';

// Where new shops come from. The website remembers a visitor's first arrival (web/src/attribution.ts) and sends it
// with the sign-up; page views carry the same fields, so visits and sign-ups can be counted per source.

/** Tracking links and customer cards use these sources; anything else is shown as typed. */
export const CARD_SOURCE = 'card';
/** A shop's own share link (/r/<join code>), from its status images and WhatsApp messages. */
export const SHOP_SOURCE = 'shop';

/** A commission partner's link (/?p=<code>), see partners.ts. */
export const PARTNER_SOURCE = 'partner';

/** A partner's code from what was typed: letters and digits only, upper case. */
export const cleanCode = (value: unknown) => (typeof value === 'string' ? value.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 20) : '');

export type Attribution ={ source: string; medium: string; campaign: string; ref: string; landing: string };

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

/** How a mobile is written in each country, for "Enter a valid WhatsApp number, like …". */
const EXAMPLE: Record<string, string> = { IN: '98765 43210', AE: '050 123 4567', SA: '050 123 4567', GB: '07400 123456', US: '(201) 555-0123' };

/**
 * The owner's WhatsApp number as +<code><number>. A number without + is read in the shop's country (India unless
 * given); one with + can be from anywhere. '' = none given.
 */
export function readPhone(value: unknown, countryCode: string = 'IN') {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '';
  const c = country(countryCode);
  const phone = e164(raw, c);
  if (!phone) throw new BadRequestException(`Enter a valid WhatsApp number, like ${EXAMPLE[c.code] ?? `+${c.dial} …`}`);
  return phone;
}

/** Every way a typed login number could be a shop's saved number: read in each country, or as written with its +. */
export function loginPhones(value: unknown) {
  const raw = typeof value === 'string' ? value.trim() : '';
  return [...new Set(COUNTRIES.map((c) => e164(raw, c)).filter(Boolean))];
}
