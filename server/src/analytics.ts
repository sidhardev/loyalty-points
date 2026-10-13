import { Body, Controller, Headers, HttpCode, Injectable, OnModuleDestroy, Post } from '@nestjs/common';
import { Db } from './db';

// Website visits: the public endpoint the site's own tracker (web/src/analytics.ts) sends page views to.
// No cookies and no IP addresses are stored; visitor and session ids are random values the browser keeps
// for a day / a tab, so this counts visits without following anyone around. The superadmin reads them
// at GET /api/admin/analytics.

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|whatsapp|telegram|lighthouse|headless|phantom|puppeteer|playwright|curl|wget|python|axios|node-fetch|go-http/i;
const ID = /^[a-z0-9-]{8,40}$/i;
const KEEP_DAYS = 400;
const EVENT_KINDS = ['click', 'section', 'signup'] as const;
const EVENTS_PER_VIEW = 60;

export type PageView = {
  id: string;
  ts: string;
  path: string;
  title: string;
  ref: string;
  refUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  country: string;
  tz: string;
  lang: string;
  device: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  os: string;
  vid: string;
  sid: string;
  ret: boolean;
  dur?: number;
  scroll?: number;
};

/** Something a visitor did during a page view: clicked a tracked button, reached a homepage section, signed up. */
export type PageEvent = { view: string; kind: (typeof EVENT_KINDS)[number]; name: string; ts: string };

const clip = (value: unknown, max: number) => (typeof value === 'string' ? value.slice(0, max) : '');

/** Wallet, bill and reset links carry secrets, so only their kind is kept. Join codes are public (shop posters). */
export const maskPath = (path: string) => path.replace(/^\/(w|c|reset)\/[^/]+/, '/$1/…');

/** The page a visitor came from, minus anything secret in it (an internal wallet link, say). */
function safeRefUrl(url: string) {
  try {
    const u = new URL(url);
    return maskPath(u.pathname) === u.pathname ? url : `${u.origin}${maskPath(u.pathname)}`;
  } catch {
    return '';
  }
}

function device(ua: string, width: number): PageView['device'] {
  if (/ipad|tablet|kindle|silk/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua))) return 'tablet';
  if (/mobi|iphone|ipod|android/i.test(ua) || (width > 0 && width < 640)) return 'mobile';
  return 'desktop';
}

function browser(ua: string) {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\/|opera/i.test(ua)) return 'Opera';
  if (/samsungbrowser/i.test(ua)) return 'Samsung Internet';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/safari/i.test(ua)) return 'Safari';
  return 'Other';
}

function os(ua: string) {
  if (/windows/i.test(ua)) return 'Windows';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/android/i.test(ua)) return 'Android';
  if (/mac os x|macintosh/i.test(ua)) return 'macOS';
  if (/cros/i.test(ua)) return 'ChromeOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Other';
}

function referrerHost(ref: string, ownHost: string) {
  try {
    const host = new URL(ref).hostname.replace(/^www\./, '');
    return host === ownHost.replace(/^www\./, '') ? '' : host;
  } catch {
    return '';
  }
}

