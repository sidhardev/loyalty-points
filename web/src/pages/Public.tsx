import { useEffect, useState, type FormEvent } from 'react';
import { api, num, when, type Bonus, type Reward, type Tier, type Transaction } from '../api';
import { BirthdayInput, ErrorText, describe, useAction } from '../ui';

// Pages customers open on their phone, without an account.

type WalletData = {
  shop: { name: string; pointsPer100: number; goldThreshold: number; goldMultiplier: number };
  customer: { name: string; points: number; lifetimePoints: number; tier: Tier; since: string };
  rewards: Reward[];
  history: Transaction[];
};

/** /w/<token> — a customer's points, rewards and history at one shop. */
export function Wallet({ token }: { token: string }) {
  const [data, setData] = useState<WalletData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<WalletData>(`public/wallet/${encodeURIComponent(token)}`)
      .then((d) => {
        setData(d);
        document.title = `${d.shop.name} · My points`;
      })
      .catch((err) => setError((err as Error).message));
  }, [token]);

  if (error) return <main className="public"><p className="alert alert-error">{error}</p></main>;
  if (!data) return <main className="public"><p className="muted center">Loading…</p></main>;

  const { shop, customer, rewards, history } = data;
  const gold = customer.tier.name === 'Gold';
  const goldPct = Math.min(100, (customer.lifetimePoints / shop.goldThreshold) * 100);

  return (
    <main className="public">
      <section className={`wallet-card ${gold ? 'wallet-gold' : ''}`}>
        <span className="wallet-shop">{shop.name}</span>
        <span className="wallet-name">Hi {customer.name}{gold ? ' ★' : ''}</span>
        <strong className="wallet-points">{num(customer.points)}</strong>
        <span>points</span>
        {gold ? (
          <em className="wallet-tier">★ Gold member — you earn ×{shop.goldMultiplier} points</em>
        ) : (
          <div className="wallet-progress">
            <div className="meter">
              <span style={{ width: `${goldPct}%` }} />
            </div>
            <em>{num(customer.tier.toGold)} more points to ★ Gold (×{shop.goldMultiplier} points)</em>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Rewards</h2>
        {rewards.length ? (
          <ul className="wallet-rewards">
            {rewards.map((r) => {
              const pct = Math.min(100, (customer.points / r.points_cost) * 100);
              const ready = customer.points >= r.points_cost;
              return (
                <li key={r.id}>
                  <div className="wallet-reward-head">
                    <strong>🎁 {r.name}</strong>
                    <span className={ready ? 'ready' : 'muted small'}>{ready ? 'Ready — ask at the counter!' : `${num(r.points_cost - customer.points)} to go`}</span>
                  </div>
                  <div className="meter">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <span className="muted small">{num(r.points_cost)} points</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="muted">Rewards coming soon.</p>
        )}
        <p className="muted small">You earn {shop.pointsPer100} points on every ₹100 you spend.</p>
      </section>

      <section className="card">
        <h2>History</h2>
        {history.length ? (
          <ul className="activity">
            {history.map((t) => (
              <li key={t.id}>
                <span className={`badge ${t.points >= 0 ? 'badge-plus' : 'badge-minus'}`}>
                  {t.points >= 0 ? '+' : '−'}
                  {num(Math.abs(t.points))}
                </span>
                <span className="activity-text">{describe(t).replace(/^earned/, 'Earned').replace(/^redeemed/, 'Redeemed').replace(/^got/, 'Got')}</span>
                <span className="muted small nowrap">{when(t.created_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No activity yet.</p>
        )}
      </section>
      <p className="muted small center">Save this page to see your points anytime.</p>
    </main>
  );
}

/** /join/<code> — sign-up page behind the shop's counter QR code. */
export function Join({ code }: { code: string }) {
  const [shop, setShop] = useState<{ shop: string; welcomeBonus: number; pointsPer100: number } | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', birthday: '' });
  const [loadError, setLoadError] = useState('');
  const { busy, error, run } = useAction();

  useEffect(() => {
    api<typeof shop>(`public/join/${encodeURIComponent(code)}`)
      .then((s) => {
        setShop(s);
        if (s) document.title = `Join ${s.shop} rewards`;
      })
      .catch((err) => setLoadError((err as Error).message));
  }, [code]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const r = await api<{ walletToken: string; bonuses: Bonus[] }>(`public/join/${encodeURIComponent(code)}`, 'POST', {
        ...form,
        birthday: form.birthday || undefined,
      });
      location.href = `/w/${r.walletToken}`;
    });
  };

  if (loadError) return <main className="public"><p className="alert alert-error">{loadError}</p></main>;
  if (!shop) return <main className="public"><p className="muted center">Loading…</p></main>;

  return (
    <main className="public">
      <section className="wallet-card">
        <span className="wallet-shop">{shop.shop}</span>
        <span className="wallet-name">Join our rewards</span>
        {shop.welcomeBonus > 0 && (
          <>
            <strong className="wallet-points">{num(shop.welcomeBonus)}</strong>
            <span>points free when you join</span>
          </>
        )}
        <em className="wallet-tier">Earn {shop.pointsPer100} points on every ₹100</em>
      </section>
      <form className="card" onSubmit={submit}>
        <label>
          Your name
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
        </label>
        <label>
          Phone number
          <input value={form.phone} inputMode="tel" onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="98765 43210" required />
        </label>
        <label>
          Birthday <span className="muted">(optional — for a birthday treat)</span>
          <BirthdayInput value={form.birthday} onChange={(birthday) => setForm({ ...form, birthday })} />
        </label>
        <ErrorText text={error.includes('already exists') ? "You're already a member! Ask at the counter for your points link." : error} />
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Joining…' : 'Join'}
        </button>
      </form>
    </main>
  );
}
