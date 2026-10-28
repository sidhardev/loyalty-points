import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Activity,
  AlertTriangle,
  BadgeIndianRupee,
  CalendarClock,
  CalendarPlus,
  Crown,
  Filter,
  History,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react';
import { num, parseTime, when, whatsapp } from '../api';
import { EmptyState, ErrorText, Sheet, Skeleton, toast, useAction } from '../ui';
import type { AdminApi } from './AdminSeo';
import { Sub } from './AdminSub';

// Admin → Plans: everything about Free and Founding Shop in one place. The offer (on sale or not, places, prices, the
// Free plan's customer limit, grace days), the money, every Founding Shop with its state, every payment with a refund
// button (through Razorpay), and Free shops close to their limit with a WhatsApp nudge. Below that, watching the payments:
// whether Razorpay is live and its webhooks arrive, how checkouts end, yearly plans due for renewal, each payment's story
// and a "check with Razorpay" for one that didn't switch the plan on.

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
  status: 'created' | 'paid' | 'failed' | 'refunded';
  phone: string | null;
  failure_reason: string | null;
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
  money: { paid: number; month: number; refunded: number; abandoned: number; failed: number };
  founding: FoundingShop[];
  payments: Payment[];
  nearLimit: { id: number; name: string; phone: string | null; customers: number }[];
  razorpay: { keyId: string; test: boolean; webhook: boolean };
  health: { lastWebhook: string | null; webhooks: number; rejected: number; verifyFailed: number; mismatched: number };
  funnel: { started: number; paid: number; failed: number; closed: number; shops: number };
  events: PayEvent[];
};
type PayEvent = { id: number; created_at: string; event: string; detail: string; paymentId?: number | null; shopId?: number | null; name?: string | null };
type SyncAnswer = { result: { attempts?: number; captured?: boolean; authorized?: boolean; checked?: number; fixed?: number }; overview: Overview };

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
  failed: { label: 'Failed', tone: 'bad' },
};
const EVENT: Record<string, { label: string; tone: string }> = {
  order: { label: 'Checkout opened', tone: 'none' },
  closed: { label: 'Closed without paying', tone: 'wait' },
  failed: { label: 'Payment failed', tone: 'bad' },
  verified: { label: 'Checkout confirmed', tone: 'ok' },
  verify_failed: { label: 'Checkout answer rejected', tone: 'bad' },
  webhook: { label: 'Razorpay webhook', tone: 'none' },
  webhook_rejected: { label: 'Webhook rejected', tone: 'bad' },
  amount_mismatch: { label: 'Wrong amount', tone: 'bad' },
  activated: { label: 'Plan switched on', tone: 'ok' },
  refunded: { label: 'Refunded', tone: 'none' },
  synced: { label: 'Checked with Razorpay', tone: 'none' },
};
const eventLabel = (e: string) => EVENT[e] ?? { label: e, tone: 'none' };
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
  const [story, setStory] = useState<{ payment: Payment; events: PayEvent[] | null } | null>(null);
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

  const sync = (p?: Payment) =>
    void run(async () => {
      const r = await api<SyncAnswer>(p ? `plans/payments/${p.id}/sync` : 'plans/sync', 'POST');
      setData(r.overview);
      if (p) {
        toast(
          r.result.captured
            ? `${p.name} had paid: plan switched on`
            : r.result.authorized
              ? 'Authorised but not captured yet: capture it in the Razorpay dashboard'
              : `Not paid at Razorpay (${num(r.result.attempts ?? 0)} attempt${r.result.attempts === 1 ? '' : 's'})`,
        );
        if (story?.payment.id === p.id) openStory(r.overview.payments.find((x) => x.id === p.id) ?? p);
      } else toast(r.result.checked ? `Checked ${num(r.result.checked)} unpaid payment(s): ${num(r.result.fixed ?? 0)} switched on` : 'No unpaid payments in the last 3 days');
    });
  const openStory = (payment: Payment) => {
    setStory({ payment, events: null });
    void api<PayEvent[]>(`plans/payments/${payment.id}/events`).then(
      (events) => setStory((s) => (s?.payment.id === payment.id ? { payment, events } : s)),
      (e: Error) => setError(e.message),
    );
  };

  const h = data.health;
  const f = data.funnel;
  const live = Boolean(data.razorpay.keyId) && !data.razorpay.test;
  const webhookAge = h.lastWebhook ? (Date.now() - parseTime(h.lastWebhook).getTime()) / 86_400_000 : null;
  const checks: { ok: boolean | null; label: string; text: string }[] = [
    {
      ok: live,
      label: 'Razorpay keys',
      text: !data.razorpay.keyId ? 'Not set on the server' : data.razorpay.test ? `Test keys (${data.razorpay.keyId.slice(0, 13)}…): no real money` : `Live (${data.razorpay.keyId.slice(0, 13)}…)`,
    },
    { ok: data.razorpay.webhook, label: 'Webhook secret', text: data.razorpay.webhook ? 'Set' : 'Missing: plans only switch on while the shop’s page stays open' },
    {
      ok: h.lastWebhook ? true : f.paid ? false : null,
      label: 'Last webhook',
      text: h.lastWebhook ? `${when(h.lastWebhook)}${webhookAge !== null && webhookAge > 7 && f.started ? ' · none for a week' : ''}` : 'None yet',
    },
    { ok: h.rejected ? false : true, label: 'Rejected webhooks, 7 days', text: h.rejected ? `${num(h.rejected)}: is RAZORPAY_WEBHOOK_SECRET the same as in Razorpay?` : 'None' },
    { ok: h.verifyFailed || h.mismatched ? false : true, label: 'Checks that failed, 7 days', text: h.verifyFailed || h.mismatched ? `${num(h.verifyFailed)} checkout answers, ${num(h.mismatched)} wrong amounts` : 'None' },
  ];
  const pct = (n: number) => (f.started ? `${Math.round((n / f.started) * 100)}%` : '–');
  const renewals = data.founding
    .filter((s) => s.plan === 'yearly' && s.plan_expires_at && (s.state !== 'active' || daysLeft(s.plan_expires_at) <= 30))
    .sort((a, b) => (a.plan_expires_at ?? '').localeCompare(b.plan_expires_at ?? ''));
  const renewNudge = (s: FoundingShop) =>
    `Namaste! 🙏 Regularhood Founding Shop ka aapka saal ${s.plan_expires_at ? day(s.plan_expires_at) : ''} ko ${s.state === 'active' ? 'khatam ho raha hai' : 'khatam ho gaya'}. ${inr(data.settings.yearlyPaise)} mein ek saal aur: app mein Settings → Your plan → Renew. Aapke ${num(s.customers)} customers ka sab data waisa hi rahega.`;
  const retryNudge = (p: Payment) =>
    `Namaste! 🙏 Regularhood Founding Shop ka payment poora nahi hua${p.failure_reason ? ` (${p.failure_reason})` : ''}. Koi dikkat ho to batayiye, ya app mein Settings → Your plan se dobara try kar sakte hain.`;

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
          <em>
            {num(data.money.abandoned)} checkouts not paid{data.money.failed ? ` · ${num(data.money.failed)} failed` : ''}
          </em>
        </div>
      </section>

      <Sub id="health">
        <div className="grid-2 plans-grid">
          <section className="card">
            <div className="card-head">
              <h2>
                <ShieldCheck size={18} /> Payment health
              </h2>
              <button className="btn btn-ghost btn-sm" disabled={busy || !data.razorpay.keyId} onClick={() => sync()} title="Ask Razorpay about every unpaid payment of the last 3 days">
                <RefreshCw size={15} /> Check unpaid
              </button>
            </div>
            <ul className="rows">
              {checks.map((c) => (
                <li key={c.label}>
                  <div className="row-item">
                    <div className="row-main">
                      <strong>{c.label}</strong>
                      <span>{c.text}</span>
                    </div>
                    <span className={`cw-chip cw-chip-${c.ok === null ? 'none' : c.ok ? 'ok' : 'bad'}`}>{c.ok === null ? 'waiting' : c.ok ? 'OK' : 'Check'}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section className="card">
            <div className="card-head">
              <h2>
                <Filter size={18} /> Checkouts, last 30 days
              </h2>
              <span className="muted small">{num(f.shops)} shops</span>
            </div>
            {f.started ? (
              <div className="plans-funnel">
                {[
                  { label: 'Opened the checkout', n: f.started, tone: 'none' },
                  { label: 'Paid', n: f.paid, tone: 'ok' },
                  { label: 'Failed', n: f.failed, tone: 'bad' },
                  { label: 'Closed without paying', n: f.closed, tone: 'wait' },
                  { label: 'Left open', n: Math.max(0, f.started - f.paid - f.failed - f.closed), tone: 'wait' },
                ].map((r) => (
                  <div key={r.label} className="plans-funnel-row">
                    <span>{r.label}</span>
                    <div className="plans-funnel-bar">
                      <i className={`tone-${r.tone}`} style={{ width: f.started ? `${(r.n / f.started) * 100}%` : 0 }} />
                    </div>
                    <strong>
                      {num(r.n)} <em>{pct(r.n)}</em>
                    </strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted small">No shop has opened the checkout in the last 30 days.</p>
            )}
          </section>
        </div>
      </Sub>

      <Sub id="shops">
        {renewals.length > 0 && (
          <section className="card">
            <div className="card-head">
              <h2>
                <CalendarClock size={18} /> Renewals
              </h2>
              <span className="muted small">Yearly plans ending within 30 days, in grace or ended</span>
            </div>
            <ul className="rows">
              {renewals.map((s) => (
                <li key={s.id}>
                  <div className="row-item">
                    <div className="row-main">
                      <a href={`#/shops/${s.id}`}>
                        <strong>{s.name}</strong>
                      </a>
                      <span>
                        <span className={`cw-chip cw-chip-${STATE[s.state].tone}`}>{STATE[s.state].label}</span>{' '}
                        {s.plan_expires_at && (daysLeft(s.plan_expires_at) >= 0 ? `ends ${day(s.plan_expires_at)} (${daysLeft(s.plan_expires_at)} days)` : `ended ${day(s.plan_expires_at)}`)} ·{' '}
                        {num(s.customers)} customers
                      </span>
                    </div>
                    {s.phone && (
                      <a className="btn btn-soft btn-sm" href={whatsapp(s.phone, renewNudge(s))} target="_blank" rel="noreferrer">
                        <MessageCircle size={15} /> WhatsApp
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </Sub>

      <div className="grid-2 plans-grid">
        <Sub id="offer">
          <OfferSettings s={data.settings} onSave={save} busy={busy} />
        </Sub>
        <Sub id="shops">
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
        </Sub>
      </div>

      <Sub id="shops">
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
      </Sub>

      <Sub id="payments">
        <section className="card">
          <div className="card-head">
            <h2>
              <BadgeIndianRupee size={18} /> Payments
            </h2>
            <div className="seg seg-sm" role="group" aria-label="Show">
              {(['paid', 'failed', 'created', 'refunded', 'all'] as const).map((k) => (
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
                        {p.failure_reason && <div className="muted small">{p.failure_reason}</div>}
                      </td>
                      <td className="small mono">{p.razorpay_payment_id ?? p.razorpay_order_id}</td>
                      <td className="plans-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => openStory(p)} title="Every step of this payment">
                          <History size={15} /> Story
                        </button>
                        {(p.status === 'created' || p.status === 'failed') && (
                          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => sync(p)} title="Ask Razorpay whether this was paid">
                            <RefreshCw size={15} /> Check
                          </button>
                        )}
                        {(p.status === 'created' || p.status === 'failed') && p.phone && (
                          <a className="btn btn-ghost btn-sm" href={whatsapp(p.phone, retryNudge(p))} target="_blank" rel="noreferrer">
                            <MessageCircle size={15} />
                          </a>
                        )}
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

        <section className="card">
          <div className="card-head">
            <h2>
              <Activity size={18} /> Payment activity
            </h2>
            <span className="muted small">The last 100 steps, newest first</span>
          </div>
          {data.events.length ? (
            <ul className="rows plans-events">
              {data.events.map((e) => (
                <li key={e.id}>
                  <div className="row-item">
                    <div className="row-main">
                      <span>
                        <span className={`cw-chip cw-chip-${eventLabel(e.event).tone}`}>{eventLabel(e.event).label}</span>{' '}
                        {e.shopId ? (
                          <a href={`#/shops/${e.shopId}`}>
                            <strong>{e.name}</strong>
                          </a>
                        ) : null}
                      </span>
                      {e.detail && <span className="small mono">{e.detail}</span>}
                    </div>
                    <span className="muted small">{when(e.created_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">Nothing yet. Every checkout, webhook and plan switch shows here.</p>
          )}
        </section>
      </Sub>

      {story && (
        <Sheet title={`${story.payment.name} · ${inr(story.payment.amount_paise)} ${story.payment.kind}`} onClose={() => setStory(null)}>
          <p className="muted small mono">
            {story.payment.razorpay_order_id}
            {story.payment.razorpay_payment_id ? ` · ${story.payment.razorpay_payment_id}` : ''}
          </p>
          {story.events === null ? (
            <Skeleton h={120} />
          ) : story.events.length ? (
            <ol className="plans-story">
              {story.events.map((e) => (
                <li key={e.id}>
                  <span className={`cw-chip cw-chip-${eventLabel(e.event).tone}`}>{eventLabel(e.event).label}</span>
                  <span className="muted small">{when(e.created_at)}</span>
                  {e.detail && <div className="small mono">{e.detail}</div>}
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted small">No steps recorded: this payment is from before the payment log existed.</p>
          )}
          {(story.payment.status === 'created' || story.payment.status === 'failed') && (
            <div className="actions">
              <button className="btn btn-primary" disabled={busy} onClick={() => sync(story.payment)}>
                <RefreshCw size={16} /> Check with Razorpay
              </button>
            </div>
          )}
        </Sheet>
      )}

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