// Fallback location when the proxy does not pass a country header: the browser's IANA time zone
// names a city, which pins the country. Covers the common zones; anything else stays unknown.
const ZONES: Record<string, string> = {
  'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN',
  'Asia/Karachi': 'PK', 'Asia/Dhaka': 'BD', 'Asia/Kathmandu': 'NP', 'Asia/Katmandu': 'NP', 'Asia/Colombo': 'LK',
  'Asia/Thimphu': 'BT', 'Indian/Maldives': 'MV', 'Asia/Kabul': 'AF',
  'Asia/Dubai': 'AE', 'Asia/Muscat': 'OM', 'Asia/Qatar': 'QA', 'Asia/Bahrain': 'BH', 'Asia/Kuwait': 'KW',
  'Asia/Riyadh': 'SA', 'Asia/Tehran': 'IR', 'Asia/Baghdad': 'IQ', 'Asia/Jerusalem': 'IL', 'Asia/Tel_Aviv': 'IL',
  'Asia/Amman': 'JO', 'Asia/Beirut': 'LB', 'Europe/Istanbul': 'TR', 'Asia/Istanbul': 'TR',
  'Asia/Singapore': 'SG', 'Asia/Kuala_Lumpur': 'MY', 'Asia/Jakarta': 'ID', 'Asia/Makassar': 'ID',
  'Asia/Bangkok': 'TH', 'Asia/Ho_Chi_Minh': 'VN', 'Asia/Saigon': 'VN', 'Asia/Manila': 'PH', 'Asia/Yangon': 'MM',
  'Asia/Phnom_Penh': 'KH', 'Asia/Hong_Kong': 'HK', 'Asia/Shanghai': 'CN', 'Asia/Chongqing': 'CN', 'Asia/Urumqi': 'CN',
  'Asia/Taipei': 'TW', 'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR', 'Asia/Ulaanbaatar': 'MN',
  'Asia/Tashkent': 'UZ', 'Asia/Almaty': 'KZ', 'Asia/Tbilisi': 'GE', 'Asia/Yerevan': 'AM', 'Asia/Baku': 'AZ',
  'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU', 'Australia/Perth': 'AU',
  'Australia/Adelaide': 'AU', 'Australia/Hobart': 'AU', 'Australia/Darwin': 'AU', 'Pacific/Auckland': 'NZ',
  'Pacific/Fiji': 'FJ',
  'Europe/London': 'GB', 'Europe/Dublin': 'IE', 'Europe/Lisbon': 'PT', 'Europe/Madrid': 'ES', 'Europe/Paris': 'FR',
  'Europe/Brussels': 'BE', 'Europe/Amsterdam': 'NL', 'Europe/Luxembourg': 'LU', 'Europe/Berlin': 'DE',
  'Europe/Zurich': 'CH', 'Europe/Vienna': 'AT', 'Europe/Rome': 'IT', 'Europe/Prague': 'CZ', 'Europe/Warsaw': 'PL',
  'Europe/Budapest': 'HU', 'Europe/Copenhagen': 'DK', 'Europe/Stockholm': 'SE', 'Europe/Oslo': 'NO',
  'Europe/Helsinki': 'FI', 'Europe/Tallinn': 'EE', 'Europe/Riga': 'LV', 'Europe/Vilnius': 'LT', 'Europe/Athens': 'GR',
  'Europe/Bucharest': 'RO', 'Europe/Sofia': 'BG', 'Europe/Belgrade': 'RS', 'Europe/Zagreb': 'HR', 'Europe/Kiev': 'UA',
  'Europe/Kyiv': 'UA', 'Europe/Minsk': 'BY', 'Europe/Moscow': 'RU', 'Atlantic/Reykjavik': 'IS',
  'America/New_York': 'US', 'America/Detroit': 'US', 'America/Chicago': 'US', 'America/Denver': 'US',
  'America/Phoenix': 'US', 'America/Los_Angeles': 'US', 'America/Anchorage': 'US', 'Pacific/Honolulu': 'US',
  'America/Indiana/Indianapolis': 'US', 'America/Boise': 'US',
  'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Edmonton': 'CA', 'America/Winnipeg': 'CA',
  'America/Halifax': 'CA', 'America/St_Johns': 'CA', 'America/Regina': 'CA',
  'America/Mexico_City': 'MX', 'America/Monterrey': 'MX', 'America/Tijuana': 'MX', 'America/Cancun': 'MX',
  'America/Bogota': 'CO', 'America/Lima': 'PE', 'America/Caracas': 'VE', 'America/Santiago': 'CL',
  'America/Argentina/Buenos_Aires': 'AR', 'America/Buenos_Aires': 'AR', 'America/Sao_Paulo': 'BR',
  'America/Montevideo': 'UY', 'America/Guayaquil': 'EC', 'America/La_Paz': 'BO', 'America/Asuncion': 'PY',
  'America/Panama': 'PA', 'America/Costa_Rica': 'CR', 'America/Guatemala': 'GT', 'America/Puerto_Rico': 'PR',
  'America/Jamaica': 'JM', 'America/Santo_Domingo': 'DO',
  'Africa/Cairo': 'EG', 'Africa/Lagos': 'NG', 'Africa/Nairobi': 'KE', 'Africa/Johannesburg': 'ZA',
  'Africa/Casablanca': 'MA', 'Africa/Algiers': 'DZ', 'Africa/Tunis': 'TN', 'Africa/Accra': 'GH',
  'Africa/Addis_Ababa': 'ET', 'Africa/Dar_es_Salaam': 'TZ', 'Africa/Kampala': 'UG', 'Africa/Kigali': 'RW',
};

