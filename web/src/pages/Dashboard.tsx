import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, num, rupees, walletUrl, whatsapp, type Bonus, type Customer, type Merchant, type Transaction } from '../api';
import { Activity, BirthdayInput, ErrorText, TierBadge, birthdayText, useAction } from '../ui';

type Earned = { points: number; bonuses: Bonus[]; isNew: boolean; customer: Customer; tierUp: boolean };

/** WhatsApp message after a purchase, with the customer's wallet link. */
export const earnedMessage = (shop: string, r: Earned) =>
  [
    `Hi ${r.customer.name}! 🎉`,
    `You earned ${num(r.points + r.bonuses.reduce((a, b) => a + b.points, 0))} points at ${shop}.`,
    r.tierUp ? 'You are now a ★ Gold member!' : '',
    `Your balance: ${num(r.customer.points)} points.`,
    `See your points and rewards: ${walletUrl(r.customer.walletToken)}`,
  ]
    .filter(Boolean)
    .join('\n');

/** The main counter action: phone + bill amount → points (creates the customer on their first visit). */
function EarnForm({ merchant, onDone }: { merchant: Merchant; onDone: () => void }) {
  const [form, setForm] = useState({ phone: '', amount: '', name: '', birthday: '' });
  const [needName, setNeedName] = useState(false);
  const [result, setResult] = useState<Earned | null>(null);
  const { busy, error, setError, run } = useAction();
  const preview = Math.floor(((Number(form.amount) || 0) / 100) * merchant.pointsPer100);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setResult(null);
    void run(async () => {
      try {
        const r = await api<Earned>('points/earn', 'POST', {
          phone: form.phone,
          amount: Number(form.amount),
          name: form.name || undefined,
          birthday: form.birthday || undefined,
        });
        setResult(r);
        setForm({ phone: '', amount: '', name: '', birthday: '' });
        setNeedName(false);
        onDone();
      } catch (err) {
        if ((err as Error).message.startsWith('New customer')) {
          setNeedName(true);
          setError('First visit — add their name to create the customer.');
          return;
        }
        throw err;
      }
    });
  };

  return (
    <form className="card earn" onSubmit={submit}>
      <h2>Give points</h2>
      <div className="row">
        <label>
          Customer phone
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" placeholder="98765 43210" required />
        </label>
        <label>
          Bill amount (₹)
          <input type="number" min="1" step="any" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        </label>
      </div>
      {needName && (
        <div className="row">
          <label>
            Customer name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
          </label>
          <label>
            Birthday <span className="muted">(optional)</span>
            <BirthdayInput value={form.birthday} onChange={(birthday) => setForm({ ...form, birthday })} />
          </label>
        </div>
      )}
      <ErrorText text={error} />
      {result && (
        <div className="alert alert-ok earned">
          <p>
            <strong>
              {result.isNew ? 'Welcome! ' : ''}
              {result.customer.name}
            </strong>{' '}
            got {num(result.points)} points
            {result.bonuses.map((b) => ` + ${num(b.points)} ${b.label.toLowerCase()}`).join('')} — balance{' '}
            <strong>{num(result.customer.points)}</strong>.{result.tierUp && ' Now a ★ Gold member!'}
          </p>
          <a className="btn btn-whatsapp btn-small" href={whatsapp(result.customer.phone, earnedMessage(merchant.name, result))} target="_blank" rel="noreferrer">
            Send on WhatsApp
          </a>
        </div>
      )}
      <button className="btn btn-primary" disabled={busy}>
        {busy ? 'Adding…' : preview > 0 ? `Give ${num(preview)} points` : 'Give points'}
      </button>
      <p className="muted small">
        {merchant.pointsPer100} points for every ₹100
        {merchant.goldMultiplier > 1 && ` · Gold members ×${merchant.goldMultiplier}`} · <a href="#/settings">change</a>
      </p>
    </form>
  );
}

type DashboardData = {
  totals: { customers: number; issued: number; redeemed: number; redemptions: number; sales: number; inactive: number };
  birthdays: (Customer & { daysUntilBirthday: number })[];
  recent: Transaction[];
};

export function Dashboard({ merchant }: { merchant: Merchant }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const load = useCallback(() => void api<DashboardData>('dashboard').then(setData), []);
  useEffect(load, [load]);

  const t = data?.totals;
  return (
    <>
      <header className="page-head">
        <h1>Hello, {merchant.name}</h1>
        <p className="muted">Here's how your loyalty program is doing.</p>
      </header>
      <section className="stats">
        <div className="stat">
          <span>Customers</span>
          <strong>{t ? num(t.customers) : '—'}</strong>
        </div>
        <div className="stat">
          <span>Points given</span>
          <strong>{t ? num(t.issued) : '—'}</strong>
        </div>
        <div className="stat">
          <span>Rewards redeemed</span>
          <strong>{t ? num(t.redemptions) : '—'}</strong>
          <em>{t ? `${num(t.redeemed)} points` : ''}</em>
        </div>
        <div className="stat">
          <span>Sales with points</span>
          <strong>{t ? rupees(t.sales) : '—'}</strong>
        </div>
      </section>

      {t && t.inactive > 0 && (
        <a className="notice" href="#/customers?filter=inactive">
          <span>
            👋 <strong>{num(t.inactive)}</strong> customer{t.inactive === 1 ? " hasn't" : "s haven't"} visited in{' '}
            {merchant.inactiveDays} days.
          </span>
          <span>Send a reminder →</span>
        </a>
      )}

      <div className="grid">
        <div className="stack">
          <EarnForm merchant={merchant} onDone={load} />
          {data && data.birthdays.length > 0 && (
            <section className="card">
              <h2>Birthdays this week 🎂</h2>
              <ul className="list">
                {data.birthdays.map((c) => (
                  <li key={c.id}>
                    <a href={`#/customers/${c.id}`}>
                      <strong>{c.name}</strong> <TierBadge tier={c.tier} />
                    </a>
                    <span className="muted small">
                      {c.daysUntilBirthday === 0 ? 'Today!' : `in ${c.daysUntilBirthday} day${c.daysUntilBirthday === 1 ? '' : 's'}`} ·{' '}
                      {birthdayText(c.birthday)}
                    </span>
                    <a
                      className="btn btn-whatsapp btn-small"
                      target="_blank"
                      rel="noreferrer"
                      href={whatsapp(
                        c.phone,
                        `Happy birthday in advance, ${c.name}! 🎂 Visit ${merchant.name} this week${
                          merchant.birthdayBonus ? ` and get ${num(merchant.birthdayBonus)} bonus points` : ''
                        }. Your points: ${walletUrl(c.walletToken)}`,
                      )}
                    >
                      Wish
                    </a>
                  </li>
                ))}
              </ul>
              {!merchant.birthdayBonus && (
                <p className="muted small">
                  Tip: set a birthday bonus in <a href="#/settings">settings</a>.
                </p>
              )}
            </section>
          )}
        </div>
        <section className="card">
          <h2>Recent activity</h2>
          <Activity items={data?.recent ?? []} />
        </section>
      </div>
    </>
  );
}
