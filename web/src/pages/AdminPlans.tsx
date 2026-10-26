import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, BadgeIndianRupee, CalendarPlus, Crown, MessageCircle, RotateCcw, Settings2, Store, TrendingUp, Users } from 'lucide-react';
import { num, parseTime, when, whatsapp } from '../api';
import { EmptyState, ErrorText, Sheet, Skeleton, toast, useAction } from '../ui';
import type { AdminApi } from './AdminSeo';

// Admin → Plans: everything about Free and Founding Shop in one place. The offer (on sale or not, places, prices, the
// Free plan's customer limit, grace days), the money, every Founding Shop with its state, every payment with a refund
// button (through Razorpay), and Free shops close to their limit with a WhatsApp nudge.

type Settings = { salesOpen: boolean; seats: number; lifetimePaise: number; yearlyPaise: number; freeCustomers: number; graceDays: number };
type FoundingShop = {
  id: number;
  name: string;
  phone: string | null;
  plan: 'lifetime' | 'yearly';
  plan_expires_at: string | null;
  founding_no: number | null;
  since: string | null;
  paid: number;
  customers: number;
  state: 'lifetime' | 'active' | 'grace' | 'lapsed';
};
type Payment = {
  id: number;
  shopId: number;
  name: string;
  kind: 'lifetime' | 'yearly';
  amount_paise: number;
  status: 'created' | 'paid' | 'refunded';
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  razorpay_refund_id: string | null;
  created_at: string;
  paid_at: string | null;
  refunded_at: string | null;
};
type Overview = {
  settings: Settings;
  seats: { total: number; left: number; taken: number };
  money: { paid: number; month: number; refunded: number; abandoned: number };
  founding: FoundingShop[];
  payments: Payment[];
  nearLimit: { id: number; name: string; phone: string | null; customers: number }[];
  razorpay: { keyId: string; test: boolean; webhook: boolean };
};