type Row = {
  id: string;
  ts: string;
  path: string;
  title: string;
  ref: string;
  ref_url: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  country: string;
  tz: string;
  lang: string;
  device: PageView['device'];
  browser: string;
  os: string;
  vid: string;
  sid: string;
  ret: number;
  dur: number | null;
  scroll: number | null;
};

@Injectable()
export class AnalyticsStore implements OnModuleDestroy {
  private pruneTimer: NodeJS.Timeout;

  constructor(private readonly db: Db) {
    this.prune();
    this.pruneTimer = setInterval(() => this.prune(), 24 * 3_600_000);
    this.pruneTimer.unref();
  }

  /** Page views and their events older than about 13 months are deleted. */
  private prune() {
    this.db.sql.prepare(`DELETE FROM page_views WHERE day < date('now', '-${KEEP_DAYS} days')`).run();
    this.db.sql.prepare(`DELETE FROM page_events WHERE day < date('now', '-${KEEP_DAYS} days')`).run();
  }

  addView(v: PageView) {
    this.db.sql
      .prepare(
        `INSERT OR IGNORE INTO page_views (id, ts, day, path, title, ref, ref_url, utm_source, utm_medium, utm_campaign,
           country, tz, lang, device, browser, os, vid, sid, ret)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(v.id, v.ts, v.ts.slice(0, 10), v.path, v.title, v.ref, v.refUrl, v.utmSource, v.utmMedium, v.utmCampaign,
        v.country, v.tz, v.lang, v.device, v.browser, v.os, v.vid, v.sid, v.ret ? 1 : 0);
  }

  /** "Leave" can be sent more than once per view; only a longer visible time replaces the stored one. */
  finishView(id: string, dur: number, scroll: number) {
    this.db.sql
      .prepare(
        `UPDATE page_views SET dur = :dur, scroll = MAX(COALESCE(scroll, 0), :scroll)
         WHERE id = :id AND (dur IS NULL OR dur < :dur) AND ts >= :since`,
      )
      .run({ id, dur, scroll, since: new Date(Date.now() - 86_400_000).toISOString() });
  }

  /** Events count only for a page view from the last day, each once, and at most EVENTS_PER_VIEW per view. */
  addEvent(view: string, kind: PageEvent['kind'], name: string) {
    const now = new Date().toISOString();
    this.db.sql
      .prepare(
        `INSERT OR IGNORE INTO page_events (view_id, kind, name, ts, day)
         SELECT id, :kind, :name, :now, :day FROM page_views
         WHERE id = :view AND ts >= :since AND (SELECT COUNT(*) FROM page_events WHERE view_id = :view) < :max`,
      )
      .run({ view, kind, name, now, day: now.slice(0, 10), since: new Date(Date.now() - 86_400_000).toISOString(), max: EVENTS_PER_VIEW });
  }

  /** Events on the UTC days from..to. */
  events(from: string, to: string): PageEvent[] {
    return this.db.sql
      .prepare('SELECT view_id AS view, kind, name, ts FROM page_events WHERE day BETWEEN ? AND ? ORDER BY ts')
      .all(from, to) as PageEvent[];
  }

  /** Every view on the UTC days from..to (YYYY-MM-DD); the dashboard does the counting. */
  views(from: string, to: string): PageView[] {
    const rows = this.db.sql.prepare('SELECT * FROM page_views WHERE day BETWEEN ? AND ? ORDER BY ts').all(from, to) as Row[];
    return rows.map((r) => ({
      id: r.id,
      ts: r.ts,
      path: r.path,
      title: r.title,
      ref: r.ref,
      refUrl: r.ref_url,
      utmSource: r.utm_source,
      utmMedium: r.utm_medium,
      utmCampaign: r.utm_campaign,
      country: r.country,
      tz: r.tz,
      lang: r.lang,
      device: r.device,
      browser: r.browser,
      os: r.os,
      vid: r.vid,
      sid: r.sid,
      ret: r.ret === 1,
      ...(r.dur !== null ? { dur: r.dur, scroll: r.scroll ?? 0 } : {}),
    }));
  }

  onModuleDestroy() {
    clearInterval(this.pruneTimer);
  }
}

@Controller('api')
export class AnalyticsController {
  constructor(private readonly store: AnalyticsStore) {}

  @Post('collect')
  @HttpCode(204)
  collect(
    @Body() body: Record<string, unknown>,
    @Headers('user-agent') ua = '',
    @Headers('x-vercel-ip-country') vercelCountry?: string,
    @Headers('cloudfront-viewer-country') cfCountry?: string,
  ) {
    if (!body || BOT.test(ua) || !ID.test(String(body.id ?? ''))) return;

    if (body.t === 'leave') {
      const dur = Math.round(Number(body.dur));
      const scroll = Math.round(Number(body.scroll));
      if (!(dur >= 0 && dur < 6 * 3600_000)) return;
      this.store.finishView(String(body.id), dur, Math.min(100, Math.max(0, scroll || 0)));
      return;
    }

    if (body.t === 'event') {
      const kind = EVENT_KINDS.find((k) => k === body.kind);
      const name = clip(body.name, 100).trim();
      if (kind && name) this.store.addEvent(String(body.id), kind, name);
      return;
    }

    if (body.t !== 'view') return;
    const ts = clip(body.ts, 30);
    const now = Date.now();
    // Accept the browser's start time only if its clock is sane.
    const start = Math.abs(Date.parse(ts) - now) < 10 * 60_000 ? new Date(ts).toISOString() : new Date(now).toISOString();
    const rawPath = clip(body.path, 300);
    if (!rawPath.startsWith('/') || rawPath.startsWith('/admin')) return;
    const path = maskPath(rawPath);

    const tz = clip(body.tz, 60);
    const refUrl = clip(body.ref, 500);
    this.store.addView({
      id: String(body.id),
      ts: start,
      path,
      // Wallet pages are titled with the shop and customer, so masked pages keep no title.
      title: path === rawPath ? clip(body.title, 200) : '',
      ref: referrerHost(refUrl, clip(body.host, 100)),
      refUrl: safeRefUrl(refUrl),
      utmSource: clip(body.utmSource, 100),
      utmMedium: clip(body.utmMedium, 100),
      utmCampaign: clip(body.utmCampaign, 100),
      country: (vercelCountry || cfCountry || ZONES[tz] || '').slice(0, 2).toUpperCase(),
      tz,
      lang: clip(body.lang, 20),
      device: device(ua, Number(body.w) || 0),
      browser: browser(ua),
      os: os(ua),
      vid: ID.test(String(body.vid ?? '')) ? String(body.vid) : '',
      sid: ID.test(String(body.sid ?? '')) ? String(body.sid) : '',
      ret: body.ret === true,
    });
  }
}
