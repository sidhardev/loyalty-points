import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, num, rupees, walletUrl, when, whatsapp, type Customer, type Merchant, type Reward, type Transaction } from '../api';
import { Activity, BirthdayInput, ErrorText, TierBadge, birthdayText, describe, useAction } from '../ui';
import { earnedMessage } from './Dashboard';

type Detail = { customer: Customer; stats: { visits: number; spent: number }; history: Transaction[] };

export function CustomerPage({ id, merchant }: { id: number; merchant: Merchant }) {
  const [data, setData] = useState<Detail | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [amount, setAmount] = useState('');
  const [adjust, setAdjust] = useState({ points: '', reason: '' });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', birthday: '' });
  const [message, setMessage] = useState<{ text: string; share?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const { busy, error, run } = useAction();

  const load = useCallback(() => {
    api<Detail>(`customers/${id}`).then((d) => {
      setData(d);
      setForm({ name: d.customer.name, phone: d.customer.phone, birthday: d.customer.birthday ?? '' });
    });
    api<Reward[]>('rewards').then(setRewards);
  }, [id]);
  useEffect(load, [load]);

  if (!data) return <p className="muted">Loading…</p>;
  const { customer, stats, history } = data;
  const earnPreview = Math.floor(((Number(amount) || 0) / 100) * merchant.pointsPer100 * customer.tier.multiplier);
  const wallet = walletUrl(customer.walletToken);

  const act = (action: () => Promise<void>) => {
    setMessage(null);
    void run(async () => {
      await action();
      load();
    });
  };

  const earn = (e: FormEvent) => {
    e.preventDefault();
    act(async () => {
      const r = await api<Parameters<typeof earnedMessage>[1]>('points/earn', 'POST', { phone: customer.phone, amount: Number(amount) });
      const extra = r.bonuses.map((b) => ` + ${num(b.points)} ${b.label.toLowerCase()}`).join('');
      setMessage({ text: `Added ${num(r.points)} points${extra}.${r.tierUp ? ' Now a ★ Gold member!' : ''}`, share: earnedMessage(merchant.name, r) });
      setAmount('');
    });
  };

  const redeem = (reward: Reward) => {
    if (!confirm(`Redeem "${reward.name}" for ${num(reward.points_cost)} points?`)) return;
    act(async () => {
      await api('points/redeem', 'POST', { customerId: customer.id, rewardId: reward.id });
      setMessage({ text: `${customer.name} redeemed ${reward.name}.` });
    });
  };

  const doAdjust = (e: FormEvent) => {
    e.preventDefault();
    act(async () => {
      await api(`customers/${customer.id}/adjust`, 'POST', { points: Number(adjust.points), reason: adjust.reason });
      setMessage({ text: `Adjusted by ${Number(adjust.points) > 0 ? '+' : ''}${num(Number(adjust.points))} points.` });
      setAdjust({ points: '', reason: '' });
    });
  };

  const undo = (t: Transaction) => {
    if (!confirm(`Undo "${describe(t)}" (${t.points > 0 ? '+' : ''}${num(t.points)} points)?`)) return;
    act(async () => {
      await api(`transactions/${t.id}/undo`, 'POST');
      setMessage({ text: 'Entry undone.' });
    });
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    act(async () => {
      await api(`customers/${customer.id}`, 'PATCH', { ...form, birthday: form.birthday || null });
      setEditing(false);
      setMessage({ text: 'Customer updated.' });
    });
  };

  const resetPin = () => {
    if (!confirm(`Reset ${customer.name}'s PIN? They can set a new one from their wallet link.`)) return;
    act(async () => {
      await api(`customers/${customer.id}/reset-pin`, 'POST');
      setMessage({
        text: 'PIN reset. Send them their wallet link to set a new one.',
        share: `Hi ${customer.name}! Your ${merchant.name} PIN was reset. Open this link to set a new PIN: ${wallet}`,
      });
    });
  };

  const remove = () => {
    if (!confirm(`Delete ${customer.name} and their whole history? This can't be undone.`)) return;
    void run(async () => {
      await api(`customers/${customer.id}`, 'DELETE');
      location.hash = '/customers';
    });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(wallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      prompt('Copy this link:', wallet);
    }
  };

  return (
    <>
      <a href="#/customers" className="back">
        ← Customers
      </a>
      <header className="page-head customer-head">
        <div>
          <h1>
            {customer.name} <TierBadge tier={customer.tier} />
          </h1>
          <p className="muted">
            {customer.phone} {customer.birthday && `· ${birthdayText(customer.birthday)}`} · joined {when(customer.createdAt)}
          </p>
          <p className="muted small">
            {num(stats.visits)} visits · {rupees(stats.spent)} spent
            {customer.tier.name !== 'Gold' && ` · ${num(customer.tier.toGold)} points to Gold`}
          </p>
          <div className="row-inline">
            <button className="link small" onClick={() => setEditing(!editing)}>
              {editing ? 'Cancel edit' : 'Edit'}
            </button>
            <button className="link small" onClick={copy}>
              {copied ? 'Copied ✓' : 'Copy wallet link'}
            </button>
            <a className="link small" href={wallet} target="_blank" rel="noreferrer">
              Open wallet
            </a>
            {customer.hasPin ? (
              <button className="link small" onClick={resetPin}>
                Reset PIN
              </button>
            ) : (
              <span className="muted small">No PIN yet</span>
            )}
            <a
              className="link small"
              href={whatsapp(customer.phone, `Hi ${customer.name}! Here are your ${merchant.name} points and rewards: ${wallet}`)}
              target="_blank"
              rel="noreferrer"
            >
              Send wallet on WhatsApp
            </a>
          </div>
        </div>
        <div className="balance">
          <span>Points</span>
          <strong>{num(customer.points)}</strong>
        </div>
      </header>

      <ErrorText text={error} />
      {message && (
        <div className="alert alert-ok earned">
          <p>{message.text}</p>
          {message.share && (
            <a className="btn btn-whatsapp btn-small" href={whatsapp(customer.phone, message.share)} target="_blank" rel="noreferrer">
              Send on WhatsApp
            </a>
          )}
        </div>
      )}

      {editing && (
        <form className="card" onSubmit={save}>
          <h2>Edit customer</h2>
          <div className="row">
            <label>
              Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label>
              Phone
              <input value={form.phone} inputMode="tel" onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </label>
          </div>
          <label>
            Birthday
            <BirthdayInput value={form.birthday} onChange={(birthday) => setForm({ ...form, birthday })} />
          </label>
          <div className="row-inline">
            <button className="btn btn-primary" disabled={busy}>
              Save
            </button>
            <button type="button" className="link danger" onClick={remove}>
              Delete customer
            </button>
          </div>
        </form>
      )}

      <div className="grid">
        <div className="stack">
          <form className="card" onSubmit={earn}>
            <h2>Add points for a bill</h2>
            <div className="inline-form flat">
              <input type="number" min="1" step="any" placeholder="Bill amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              <button className="btn btn-primary" disabled={busy}>
                {earnPreview > 0 ? `Give ${num(earnPreview)} points` : 'Give points'}
              </button>
            </div>
            {customer.tier.multiplier > 1 && <p className="muted small">★ Gold: earns ×{customer.tier.multiplier} points</p>}
          </form>

          <section className="card">
            <h2>Redeem a reward</h2>
            {rewards.length ? (
              <ul className="rewards">
                {rewards.map((r) => {
                  const short = r.points_cost - customer.points;
                  return (
                    <li key={r.id}>
                      <span>
                        <strong>{r.name}</strong>
                        <em className="muted small">{num(r.points_cost)} points</em>
                      </span>
                      {short > 0 ? (
                        <span className="muted small">{num(short)} more needed</span>
                      ) : (
                        <button className="btn btn-small" disabled={busy} onClick={() => redeem(r)}>
                          Redeem
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="muted">
                No rewards yet. <a href="#/rewards">Create one</a>
              </p>
            )}
          </section>

          <form className="card" onSubmit={doAdjust}>
            <h2>Adjust points</h2>
            <p className="muted small">Fix a mistake: use a negative number to remove points. To reverse one entry, use Undo in the history.</p>
            <div className="inline-form flat">
              <input type="number" step="1" placeholder="+50 or -50" value={adjust.points} onChange={(e) => setAdjust({ ...adjust, points: e.target.value })} required />
              <input placeholder="Reason" value={adjust.reason} onChange={(e) => setAdjust({ ...adjust, reason: e.target.value })} required />
              <button className="btn" disabled={busy}>
                Adjust
              </button>
            </div>
          </form>
        </div>
        <section className="card">
          <h2>History</h2>
          <Activity items={history} showCustomer={false} onUndo={undo} />
        </section>
      </div>
    </>
  );
}
