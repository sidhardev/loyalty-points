import { useCallback, useEffect, useState } from 'react';
import { Check, ExternalLink, MessageCircle, Trash2, Users } from 'lucide-react';
import { when } from '../api';
import { EmptyState, ErrorText, SkeletonRows, confirmDialog, toast } from '../ui';
import type { AdminApi } from './AdminSeo';

// Admin → Waitlist (server/src/waitlist.ts): shops that joined a country's waitlist (the UAE first, at /uae). The top
// numbers are the go / no-go test: 30+ on the list or 5+ who say they'd pay means it's worth making the app work there.

type Row = {
  id: number;
  market: string;
  name: string;
  shop: string;
  shop_type: string;
  area: string;
  phone: string;
  would_pay: string;
  source: string;
  note: string;
  contacted_at: string | null;
  created_at: string;
};
type Data = {
  rows: Row[];
  totals: { all: number; yes: number; maybe: number; no: number; contacted: number; week: number };
  bySource: [string, number][];
  byType: [string, number][];
  byArea: [string, number][];
};

const GOAL_LIST = 30;
const GOAL_PAY = 5;
const PAY: Record<string, string> = { yes: 'Would pay', maybe: 'Maybe', no: 'Only free', '': '—' };

const hello = (r: Row) =>
  `Hi ${r.name.split(' ')[0]}, this is Regularhood. Thanks for joining the UAE waitlist for ${r.shop}. Could I ask you 2 quick questions about how you bring customers back today?`;

export function WaitlistPage({ api }: { api: AdminApi }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => void api<Data>('waitlist').then(setData, (e) => setError((e as Error).message)), [api]);
  useEffect(load, [load]);

  const save = (id: number, body: object) =>
    api(`waitlist/${id}`, 'POST', body).then(load, (e) => toast((e as Error).message, 'error'));
  const remove = async (r: Row) => {
    if (!(await confirmDialog({ title: `Remove ${r.shop} from the waitlist?`, confirm: 'Remove' }))) return;
    api(`waitlist/${r.id}`, 'DELETE').then(load, (e) => toast((e as Error).message, 'error'));
  };

  const t = data?.totals;
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Waitlist</h1>
          <p className="muted small" style={{ margin: 0 }}>
            Shops waiting for Regularhood in the UAE. Page to share:{' '}
            <a href="/uae" target="_blank" rel="noreferrer">
              {location.origin}/uae <ExternalLink size={12} />
            </a>
          </p>
        </div>
      </div>
      <ErrorText text={error} />
      {!data ? (
        <SkeletonRows />
      ) : (
        <>
          <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
            <Goal label="On the list" value={t!.all} goal={GOAL_LIST} />
            <Goal label="Say they'd pay" value={t!.yes} goal={GOAL_PAY} />
            <div>
              <div className="muted small">Maybe · Only free</div>
              <b style={{ fontSize: 24 }}>
                {t!.maybe} · {t!.no}
              </b>
            </div>
            <div>
              <div className="muted small">This week · Contacted</div>
              <b style={{ fontSize: 24 }}>
                {t!.week} · {t!.contacted}
              </b>
            </div>
          </div>

          {data.rows.length > 0 && (
            <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <Tally title="Where they came from" items={data.bySource} />
              <Tally title="Type of shop" items={data.byType} />
              <Tally title="Emirate" items={data.byArea} />
            </div>
          )}

          {data.rows.length === 0 ? (
            <EmptyState icon={Users} title="No one on the waitlist yet" text="Share /uae in UAE shop owner groups, or with a ?utm_source= tag to see which channel works." />
          ) : (
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Shop</th>
                    <th>Owner</th>
                    <th>Would pay</th>
                    <th>From</th>
                    <th>Joined</th>
                    <th>Note</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <b>{r.shop}</b>
                        <div className="muted small">
                          {r.shop_type} · {r.area}
                        </div>
                      </td>
                      <td>
                        {r.name}
                        <div className="muted small">{r.phone}</div>
                      </td>
                      <td>
                        <span className={`badge ${r.would_pay === 'yes' ? 'badge-plus' : r.would_pay === 'no' ? 'badge-minus' : 'badge-neutral'}`}>{PAY[r.would_pay] ?? r.would_pay}</span>
                      </td>
                      <td className="small">{r.source || '—'}</td>
                      <td className="small">{when(r.created_at)}</td>
                      <td>
                        <input
                          style={{ minWidth: 160 }}
                          defaultValue={r.note}
                          placeholder="Add a note"
                          onBlur={(e) => e.target.value !== r.note && void save(r.id, { note: e.target.value })}
                        />
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <a
                          className="btn btn-soft btn-sm"
                          href={`https://wa.me/${r.phone.replace(/\D/g, '')}?text=${encodeURIComponent(hello(r))}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => !r.contacted_at && void save(r.id, { contacted: true })}
                        >
                          <MessageCircle size={15} /> Message
                        </a>{' '}
                        <button
                          type="button"
                          className={`btn btn-sm ${r.contacted_at ? 'btn-soft' : 'btn-ghost'}`}
                          title={r.contacted_at ? `Contacted ${when(r.contacted_at)}. Click to undo.` : 'Mark as contacted'}
                          onClick={() => void save(r.id, { contacted: !r.contacted_at })}
                        >
                          <Check size={15} /> {r.contacted_at ? 'Contacted' : 'Mark contacted'}
                        </button>{' '}
                        <button type="button" className="btn btn-ghost btn-sm" aria-label="Remove" onClick={() => void remove(r)}>
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Goal({ label, value, goal }: { label: string; value: number; goal: number }) {
  const pct = Math.min(100, Math.round((value / goal) * 100));
  return (
    <div>
      <div className="muted small">
        {label} (goal {goal})
      </div>
      <b style={{ fontSize: 24 }}>{value}</b>
      <div style={{ height: 6, borderRadius: 3, background: 'var(--line, #e5e7eb)', marginTop: 6 }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: pct >= 100 ? '#0b7a52' : '#f0a202' }} />
      </div>
    </div>
  );
}

function Tally({ title, items }: { title: string; items: [string, number][] }) {
  return (
    <div>
      <div className="muted small" style={{ marginBottom: 6 }}>
        {title}
      </div>
      {items.slice(0, 6).map(([k, n]) => (
        <div key={k} className="small" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <span>{k}</span>
          <b>{n}</b>
        </div>
      ))}
    </div>
  );
}
