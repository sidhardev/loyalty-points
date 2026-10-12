import { useEffect, useMemo, useState } from 'react';
import { api, num, rupees } from '../api';

// How the program is doing: visits per day (new vs returning customers), top customers and repeat rate.
// A "visit" is a purchase that earned points.

type Day = { day: string; visits: number; new_customers: number; sales: number; points: number };
type Top = { id: number; name: string; phone: string; points: number; visits: number; spent: number };
type Data = {
  days: number;
  daily: Day[];
  top: Top[];
  repeat: { active: number; returning: number; everVisited: number; everReturned: number };
};

const RANGES = [7, 30, 90];

const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function VisitsChart({ days }: { days: { day: string; fresh: number; back: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(4, ...days.map((d) => d.fresh + d.back));
  const step = Math.ceil(max / 4);
  const top = step * 4;
  const W = 720;
  const H = 220;
  const pad = { l: 34, r: 8, t: 10, b: 24 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const slot = iw / days.length;
  const bw = Math.max(3, Math.min(26, slot * 0.66));
  const y = (v: number) => pad.t + ih - (v / top) * ih;
  const every = Math.ceil(days.length / 10);
  const h = hover !== null ? days[hover] : null;

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Visits per day, new and returning customers">
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={y(i * step)} y2={y(i * step)} className="grid-line" />
            <text x={pad.l - 6} y={y(i * step)} dy="0.32em" textAnchor="end" className="axis">
              {i * step}
            </text>
          </g>
        ))}
        {days.map((d, i) => {
          const cx = pad.l + slot * i + slot / 2;
          const backH = (d.back / top) * ih;
          const freshH = (d.fresh / top) * ih;
          return (
            <g key={d.day} className={hover !== null && hover !== i ? 'dim' : ''}>
              {d.back > 0 && <rect x={cx - bw / 2} y={y(d.back)} width={bw} height={Math.max(0, backH)} className="bar-back" rx={d.fresh ? 0 : 3} />}
              {d.fresh > 0 && (
                <rect x={cx - bw / 2} y={y(d.back + d.fresh)} width={bw} height={Math.max(0, freshH - (d.back ? 2 : 0))} className="bar-new" rx={3} />
              )}
              {i % every === 0 && (
                <text x={cx} y={H - 6} textAnchor="middle" className="axis">
                  {new Date(`${d.day}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </text>
              )}
              <rect x={pad.l + slot * i} y={pad.t} width={slot} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            </g>
          );
        })}
      </svg>
      {h && (
        <div className="tip" style={{ left: `${((pad.l + slot * hover! + slot / 2) / W) * 100}%` }}>
          <strong>{new Date(`${h.day}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
          <span>
            <i className="dot dot-new" /> New customers <b>{h.fresh}</b>
          </span>
          <span>
            <i className="dot dot-back" /> Returning <b>{h.back}</b>
          </span>
        </div>
      )}
    </div>
  );
}

export function Insights() {
  const [range, setRange] = useState(30);
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    setData(null);
    api<Data>(`insights?days=${range}&tz=${-new Date().getTimezoneOffset()}`).then(setData);
  }, [range]);

  // Every day in the range, including days with no visits.
  const days = useMemo(() => {
    const byDay = new Map((data?.daily ?? []).map((d) => [d.day, d]));
    const out: { day: string; fresh: number; back: number }[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const d = byDay.get(localDay(date));
      out.push({ day: localDay(date), fresh: d?.new_customers ?? 0, back: (d?.visits ?? 0) - (d?.new_customers ?? 0) });
    }
    return out;
  }, [data, range]);

  const totals = (data?.daily ?? []).reduce(
    (a, d) => ({ visits: a.visits + d.visits, fresh: a.fresh + d.new_customers, sales: a.sales + d.sales }),
    { visits: 0, fresh: 0, sales: 0 },
  );
  const r = data?.repeat;
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');

  return (
    <>
      <header className="page-head page-head-row">
        <div>
          <h1>Insights</h1>
          <p className="muted">Are customers coming back?</p>
        </div>
        <div className="seg">
          {RANGES.map((d) => (
            <button key={d} className={range === d ? 'active' : ''} onClick={() => setRange(d)}>
              {d} days
            </button>
          ))}
        </div>
      </header>

      <section className="stats">
        <div className="stat">
          <span>Repeat rate</span>
          <strong>{r ? pct(r.returning, r.active) : '—'}</strong>
          <em>{r ? `${num(r.returning)} of ${num(r.active)} customers came 2+ times` : ''}</em>
        </div>
        <div className="stat">
          <span>Visits</span>
          <strong>{data ? num(totals.visits) : '—'}</strong>
          <em>{data ? `${num(totals.visits - totals.fresh)} returning · ${num(totals.fresh)} new` : ''}</em>
        </div>
        <div className="stat">
          <span>Sales with points</span>
          <strong>{data ? rupees(totals.sales) : '—'}</strong>
          <em>{data && totals.visits ? `avg bill ${rupees(Math.round(totals.sales / totals.visits))}` : ''}</em>
        </div>
        <div className="stat">
          <span>All-time repeat rate</span>
          <strong>{r ? pct(r.everReturned, r.everVisited) : '—'}</strong>
          <em>{r ? `${num(r.everReturned)} of ${num(r.everVisited)} customers` : ''}</em>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Visits per day</h2>
          <div className="legend">
            <span>
              <i className="dot dot-back" /> Returning
            </span>
            <span>
              <i className="dot dot-new" /> New customers
            </span>
          </div>
        </div>
        {data ? (
          totals.visits ? (
            <VisitsChart days={days} />
          ) : (
            <p className="muted empty">No visits in the last {range} days yet.</p>
          )
        ) : (
          <p className="muted empty">Loading…</p>
        )}
      </section>

      <section className="card">
        <h2>Top customers · last {range} days</h2>
        {data?.top.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer</th>
                <th className="right">Visits</th>
                <th className="right">Spent</th>
                <th className="right">Points</th>
              </tr>
            </thead>
            <tbody>
              {data.top.map((c, i) => (
                <tr key={c.id} onClick={() => (location.hash = `/customers/${c.id}`)}>
                  <td className="muted">{i + 1}</td>
                  <td>
                    <strong>{c.name}</strong> <span className="muted small">{c.phone}</span>
                  </td>
                  <td className="right">{num(c.visits)}</td>
                  <td className="right">{rupees(c.spent)}</td>
                  <td className="right">
                    <span className="points">{num(c.points)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted empty">{data ? 'No visits yet.' : 'Loading…'}</p>
        )}
      </section>
    </>
  );
}
