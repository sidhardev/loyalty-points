import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  api,
  getToken,
  LOGGED_OUT,
  num,
  rupees,
  setToken,
  when,
  type Customer,
  type Merchant,
  type Reward,
  type Transaction,
} from './api';

// Pages are picked from the URL hash (#/customers/3), so no router library is needed.

function useHash() {
  const [hash, setHash] = useState(location.hash.slice(1) || '/');
  useEffect(() => {
    const onChange = () => setHash(location.hash.slice(1) || '/');
    addEventListener('hashchange', onChange);
    return () => removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

/** Runs a form action, showing its error message if it fails. */
function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, run };
}

const ErrorText = ({ text }: { text: string }) => (text ? <p className="alert alert-error">{text}</p> : null);

// ---------------------------------------------------------------- auth

function AuthPage({ onAuthed }: { onAuthed: (m: Merchant) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const { busy, error, setError, run } = useAction();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const { token, merchant } = await api<{ token: string; merchant: Merchant }>(
        `auth/${mode}`,
        'POST',
        mode === 'signup' ? form : { email: form.email, password: form.password },
      );
      setToken(token);
      onAuthed(merchant);
    });
  };

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  return (
    <main className="auth">
      <div className="auth-side">
        <div className="brand brand-lg">⭐ Loyalty Points</div>
        <h1>Bring your customers back.</h1>
        <p>Give points on every bill, let customers spend them on rewards, and see who your regulars are.</p>
        <ul>
          <li>Points on every purchase, by phone number</li>
          <li>Rewards your customers actually want</li>
          <li>Every customer's history in one place</li>
        </ul>
      </div>
      <form className="card auth-card" onSubmit={submit}>
        <h2>{mode === 'login' ? 'Log in' : 'Create your shop account'}</h2>
        {mode === 'signup' && (
          <label>
            Shop name
            <input value={form.name} onChange={set('name')} placeholder="Chai Point, MG Road" required autoFocus />
          </label>
        )}
        <label>
          Email
          <input type="email" value={form.email} onChange={set('email')} required autoFocus={mode === 'login'} />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            required
            minLength={mode === 'signup' ? 8 : undefined}
            placeholder={mode === 'signup' ? 'At least 8 characters' : ''}
          />
        </label>
        <ErrorText text={error} />
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}
        </button>
        <p className="muted center">
          {mode === 'login' ? 'New here? ' : 'Already have an account? '}
          <button
            type="button"
            className="link"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError('');
            }}
          >
            {mode === 'login' ? 'Create an account' : 'Log in'}
          </button>
        </p>
      </form>
    </main>
  );
}

// ---------------------------------------------------------------- shared pieces

function Activity({ items, showCustomer = true }: { items: Transaction[]; showCustomer?: boolean }) {
  if (!items.length) return <p className="muted empty">No activity yet.</p>;
  return (
    <ul className="activity">
      {items.map((t) => (
        <li key={t.id}>
          <span className={`badge badge-${t.type}`}>{t.type === 'earn' ? `+${num(t.points)}` : `−${num(t.points)}`}</span>
          <span className="activity-text">
            {showCustomer && (
              <a href={`#/customers/${t.customer_id}`}>
                <strong>{t.customer_name}</strong>
              </a>
            )}{' '}
            {t.type === 'earn' ? `earned points on a ${rupees(t.amount ?? 0)} bill` : `redeemed ${t.note}`}
          </span>
          <span className="muted small">{when(t.created_at)}</span>
        </li>
      ))}
    </ul>
  );
}

