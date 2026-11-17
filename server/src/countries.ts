// Countries a shop can be in. The shop's country (merchants.country) decides how phone numbers are read and shown, where
// WhatsApp links go and what the shop pays in (plans.ts currencyFor). Kept in step with web/src/country.ts.
//
// `nsn` is how many digits a mobile has without the country code or the leading 0 (India 98765 43210 → 10; UAE
// 050 123 4567 → 50 123 4567 → 9). A customer is found by those last digits, so "+971 50…", "050…" and "50…" are the
// same customer.

export type Country = { code: string; name: string; dial: string; nsn: number; zones: string[] };

export const COUNTRIES: Country[] = [
  { code: 'IN', name: 'India', dial: '91', nsn: 10, zones: ['Asia/Kolkata', 'Asia/Calcutta'] },
  { code: 'AE', name: 'United Arab Emirates', dial: '971', nsn: 9, zones: ['Asia/Dubai'] },
  { code: 'SA', name: 'Saudi Arabia', dial: '966', nsn: 9, zones: ['Asia/Riyadh'] },
  { code: 'QA', name: 'Qatar', dial: '974', nsn: 8, zones: ['Asia/Qatar'] },
  { code: 'KW', name: 'Kuwait', dial: '965', nsn: 8, zones: ['Asia/Kuwait'] },
  { code: 'OM', name: 'Oman', dial: '968', nsn: 8, zones: ['Asia/Muscat'] },
  { code: 'BH', name: 'Bahrain', dial: '973', nsn: 8, zones: ['Asia/Bahrain'] },
  { code: 'NP', name: 'Nepal', dial: '977', nsn: 10, zones: ['Asia/Kathmandu', 'Asia/Katmandu'] },
  { code: 'BD', name: 'Bangladesh', dial: '880', nsn: 10, zones: ['Asia/Dhaka', 'Asia/Dacca'] },
  { code: 'LK', name: 'Sri Lanka', dial: '94', nsn: 9, zones: ['Asia/Colombo'] },
  { code: 'SG', name: 'Singapore', dial: '65', nsn: 8, zones: ['Asia/Singapore'] },
  { code: 'GB', name: 'United Kingdom', dial: '44', nsn: 10, zones: ['Europe/London'] },
  { code: 'US', name: 'United States', dial: '1', nsn: 10, zones: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Phoenix'] },
  { code: 'CA', name: 'Canada', dial: '1', nsn: 10, zones: ['America/Toronto', 'America/Vancouver', 'America/Edmonton', 'America/Winnipeg', 'America/Halifax'] },
  { code: 'AU', name: 'Australia', dial: '61', nsn: 9, zones: ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Perth', 'Australia/Adelaide'] },
];

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

/** The country for a code; India for anything unknown (most shops, and every shop from before countries). */
export const country = (code: unknown): Country => BY_CODE.get(String(code ?? '').toUpperCase()) ?? BY_CODE.get('IN')!;

/** A known country code, or '' (so a signup can fall back to the time zone). */
export const knownCountry = (code: unknown) => (BY_CODE.has(String(code ?? '').toUpperCase()) ? String(code).toUpperCase() : '');

/** The country a browser time zone is in, or '' when it's not one of ours. */
export const countryFromTz = (tz: unknown) => COUNTRIES.find((c) => c.zones.includes(String(tz ?? '')))?.code ?? '';

/**
 * A mobile number's own digits in the shop's country: no country code, no leading 0. '' when it isn't a number of that
 * length (a number from another country, written with its +, is kept whole).
 */
export function nationalDigits(raw: unknown, c: Country) {
  const text = String(raw ?? '').trim();
  let digits = text.replace(/\D/g, '');
  if (text.startsWith('+') || digits.startsWith('00')) {
    digits = digits.replace(/^00/, '');
    return digits.startsWith(c.dial) && digits.length === c.dial.length + c.nsn ? digits.slice(c.dial.length) : '';
  }
  if (digits.length === c.nsn + 1 && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === c.dial.length + c.nsn && digits.startsWith(c.dial)) digits = digits.slice(c.dial.length);
  return digits.length === c.nsn ? digits : '';
}

/** "+<country code><number>" for a number typed in the shop's country, or a full international one; '' if neither. */
export function e164(raw: unknown, c: Country) {
  const text = String(raw ?? '').trim();
  const local = nationalDigits(text, c);
  if (local) return `+${c.dial}${local}`;
  const digits = text.replace(/\D/g, '').replace(/^00/, '');
  if ((text.startsWith('+') || text.startsWith('00')) && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  // Another country's code written without the + ("971 50 123 4567").
  return COUNTRIES.some((o) => digits.startsWith(o.dial) && digits.length === o.dial.length + o.nsn) ? `+${digits}` : '';
}
