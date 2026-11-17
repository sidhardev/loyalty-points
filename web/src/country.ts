// Countries a shop can be in: how its customers' numbers are typed, shown and sent on WhatsApp. Kept in step with
// server/src/countries.ts (the server checks every number again).
//
// `nsn` is how many digits a mobile has without the country code or a leading 0 (India 10, UAE 9). `groups` splits
// those digits for display: India 98765 43210, UAE 50 123 4567.

export type Country = { code: string; name: string; dial: string; nsn: number; groups: number[]; zones: string[] };

export const COUNTRIES: Country[] = [
  { code: 'IN', name: 'India', dial: '91', nsn: 10, groups: [5, 5], zones: ['Asia/Kolkata', 'Asia/Calcutta'] },
  { code: 'AE', name: 'United Arab Emirates', dial: '971', nsn: 9, groups: [2, 3, 4], zones: ['Asia/Dubai'] },
  { code: 'SA', name: 'Saudi Arabia', dial: '966', nsn: 9, groups: [2, 3, 4], zones: ['Asia/Riyadh'] },
  { code: 'QA', name: 'Qatar', dial: '974', nsn: 8, groups: [4, 4], zones: ['Asia/Qatar'] },
  { code: 'KW', name: 'Kuwait', dial: '965', nsn: 8, groups: [4, 4], zones: ['Asia/Kuwait'] },
  { code: 'OM', name: 'Oman', dial: '968', nsn: 8, groups: [4, 4], zones: ['Asia/Muscat'] },
  { code: 'BH', name: 'Bahrain', dial: '973', nsn: 8, groups: [4, 4], zones: ['Asia/Bahrain'] },
  { code: 'NP', name: 'Nepal', dial: '977', nsn: 10, groups: [3, 3, 4], zones: ['Asia/Kathmandu', 'Asia/Katmandu'] },
  { code: 'BD', name: 'Bangladesh', dial: '880', nsn: 10, groups: [4, 6], zones: ['Asia/Dhaka', 'Asia/Dacca'] },
  { code: 'LK', name: 'Sri Lanka', dial: '94', nsn: 9, groups: [2, 3, 4], zones: ['Asia/Colombo'] },
  { code: 'SG', name: 'Singapore', dial: '65', nsn: 8, groups: [4, 4], zones: ['Asia/Singapore'] },
  { code: 'GB', name: 'United Kingdom', dial: '44', nsn: 10, groups: [4, 6], zones: ['Europe/London'] },
  { code: 'US', name: 'United States', dial: '1', nsn: 10, groups: [3, 3, 4], zones: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Phoenix'] },
  { code: 'CA', name: 'Canada', dial: '1', nsn: 10, groups: [3, 3, 4], zones: ['America/Toronto', 'America/Vancouver', 'America/Edmonton', 'America/Winnipeg', 'America/Halifax'] },
  { code: 'AU', name: 'Australia', dial: '61', nsn: 9, groups: [3, 3, 3], zones: ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Perth', 'Australia/Adelaide'] },
];

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

/** The country for a code; India for anything unknown. */
export const country = (code?: string | null): Country => BY_CODE.get((code ?? '').toUpperCase()) ?? BY_CODE.get('IN')!;

/** The country this browser is in, by its time zone ('' when it isn't one of ours). */
export function browserCountry() {
  let tz = '';
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    // Old browsers: no time zone.
  }
  return COUNTRIES.find((c) => c.zones.includes(tz))?.code ?? '';
}

/** "98765 43210" / "50 123 4567": the number's own digits grouped the country's way. */
export const groupDigits = (digits: string, c: Country) => {
  const out: string[] = [];
  let i = 0;
  for (const g of c.groups) {
    if (i >= digits.length) break;
    out.push(digits.slice(i, i + g));
    i += g;
  }
  if (i < digits.length) out.push(digits.slice(i));
  return out.join(' ');
};

const EXAMPLES: Record<string, string> = {
  IN: '98765 43210', AE: '050 123 4567', SA: '050 123 4567', QA: '3312 3456', KW: '5012 3456', OM: '9212 3456', BH: '3600 1234',
  NP: '984 123 4567', BD: '01712 345678', LK: '071 234 5678', SG: '8123 4567', GB: '07400 123456', US: '(201) 555-0123',
  CA: '(416) 555-0123', AU: '0412 345 678',
};

/** A sample mobile written the local way, for placeholders. */
export const example = (c: Country) => EXAMPLES[c.code] ?? `+${c.dial} …`;

/** The number's own digits (no country code, no leading 0) if it's a number of this country, else ''. */
export function nationalDigits(phone: string, c: Country) {
  const text = phone.trim();
  let digits = text.replace(/\D/g, '');
  if (text.startsWith('+') || digits.startsWith('00')) {
    digits = digits.replace(/^00/, '');
    return digits.startsWith(c.dial) && digits.length === c.dial.length + c.nsn ? digits.slice(c.dial.length) : '';
  }
  if (digits.length === c.nsn + 1 && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === c.dial.length + c.nsn && digits.startsWith(c.dial)) digits = digits.slice(c.dial.length);
  return digits.length === c.nsn ? digits : '';
}

/** The digits wa.me needs (country code first) for a number saved by a shop in this country. */
export function waDigits(phone: string, c: Country) {
  const local = nationalDigits(phone, c);
  return local ? `${c.dial}${local}` : phone.replace(/\D/g, '').replace(/^00/, '');
}