/** The main counter action: phone + bill amount → points (creates the customer on their first visit). */
function EarnForm({ merchant, onDone }: { merchant: Merchant; onDone: () => void }) {
  const [form, setForm] = useState({ phone: '', amount: '', name: '' });
  const [needName, setNeedName] = useState(false);
  const [done, setDone] = useState('');
  const { busy, error, setError, run } = useAction();
  const preview = Math.floor(((Number(form.amount) || 0) / 100) * merchant.pointsPer100);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setDone('');
    void run(async () => {
      try {
        const r = await api<{ points: number; isNew: boolean; customer: Customer }>('points/earn', 'POST', {
          phone: form.phone,
          amount: Number(form.amount),
          name: form.name || undefined,
        });
        setDone(
          `${r.isNew ? 'Welcome! ' : ''}${r.customer.name} got ${num(r.points)} points — balance ${num(r.customer.points)}.`,
        );
        setForm({ phone: '', amount: '', name: '' });
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
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            inputMode="tel"
            placeholder="98765 43210"
            required
          />
        </label>
        <label>
          Bill amount (₹)
          <input
            type="number"
            min="1"
            step="any"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
        </label>
      </div>
      {needName && (
        <label>
          Customer name
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
        </label>
      )}
      <ErrorText text={error} />
      {done && <p className="alert alert-ok">{done}</p>}
      <button className="btn btn-primary" disabled={busy}>
        {busy ? 'Adding…' : preview > 0 ? `Give ${num(preview)} points` : 'Give points'}
      </button>
      <p className="muted small">
        {merchant.pointsPer100} points for every ₹100 · <a href="#/settings">change</a>
      </p>
    </form>
  );
}

// ---------------------------------------------------------------- pages

function Dashboard({ merchant }: { merchant: Merchant }) {
  const [data, setData] = useState<{
    totals: { customers: number; issued: number; redeemed: number; redemptions: number; sales: number };
    recent: Transaction[];
  } | null>(null);
  const load = useCallback(() => void api<typeof data>('dashboard').then(setData), []);
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
      <div className="grid">
        <EarnForm merchant={merchant} onDone={load} />
        <section className="card">
          <h2>Recent activity</h2>
          <Activity items={data?.recent ?? []} />
        </section>
      </div>
    </>
  );
}

function Customers() {
  const [q, setQ] = useState('');
  const [list, setList] = useState<Customer[]>([]);
  const [form, setForm] = useState({ name: '', phone: '' });
  const { busy, error, run } = useAction();

  const load = useCallback(() => void api<Customer[]>(`customers?q=${encodeURIComponent(q)}`).then(setList), [q]);
  useEffect(load, [load]);

  const add = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await api('customers', 'POST', form);
      setForm({ name: '', phone: '' });
      load();
    });
  };

  return (
    <>
      <header className="page-head">
        <h1>Customers</h1>
        <p className="muted">Everyone in your loyalty program.</p>
      </header>
      <form className="card inline-form" onSubmit={add}>
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input
          placeholder="Phone"
          inputMode="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          required
        />
        <button className="btn btn-primary" disabled={busy}>
          Add customer
        </button>
        <ErrorText text={error} />
      </form>
      <section className="card">
        <input className="search" placeholder="Search by name or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
        {list.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th className="right">Points</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} onClick={() => (location.hash = `/customers/${c.id}`)}>
                  <td>
                    <strong>{c.name}</strong>
                  </td>
                  <td>{c.phone}</td>
                  <td className="right">
                    <span className="points">{num(c.points)}</span>
                  </td>
                  <td className="muted">{when(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted empty">{q ? 'No customers match.' : 'No customers yet — add one above or give points from the dashboard.'}</p>
        )}
      </section>
    </>
  );
}

function CustomerPage({ id, merchant }: { id: number; merchant: Merchant }) {
  const [data, setData] = useState<{ customer: Customer; history: Transaction[] } | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const { busy, error, run } = useAction();

  const load = useCallback(() => {
    api<typeof data>(`customers/${id}`).then(setData);
    api<Reward[]>('rewards').then(setRewards);
  }, [id]);
  useEffect(load, [load]);

  if (!data) return <p className="muted">Loading…</p>;
  const earnPreview = Math.floor(((Number(amount) || 0) / 100) * merchant.pointsPer100);
  const { customer, history } = data;

  const earn = (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    void run(async () => {
      const r = await api<{ points: number }>('points/earn', 'POST', { phone: customer.phone, amount: Number(amount) });
      setMessage(`Added ${num(r.points)} points.`);
      setAmount('');
      load();
    });
  };

  const redeem = (reward: Reward) => {
    if (!confirm(`Redeem "${reward.name}" for ${num(reward.points_cost)} points?`)) return;
    setMessage('');
    void run(async () => {
      await api('points/redeem', 'POST', { customerId: customer.id, rewardId: reward.id });
      setMessage(`${customer.name} redeemed ${reward.name}.`);
      load();
    });
  };

  return (
    <>
      <a href="#/customers" className="back">
        ← Customers
      </a>
      <header className="page-head customer-head">
        <div>
          <h1>{customer.name}</h1>
          <p className="muted">
            {customer.phone} · joined {when(customer.created_at)}
          </p>
        </div>
        <div className="balance">
          <span>Points</span>
          <strong>{num(customer.points)}</strong>
        </div>
      </header>
      <ErrorText text={error} />
      {message && <p className="alert alert-ok">{message}</p>}
      <div className="grid">
        <div className="stack">
          <form className="card" onSubmit={earn}>
            <h2>Add points for a bill</h2>
            <div className="inline-form flat">
              <input
                type="number"
                min="1"
                step="any"
                placeholder="Bill amount (₹)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <button className="btn btn-primary" disabled={busy}>
                {earnPreview > 0 ? `Give ${num(earnPreview)} points` : 'Give points'}
              </button>
            </div>
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
        </div>
        <section className="card">
          <h2>History</h2>
          <Activity items={history} showCustomer={false} />
        </section>
      </div>
    </>
  );
}

