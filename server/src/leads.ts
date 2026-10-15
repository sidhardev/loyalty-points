import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Injectable,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard, AdminId } from './admin';
import { Db } from './db';
import { AiBudgetError, Gemini } from './gemini';
import { seal, unseal } from './secret';
import { SITE, SeoService } from './seo';

// Lead finder (Admin → Leads): searches Google Maps (Places API, Text Search) for neighbourhood shops that could use
// Regularhood, scores how good a fit each one is, and has Gemini write a pitch for the ones worth contacting. The admin
// tracks each lead (contacted → interested → joined) and sees what every search and pitch cost.
//
// The Places key is set here (encrypted in the database, like the Gemini key) or comes from GOOGLE_MAPS_API_KEY. Google
// bills Text Search by the fields asked for: we ask for phone, website and rating, which is the "Text Search Enterprise"
// SKU. The price and the month's free calls are settings, since Google changes them; every call is recorded in
// places_usage with its cost, and searches stop once the month's Places budget is used up. Pitches use Gemini with the
// model, prices and budget set in Admin → SEO pages, and are recorded in ai_usage like every other AI call.

export type LeadSettings = {
  pricePer1000Usd: number; // Text Search Enterprise, per 1000 calls
  freePerMonth: number; // calls Google doesn't bill each month (per billing account)
  monthlyBudgetUsd: number; // billed Places spend allowed per month; 0 = no searches
};

const DEFAULTS: LeadSettings = { pricePer1000Usd: 35, freePerMonth: 1000, monthlyBudgetUsd: 5 };

/** Overridable only for local testing against a stand-in server. */
const API_BASE = (process.env.PLACES_API_BASE || 'https://places.googleapis.com').replace(/\/$/, '');

const FIELDS = [
  'places.id',
  'places.displayName',
  'places.primaryTypeDisplayName',
  'places.primaryType',
  'places.types',
  'places.formattedAddress',
  'places.location',
  'places.businessStatus',
  'places.googleMapsUri',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'nextPageToken',
].join(',');

type Place = {
  id: string;
  displayName?: { text?: string };
  primaryTypeDisplayName?: { text?: string };
  primaryType?: string;
  types?: string[];
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  businessStatus?: string;
  googleMapsUri?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
};

/** Shop types offered in the search box: ones whose customers come back often. */
export const SHOP_TYPES = [
  'Salon', 'Beauty parlour', 'Barber shop', 'Café', 'Chai stall', 'Bakery', 'Sweet shop', 'Kirana store', 'Pharmacy', 'Gym',
  'Spa', 'Juice bar', 'Ice cream parlour', 'Restaurant', 'Tiffin service', 'Laundry', 'Pet shop', 'Stationery shop',
  'Mobile repair shop', 'Boutique', 'Optical store', 'Fruit & vegetable shop',
];

/** Google types where the same customers come back every week or month: the best fit for a stamp card. */
const REPEAT_TYPES = new Set([
  'beauty_salon', 'hair_salon', 'hair_care', 'barber_shop', 'nail_salon', 'spa', 'cafe', 'coffee_shop', 'tea_house', 'bakery',
  'confectionery', 'dessert_shop', 'ice_cream_shop', 'juice_shop', 'grocery_store', 'convenience_store', 'food_store', 'pharmacy',
  'drugstore', 'gym', 'fitness_center', 'yoga_studio', 'restaurant', 'fast_food_restaurant', 'meal_takeaway', 'indian_restaurant',
  'laundry', 'pet_store', 'book_store', 'butcher_shop', 'market', 'sweets_and_desserts_shop',
]);

/** "+91 98765 43210" is how Google writes Indian mobiles; landlines are grouped by city code ("+91 731 252 3456"). */
const isMobile = (phone: string) => /^\+91 [6-9]\d{4} \d{5}$/.test(phone.trim());