const inr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const STATE: Record<FoundingShop['state'], { label: string; tone: string }> = {
  lifetime: { label: 'Lifetime', tone: 'ok' },
  active: { label: 'Yearly', tone: 'ok' },
  grace: { label: 'Ran out · grace', tone: 'wait' },
  lapsed: { label: 'Ran out', tone: 'bad' },
};
const PAY_STATUS: Record<Payment['status'], { label: string; tone: string }> = {
  paid: { label: 'Paid', tone: 'ok' },
  refunded: { label: 'Refunded', tone: 'none' },
  created: { label: 'Not paid', tone: 'wait' },
};
const day = (sqlTime: string) => parseTime(sqlTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const daysLeft = (sqlTime: string) => Math.ceil((Date.parse(`${sqlTime.replace(' ', 'T')}Z`) - Date.now()) / 86_400_000);

/** The offer's numbers, edited in rupees and saved together. */
function OfferSettings({ s, onSave, busy }: { s: Settings; onSave: (patch: Partial<Settings>) => void; busy: boolean }) {
  const toForm = (x: Settings) => ({ seats: String(x.seats), lifetime: String(x.lifetimePaise / 100), yearly: String(x.yearlyPaise / 100), free: String(x.freeCustomers), grace: String(x.graceDays) });
  const [f, setF] = useState(toForm(s));
  useEffect(() => setF(toForm(s)), [s]);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const changed = JSON.stringify(f) !== JSON.stringify(toForm(s));
  const save = (e: FormEvent) => {
    e.preventDefault();
    onSave({
      seats: Number(f.seats),
      lifetimePaise: Math.round(Number(f.lifetime) * 100),
      yearlyPaise: Math.round(Number(f.yearly) * 100),
      freeCustomers: Number(f.free),
      graceDays: Number(f.grace),
    });
  };
  return (
    <section className="card">
      <div className="card-head">
        <h2>
          <Settings2 size={18} /> Offer
        </h2>
      </div>
      <div className="cw-live-row">
        <div>
          <strong>{s.salesOpen ? 'Founding Shop is on sale' : 'Founding Shop is not on sale'}</strong>
          <span className="muted small">
            {s.salesOpen ? 'New shops can buy it from the Plan page and the homepage.' : 'New shops see “Not on sale right now”. Yearly shops can still renew.'}
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={s.salesOpen}
          aria-label="Founding Shop on sale"
          className={`switch ${s.salesOpen ? 'on' : ''}`}
          disabled={busy}
          onClick={() => onSave({ salesOpen: !s.salesOpen })}
        />
      </div>
      <form className="plans-form" onSubmit={save}>
        <label>
          Lifetime price (₹)
          <input type="number" min="1" step="1" value={f.lifetime} onChange={set('lifetime')} required />
        </label>
        <label>
          Yearly price (₹)
          <input type="number" min="1" step="1" value={f.yearly} onChange={set('yearly')} required />
        </label>
        <label>
          Founding places
          <input type="number" min="0" step="1" value={f.seats} onChange={set('seats')} required />
        </label>
        <label>
          Free plan: customers
          <input type="number" min="1" step="1" value={f.free} onChange={set('free')} required />
        </label>
        <label>
          Grace days after a year runs out
          <input type="number" min="0" max="365" step="1" value={f.grace} onChange={set('grace')} required />
        </label>
        <div className="plans-form-save">
          <button className="btn btn-primary" disabled={busy || !changed}>
            Save offer
          </button>
          {changed && (
            <button type="button" className="btn btn-ghost" onClick={() => setF(toForm(s))}>
              Undo
            </button>
          )}
        </div>
      </form>
      <p className="muted small" style={{ margin: 0 }}>
        New prices apply to new payments only; shops that already paid keep their plan. A lower Free limit doesn’t remove anyone’s customers, it only stops new
        ones. The homepage and the Plan page show these numbers straight away. Every change is kept in the admin log.
      </p>
    </section>
  );
}

export function PlansPage({ api }: { api: AdminApi }) {
  const [data, setData] = useState<Overview | null>(null);
  const [filter, setFilter] = useState<'all' | Payment['status']>('paid');
  const [refunding, setRefunding] = useState<Payment | null>(null);
  const [toFree, setToFree] = useState(true);
  const { busy, error, setError, run } = useAction();
  const load = useCallback(() => void api<Overview>('plans').then(setData, (e: Error) => setError(e.message)), [api, setError]);
  useEffect(load, [load]);

  if (!data) {
    return (
      <>
        <ErrorText text={error} />
        <Skeleton h={40} w="40%" />
        <Skeleton h={300} />
      </>
    );
  }

  const save = (patch: Partial<Settings>) =>
    void run(async () => {
      setData(await api<Overview>('plans/settings', 'PUT', patch));
      toast('Saved');
    });
  const extend = (shop: FoundingShop) =>
    void run(async () => {
      setData(await api<Overview>(`plans/shops/${shop.id}/extend`, 'POST'));
      toast(`${shop.name}: one more year`);
    });
  const refund = () =>
    void run(async () => {
      if (!refunding) return;
      setData(await api<Overview>(`plans/payments/${refunding.id}/refund`, 'POST', { toFree }));
      toast(`Refunded ${inr(refunding.amount_paise)} to ${refunding.name}`);
      setRefunding(null);
    });

  const lifetime = data.founding.filter((s) => s.plan === 'lifetime').length;
  const yearly = data.founding.filter((s) => s.plan === 'yearly');
  const expiring = yearly.filter((s) => s.plan_expires_at && daysLeft(s.plan_expires_at) <= 30 && daysLeft(s.plan_expires_at) > 0).length;
  const payments = data.payments.filter((p) => filter === 'all' || p.status === filter);
  const nudge = (customers: number) =>
    `Namaste! 🙏 Regularhood par aapke ${customers} customers ho gaye hain, badhai ho! Free plan mein ${data.settings.freeCustomers} customers tak hote hain. Founding Shop (${inr(data.settings.lifetimePaise)} ek baar, ya ${inr(data.settings.yearlyPaise)} saal ka) mein unlimited customers, unhe WhatsApp apne aap, aur Google reviews milte hain. App mein Settings → Your plan dekhiye.`;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>
            Plans & payments{' '}
            <span className={`cw-live ${data.razorpay.test ? '' : 'on'}`}>{data.razorpay.keyId ? (data.razorpay.test ? 'Razorpay test mode' : 'Razorpay live') : 'Razorpay not set up'}</span>
          </h1>
          <p>The Founding Shop offer, every paying shop and every payment.</p>
        </div>
      </header>
      <ErrorText text={error} />
      {!data.razorpay.webhook && (
        <p className="alert alert-error small">
          <AlertTriangle size={16} /> RAZORPAY_WEBHOOK_SECRET isn’t set on the server: if a shop closes the page right after paying, its plan won’t switch on by
          itself.
        </p>
      )}

      <section className="stats">
        <div className="stat">
          <span className="stat-label">
            <Crown size={16} /> Founding places
          </span>
          <strong>
            {num(data.seats.taken)} / {num(data.seats.total)}
          </strong>
          <em>{data.settings.salesOpen ? `${num(data.seats.left)} left` : 'not on sale'}</em>
        </div>
        <div className="stat">
          <span className="stat-label">
            <TrendingUp size={16} /> Revenue
          </span>
          <strong>{inr(data.money.paid)}</strong>
          <em>{inr(data.money.month)} this month</em>
        </div>
        <div className="stat">
          <span className="stat-label">
            <Users size={16} /> Paying shops
          </span>
          <strong>{num(data.founding.length)}</strong>
          <em>
            {num(lifetime)} lifetime · {num(yearly.length)} yearly{expiring ? ` · ${num(expiring)} end within 30 days` : ''}
          </em>
        </div>
        <div className="stat">
          <span className="stat-label">
            <RotateCcw size={16} /> Refunded
          </span>
          <strong>{inr(data.money.refunded)}</strong>
          <em>{num(data.money.abandoned)} checkouts started but not paid</em>
        </div>
      </section>

      <div className="grid-2 plans-grid">
        <OfferSettings s={data.settings} onSave={save} busy={busy} />
        <section className="card">
          <div className="card-head">
            <h2>
              <Store size={18} /> Close to the Free limit
            </h2>
            <span className="muted small">{num(Math.ceil(data.settings.freeCustomers * 0.7))}+ customers</span>
          </div>
          {data.nearLimit.length ? (
            <ul className="rows">
              {data.nearLimit.map((s) => (
                <li key={s.id}>
                  <div className="row-item">
                    <div className="row-main">
                      <a href={`#/shops/${s.id}`}>
                        <strong>{s.name}</strong>
                      </a>
                      <span>
                        {num(s.customers)} of {num(data.settings.freeCustomers)} customers{s.customers >= data.settings.freeCustomers ? ' · at the limit' : ''}
                      </span>
                    </div>
                    {s.phone && (
                      <a className="btn btn-soft btn-sm" href={whatsapp(s.phone, nudge(s.customers))} target="_blank" rel="noreferrer">
                        <MessageCircle size={15} /> WhatsApp
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">No Free shop is near its limit yet. They show here from 70% full: the ones most likely to pay.</p>
          )}
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>
            <Crown size={18} /> Founding Shops
          </h2>
          <span className="muted small">Change a plan by hand (paid by UPI, a mistake) from the shop’s page</span>
        </div>
        {data.founding.length ? (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Shop</th>
                  <th>Plan</th>
                  <th>Since</th>
                  <th>Ends</th>
                  <th className="num">Customers</th>
                  <th className="num">Paid</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.founding.map((s) => (
                  <tr key={s.id}>
                    <td>{s.founding_no ?? '–'}</td>
                    <td>
                      <a href={`#/shops/${s.id}`}>
                        <strong>{s.name}</strong>
                      </a>
                    </td>
                    <td>
                      <span className={`cw-chip cw-chip-${STATE[s.state].tone}`}>{STATE[s.state].label}</span>
                    </td>
                    <td className="small">{s.since ? day(s.since) : 'by hand'}</td>
                    <td className="small">
                      {s.plan === 'lifetime' ? 'never' : s.plan_expires_at ? `${day(s.plan_expires_at)} (${daysLeft(s.plan_expires_at) >= 0 ? `${daysLeft(s.plan_expires_at)} days` : 'ended'})` : '–'}
                    </td>
                    <td className="num">{num(s.customers)}</td>
                    <td className="num">{inr(s.paid)}</td>
                    <td>
                      {s.plan === 'yearly' && (
                        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => extend(s)} title="Add one year, free">
                          <CalendarPlus size={15} /> +1 year
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Crown} title="No Founding Shops yet" text="They show here as soon as a shop pays." />
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>
            <BadgeIndianRupee size={18} /> Payments
          </h2>
          <div className="seg seg-sm" role="group" aria-label="Show">
            {(['paid', 'refunded', 'created', 'all'] as const).map((k) => (
              <button key={k} className={filter === k ? 'active' : ''} onClick={() => setFilter(k)}>
                {k === 'all' ? 'All' : PAY_STATUS[k].label} ({num(k === 'all' ? data.payments.length : data.payments.filter((p) => p.status === k).length)})
              </button>
            ))}
          </div>
        </div>
        {payments.length ? (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Shop</th>
                  <th>Plan</th>
                  <th className="num">Amount</th>
                  <th>Status</th>
                  <th>Razorpay</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="small">{when(p.paid_at ?? p.created_at)}</td>
                    <td>
                      <a href={`#/shops/${p.shopId}`}>
                        <strong>{p.name}</strong>
                      </a>
                    </td>
                    <td>{p.kind}</td>
                    <td className="num">{inr(p.amount_paise)}</td>
                    <td>
                      <span className={`cw-chip cw-chip-${PAY_STATUS[p.status].tone}`}>{PAY_STATUS[p.status].label}</span>
                      {p.refunded_at && <span className="muted small"> {when(p.refunded_at)}</span>}
                    </td>
                    <td className="small mono">{p.razorpay_payment_id ?? p.razorpay_order_id}</td>
                    <td>
                      {p.status === 'paid' && (
                        <button className="btn btn-ghost btn-sm danger" disabled={busy} onClick={() => (setToFree(true), setRefunding(p))}>
                          <RotateCcw size={15} /> Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted small">Nothing here.</p>
        )}
      </section>

      {refunding && (
        <Sheet title={`Refund ${inr(refunding.amount_paise)} to ${refunding.name}?`} onClose={() => setRefunding(null)}>
          <div className="plans-refund">
            <p>
              Razorpay refunds the full {inr(refunding.amount_paise)} ({refunding.kind}, paid {when(refunding.paid_at ?? refunding.created_at)}) to the UPI, card or bank
              they paid with. It usually arrives in 5–7 working days. This can’t be undone.
            </p>
            <label className="poster-check">
              <input type="checkbox" checked={toFree} onChange={(e) => setToFree(e.target.checked)} /> Move {refunding.name} back to the Free plan
            </label>
            <ErrorText text={error} />
            <div className="actions">
              <button className="btn btn-ghost" onClick={() => setRefunding(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" disabled={busy} onClick={refund}>
                <RotateCcw size={16} /> {busy ? 'Refunding…' : `Refund ${inr(refunding.amount_paise)}`}
              </button>
            </div>
          </div>
        </Sheet>
      )}
    </>
  );
}