function Rewards() {
  const [list, setList] = useState<Reward[]>([]);
  const [form, setForm] = useState({ name: '', pointsCost: '' });
  const { busy, error, run } = useAction();
  const load = useCallback(() => void api<Reward[]>('rewards').then(setList), []);
  useEffect(load, [load]);

  const add = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await api('rewards', 'POST', { name: form.name, pointsCost: Number(form.pointsCost) });
      setForm({ name: '', pointsCost: '' });
      load();
    });
  };

  const remove = (r: Reward) => {
    if (!confirm(`Remove "${r.name}"?`)) return;
    void run(async () => {
      await api(`rewards/${r.id}`, 'DELETE');
      load();
    });
  };

  return (
    <>
      <header className="page-head">
        <h1>Rewards</h1>
        <p className="muted">What customers can get with their points.</p>
      </header>
      <form className="card inline-form" onSubmit={add}>
        <input placeholder="Reward, e.g. Free coffee" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input
          type="number"
          min="1"
          step="1"
          placeholder="Points needed"
          value={form.pointsCost}
          onChange={(e) => setForm({ ...form, pointsCost: e.target.value })}
          required
        />
        <button className="btn btn-primary" disabled={busy}>
          Add reward
        </button>
        <ErrorText text={error} />
      </form>
      <section className="reward-grid">
        {list.map((r) => (
          <div className="card reward" key={r.id}>
            <span className="reward-icon">🎁</span>
            <strong>{r.name}</strong>
            <span className="points">{num(r.points_cost)} points</span>
            <button className="link danger" onClick={() => remove(r)}>
              Remove
            </button>
          </div>
        ))}
        {!list.length && <p className="muted empty">No rewards yet — add your first one above.</p>}
      </section>
    </>
  );
}

function Settings({ merchant, onSaved }: { merchant: Merchant; onSaved: (m: Merchant) => void }) {
  const [form, setForm] = useState({ name: merchant.name, pointsPer100: String(merchant.pointsPer100) });
  const [saved, setSaved] = useState(false);
  const { busy, error, run } = useAction();

  const save = (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    void run(async () => {
      onSaved(await api<Merchant>('me', 'PATCH', { name: form.name, pointsPer100: Number(form.pointsPer100) }));
      setSaved(true);
    });
  };

  return (
    <>
      <header className="page-head">
        <h1>Settings</h1>
        <p className="muted">{merchant.email}</p>
      </header>
      <form className="card narrow" onSubmit={save}>
        <label>
          Shop name
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label>
          Points for every ₹100 spent
          <input
            type="number"
            min="1"
            max="1000"
            step="1"
            value={form.pointsPer100}
            onChange={(e) => setForm({ ...form, pointsPer100: e.target.value })}
            required
          />
        </label>
        <p className="muted small">
          Example: a ₹450 bill gives {num(Math.floor(4.5 * (Number(form.pointsPer100) || 0)))} points.
        </p>
        <ErrorText text={error} />
        {saved && <p className="alert alert-ok">Saved.</p>}
        <button className="btn btn-primary" disabled={busy}>
          Save
        </button>
      </form>
    </>
  );
}

// ---------------------------------------------------------------- app shell

function Shell({ merchant, children, onLogout }: { merchant: Merchant; children: ReactNode; onLogout: () => void }) {
  const hash = useHash();
  const links = [
    ['/', 'Dashboard'],
    ['/customers', 'Customers'],
    ['/rewards', 'Rewards'],
    ['/settings', 'Settings'],
  ];
  const active = (path: string) => (path === '/' ? hash === '/' : hash.startsWith(path));
  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <a href="#/" className="brand">
            ⭐ <span>{merchant.name}</span>
          </a>
          <div className="nav-links">
            {links.map(([path, label]) => (
              <a key={path} href={`#${path}`} className={active(path) ? 'active' : ''}>
                {label}
              </a>
            ))}
          </div>
          <button className="link" onClick={onLogout}>
            Log out
          </button>
        </div>
      </nav>
      <main className="page">{children}</main>
    </>
  );
}

export function App() {
  const [merchant, setMerchant] = useState<Merchant | null | undefined>(getToken() ? undefined : null);
  const hash = useHash();

  useEffect(() => {
    if (getToken()) api<Merchant>('me').then(setMerchant).catch(() => setMerchant(null));
    const onLogout = () => setMerchant(null);
    addEventListener(LOGGED_OUT, onLogout);
    return () => removeEventListener(LOGGED_OUT, onLogout);
  }, []);

  if (merchant === undefined) return null;
  if (!merchant) return <AuthPage onAuthed={setMerchant} />;

  const logout = () => {
    setToken(null);
    setMerchant(null);
    location.hash = '/';
  };

  const customerId = hash.match(/^\/customers\/(\d+)$/)?.[1];
  let page: ReactNode;
  if (customerId) page = <CustomerPage key={customerId} id={Number(customerId)} merchant={merchant} />;
  else if (hash.startsWith('/customers')) page = <Customers />;
  else if (hash.startsWith('/rewards')) page = <Rewards />;
  else if (hash.startsWith('/settings')) page = <Settings merchant={merchant} onSaved={setMerchant} />;
  else page = <Dashboard merchant={merchant} />;

  return (
    <Shell merchant={merchant} onLogout={logout}>
      {page}
    </Shell>
  );
}