/** 0-100: can we reach them on WhatsApp, are they an established single shop, do customers come back often. */
function scoreLead(p: Place): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  const phone = p.internationalPhoneNumber ?? '';
  if (isMobile(phone)) {
    score += 30;
    reasons.push('Mobile number (WhatsApp)');
  } else if (phone) {
    score += 12;
    reasons.push('Landline only');
  } else reasons.push('No phone listed');

  const n = p.userRatingCount ?? 0;
  if (n >= 50 && n < 800) {
    score += 25;
    reasons.push(`${n} reviews: established and busy`);
  } else if (n >= 10 && n < 50) {
    score += 18;
    reasons.push(`${n} reviews: small, growing`);
  } else if (n >= 800 && n < 3000) {
    score += 10;
    reasons.push(`${n} reviews: big, may be a chain`);
  } else if (n >= 3000) {
    score += 2;
    reasons.push(`${n} reviews: very big, likely a chain`);
  } else {
    score += 8;
    reasons.push(n ? `Only ${n} reviews` : 'No reviews yet');
  }

  if ((p.rating ?? 0) >= 4) {
    score += 10;
    reasons.push(`Rated ${p.rating}`);
  }
  const types = [p.primaryType ?? '', ...(p.types ?? [])];
  if (types.some((t) => REPEAT_TYPES.has(t))) {
    score += 25;
    reasons.push('Customers come back often');
  } else score += 10;
  if (!p.websiteUri) {
    score += 10;
    reasons.push('No website: an independent shop');
  }
  return { score: Math.min(100, score), reasons };
}

type LeadRow = {
  id: number;
  place_id: string;
  search_id: number | null;
  name: string;
  category: string;
  shop_type: string;
  area: string;
  address: string;
  phone: string;
  mobile: number;
  website: string;
  maps_url: string;
  rating: number | null;
  reviews: number;
  score: number;
  reasons: string;
  status: string;
  notes: string;
  pitch: string | null;
  pitch_cost_usd: number;
  created_at: string;
  updated_at: string;
  contacted_at: string | null;
  wa_opted_out: number;
  last_inbound_at: string | null;
};

export type Pitch = {
  fit: string;
  whatsapp: string; // Hinglish
  whatsappHindi: string; // Devanagari
  callOpener: string;
  talkingPoints: string[];
  rewardIdeas: string[];
  objections: { q: string; a: string }[];
  followUp: string;
};

const S = (type: string, extra: object = {}) => ({ type, ...extra });
const str = (description: string) => S('STRING', { description });
const PITCH_SCHEMA = S('OBJECT', {
  properties: {
    fit: str('One sentence in English for the founder: why this shop is (or is not) a good fit'),
    whatsappHindi: str('First WhatsApp message to the owner in Hindi, Devanagari script. 4 to 6 short lines. Contains [link] exactly once.'),
    whatsapp: str(
      'The whatsappHindi message written again in Latin letters (Roman Hindi), word by word, the way Indians type Hindi on WhatsApp: "Namaste ji, hum Regularhood se hain..." Same Hindi words, NOT translated into English. Contains [link] exactly once.',
    ),
    callOpener: str('What to say in the first 20 seconds of a phone call or a visit to the shop, in Roman Hindi, 2 or 3 sentences, speaking as "hum" (never "main")'),
    talkingPoints: S('ARRAY', { items: str('one point in Hinglish, specific to this kind of shop'), minItems: 3, maxItems: 4 }),
    rewardIdeas: S('ARRAY', { items: str('a stamp-card rule this shop could use, in Hinglish, e.g. "Har 5 visit par ek free chai"'), minItems: 2, maxItems: 3 }),
    objections: S('ARRAY', {
      items: S('OBJECT', { properties: { q: str('what the owner might say, in Hinglish'), a: str('a short honest answer in Hinglish') }, required: ['q', 'a'] }),
      minItems: 3,
      maxItems: 3,
    }),
    followUp: str('A short follow-up WhatsApp message for 2 or 3 days later if there is no reply, in Roman Hindi (Hindi words in Latin letters, not English). Contains [link] exactly once.'),
  },
  // Gemini fills fields in this order: the Hindi message first, so the Roman one is a transliteration of it.
  propertyOrdering: ['fit', 'whatsappHindi', 'whatsapp', 'callOpener', 'talkingPoints', 'rewardIdeas', 'objections', 'followUp'],
  required: ['fit', 'whatsapp', 'whatsappHindi', 'callOpener', 'talkingPoints', 'rewardIdeas', 'objections', 'followUp'],
});

