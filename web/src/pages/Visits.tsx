import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Activity, BarChart3, Clock, Eye, Globe2, Home, MousePointerClick, RefreshCw, Rocket, ScrollText, Users, X as XIcon } from 'lucide-react';
import { LANDING_SECTIONS } from '../analytics';
import { num } from '../api';
import { ErrorText, Skeleton } from '../ui';

// Superadmin → Visits: website traffic from the site's own tracker (src/analytics.ts). The server returns raw page
// views and everything is counted here. Days follow this browser's time zone, so "Today" means your today.

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

/** Something a visitor did during a page view (see src/analytics.ts). */
export type PageEvent = { view: string; kind: 'click' | 'section' | 'signup'; name: string; ts: string };

type Range = 'today' | '7d' | '30d' | '90d' | 'custom';
type Dim = 'path' | 'source' | 'country' | 'device' | 'browser' | 'os';

const RANGES: { id: Range; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: 'custom', label: 'Custom' },
];

const DIM_LABEL: Record<Dim, string> = { path: 'Page', source: 'Source', country: 'Country', device: 'Device', browser: 'Browser', os: 'OS' };

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};
/** Local calendar date (YYYY-MM-DD) of a moment, in this browser's time zone. */
const localDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const localToday = () => localDay(new Date());

function stored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}
function useStored<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => stored(key, fallback));
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // A convenience only; the page works without storage.
    }
  }, [key, value]);
  return [value, setValue] as const;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Rounds a max value up to a tidy axis top, with 4 equal steps. */
function niceTicks(max: number) {
  if (max <= 0) return [0];
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw)!;
  return [0, 1, 2, 3, 4].map((i) => i * step);
}

const regionNames = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    return undefined;
  }
})();
const countryName = (code: string) => (code ? (regionNames?.of(code) ?? code) : 'Unknown');
const flag = (code: string) =>
  code.length === 2 ? String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0))) : '🌐';

const source = (v: PageView) => v.utmSource || v.ref || 'Direct';
const visitorKey = (v: PageView) => `${localDay(new Date(v.ts))}|${v.vid || v.sid || v.id}`;

