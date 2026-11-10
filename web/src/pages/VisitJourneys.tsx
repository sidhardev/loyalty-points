import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowDownToLine,
  Clock,
  Eye,
  FileText,
  Footprints,
  Keyboard,
  Laptop,
  LogOut,
  MousePointerClick,
  Rocket,
  Smartphone,
  Store,
  Tablet,
  Timer,
  Users,
} from 'lucide-react';
import { LANDING_SECTIONS } from '../analytics';
import { num } from '../api';
import { Sheet } from '../ui';
import type { PageEvent, PageView, VisitShop } from './Visits';

// Superadmin → Visits → Visitor journeys: each visit (one browser tab) as a story — the pages they opened, what they
// clicked, how far they read, which homepage part held them longest, the form fields they started on, and where they
// left. Built from the same views and events as the rest of the Visits page (src/analytics.ts records them).

/** Local calendar date (YYYY-MM-DD) of a moment, in this browser's time zone. */
export const localDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const regionNames = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    return undefined;
  }
})();
export const countryName = (code: string) => (code ? (regionNames?.of(code) ?? code) : 'Unknown');
export const flag = (code: string) =>
  code.length === 2 ? String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0))) : '🌐';

export const source = (v: PageView) => v.utmSource || v.ref || 'Direct';

export function duration(ms: number) {
  if (!ms) return '0s';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** Readable name for a path; masked secret links get a description instead. */
export const pageLabel = (path: string) =>
  path === '/w/…'
    ? 'Customer wallet'
    : path === '/c/…'
      ? 'Bill QR claim'
      : path === '/reset/…'
        ? 'Password reset'
        : path === '/partner/…'
          ? 'Partner page'
          : path.startsWith('/join/')
            ? 'Join a shop'
            : '';

/** Buttons that lead to the sign-up form. */
export const isSignupButton = (name: string) => /start free|create your shop|founding shop/i.test(name);

const SECTION_LABEL = new Map(LANDING_SECTIONS);
const sectionLabel = (key: string) => SECTION_LABEL.get(key) ?? key;
const PAGE_NAMES: Record<string, string> = { '/': 'Homepage', '/app': 'Shop app (sign-up / log in)', '/partners': 'Partner sign-up' };
/** Pages that only render in the browser keep the homepage's title, so a title naming the brand first isn't used. */
const pageName = (v: PageView) =>
  PAGE_NAMES[v.path] || pageLabel(v.path) || (v.title.startsWith('Regularhood') ? '' : v.title.replace(/\s*[·|—-]\s*Regularhood$/, '')) || v.path;

/** "+1:05" from the start of a page view. */
const offset = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `+${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const clock = (t: number | string) => new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
const when = (t: number | string) => new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

type Outcome = 'signup' | 'form' | 'clicked' | 'pricing' | 'read' | 'bounce';
const OUTCOME: Record<Outcome, { label: string; className: string }> = {
  signup: { label: 'Signed up', className: 'j-out-signup' },
  form: { label: 'Started the form', className: 'j-out-form' },
  clicked: { label: 'Clicked sign-up', className: 'j-out-clicked' },
  pricing: { label: 'Saw pricing', className: 'j-out-pricing' },
  read: { label: 'Browsed', className: 'j-out-read' },
  bounce: { label: 'Left quickly', className: 'j-out-bounce' },
};

export type Journey = {
  key: string;
  vid: string;
  views: PageView[];
  events: Map<string, PageEvent[]>;
  start: number;
  end: number;
  time: number;
  clicks: number;
  fields: string[];
  maxScroll: number;
  exit: PageView;
  exitSection: string;
  live: boolean;
  outcome: Outcome;
  first: PageView;
  /** The shop whose owner this was; guess: only matched by what a shop did in the app during the visit. */
  shop?: { id: number; guess: boolean };
};

/**
 * Whose visit: a view sent from a browser logged in to a shop, or one from the same browser that day (the visitor id
 * renews daily); else, for older /app visits, the one shop that used the app at the time.
 */
function shopOf(list: PageView[], byVid: Map<string, number>): Journey['shop'] {
  const tagged = list.find((v) => v.shopId)?.shopId ?? (list[0].vid ? byVid.get(list[0].vid) : undefined);
  if (tagged) return { id: tagged, guess: false };
  const guesses = new Set(list.map((v) => v.shopGuess).filter((id): id is number => !!id));
  return guesses.size === 1 ? { id: [...guesses][0], guess: true } : undefined;
}

/** Groups page views into visits (one browser tab) with their events, newest first. */
export function buildJourneys(views: PageView[], events: PageEvent[], everyView: PageView[] = views): Journey[] {
  const byVid = new Map<string, number>();
  for (const v of everyView) if (v.vid && v.shopId) byVid.set(v.vid, v.shopId);
  const byView = new Map<string, PageEvent[]>();
  for (const e of events) byView.set(e.view, [...(byView.get(e.view) ?? []), e]);
  const sessions = new Map<string, PageView[]>();
  for (const v of views) {
    const key = v.sid || v.id;
    sessions.set(key, [...(sessions.get(key) ?? []), v]);
  }
  const fiveMin = Date.now() - 5 * 60_000;
  return [...sessions.entries()]
    .map(([key, list]): Journey => {
      const sorted = [...list].sort((a, b) => a.ts.localeCompare(b.ts));
      const evs = sorted.flatMap((v) => byView.get(v.id) ?? []);
      const start = Date.parse(sorted[0].ts);
      const end = Math.max(...sorted.map((v) => Date.parse(v.ts) + (v.dur ?? 0)), ...evs.map((e) => Date.parse(e.ts)));
      const exit = sorted[sorted.length - 1];
      const clicks = evs.filter((e) => e.kind === 'click');
      const fields = [...new Set(evs.filter((e) => e.kind === 'form').map((e) => e.name))];
      const time = sorted.reduce((a, v) => a + (v.dur ?? 0), 0);
      const outcome: Outcome = evs.some((e) => e.kind === 'signup')
        ? 'signup'
        : fields.length && sorted.some((v) => v.path.startsWith('/app') || v.path.startsWith('/r/') || v.path.startsWith('/partners'))
          ? 'form'
          : clicks.some((e) => isSignupButton(e.name))
            ? 'clicked'
            : evs.some((e) => e.kind === 'section' && e.name === 'pricing')
              ? 'pricing'
              : sorted.length === 1 && time < 10_000
                ? 'bounce'
                : 'read';
      return {
        key,
        vid: sorted[0].vid,
        views: sorted,
        events: byView,
        start,
        end,
        time,
        clicks: clicks.length,
        fields,
        maxScroll: Math.max(0, ...sorted.map((v) => v.scroll ?? 0)),
        exit,
        exitSection: exit.exit ?? '',
        live: end >= fiveMin && exit.dur === undefined,
        outcome,
        first: sorted[0],
        shop: shopOf(sorted, byVid),
      };
    })
    .sort((a, b) => b.start - a.start);
}

const DeviceIcon = ({ device, size = 15 }: { device: PageView['device']; size?: number }) =>
  device === 'mobile' ? <Smartphone size={size} /> : device === 'tablet' ? <Tablet size={size} /> : <Laptop size={size} />;

const cameFrom = (v: PageView) => {
  if (!v.ref && !v.utmSource && v.refUrl.includes(location.hostname.replace(/^www\./, ''))) return 'Internal link';
  const s = source(v);
  return v.utmCampaign ? `${s} · ${v.utmCampaign}` : s;
};

type Filter = 'all' | 'interested' | 'signup' | 'engaged' | 'bounce' | 'shops';
const FILTERS: { id: Filter; label: string; test: (j: Journey) => boolean }[] = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'interested', label: 'Interested', test: (j) => ['signup', 'form', 'clicked'].includes(j.outcome) },
  { id: 'signup', label: 'Signed up', test: (j) => j.outcome === 'signup' },
  { id: 'engaged', label: 'Stayed 30s+', test: (j) => j.time >= 30_000 },
  { id: 'bounce', label: 'Left quickly', test: (j) => j.outcome === 'bounce' },
  { id: 'shops', label: 'Shop owners', test: (j) => !!j.shop },
];

const PLAN: Record<string, string> = { free: 'Free', grandfathered: 'Early shop', lifetime: 'Founding · lifetime', yearly: 'Founding · yearly' };
/** A date from the database (SQLite "YYYY-MM-DD HH:MM:SS", UTC). */
const dbDay = (t: string) =>
  new Date(t.includes('T') ? t : `${t.replace(' ', 'T')}Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** The shop on a visit row: its name, and "?" when it is only a guess. */
function ShopTag({ j, shops }: { j: Journey; shops: Map<number, VisitShop> }) {
  const s = j.shop && shops.get(j.shop.id);
  if (!j.shop || !s) return null;
  return (
    <span className={`j-shop${j.shop.guess ? ' j-shop-guess' : ''}`} title={j.shop.guess ? 'Likely this shop: it used the app during this visit' : 'Logged in as this shop'}>
      <Store size={12} /> {s.name}
      {j.shop.guess && ' ?'}
    </span>
  );
}

/** The list of visits; a click opens the whole journey. */
export function Journeys({ views, allViews, events, shops, onOpen }: { views: PageView[]; allViews: PageView[]; events: PageEvent[]; shops: Map<number, VisitShop>; onOpen: (key: string) => void }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [limit, setLimit] = useState(25);
  const journeys = useMemo(() => {
    // Only visits with a view in range, but each with all its pages (a visit can cross midnight or a filter).
    const keys = new Set(views.map((v) => v.sid || v.id));
    return buildJourneys(
      allViews.filter((v) => keys.has(v.sid || v.id)),
      events,
      allViews,
    );
  }, [views, allViews, events]);
  const test = FILTERS.find((f) => f.id === filter)!.test;
  const shown = journeys.filter(test);

  return (
    <section className="card">
      <div className="card-head">
        <h2>
          <Footprints size={18} /> Visitor journeys
        </h2>
        <span className="muted small">{num(journeys.length)} visits · tap one for every step</span>
      </div>
      <div className="seg seg-scroll j-filters" role="group" aria-label="Show visits">
        {FILTERS.map((f) => (
          <button key={f.id} className={filter === f.id ? 'active' : ''} onClick={() => setFilter(f.id)}>
            {f.label} <em>{num(journeys.filter(f.test).length)}</em>
          </button>
        ))}
      </div>
      <ul className="j-list">
        {shown.slice(0, limit).map((j) => (
          <li key={j.key}>
            <button className="j-row" onClick={() => onOpen(j.key)}>
              <span className="j-when">
                <strong>{when(j.start)}</strong>
                {j.live ? (
                  <span className="j-live">
                    <span className="live-dot" aria-hidden /> on the site now
                  </span>
                ) : (
                  <span className="muted small">{duration(j.time)} on site</span>
                )}
              </span>
              <span className="j-who">
                <span>
                  {flag(j.first.country)} {countryName(j.first.country)}
                </span>
                <span className="muted small j-dev">
                  <DeviceIcon device={j.first.device} size={13} /> {j.first.browser} · {j.first.os}
                  {j.views.some((v) => v.ret) && ' · returning'}
                </span>
                <ShopTag j={j} shops={shops} />
              </span>
              <span className="j-path">
                <span className="muted small">from {cameFrom(j.first)}</span>
                <span className="j-trail">
                  {j.views.slice(0, 4).map((v, i) => (
                    <span key={v.id} className="j-step">
                      {i > 0 && <span aria-hidden>→</span>}
                      <code>{v.path}</code>
                    </span>
                  ))}
                  {j.views.length > 4 && <span className="muted small">+{j.views.length - 4}</span>}
                </span>
              </span>
              <span className="j-nums">
                <span title="Pages">
                  <Eye size={13} /> {j.views.length}
                </span>
                <span title="Clicks">
                  <MousePointerClick size={13} /> {j.clicks}
                </span>
                <span title="Deepest scroll">
                  <ArrowDownToLine size={13} /> {j.maxScroll}%
                </span>
              </span>
              <span className="j-end">
                <span className={`badge ${OUTCOME[j.outcome].className}`}>{OUTCOME[j.outcome].label}</span>
                {j.exitSection && <span className="muted small">left at {sectionLabel(j.exitSection)}</span>}
              </span>
            </button>
          </li>
        ))}
        {!shown.length && <li className="muted small">No visits like this in this range.</li>}
      </ul>
      {shown.length > limit && (
        <button className="btn btn-ghost btn-sm" onClick={() => setLimit(limit + 50)}>
          Show more
        </button>
      )}
    </section>
  );
}

/** What one event says in the timeline. */
function describe(e: PageEvent): { icon: ReactNode; text: ReactNode; sub?: string; tone?: string } | null {
  if (e.kind === 'signup') return { icon: <Rocket size={15} />, text: <strong>Signed up as a shop</strong>, tone: 'ok' };
  if (e.kind === 'section') return { icon: <Eye size={15} />, text: <>Scrolled to <strong>{sectionLabel(e.name)}</strong></> };
  if (e.kind === 'scroll') return { icon: <ArrowDownToLine size={15} />, text: <>Scrolled {e.name} down the page</>, tone: 'quiet' };
  if (e.kind === 'form') return { icon: <Keyboard size={15} />, text: <>Started filling <strong>{e.name}</strong></>, tone: 'warm' };
  if (e.kind !== 'click') return null;
  if (e.name.startsWith('link: ') || e.name.startsWith('button: ')) {
    const [kind, rest] = [e.name.slice(0, e.name.indexOf(':')), e.name.slice(e.name.indexOf(': ') + 2)];
    const [label, to] = rest.split(' → ');
    return { icon: <MousePointerClick size={15} />, text: <>Clicked {kind} <strong>“{label}”</strong></>, sub: to ? `goes to ${to}` : undefined };
  }
  const [where, label] = e.name.includes(': ') ? [e.name.slice(0, e.name.indexOf(': ')), e.name.slice(e.name.indexOf(': ') + 2)] : ['', e.name];
  if (where === 'faq') return { icon: <FileText size={15} />, text: <>Opened FAQ <strong>“{label}”</strong></> };
  return {
    icon: <MousePointerClick size={15} />,
    text: <>Clicked <strong>“{label}”</strong></>,
    sub: where ? `in ${where}` : undefined,
    tone: isSignupButton(e.name) ? 'warm' : undefined,
  };
}

/** Every step of one visit, page by page, with the time each part of the homepage held them. */
export function JourneySheet({ journeyKey, allViews, events, shops, onOpen, onClose }: { journeyKey: string; allViews: PageView[]; events: PageEvent[]; shops: Map<number, VisitShop>; onOpen: (key: string) => void; onClose: () => void }) {
  const journeys = useMemo(() => buildJourneys(allViews, events), [allViews, events]);
  const j = journeys.find((x) => x.key === journeyKey);
  if (!j) return null;
  const others = j.vid ? journeys.filter((x) => x.vid === j.vid && x.key !== j.key && localDay(new Date(x.start)) === localDay(new Date(j.start))) : [];
  const dwell = new Map<string, number>();
  for (const v of j.views) for (const e of j.events.get(v.id) ?? []) if (e.kind === 'dwell') dwell.set(e.name, Math.max(dwell.get(e.name) ?? 0, e.value ?? 0));
  const known = new Set(LANDING_SECTIONS.map(([k]) => k));
  const dwellRows = [...LANDING_SECTIONS.map(([k]) => k), ...[...dwell.keys()].filter((k) => !known.has(k))].filter((k) => dwell.has(k)).map((k) => ({ key: k, ms: dwell.get(k)! }));
  const longest = dwellRows.reduce<{ key: string; ms: number } | null>((a, r) => (!a || r.ms > a.ms ? r : a), null);
  const maxDwell = Math.max(1, ...dwellRows.map((r) => r.ms));
  const homeExit = [...j.views].reverse().find((v) => v.path === '/')?.exit ?? '';
  const f = j.first;
  const shop = j.shop && shops.get(j.shop.id);

  const facts: [string, ReactNode][] = [
    ['Where', `${flag(f.country)} ${countryName(f.country)}${f.tz ? ` · ${f.tz}` : ''}`],
    ['Device', <><DeviceIcon device={f.device} size={14} /> {f.device} · {f.browser} · {f.os}</>],
    ['Language', f.lang || '—'],
    ['Came from', cameFrom(f)],
    ...(f.refUrl ? ([['Referrer', <span className="j-break">{f.refUrl}</span>]] as [string, ReactNode][]) : []),
    ...(f.utmSource ? ([['Campaign', [f.utmSource, f.utmMedium, f.utmCampaign].filter(Boolean).join(' / ')]] as [string, ReactNode][]) : []),
    ['Visitor', j.views.some((v) => v.ret) ? 'Has been here before' : 'First time on the site'],
  ];

  return (
    <Sheet
      wide
      className="j-sheet"
      onClose={onClose}
      title={
        <>
          <Footprints size={19} /> Visit on {when(j.start)}
        </>
      }
    >
      <div className="j-summary">
        <span className={`badge ${OUTCOME[j.outcome].className}`}>{OUTCOME[j.outcome].label}</span>
        {j.live && (
          <span className="j-live">
            <span className="live-dot" aria-hidden /> on the site now
          </span>
        )}
        <span>
          <Timer size={14} /> {duration(j.time)} on site
        </span>
        <span>
          <Eye size={14} /> {j.views.length} {j.views.length === 1 ? 'page' : 'pages'}
        </span>
        <span>
          <MousePointerClick size={14} /> {j.clicks} {j.clicks === 1 ? 'click' : 'clicks'}
        </span>
        <span>
          <ArrowDownToLine size={14} /> read {j.maxScroll}% at most
        </span>
      </div>

      {shop && j.shop && (
        <div className="j-shop-card">
          <div>
            <span className="muted small">{j.shop.guess ? 'Likely the owner of' : 'Shop owner, logged in as'}</span>
            <strong>
              <Store size={16} />{' '}
              <a href={`#/shops/${shop.id}`} onClick={onClose}>
                {shop.name}
              </a>
            </strong>
          </div>
          <dl>
            <div>
              <dt>Plan</dt>
              <dd>{PLAN[shop.plan] ?? shop.plan}</dd>
            </div>
            <div>
              <dt>Customers</dt>
              <dd>{num(shop.customers)}</dd>
            </div>
            <div>
              <dt>Joined</dt>
              <dd>{dbDay(shop.createdAt)}</dd>
            </div>
            {shop.phone && (
              <div>
                <dt>Phone</dt>
                <dd>{shop.phone}</dd>
              </div>
            )}
            {shop.email && (
              <div>
                <dt>Email</dt>
                <dd className="j-break">{shop.email}</dd>
              </div>
            )}
          </dl>
          {j.shop.guess && <p className="muted small">From before visits were tagged with the shop: this was the only shop using the app at the time.</p>}
        </div>
      )}

      <dl className="j-facts">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      {longest && (
        <div className="j-block">
          <h3>
            <Clock size={16} /> Where they spent time on the homepage
          </h3>
          <p className="muted small">
            Longest on <strong>{sectionLabel(longest.key)}</strong> ({duration(longest.ms)}).
            {homeExit && (
              <>
                {' '}
                Left the homepage while looking at <strong>{sectionLabel(homeExit)}</strong>.
              </>
            )}
          </p>
          <ul className="reach">
            {dwellRows.map((r) => (
              <li key={r.key} className={r.key === longest.key ? 'j-top' : ''}>
                <span className="reach-label">{sectionLabel(r.key)}</span>
                <span className="reach-track">
                  <span className="reach-bar" style={{ width: `${(r.ms / maxDwell) * 100}%` }} />
                </span>
                <span className="reach-num">{duration(r.ms)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="j-block">
        <h3>
          <Footprints size={16} /> Step by step
        </h3>
        <ol className="j-timeline">
          {j.views.map((v, i) => {
            const t0 = Date.parse(v.ts);
            const steps = (j.events.get(v.id) ?? [])
              .filter((e) => e.kind !== 'dwell')
              .sort((a, b) => a.ts.localeCompare(b.ts))
              .map((e) => ({ e, d: describe(e) }))
              .filter((x) => x.d);
            const last = i === j.views.length - 1;
            return (
              <li key={v.id} className="j-page">
                <div className="j-page-head">
                  <span className="j-dot j-dot-page">
                    <FileText size={14} />
                  </span>
                  <div>
                    <strong>
                      {i === 0 ? 'Landed on' : 'Opened'} {pageName(v)}
                    </strong>
                    <span className="muted small">
                      <code>{v.path}</code> · {clock(t0)}
                      {i === 0 && ` · from ${cameFrom(v)}`}
                    </span>
                  </div>
                </div>
                <ul className="j-steps">
                  {steps.map(({ e, d }) => (
                    <li key={`${e.kind}|${e.name}`} className={d!.tone ? `j-tone-${d!.tone}` : ''}>
                      <span className="j-at">{offset(Date.parse(e.ts) - t0)}</span>
                      <span className="j-dot">{d!.icon}</span>
                      <span className="j-text">
                        {d!.text}
                        {d!.sub && <span className="muted small"> {d!.sub}</span>}
                      </span>
                    </li>
                  ))}
                  {!steps.length && v.dur !== undefined && <li className="muted small j-none">Didn’t click or scroll anything here.</li>}
                  <li className="j-leave">
                    <span className="j-at">{v.dur !== undefined ? offset(v.dur) : ''}</span>
                    <span className="j-dot">{v.dur === undefined ? <Eye size={15} /> : last ? <LogOut size={15} /> : <FileText size={15} />}</span>
                    <span className="j-text">
                      {v.dur === undefined ? (
                        j.live && last ? (
                          <strong>Still on this page</strong>
                        ) : (
                          <span className="muted">Time on this page wasn’t recorded</span>
                        )
                      ) : (
                        <>
                          {last ? <strong>Left the site</strong> : 'Moved on'} after {duration(v.dur)} · read {v.scroll ?? 0}% of the page
                          {v.exit && <> · was on {sectionLabel(v.exit)}</>}
                        </>
                      )}
                    </span>
                  </li>
                </ul>
              </li>
            );
          })}
        </ol>
      </div>

      {j.fields.length > 0 && (
        <p className="muted small">
          <Keyboard size={13} /> Form fields they touched: {j.fields.join(', ')}. What they typed is never recorded.
        </p>
      )}

      {others.length > 0 && (
        <div className="j-block">
          <h3>
            <Users size={16} /> Same visitor, other visits that day
          </h3>
          <ul className="j-others">
            {others.map((o) => (
              <li key={o.key}>
                <button className="rank-row" onClick={() => onOpen(o.key)}>
                  <span className="rank-label">
                    {when(o.start)} · {o.views.length} {o.views.length === 1 ? 'page' : 'pages'} · {duration(o.time)}
                  </span>
                  <span className={`badge ${OUTCOME[o.outcome].className}`}>{OUTCOME[o.outcome].label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Sheet>
  );
}
