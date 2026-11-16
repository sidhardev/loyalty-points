import { useState, type ReactNode } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';

// Small chart pieces for the admin Overview: a daily bar chart with a hover tooltip, a sparkline, a change chip and a
// stacked share bar. Plain HTML/SVG with the app's colour tokens, so they follow light and dark mode.

const DAY = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
const WEEKDAY = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
export const dayLabel = (day: string) => DAY.format(new Date(`${day}T00:00:00`));

/** 1.2k, 3.4L — short numbers for axes. */
export const short = (n: number) =>
  n >= 1e7 ? `${+(n / 1e7).toFixed(1)}Cr` : n >= 1e5 ? `${+(n / 1e5).toFixed(1)}L` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}k` : `${Math.round(n)}`;

/** A round top for the y-axis: 1, 2, 5 × 10ⁿ. */
function niceMax(v: number) {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const top = [1, 2, 2.5, 5, 10].map((m) => m * p).find((m) => m >= v)!;
  return top;
}

/** Daily bars with gridlines, sparse date labels and a tooltip on hover/tap. */
export function TrendBars({ data, format, label }: { data: { day: string; value: number }[]; format: (n: number) => string; label: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const ticks = [max, max / 2, 0];
  const every = Math.ceil(data.length / 6);
  const h = hover !== null ? data[hover] : null;
  return (
    <div className="tchart" onMouseLeave={() => setHover(null)}>
      <div className="trend-plot" role="img" aria-label={`${label} per day: ${format(data.reduce((n, d) => n + d.value, 0))} in total`}>
        {ticks.map((t) => (
          <span key={t} className="trend-grid" style={{ bottom: `${(t / max) * 100}%` }}>
            <em>{t ? (format(t).startsWith('₹') ? `₹${short(t)}` : short(t)) : '0'}</em>
          </span>
        ))}
        <div className="trend-bars" style={{ gap: data.length > 45 ? 1 : 3 }}>
          {data.map((d, i) => (
            <button
              key={d.day}
              type="button"
              className={`trend-col${hover === i ? ' on' : ''}`}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onClick={() => setHover(i)}
              aria-label={`${dayLabel(d.day)}: ${format(d.value)}`}
            >
              <i style={{ height: d.value ? `max(3px, ${(d.value / max) * 100}%)` : 0 }} />
            </button>
          ))}
        </div>
        {h && (
          <div className="trend-tip" style={{ left: `${((hover! + 0.5) / data.length) * 100}%` }}>
            <span>{WEEKDAY.format(new Date(`${h.day}T00:00:00`))}</span>
            <strong>{format(h.value)}</strong>
          </div>
        )}
      </div>
      <div className="trend-x">
        {data.map((d, i) => (
          <span key={d.day}>{(data.length - 1 - i) % every === 0 ? dayLabel(d.day) : ''}</span>
        ))}
      </div>
    </div>
  );
}

/** A tiny line of the last days' values, for a stat tile. */
export function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${30 - (v / max) * 28}`).join(' ');
  return (
    <svg className="spark" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
      <polygon points={`0,32 ${pts} 100,32`} />
      <polyline points={pts} />
    </svg>
  );
}

/** "+12%" against the period before; nothing when there's nothing to compare with. */
export function Delta({ now, before }: { now: number; before: number | null }) {
  if (before === null) return null;
  if (!before) return now ? <span className="delta up">new</span> : null;
  const change = Math.round(((now - before) / before) * 100);
  const Icon = change < 0 ? TrendingDown : TrendingUp;
  return (
    <span className={`delta ${change < 0 ? 'down' : change > 0 ? 'up' : ''}`} title={`Before: ${before.toLocaleString('en-IN')}`}>
      <Icon size={13} /> {change > 0 ? '+' : ''}
      {change}%
    </span>
  );
}

/** A stat tile: label, big number, change chip, sparkline. */
export function KpiTile({ icon, label, value, sub, delta, spark, href }: { icon: ReactNode; label: string; value?: string; sub?: ReactNode; delta?: ReactNode; spark?: number[]; href?: string }) {
  const body = (
    <>
      <span className="kpi-label">
        {icon} {label}
      </span>
      <span className="kpi-value">
        <strong>{value ?? '–'}</strong>
        {delta}
      </span>
      {sub && <em>{sub}</em>}
      {spark && <Sparkline values={spark} />}
    </>
  );
  return href ? (
    <a className="kpi" href={href}>
      {body}
    </a>
  ) : (
    <div className="kpi">{body}</div>
  );
}