function duration(ms: number) {
  if (!ms) return '0s';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

const dimValue = (v: PageView, dim: Dim) => (dim === 'path' ? v.path : dim === 'source' ? source(v) : dim === 'country' ? v.country : v[dim]);

type Point = { key: string; label: string; visitors: number; views: number };

function TrendChart({ points }: { points: Point[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const height = 240;
  const pad = { top: 12, right: 24, bottom: 26, left: 44 };
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;
  const ticks = niceTicks(Math.max(4, ...points.map((p) => p.views)));
  const top = ticks[ticks.length - 1] || 1;
  const step = points.length > 1 ? innerW / (points.length - 1) : 0;
  const x = (i: number) => pad.left + (points.length > 1 ? step * i : innerW / 2);
  const y = (v: number) => pad.top + innerH - (v / top) * innerH;
  const line = (key: 'visitors' | 'views') => points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p[key])}`).join('');
  const area = `${line('views')}L${x(points.length - 1)},${y(0)}L${x(0)},${y(0)}Z`;
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(1, Math.floor(innerW / 70))));
  const hovered = hover !== null ? points[hover] : undefined;

  const onMove = (e: MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = points.length > 1 ? Math.round((e.clientX - rect.left - step / 2) / step) : 0;
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };

  return (
    <div className="chart" ref={ref}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Visitors and page views over time">
          {ticks.map((t) => (
            <g key={t}>
              <line className="grid-line" x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} />
              <text className="axis" x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
                {num(t)}
              </text>
            </g>
          ))}
          {points.map((p, i) =>
            i % labelEvery === 0 ? (
              <text key={p.key} className="axis" x={x(i)} y={height - 8} textAnchor="middle">
                {p.label}
              </text>
            ) : null,
          )}
          <path className="trend-area" d={area} />
          <path className="trend-line trend-views" d={line('views')} />
          <path className="trend-line trend-visitors" d={line('visitors')} />
          {hovered && (
            <>
              <line className="trend-cross" x1={x(hover!)} x2={x(hover!)} y1={pad.top} y2={y(0)} />
              <circle className="trend-dot trend-views" cx={x(hover!)} cy={y(hovered.views)} r={4.5} />
              <circle className="trend-dot trend-visitors" cx={x(hover!)} cy={y(hovered.visitors)} r={4.5} />
            </>
          )}
          <rect
            className="trend-hit"
            x={pad.left - step / 2}
            y={pad.top}
            width={innerW + step}
            height={innerH}
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
          />
        </svg>
      )}
      {hovered && (
        <div className="tip" style={{ left: Math.min(Math.max(x(hover!), 90), width - 90), top: Math.max(0, y(hovered.views) - 90) }}>
          <strong>{hovered.label}</strong>
          <span>
            <i className="dot dot-visitors" /> Visitors <b>{num(hovered.visitors)}</b>
          </span>
          <span>
            <i className="dot dot-views" /> Page views <b>{num(hovered.views)}</b>
          </span>
        </div>
      )}
    </div>
  );
}

type Row = { key: string; label: string; sub?: string; visitors: number; views: number; avg: number };

function Ranked({
  title,
  rows,
  total,
  onPick,
  columns = 'visitors',
}: {
  title: ReactNode;
  rows: Row[];
  total: number;
  onPick: (key: string) => void;
  columns?: 'visitors' | 'pages';
}) {
  const [limit, setLimit] = useState(8);
  const max = Math.max(1, ...rows.map((r) => (columns === 'pages' ? r.views : r.visitors)));
  return (
    <section className="card">
      <div className="card-head">
        <h2>{title}</h2>
        <span className="rank-cols">
          {columns === 'pages' ? (
            <>
              <span>Views</span>
              <span>Avg time</span>
            </>
          ) : (
            <span>Visitors</span>
          )}
        </span>
      </div>
      <ul className="rank">
        {rows.slice(0, limit).map((r) => (
          <li key={r.key}>
            <button className="rank-row" onClick={() => onPick(r.key)} title="Filter by this">
              <span className="rank-bar" style={{ width: `${((columns === 'pages' ? r.views : r.visitors) / max) * 100}%` }} />
              <span className="rank-label">
                {r.label}
                {r.sub && <em>{r.sub}</em>}
              </span>
              {columns === 'pages' ? (
                <>
                  <span className="rank-num">{num(r.views)}</span>
                  <span className="rank-num muted">{duration(r.avg)}</span>
                </>
              ) : (
                <span className="rank-num">
                  {num(r.visitors)} <em>{total ? pct(r.visitors / total) : ''}</em>
                </span>
              )}
            </button>
          </li>
        ))}
        {!rows.length && <li className="muted small">No data yet.</li>}
      </ul>
      {rows.length > limit && (
        <button className="btn btn-ghost btn-sm" onClick={() => setLimit(limit + 20)}>
          Show more
        </button>
      )}
    </section>
  );
}

function group(list: PageView[], key: (v: PageView) => string, label: (k: string) => string = (k) => k, sub?: (k: string, vs: PageView[]) => string) {
  const map = new Map<string, PageView[]>();
  for (const v of list) map.set(key(v), [...(map.get(key(v)) ?? []), v]);
  return [...map.entries()]
    .map(([k, vs]): Row => {
      const timed = vs.filter((v) => v.dur !== undefined);
      return {
        key: k,
        label: label(k),
        sub: sub?.(k, vs),
        visitors: new Set(vs.map(visitorKey)).size,
        views: vs.length,
        avg: timed.length ? timed.reduce((a, v) => a + (v.dur ?? 0), 0) / timed.length : 0,
      };
    })
    .sort((a, b) => b.visitors - a.visitors || b.views - a.views);
}

/** Readable name for a path; masked secret links get a description instead. */
const pageLabel = (path: string) =>
  path === '/w/…' ? 'Customer wallet' : path === '/c/…' ? 'Bill QR claim' : path === '/reset/…' ? 'Password reset' : path.startsWith('/join/') ? 'Join a shop' : '';

/** Buttons that lead to the sign-up form. */
const isSignupButton = (name: string) => /start free|create your shop/i.test(name);

/**
 * Homepage: which buttons visitors click, how far down they read, and which clicks end in a sign-up in the same visit
 * (one browser tab). Counts only homepage views that recorded events, so visits from before this tracking existed
 * don't drag the percentages down.
 */
function HomepageInsights({ views, allViews, events }: { views: PageView[]; allViews: PageView[]; events: PageEvent[] }) {
  const data = useMemo(() => {
    const byView = new Map<string, PageEvent[]>();
    for (const e of events) byView.set(e.view, [...(byView.get(e.view) ?? []), e]);
    const sessionOf = new Map(allViews.map((v) => [v.id, v.sid || v.id]));
    const signedUp = new Set(events.filter((e) => e.kind === 'signup').map((e) => sessionOf.get(e.view)).filter(Boolean));

    const home = views.filter((v) => v.path === '/' && byView.has(v.id));
    const sessions = new Set(home.map((v) => v.sid || v.id));
    const clicks = new Map<string, Set<string>>();
    const reached = new Map<string, number>();
    for (const v of home) {
      for (const e of byView.get(v.id)!) {
        if (e.kind === 'click') clicks.set(e.name, (clicks.get(e.name) ?? new Set()).add(v.sid || v.id));
        if (e.kind === 'section') reached.set(e.name, (reached.get(e.name) ?? 0) + 1);
      }
    }
    const clickedSignup = new Set([...clicks].filter(([name]) => isSignupButton(name)).flatMap(([, s]) => [...s]));
    const buttons = [...clicks]
      .map(([name, s]) => {
        const [where, label] = name.includes(': ') ? [name.slice(0, name.indexOf(': ')), name.slice(name.indexOf(': ') + 2)] : ['', name];
        return { name, where, label, visits: s.size, signups: [...s].filter((x) => signedUp.has(x)).length };
      })
      .sort((a, b) => b.visits - a.visits || b.signups - a.signups);
    const known = new Set(LANDING_SECTIONS.map(([k]) => k));
    const sections = [...LANDING_SECTIONS, ...[...reached.keys()].filter((k) => !known.has(k)).map((k): [string, string] => [k, k])].map(([key, label]) => ({
      key,
      label,
      share: home.length ? (reached.get(key) ?? 0) / home.length : 0,
    }));
    return {
      views: home.length,
      visits: sessions.size,
      clickedSignup: clickedSignup.size,
      signups: [...sessions].filter((x) => signedUp.has(x)).length,
      pricing: home.length ? (reached.get('pricing') ?? 0) / home.length : 0,
      buttons,
      sections,
    };
  }, [views, allViews, events]);

  const share = (n: number) => (data.visits ? pct(n / data.visits) : '—');

  return (
    <section className="card">
      <div className="card-head">
        <h2>
          <Home size={18} /> Homepage: what visitors do
        </h2>
        <span className="muted small">{num(data.visits)} visits with tracking</span>
      </div>
      {!data.views ? (
        <p className="muted small">No homepage visits with click tracking in this range yet. Clicks and scrolling are recorded from now on.</p>
      ) : (
        <>
          <div className="stats home-stats">
            {[
              { icon: Home, label: 'Homepage visits', value: num(data.visits), sub: `${num(data.views)} page views` },
              { icon: MousePointerClick, label: 'Clicked sign-up', value: share(data.clickedSignup), sub: `${num(data.clickedSignup)} ${data.clickedSignup === 1 ? 'visit' : 'visits'} clicked Start free` },
              { icon: Rocket, label: 'Signed up', value: share(data.signups), sub: `${num(data.signups)} ${data.signups === 1 ? 'shop' : 'shops'}, in the same visit` },
              { icon: ScrollText, label: 'Read to pricing', value: pct(data.pricing), sub: 'of homepage views' },
            ].map(({ icon: Icon, label, value, sub }) => (
              <div className="stat" key={label}>
                <span className="stat-label">
                  <Icon size={16} /> {label}
                </span>
                <strong>{value}</strong>
                <em>{sub}</em>
              </div>
            ))}
          </div>

          <div className="grid-2 visits-grid">
            <div className="home-block">
              <h3>Buttons clicked</h3>
              <div className="table-wrap">
                <table className="admin-table visits-table">
                  <thead>
                    <tr>
                      <th>Button</th>
                      <th className="num">Visits</th>
                      <th className="num">Signed up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.buttons.map((b) => (
                      <tr key={b.name}>
                        <td className="home-button">
                          <strong>{b.label}</strong>
                          {b.where && <span className="muted small">{b.where}</span>}
                        </td>
                        <td className="num">
                          {num(b.visits)} <span className="muted small">{share(b.visits)}</span>
                        </td>
                        <td className="num">{b.signups ? num(b.signups) : <span className="muted">—</span>}</td>
                      </tr>
                    ))}
                    {!data.buttons.length && (
                      <tr>
                        <td colSpan={3} className="muted">
                          No clicks yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="home-block">
              <h3>How far down they read</h3>
              <ul className="reach">
                {data.sections.map((sec, i) => {
                  const drop = i ? data.sections[i - 1].share - sec.share : 0;
                  return (
                    <li key={sec.key}>
                      <span className="reach-label">{sec.label}</span>
                      <span className="reach-track">
                        <span className="reach-bar" style={{ width: `${sec.share * 100}%` }} />
                      </span>
                      <span className="reach-num">
                        {pct(sec.share)}
                        {drop >= 0.1 && <em> −{pct(drop)}</em>}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="muted small">Share of homepage views that scrolled to each part. A big drop shows where people lose interest.</p>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export function VisitsPage({ fetchViews }: { fetchViews: (from: string, to: string) => Promise<{ views: PageView[]; events: PageEvent[] }> }) {
  const [range, setRange] = useStored<Range>('lp_admin_visits_range', '7d');
  const [custom, setCustom] = useStored('lp_admin_visits_custom', { from: addDays(localToday(), -29), to: localToday() });
  const [filters, setFilters] = useState<Partial<Record<Dim, string>>>({});
  const [views, setViews] = useState<PageView[] | null>(null);
  const [events, setEvents] = useState<PageEvent[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tech, setTech] = useState<'device' | 'browser' | 'os'>('device');
  const [pagesMode, setPagesMode] = useState<'all' | 'entry'>('all');

  const [from, to] = useMemo((): [string, string] => {
    const t = localToday();
    if (range === 'today') return [t, t];
    if (range === '7d') return [addDays(t, -6), t];
    if (range === '30d') return [addDays(t, -29), t];
    if (range === '90d') return [addDays(t, -89), t];
    return custom.from <= custom.to ? [custom.from, custom.to] : [custom.to, custom.from];
  }, [range, custom]);

  const load = useCallback(() => {
    setLoading(true);
    // Days are stored in UTC; fetch one extra day each side and keep the local days here.
    fetchViews(addDays(from, -1), addDays(to, 1))
      .then((d) => {
        setViews(d.views);
        setEvents(d.events);
        setError('');
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [from, to, fetchViews]);
  useEffect(load, [load]);

  const inRange = useMemo(
    () =>
      (views ?? []).filter((v) => {
        const d = localDay(new Date(v.ts));
        return d >= from && d <= to;
      }),
    [views, from, to],
  );
  const filtered = useMemo(
    () => inRange.filter((v) => (Object.entries(filters) as [Dim, string][]).every(([dim, val]) => dimValue(v, dim) === val)),
    [inRange, filters],
  );

  const stats = useMemo(() => {
    const sessions = new Map<string, PageView[]>();
    for (const v of filtered) {
      const key = v.sid || v.id;
      sessions.set(key, [...(sessions.get(key) ?? []), v]);
    }
    const all = [...sessions.values()];
    const timed = filtered.filter((v) => v.dur !== undefined);
    const visitTime = all.map((s) => s.reduce((a, v) => a + (v.dur ?? 0), 0));
    const fiveMin = Date.now() - 5 * 60_000;
    return {
      sessions,
      visitors: new Set(filtered.map(visitorKey)).size,
      visits: sessions.size,
      views: filtered.length,
      perVisit: sessions.size ? filtered.length / sessions.size : 0,
      avgTime: timed.length ? timed.reduce((a, v) => a + (v.dur ?? 0), 0) / timed.length : 0,
      visitDuration: visitTime.length ? visitTime.reduce((a, b) => a + b, 0) / visitTime.length : 0,
      bounce: sessions.size ? all.filter((s) => s.length === 1).length / sessions.size : 0,
      returning: sessions.size ? all.filter((s) => s.some((v) => v.ret)).length / sessions.size : 0,
      active: new Set((views ?? []).filter((v) => Date.parse(v.ts) >= fiveMin).map((v) => v.sid || v.id)).size,
    };
  }, [filtered, views]);

  const points = useMemo((): Point[] => {
    const hourly = from === to;
    const buckets = new Map<string, { label: string; visitors: Set<string>; views: number }>();
    if (hourly) {
      for (let h = 0; h < 24; h++) {
        buckets.set(String(h), { label: new Date(2000, 0, 1, h).toLocaleTimeString('en-IN', { hour: 'numeric' }), visitors: new Set(), views: 0 });
      }
    } else {
      for (let d = from; d <= to; d = addDays(d, 1)) {
        buckets.set(d, { label: new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), visitors: new Set(), views: 0 });
      }
    }
    for (const v of filtered) {
      const date = new Date(v.ts);
      const b = buckets.get(hourly ? String(date.getHours()) : localDay(date));
      if (!b) continue;
      b.views += 1;
      b.visitors.add(v.vid || v.sid || v.id);
    }
    return [...buckets.entries()].map(([key, b]) => ({ key, label: b.label, visitors: b.visitors.size, views: b.views }));
  }, [filtered, from, to]);

  const entryViews = useMemo(() => [...stats.sessions.values()].map((s) => s.reduce((first, v) => (v.ts < first.ts ? v : first))), [stats.sessions]);
  const titleOf = useMemo(() => new Map(filtered.map((v) => [v.path, v.title])), [filtered]);

  const pages = group(pagesMode === 'entry' ? entryViews : filtered, (v) => v.path, (k) => k, (k) => pageLabel(k) || (titleOf.get(k) ?? '').replace(/\s*[·|—-]\s*Regularhood$/, '')).sort(
    (a, b) => b.views - a.views,
  );
  const sources = group(entryViews, source, (k) => k, (_k, vs) => (vs[0].utmSource ? 'campaign' : vs[0].ref ? 'referral' : 'typed or bookmarked'));
  const countries = group(entryViews, (v) => v.country, (k) => `${flag(k)} ${countryName(k)}`);
  const techRows = group(entryViews, (v) => v[tech]);
  const recent = [...filtered].sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 30);

  const pick = (dim: Dim) => (value: string) => setFilters((f) => ({ ...f, [dim]: value }));
  const filterLabel = (dim: Dim, value: string) => (dim === 'country' ? `${flag(value)} ${countryName(value)}` : value);

  const tiles = [
    { icon: Users, label: 'Visitors', value: num(stats.visitors), sub: `${pct(stats.returning)} of visits returning` },
    { icon: MousePointerClick, label: 'Visits', value: num(stats.visits), sub: `${stats.perVisit.toFixed(1)} pages per visit` },
    { icon: Eye, label: 'Page views', value: num(stats.views), sub: `${num(new Set(filtered.map((v) => v.path)).size)} different pages` },
    { icon: Clock, label: 'Time on page', value: duration(stats.avgTime), sub: `${duration(stats.visitDuration)} per visit` },
    { icon: Activity, label: 'Bounce rate', value: pct(stats.bounce), sub: 'left after one page' },
    {
      icon: Globe2,
      label: 'Countries',
      value: num(new Set(filtered.map((v) => v.country).filter(Boolean)).size),
      sub: countries[0] ? `most from ${countryName(countries[0].key)}` : '—',
    },
  ];

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Visits</h1>
          <p>Who visits the website, where they come from, and what they look at. No cookies, no personal data.</p>
        </div>
        <div className="visits-actions">
          <span className="live">
            <span className="live-dot" aria-hidden /> {num(stats.active)} active now
          </span>
          <button className="btn btn-soft btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </header>

      <section className="card visits-filters">
        <div className="seg seg-scroll" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <button key={r.id} className={range === r.id ? 'active' : ''} onClick={() => setRange(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
        {range === 'custom' && (
          <div className="visits-dates">
            <input type="date" value={custom.from} max={localToday()} onChange={(e) => setCustom({ ...custom, from: e.target.value })} aria-label="From" />
            <span className="muted">to</span>
            <input type="date" value={custom.to} max={localToday()} onChange={(e) => setCustom({ ...custom, to: e.target.value })} aria-label="To" />
          </div>
        )}
        <div className="chips visits-chips">
          {(Object.entries(filters) as [Dim, string][]).map(([dim, value]) => (
            <span key={dim} className="chip">
              {DIM_LABEL[dim]}: <strong>{filterLabel(dim, value) || 'Unknown'}</strong>
              <button className="chip-x" onClick={() => setFilters(({ [dim]: _removed, ...rest }) => rest)} aria-label={`Remove ${DIM_LABEL[dim]} filter`}>
                <XIcon size={13} />
              </button>
            </span>
          ))}
          {!Object.keys(filters).length && <span className="muted small">Tip: click any row below to filter by it.</span>}
        </div>
      </section>

      <ErrorText text={error} />

      <section className="stats stats-6">
        {tiles.map(({ icon: Icon, label, value, sub }) => (
          <div className="stat" key={label}>
            <span className="stat-label">
              <Icon size={16} /> {label}
            </span>
            {views ? <strong>{value}</strong> : <Skeleton h={30} w="60%" />}
            {views && <em>{sub}</em>}
          </div>
        ))}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>
            <BarChart3 size={18} /> Traffic
          </h2>
          <div className="legend">
            <span>
              <i className="dot dot-visitors" /> Visitors
            </span>
            <span>
              <i className="dot dot-views" /> Page views
            </span>
          </div>
        </div>
        {filtered.length ? <TrendChart points={points} /> : views ? <p className="muted small">No visits in this range yet.</p> : <Skeleton h={240} />}
      </section>

      <div className="grid-2 visits-grid">
        <Ranked
          title={
            <span className="seg">
              <button className={pagesMode === 'all' ? 'active' : ''} onClick={() => setPagesMode('all')}>
                Top pages
              </button>
              <button className={pagesMode === 'entry' ? 'active' : ''} onClick={() => setPagesMode('entry')}>
                Entry pages
              </button>
            </span>
          }
          rows={pages}
          total={stats.views}
          onPick={pick('path')}
          columns="pages"
        />
        <Ranked title="Where visitors come from" rows={sources} total={stats.visits} onPick={pick('source')} />
        <Ranked title="Countries" rows={countries} total={stats.visits} onPick={pick('country')} />
        <Ranked
          title={
            <span className="seg">
              {(['device', 'browser', 'os'] as const).map((t) => (
                <button key={t} className={tech === t ? 'active' : ''} onClick={() => setTech(t)}>
                  {DIM_LABEL[t]}
                </button>
              ))}
            </span>
          }
          rows={techRows}
          total={stats.visits}
          onPick={pick(tech)}
        />
      </div>

      {views && <HomepageInsights views={filtered} allViews={views} events={events} />}

      <section className="card">
        <div className="card-head">
          <h2>
            <Eye size={18} /> Recent page views
          </h2>
          <span className="muted small">latest 30</span>
        </div>
        <div className="table-wrap">
          <table className="admin-table visits-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Page</th>
                <th>From</th>
                <th>Where</th>
                <th>Device</th>
                <th className="num">Time</th>
                <th className="num">Scroll</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((v) => (
                <tr key={v.id}>
                  <td>{new Date(v.ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td>
                    <strong>{v.path}</strong>
                    {v.ret && <span className="muted small"> · returning</span>}
                  </td>
                  <td>
                    {!v.ref && !v.utmSource && v.refUrl.includes(location.hostname.replace(/^www\./, '')) ? (
                      <span className="muted">Internal link</span>
                    ) : (
                      source(v)
                    )}
                  </td>
                  <td>
                    {flag(v.country)} {countryName(v.country)}
                  </td>
                  <td>
                    {v.device} · {v.browser}
                  </td>
                  <td className="num">{v.dur !== undefined ? duration(v.dur) : <span className="muted">reading…</span>}</td>
                  <td className="num">{v.scroll !== undefined ? `${v.scroll}%` : '—'}</td>
                </tr>
              ))}
              {!recent.length && (
                <tr>
                  <td colSpan={7} className="muted">
                    {views ? 'No visits yet.' : 'Loading…'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="muted small">
        Visitors are counted per day with a random id that resets daily; a visit is one browser tab session. Time on page counts only while the
        page is visible. Wallet, bill and reset links are recorded without their secret part. Your own browser is excluded since it has opened
        the admin.
      </p>
    </>
  );
}