function pitchPrompt(l: LeadRow) {
  return `You help the founder of Regularhood, a simple loyalty stamp card app for small neighbourhood shops in India, reach out to shop owners.
Write a pitch for this shop. The founder will send it on WhatsApp or use it on a call or visit.

The shop (from Google Maps):
- Name: ${l.name}
- Kind of shop: ${l.category || l.shop_type}${l.shop_type && l.category !== l.shop_type ? ` (found by searching for "${l.shop_type}")` : ''}
- Area: ${l.area}. Address: ${l.address}
- Google rating: ${l.rating ?? 'none'} from ${l.reviews} reviews
- Website: ${l.website ? 'yes' : 'none'}

What Regularhood does (use only these facts):
- A digital stamp card on the customer's phone number. The shop sets one rule: every N visits, one reward, e.g. "har 5 visit par ek free chai".
- At the counter the shop types the customer's phone number and taps "Add visit". That's all. The app says when to give the reward.
- No app, no QR code, no points and no sign-up for customers. Works for customers without a smartphone, only their number is needed.
- One tap sends the customer their card on WhatsApp (nothing is sent automatically): their stamps and how many visits are left, in Hindi and English.
- A list of customers who haven't come back, with a ready "we miss you" WhatsApp message.
- A printable counter poster with the shop's rule.
- Works on any phone. Free to start, set up in one minute.

Language:
- "Hinglish" means Hindi sentences written in Latin letters, the way people in India text on WhatsApp. Example: "Namaste ji, hum Regularhood se hain. Aapke salon ke customers ko har 5 visit par ek free service mile, toh woh baar baar aayenge." It is NOT English: only common words like shop, customer, visit, free, app, link stay in English.
- Write as "hum" (we, the Regularhood team), never "main", so the text works for whoever sends it.

Rules:
- Personal and short, like one shop owner talking to another. Use the shop's name and talk about what its customers buy and how often they come.
- The founder has not visited the shop: never claim you met them, ate there or are a customer. You may say you found the shop on Google Maps and saw its good reviews (only if the rating is 4 or more).
- No statistics, percentages or made-up results, no fake urgency, no competitor names. The only price is "free to start".
- Put [link] where the sign-up link goes; it is replaced with the real link.
- Rewards must suit real prices at this kind of shop (a free small item or service every few visits). Never mention points, QR codes, tiers or bonuses.
- No markdown, at most one emoji per message.`;
}

@Injectable()
export class LeadsService {
  constructor(
    private readonly db: Db,
    private readonly gemini: Gemini,
    private readonly seo: SeoService,
  ) {}

  // ---------------------------------------------------------------- key and settings

  private panelKey() {
    const row = this.db.sql.prepare("SELECT value FROM app_settings WHERE key = 'places_key'").get() as { value: string } | undefined;
    return row ? unseal(row.value) : null;
  }

  private key() {
    return this.panelKey() || process.env.GOOGLE_MAPS_API_KEY?.trim() || '';
  }

  keyInfo() {
    const panel = this.panelKey();
    const env = process.env.GOOGLE_MAPS_API_KEY?.trim();
    const key = panel || env;
    return { source: panel ? ('panel' as const) : env ? ('env' as const) : null, last4: key ? key.slice(-4) : '', envAlsoSet: Boolean(panel && env) };
  }

  setKey(key: string | null) {
    if (key) this.db.sql.prepare("INSERT INTO app_settings (key, value) VALUES ('places_key', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(seal(key));
    else this.db.sql.prepare("DELETE FROM app_settings WHERE key = 'places_key'").run();
  }

  /** Checks a key with an IDs-only search, which Google doesn't bill. Returns an error message, or ''. */
  async check(key = this.key()) {
    if (!key) return 'No key';
    try {
      const res = await fetch(`${API_BASE}/v1/places:searchText`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key, 'x-goog-fieldmask': 'places.id' },
        body: JSON.stringify({ textQuery: 'pharmacy in New Delhi', pageSize: 1 }),
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) return '';
      const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      return `Google ${res.status}: ${body.error?.message ?? 'the key was not accepted'}`;
    } catch (error) {
      return `Could not reach Google: ${(error as Error).message}`;
    }
  }

  settings(): LeadSettings {
    const row = this.db.sql.prepare("SELECT value FROM app_settings WHERE key = 'leads'").get() as { value: string } | undefined;
    return { ...DEFAULTS, ...(row ? (JSON.parse(row.value) as Partial<LeadSettings>) : {}) };
  }

