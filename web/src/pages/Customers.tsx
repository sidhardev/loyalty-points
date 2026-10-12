import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, daysAgo, num, walletUrl, whatsapp, type Customer, type Merchant, type Reward } from '../api';
import { BirthdayInput, ErrorText, TierBadge, birthdayText, useAction } from '../ui';

/** "We miss you" WhatsApp message, pointing at the cheapest reward they can already get (or are closest to). */
function reminder(shop: string, c: Customer, rewards: Reward[]) {
  const affordable = rewards.filter((r) => r.points_cost <= c.points).pop();
  const next = rewards.find((r) => r.points_cost > c.points);
  const hook = affordable
    ? `You can already get ${affordable.name} with your points!`
    : next
      ? `You're ${num(next.points_cost - c.points)} points away from ${next.name}.`
      : '';
  return `Hi ${c.name}, we miss you at ${shop}! 👋 You have ${num(c.points)} points waiting. ${hook}\nYour points: ${walletUrl(c.walletToken)}`;
}

export function Customers({ merchant, inactiveView }: { merchant: Merchant; inactiveView: boolean }) {
  const [q, setQ] = useState('');
  const [list, setList] = useState<Customer[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [form, setForm] = useState({ name: '', phone: '', birthday: '' });
  const [sent, setSent] = useState<Set<number>>(new Set());
  const { busy, error, run } = useAction();

  const load = useCallback(
    () => void api<Customer[]>(`customers?q=${encodeURIComponent(q)}${inactiveView ? '&filter=inactive' : ''}`).then(setList),
    [q, inactiveView],
  );
  useEffect(load, [load]);
  useEffect(() => void api<Reward[]>('rewards').then(setRewards), []);

  const add = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await api('customers', 'POST', { ...form, birthday: form.birthday || undefined });
      setForm({ name: '', phone: '', birthday: '' });
      load();
    });
  };

  return (
    <>
      <header className="page-head">
        <h1>Customers</h1>
        <p className="muted">Everyone in your loyalty program.</p>
      </header>

      <div className="tabs">
        <a href="#/customers" className={!inactiveView ? 'active' : ''}>
          All
        </a>
        <a href="#/customers?filter=inactive" className={inactiveView ? 'active' : ''}>
          Haven't visited in {merchant.inactiveDays} days
        </a>
      </div>

      {!inactiveView && (
        <form className="card inline-form" onSubmit={add}>
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder="Phone" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          <BirthdayInput value={form.birthday} onChange={(birthday) => setForm({ ...form, birthday })} />
          <button className="btn btn-primary" disabled={busy}>
            Add customer
          </button>
          <ErrorText text={error} />
        </form>
      )}

      {inactiveView && list.length > 0 && (
        <p className="muted">
          Tap <strong>Remind</strong> to open WhatsApp with a ready "we miss you" message showing their points.
        </p>
      )}

      <section className="card">
        <input className="search" placeholder="Search by name or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
        {list.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th className="right">Points</th>
                <th className={inactiveView ? '' : 'hide-sm'}>{inactiveView ? 'Last visit' : 'Joined'}</th>
                {inactiveView && <th />}
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} onClick={() => (location.hash = `/customers/${c.id}`)}>
                  <td>
                    <strong>{c.name}</strong> <TierBadge tier={c.tier} />
                    {c.birthday && <span className="muted small"> {birthdayText(c.birthday)}</span>}
                  </td>
                  <td>{c.phone}</td>
                  <td className="right">
                    <span className="points">{num(c.points)}</span>
                  </td>
                  <td className={`muted ${inactiveView ? '' : 'hide-sm'}`}>
                    {inactiveView
                      ? c.lastVisit
                        ? `${daysAgo(c.lastVisit)} days ago`
                        : 'never'
                      : new Date(`${c.createdAt.replace(' ', 'T')}Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </td>
                  {inactiveView && (
                    <td className="right" onClick={(e) => e.stopPropagation()}>
                      <a
                        className={`btn btn-small ${sent.has(c.id) ? '' : 'btn-whatsapp'}`}
                        href={whatsapp(c.phone, reminder(merchant.name, c, rewards))}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => setSent(new Set(sent).add(c.id))}
                      >
                        {sent.has(c.id) ? 'Sent ✓' : 'Remind'}
                      </a>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted empty">
            {q
              ? 'No customers match.'
              : inactiveView
                ? `Everyone has visited in the last ${merchant.inactiveDays} days. 🎉`
                : 'No customers yet — add one above or give points from the dashboard.'}
          </p>
        )}
      </section>
    </>
  );
}