/** One bar split into shares, with a legend of counts under it. Each part names its own colour class. */
export function ShareBar({ parts }: { parts: { key: string; label: string; value: number; cls: string; href?: string }[] }) {
  const total = parts.reduce((n, p) => n + p.value, 0) || 1;
  return (
    <div className="share">
      <div className="share-bar" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(', ')}>
        {parts
          .filter((p) => p.value)
          .map((p) => (
            <i key={p.key} className={p.cls} style={{ flexGrow: p.value }} title={`${p.label}: ${p.value} (${Math.round((p.value / total) * 100)}%)`} />
          ))}
      </div>
      <ul className="share-legend">
        {parts.map((p) => {
          const inner = (
            <>
              <i className={p.cls} /> <span>{p.label}</span>
              <strong>{p.value.toLocaleString('en-IN')}</strong>
              <em>{Math.round((p.value / total) * 100)}%</em>
            </>
          );
          return <li key={p.key}>{p.href ? <a href={p.href}>{inner}</a> : <div>{inner}</div>}</li>;
        })}
      </ul>
    </div>
  );
}

const MONTH = new Intl.DateTimeFormat('en-IN', { month: 'short' });
const KIND_ORDER = [
  { kind: 'lifetime', label: 'Lifetime', cls: 'pl-lifetime' },
  { kind: 'yearly', label: 'Yearly', cls: 'pl-yearly' },
  { kind: 'monthly', label: 'Monthly', cls: 'pl-monthly' },
];

/** Money in per month for the last 12 months, each column split by plan, with a legend and a tooltip. */
export function MonthlyRevenue({ rows }: { rows: { month: string; kind: string; paise: number; n: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const now = new Date(Date.now() + 330 * 60_000);
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + i, 1));
    const key = d.toISOString().slice(0, 7);
    const parts = KIND_ORDER.map((k) => {
      const r = rows.find((x) => x.month === key && x.kind === k.kind);
      return { ...k, rupees: (r?.paise ?? 0) / 100, n: r?.n ?? 0 };
    });
    return { key, label: MONTH.format(d), parts, total: parts.reduce((a, p) => a + p.rupees, 0) };
  });
  const max = niceMax(Math.max(0, ...months.map((m) => m.total)));
  const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  const h = hover !== null ? months[hover] : null;
  return (
    <div className="mrev">
      <ul className="mrev-legend">
        {KIND_ORDER.map((k) => (
          <li key={k.kind}>
            <i className={k.cls} /> {k.label}
          </li>
        ))}
      </ul>
      <div className="tchart" onMouseLeave={() => setHover(null)}>
        <div className="trend-plot" style={{ height: 200 }} role="img" aria-label={`Money in per month: ${months.map((m) => `${m.label} ${inr(m.total)}`).join(', ')}`}>
          {[max, max / 2, 0].map((t) => (
            <span key={t} className="trend-grid" style={{ bottom: `${(t / max) * 100}%` }}>
              <em>{t ? `₹${short(t)}` : '0'}</em>
            </span>
          ))}
          <div className="trend-bars" style={{ gap: 8 }}>
            {months.map((m, i) => (
              <button key={m.key} type="button" className={`trend-col mrev-col${hover === i ? ' on' : ''}`} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onClick={() => setHover(i)} aria-label={`${m.label}: ${inr(m.total)}`}>
                <span className="mrev-stack" style={{ height: `${(m.total / max) * 100}%` }}>
                  {m.parts
                    .filter((p) => p.rupees)
                    .map((p) => (
                      <i key={p.kind} className={p.cls} style={{ flexGrow: p.rupees }} />
                    ))}
                </span>
              </button>
            ))}
          </div>
          {h && (
            <div className="trend-tip" style={{ left: `${((hover! + 0.5) / 12) * 100}%` }}>
              <span>{h.label}</span>
              <strong>{inr(h.total)}</strong>
              {h.parts
                .filter((p) => p.n)
                .map((p) => (
                  <span key={p.kind}>
                    {p.label}: {p.n} · {inr(p.rupees)}
                  </span>
                ))}
            </div>
          )}
        </div>
        <div className="trend-x">
          {months.map((m) => (
            <span key={m.key} style={{ textAlign: 'center' }}>
              {m.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** A labelled meter 0..100%. */
export function Meter({ label, value, of, note }: { label: string; value: number; of: number; note?: string }) {
  const share = of ? Math.min(100, Math.round((value / of) * 100)) : 0;
  return (
    <div className="meter-row">
      <div className="meter-top">
        <span>{label}</span>
        <strong>{of ? `${share}%` : '–'}</strong>
      </div>
      <div className="meter-track">
        <i style={{ width: `${share}%` }} />
      </div>
      {note && <em>{note}</em>}
    </div>
  );
}