  saveSettings(input: Partial<LeadSettings>) {
    const s = { ...this.settings() };
    const num = (v: unknown, label: string, min: number, max: number) => {
      const n = Number(v);
      if (!Number.isFinite(n) || n < min || n > max) throw new BadRequestException(`${label} must be between ${min} and ${max}`);
      return n;
    };
    if (input.pricePer1000Usd !== undefined) s.pricePer1000Usd = num(input.pricePer1000Usd, 'Price per 1000 calls', 0, 1000);
    if (input.freePerMonth !== undefined) s.freePerMonth = Math.round(num(input.freePerMonth, 'Free calls per month', 0, 100_000));
    if (input.monthlyBudgetUsd !== undefined) s.monthlyBudgetUsd = num(input.monthlyBudgetUsd, 'Monthly budget', 0, 1000);
    this.db.sql.prepare("INSERT INTO app_settings (key, value) VALUES ('leads', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(JSON.stringify(s));
    return s;
  }

  // ---------------------------------------------------------------- costs

  /** Successful Places calls and their billed cost since the 1st of this month (UTC, like Google's billing month). */
  placesMonth() {
    return this.db.sql
      .prepare("SELECT COUNT(*) AS calls, COALESCE(SUM(cost_usd), 0) AS usd FROM places_usage WHERE ok = 1 AND ts >= date('now', 'start of month')")
      .get() as { calls: number; usd: number };
  }

  /** What one more call will cost: nothing while inside the month's free calls. */
  nextCallCost(s = this.settings()) {
    return this.placesMonth().calls < s.freePerMonth ? 0 : s.pricePer1000Usd / 1000;
  }

  // ---------------------------------------------------------------- search

  /** Up to `pages` × 20 shops for "<shop type> in <area>". Shops already found keep their status, notes and pitch. */
  async search(shopType: string, area: string, pages: number) {
    const key = this.key();
    if (!key) throw new BadRequestException('Add a Google Maps (Places API) key first');
    const s = this.settings();
    const sql = this.db.sql;
    const searchId = Number(sql.prepare('INSERT INTO lead_searches (shop_type, area) VALUES (?, ?)').run(shopType, area).lastInsertRowid);
    const upsert = sql.prepare(
      `INSERT INTO leads (place_id, search_id, name, category, shop_type, area, address, phone, mobile, website, maps_url, rating, reviews, lat, lng, score, reasons)
       VALUES (:place_id, :search_id, :name, :category, :shop_type, :area, :address, :phone, :mobile, :website, :maps_url, :rating, :reviews, :lat, :lng, :score, :reasons)
       ON CONFLICT(place_id) DO UPDATE SET name = excluded.name, category = excluded.category, address = excluded.address, phone = excluded.phone,
         mobile = excluded.mobile, website = excluded.website, maps_url = excluded.maps_url, rating = excluded.rating, reviews = excluded.reviews,
         lat = excluded.lat, lng = excluded.lng, score = excluded.score, reasons = excluded.reasons, updated_at = datetime('now')`,
    );
    const exists = sql.prepare('SELECT 1 FROM leads WHERE place_id = ?');

    let found = 0;
    let added = 0;
    let cost = 0;
    let calls = 0;
    let pageToken = '';
    let error = '';
    for (let page = 0; page < pages; page++) {
      // Free calls always go through; a billed one only if it keeps the month inside the budget.
      const price = this.nextCallCost(s);
      if (price > 0 && this.placesMonth().usd + price > s.monthlyBudgetUsd + 1e-9) {
        error = `This month's Places budget ($${s.monthlyBudgetUsd}) is used up`;
        break;
      }
      let places: Place[] = [];
      try {
        const res = await fetch(`${API_BASE}/v1/places:searchText`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': key, 'x-goog-fieldmask': FIELDS },
          body: JSON.stringify({ textQuery: `${shopType} in ${area}`, languageCode: 'en', regionCode: 'IN', pageSize: 20, ...(pageToken ? { pageToken } : {}) }),
          signal: AbortSignal.timeout(30_000),
        });
        const body = (await res.json().catch(() => ({}))) as { places?: Place[]; nextPageToken?: string; error?: { message?: string } };
        if (!res.ok) throw new Error(`Google ${res.status}: ${body.error?.message ?? 'search failed'}`);
        places = body.places ?? [];
        pageToken = body.nextPageToken ?? '';
        calls++;
        cost += price;
        sql.prepare('INSERT INTO places_usage (purpose, ref_id, results, free, cost_usd, ok) VALUES (?, ?, ?, ?, ?, 1)').run('lead-search', searchId, places.length, price ? 0 : 1, price);
      } catch (e) {
        error = (e as Error).message;
        sql.prepare('INSERT INTO places_usage (purpose, ref_id, ok, error) VALUES (?, ?, 0, ?)').run('lead-search', searchId, error.slice(0, 500));
        break;
      }

      this.db.transaction(() => {
        for (const p of places) {
          if (!p.id || p.businessStatus === 'CLOSED_PERMANENTLY') continue;
          found++;
          if (!exists.get(p.id)) added++;
          const { score, reasons } = scoreLead(p);
          const phone = p.internationalPhoneNumber?.trim() ?? '';
          upsert.run({
            place_id: p.id,
            search_id: searchId,
            name: (p.displayName?.text ?? 'Unnamed shop').slice(0, 120),
            category: (p.primaryTypeDisplayName?.text ?? '').slice(0, 60),
            shop_type: shopType,
            area,
            address: (p.formattedAddress ?? '').slice(0, 300),
            phone,
            mobile: isMobile(phone) ? 1 : 0,
            website: (p.websiteUri ?? '').slice(0, 300),
            maps_url: p.googleMapsUri ?? '',
            rating: p.rating ?? null,
            reviews: p.userRatingCount ?? 0,
            lat: p.location?.latitude ?? null,
            lng: p.location?.longitude ?? null,
            score,
            reasons: JSON.stringify(reasons),
          });
        }
      });
      if (!pageToken) break;
    }

    sql.prepare('UPDATE lead_searches SET pages = ?, found = ?, added = ?, cost_usd = ? WHERE id = ?').run(calls, found, added, cost, searchId);
    if (!calls && error) {
      sql.prepare('DELETE FROM lead_searches WHERE id = ?').run(searchId);
      throw new BadRequestException(error);
    }
    return { searchId, found, added, calls, costUsd: cost, error };
  }

  // ---------------------------------------------------------------- leads

  lead(id: number) {
    const row = this.db.sql.prepare('SELECT * FROM leads WHERE id = ?').get(id) as LeadRow | undefined;
    if (!row) throw new NotFoundException('Lead not found');
    return row;
  }

  /** The sign-up link in a pitch: Admin → Growth counts it under "leadfinder", and the lead is marked joined when it's used. */
  link(id: number) {
    return `${SITE}/?utm_source=leadfinder&utm_medium=whatsapp&utm_campaign=lead-${id}`;
  }

  async writePitch(id: number) {
    const lead = this.lead(id);
    const t = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
    const write = async () => {
      const { data, costUsd } = await this.gemini.json<Pitch>(pitchPrompt(lead), PITCH_SCHEMA, this.seo.settings(), { purpose: 'lead-pitch', refId: id });
      const list = (v: unknown, n: number) => (Array.isArray(v) ? v : []).slice(0, n).map((x) => t(x, 300)).filter(Boolean);
      const pitch: Pitch = {
        fit: t(data.fit, 300),
        whatsapp: t(data.whatsapp, 1200),
        whatsappHindi: t(data.whatsappHindi, 1200),
        callOpener: t(data.callOpener, 600),
        talkingPoints: list(data.talkingPoints, 4),
        rewardIdeas: list(data.rewardIdeas, 3),
        objections: (Array.isArray(data.objections) ? data.objections : []).slice(0, 3).map((o) => ({ q: t(o?.q, 200), a: t(o?.a, 400) })).filter((o) => o.q && o.a),
        followUp: t(data.followUp, 800),
      };
      if (!pitch.whatsapp || !pitch.callOpener) throw new Error('The model returned an incomplete pitch');
      const dev = (pitch.whatsappHindi.match(/[ऀ-ॿ]/g) ?? []).length;
      if (dev < pitch.whatsappHindi.length / 3) throw new Error('The Hindi message came back in Latin letters');
      // Hinglish is Hindi in Latin letters: it should be full of words like "hai", "aap", "ke".
      const hindiWords = (text: string) => (text.toLowerCase().match(/\b(hai|hain|aap|aapke|aapki|ke|ka|ki|ko|se|mein|hum|nahi|kar|karein|sakte|liye|bhi|toh)\b/g) ?? []).length;
      if (hindiWords(pitch.whatsapp) < 4 || hindiWords(pitch.followUp) < 2) throw new Error('The Hinglish message came back in English');
      return { pitch, costUsd };
    };
    try {
      // One more try if the answer doesn't pass the checks above (a missing key or budget won't fix itself).
      const result = await write().catch((error: Error) => {
        if (error instanceof AiBudgetError || /No Gemini API key/.test(error.message)) throw error;
        return write();
      });
      this.db.sql
        .prepare("UPDATE leads SET pitch = ?, pitch_cost_usd = pitch_cost_usd + ?, updated_at = datetime('now') WHERE id = ?")
        .run(JSON.stringify(result.pitch), result.costUsd, id);
      return this.view(this.lead(id));
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  /** Marks leads as joined when a shop signed up from their link or with their phone number. */
  syncJoined() {
    this.db.sql.exec(`
      UPDATE leads SET status = 'joined', updated_at = datetime('now')
      WHERE status != 'joined' AND (
        EXISTS (SELECT 1 FROM merchants m WHERE m.signup_source = 'leadfinder' AND m.signup_campaign = 'lead-' || leads.id)
        OR (leads.phone != '' AND EXISTS (SELECT 1 FROM merchants m WHERE m.phone = '+' || replace(replace(substr(leads.phone, 2), ' ', ''), '-', '')))
      )`);
  }

  view(l: LeadRow) {
    const { pitch, reasons, ...rest } = l;
    return { ...rest, reasons: JSON.parse(reasons) as string[], pitch: pitch ? (JSON.parse(pitch) as Pitch) : null, link: this.link(l.id) };
  }
}

// ---------------------------------------------------------------- admin

const STATUSES = ['new', 'contacted', 'interested', 'joined', 'not_interested'];

@Controller('api/admin/leads')
@UseGuards(AdminGuard)
export class LeadsAdminController {
  constructor(
    private readonly leads: LeadsService,
    private readonly gemini: Gemini,
    private readonly seo: SeoService,
    private readonly db: Db,
  ) {}

  /** Leads, searches, settings and what it all cost. */
  @Get()
  overview() {
    this.leads.syncJoined();
    const sql = this.db.sql;
    const s = this.leads.settings();
    const pitchCost = (where: string) =>
      sql.prepare(`SELECT COUNT(*) AS calls, COALESCE(SUM(cost_usd), 0) AS usd FROM ai_usage WHERE purpose = 'lead-pitch' AND ${where}`).get() as { calls: number; usd: number };
    const placesAll = sql.prepare('SELECT COUNT(*) AS calls, COALESCE(SUM(cost_usd), 0) AS usd FROM places_usage WHERE ok = 1').get() as { calls: number; usd: number };
    const usage = sql
      .prepare(
        `SELECT * FROM (
           SELECT 'places' AS kind, id, ts, purpose, ref_id, results, NULL AS model, cost_usd, free, ok, error FROM places_usage
           UNION ALL
           SELECT 'ai' AS kind, id, ts, purpose, ref_id, output_tokens AS results, model, cost_usd, 0 AS free, ok, error FROM ai_usage WHERE purpose = 'lead-pitch'
           UNION ALL
           SELECT 'wa' AS kind, id, created_at AS ts, kind AS purpose, lead_id AS ref_id, 0 AS results, category AS model, cost_usd, 0 AS free,
             status != 'failed' AS ok, error FROM wa_messages WHERE direction = 'out'
         ) ORDER BY ts DESC, id DESC LIMIT 60`,
      )
      .all();
    const waCost = (where: string) =>
      sql.prepare(`SELECT COUNT(*) FILTER (WHERE direction = 'out') AS calls, COALESCE(SUM(cost_usd), 0) AS usd FROM wa_messages WHERE ${where}`).get() as { calls: number; usd: number };
    // Per lead: the latest WhatsApp message each way, to show sent / delivered / read / replied on the list.
    const wa = new Map(
      (
        sql
          .prepare(
            `SELECT lead_id,
               (SELECT status FROM wa_messages o WHERE o.lead_id = m.lead_id AND o.direction = 'out' ORDER BY o.id DESC LIMIT 1) AS last_out,
               MAX(CASE WHEN direction = 'in' THEN created_at END) AS last_in
             FROM wa_messages m WHERE lead_id IS NOT NULL GROUP BY lead_id`,
          )
          .all() as { lead_id: number; last_out: string | null; last_in: string | null }[]
      ).map((r) => [r.lead_id, { lastOut: r.last_out, lastIn: r.last_in }]),
    );
    return {
      settings: s,
      key: this.leads.keyInfo(),
      geminiReady: this.gemini.configured,
      model: this.seo.settings().model,
      usdToInr: this.seo.settings().usdToInr,
      nextCallUsd: this.leads.nextCallCost(s),
      cost: {
        placesMonth: this.leads.placesMonth(),
        placesAll,
        pitchMonth: pitchCost("ts >= date('now', 'start of month')"),
        pitchAll: pitchCost('1 = 1'),
        waMonth: waCost("created_at >= date('now', 'start of month')"),
        waAll: waCost('1 = 1'),
      },
      shopTypes: SHOP_TYPES,
      searches: sql.prepare('SELECT * FROM lead_searches ORDER BY id DESC LIMIT 30').all(),
      leads: (sql.prepare('SELECT * FROM leads ORDER BY score DESC, reviews DESC LIMIT 2000').all() as LeadRow[]).map((l) => ({
        ...this.leads.view(l),
        wa: wa.get(l.id) ?? null,
      })),
      usage,
    };
  }

  @Put('key')
  async setKey(@AdminId() adminId: number, @Body() body: { key?: string }) {
    const key = String(body?.key ?? '').trim();
    if (!/^[\w.\-]{20,200}$/.test(key)) throw new BadRequestException('That doesn’t look like a Google API key');
    const problem = await this.leads.check(key);
    if (problem) throw new BadRequestException(`Key not saved. ${problem}`);
    this.leads.setKey(key);
    this.audit(adminId, `Set a new Google Maps (Places) API key (…${key.slice(-4)})`);
    return this.leads.keyInfo();
  }

  @Delete('key')
  removeKey(@AdminId() adminId: number) {
    this.leads.setKey(null);
    this.audit(adminId, 'Removed the Google Maps (Places) API key set in the admin panel');
    return this.leads.keyInfo();
  }

  /** Checks the key in use with a search Google doesn't bill. */
  @Post('key/test')
  @HttpCode(200)
  async testKey() {
    const problem = await this.leads.check();
    if (problem) throw new BadRequestException(problem);
    return { ok: true };
  }

  @Put('settings')
  saveSettings(@Body() body: Partial<LeadSettings>) {
    return this.leads.saveSettings(body ?? {});
  }

  @Post('search')
  @HttpCode(200)
  search(@Body() body: { shopType?: string; area?: string; pages?: number }) {
    const shopType = String(body?.shopType ?? '').trim().slice(0, 60);
    const area = String(body?.area ?? '').trim().slice(0, 100);
    if (!shopType) throw new BadRequestException('Type a kind of shop');
    if (!area) throw new BadRequestException('Type an area or city, e.g. Vijay Nagar, Indore');
    return this.leads.search(shopType, area, Math.min(3, Math.max(1, Math.round(Number(body?.pages) || 1))));
  }

  @Post(':id/pitch')
  @HttpCode(200)
  pitch(@Param('id', ParseIntPipe) id: number) {
    return this.leads.writePitch(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: { status?: string; notes?: string }) {
    const lead = this.leads.lead(id);
    const status = body?.status ?? lead.status;
    if (!STATUSES.includes(status)) throw new BadRequestException('Unknown status');
    const notes = body?.notes !== undefined ? String(body.notes).slice(0, 2000) : lead.notes;
    this.db.sql
      .prepare(
        `UPDATE leads SET status = ?, notes = ?, updated_at = datetime('now'),
           contacted_at = CASE WHEN ? != 'new' AND contacted_at IS NULL THEN datetime('now') ELSE contacted_at END WHERE id = ?`,
      )
      .run(status, notes, status, id);
    return this.leads.view(this.leads.lead(id));
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    this.leads.lead(id);
    this.db.sql.prepare('DELETE FROM leads WHERE id = ?').run(id);
    return { ok: true };
  }

  private audit(adminId: number, detail: string) {
    this.db.sql.prepare('INSERT INTO admin_log (admin_id, merchant_id, action, detail) VALUES (?, NULL, ?, ?)').run(adminId, 'places_key', detail);
  }
}
