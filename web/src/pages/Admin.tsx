import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowLeft,
  Copy,
  IndianRupee,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Pause,
  Phone,
  Play,
  Receipt,
  ScrollText,
  Search,
  ShieldCheck,
  Store,
  StickyNote,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { daysAgo, num, rupees, when } from '../api';
import { EmptyState, ErrorText, Logo, Skeleton, SkeletonRows, confirmDialog, toast, useAction, useTheme } from '../ui';

// /admin — the platform owner's panel: every shop's health, who needs a call, and support actions.
// Uses its own login (admin accounts are created on the server: npm run create-admin -w server -- <email>).
// Shows counts and totals only — never customers' names or phone numbers.

const TOKEN = 'lp_admin_token';
const getAdminToken = () => {
  try {
    return localStorage.getItem(TOKEN);
  } catch {
    return null;
  }
};
const setAdminToken = (token: string | null) => {
  try {
    if (token) localStorage.setItem(TOKEN, token);
    else localStorage.removeItem(TOKEN);
  } catch {
    // Logged in for this visit only.
  }
};
const ADMIN_LOGGED_OUT = 'lp-admin-logged-out';

async function adminApi<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const token = getAdminToken();
  const res = await fetch(`/api/admin/${path}`, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) {
    setAdminToken(null);
    dispatchEvent(new Event(ADMIN_LOGGED_OUT));
  }
  if (!res.ok) throw new Error((Array.isArray(data.message) ? data.message.join(', ') : data.message) || `Something went wrong (${res.status})`);
  return data as T;
}

type Status = 'active' | 'sleeping' | 'new' | 'never' | 'paused';
type Shop = {
  id: number;
  name: string;
  email: string;
  created_at: string;
  last_seen_at: string | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  customers: number;
  bills30: number;
  sales30: number;
  last_bill: string | null;
  status: Status;
};
type Comeback = { customers: number; visits: number; sales: number; wonBack: number; allSales: number; rewards: number };

const STATUS: Record<Status, { label: string; hint: string }> = {
  active: { label: 'Active', hint: 'Gave points in the last 7 days' },
  sleeping: { label: 'Sleeping', hint: 'Used it before, nothing for 7+ days' },
  new: { label: 'New', hint: 'Joined in the last 2 days' },
  never: { label: 'Never started', hint: 'Signed up but never gave points' },
  paused: { label: 'Paused', hint: 'Turned off by an admin' },
};

const StatusBadge = ({ status }: { status: Status }) => (
  <span className={`status status-${status}`} title={STATUS[status].hint}>
    {STATUS[status].label}
  </span>
);

const ago = (t: string | null) => {
  if (!t) return 'never';
  const d = daysAgo(t);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
};

/** Why a shop is on the "needs a call" list. */
const reason = (s: Shop) =>
  s.status === 'sleeping' ? `No bills for ${daysAgo(s.last_bill!)} days — had ${num(s.bills30)} in the last 30` : `Joined ${ago(s.created_at)}, never gave points`;

function useAdminHash() {
  const [hash, setHash] = useState(location.hash.slice(1) || '/');
  useEffect(() => {
    const onChange = () => {
      setHash(location.hash.slice(1) || '/');
      scrollTo({ top: 0 });
    };
    addEventListener('hashchange', onChange);
    return () => removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

// ---------------------------------------------------------------- login

function AdminLogin({ onIn }: { onIn: (email: string) => void }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const { busy, error, run } = useAction();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const r = await adminApi<{ token: string; email: string }>('login', 'POST', form);
      setAdminToken(r.token);
      onIn(r.email);
    });
  };
  return (
    <main className="public">
      <form className="card auth-card" onSubmit={submit}>
        <span className="brand">
          <Logo /> <span>Habiturn Admin</span>
        </span>
        <div>
          <h2 style={{ fontSize: 22 }}>Admin log in</h2>
          <p className="muted small">For the people who run Habiturn. Shops log in at /app.</p>
        </div>
        <label>
          Email
          <input type="email" autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoFocus />
        </label>
        <label>
          Password
          <input type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </label>
        <ErrorText text={error} />
        <button className="btn btn-primary btn-lg" disabled={busy}>
          {busy ? 'Checking…' : 'Log in'}
        </button>
      </form>
    </main>
  );
}

// ---------------------------------------------------------------- overview

type Overview = {
  totals: {
    shops: number;
    newShops: number;
    paused: number;
    activeShops: number;
    customers: number;
    newCustomers: number;
    bills24h: number;
    bills30: number;
    sales30: number;
  };
  attention: Shop[];
};

function Stat({ icon: Icon, label, value, sub }: { icon: typeof Store; label: string; value?: string; sub?: string }) {
  return (
    <div className="stat">
      <span className="stat-label">
        <Icon size={16} /> {label}
      </span>
      {value !== undefined ? <strong>{value}</strong> : <Skeleton h={30} w="60%" />}
      {sub && <em>{sub}</em>}
    </div>
  );
}

function OverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  useEffect(() => void adminApi<Overview>('overview').then(setData, (e) => setError((e as Error).message)), []);
  const t = data?.totals;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Overview</h1>
          <p>How the whole platform is doing.</p>
        </div>
      </header>
      <ErrorText text={error} />
      <section className="stats">
        <Stat icon={Store} label="Shops" value={t && num(t.shops)} sub={t && `${num(t.newShops)} new this week${t.paused ? ` · ${num(t.paused)} paused` : ''}`} />
        <Stat
          icon={TrendingUp}
          label="Active this week"
          value={t && num(t.activeShops)}
          sub={t && (t.shops ? `${Math.round((t.activeShops / t.shops) * 100)}% of shops gave points` : '')}
        />
        <Stat icon={Users} label="Customers" value={t && num(t.customers)} sub={t && `${num(t.newCustomers)} new this week`} />
        <Stat icon={Receipt} label="Bills, 30 days" value={t && num(t.bills30)} sub={t && `${num(t.bills24h)} in the last 24 hours`} />
        <Stat icon={IndianRupee} label="Shop sales, 30 days" value={t && rupees(t.sales30)} sub="through the app" />
      </section>

      <section className="card">
        <div className="card-head">
          <h2>
            <Phone size={18} /> Needs a call
          </h2>
          <a href="#/shops" className="small">
            All shops
          </a>
        </div>
        <p className="muted small" style={{ margin: 0 }}>
          Shops that went quiet or never started. A call now is the best chance to keep them.
        </p>
        {!data ? (
          <SkeletonRows count={3} />
        ) : data.attention.length ? (
          <ul className="rows">
            {data.attention.map((s) => (
              <li key={s.id}>
                <a className="row-item" href={`#/shops/${s.id}`} style={{ color: 'inherit' }}>
                  <span className="row-main">
                    <strong>
                      {s.name} <StatusBadge status={s.status} />
                    </strong>
                    <span>{reason(s)}</span>
                  </span>
                  <span className="muted small">{s.email}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={ShieldCheck} title="Everyone's active" text="No shop has gone quiet. 🎉" />
        )}
      </section>
    </>
  );
}

// ---------------------------------------------------------------- shops

const FILTERS: { key: '' | Status; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'sleeping', label: 'Sleeping' },
  { key: 'new', label: 'New' },
  { key: 'never', label: 'Never started' },
  { key: 'paused', label: 'Paused' },
];

function ShopsPage() {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'' | Status>('');
  const [shops, setShops] = useState<Shop[] | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      void adminApi<Shop[]>(`shops?q=${encodeURIComponent(q)}&filter=${filter}`).then(setShops);
    }, 200);
    return () => clearTimeout(timer);
  }, [q, filter]);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Shops</h1>
          <p>{shops ? `${num(shops.length)} shown` : 'Loading…'}</p>
        </div>
      </header>
      <section className="card">
        <div className="input-icon">
          <Search size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search shop name or email" aria-label="Search shops" />
        </div>
        <div className="seg seg-scroll">
          {FILTERS.map((f) => (
            <button key={f.key} className={filter === f.key ? 'active' : ''} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
        {!shops ? (
          <SkeletonRows count={5} />
        ) : shops.length ? (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Shop</th>
                  <th>Status</th>
                  <th className="num">Customers</th>
                  <th className="num">Bills (30d)</th>
                  <th className="num">Sales (30d)</th>
                  <th>Last bill</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {shops.map((s) => (
                  <tr key={s.id} onClick={() => (location.hash = `/shops/${s.id}`)}>
                    <td>
                      <a href={`#/shops/${s.id}`}>
                        <strong>{s.name}</strong>
                      </a>
                      <span className="muted small">{s.email}</span>
                    </td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="num">{num(s.customers)}</td>
                    <td className="num">{num(s.bills30)}</td>
                    <td className="num">{rupees(s.sales30)}</td>
                    <td>{ago(s.last_bill)}</td>
                    <td>{ago(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Store} title="No shops here" text="Try another filter or search." />
        )}
      </section>
    </>
  );
}

// ---------------------------------------------------------------- one shop

type ShopDetail = {
  shop: Shop;
  settings: { pointsPer100: number; welcomeBonus: number; birthdayBonus: number; goldThreshold: number; goldMultiplier: number; maxVisitsPerDay: number; largeBill: number };
  counts: { rewards: number; billsAllTime: number; redemptions: number; customersWithPin: number; blocked30: number };
  comeback: { current: Comeback; previous: Comeback };
  daily: { day: string; bills: number; sales: number }[];
  notes: { id: number; note: string; created_at: string; admin: string }[];
  log: { id: number; action: string; detail: string; created_at: string; admin: string }[];
};

/** Bills per day for the last 30 days, as simple bars. */
function DailyBars({ daily }: { daily: ShopDetail['daily'] }) {
  const byDay = new Map(daily.map((d) => [d.day, d]));
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() + 330 * 60_000 - (29 - i) * 86_400_000).toISOString().slice(0, 10);
    return { day: d, bills: byDay.get(d)?.bills ?? 0, sales: byDay.get(d)?.sales ?? 0 };
  });
  const max = Math.max(1, ...days.map((d) => d.bills));
  return (
    <div className="bars" role="img" aria-label={`Bills per day for 30 days, up to ${max} a day`}>
      {days.map((d) => (
        <span key={d.day} style={{ height: `${Math.max(3, (d.bills / max) * 100)}%` }} className={d.bills ? '' : 'zero'} title={`${d.day}: ${d.bills} bills, ${rupees(d.sales)}`} />
      ))}
    </div>
  );
}

function ShopPage({ id }: { id: number }) {
  const [data, setData] = useState<ShopDetail | null>(null);
  const [error, setError] = useState('');
  const [resetLink, setResetLink] = useState('');
  const [note, setNote] = useState('');
  const [pauseReason, setPauseReason] = useState('');
  const [pausing, setPausing] = useState(false);
  const action = useAction();

  const load = useCallback(() => {
    adminApi<ShopDetail>(`shops/${id}`).then(setData, (e) => setError((e as Error).message));
  }, [id]);
  useEffect(load, [load]);

  if (error) return <EmptyState icon={Store} title="Shop not found" text={error} action={<a className="btn" href="#/shops">All shops</a>} />;
  if (!data) {
    return (
      <div className="card">
        <Skeleton h={28} w="40%" />
        <SkeletonRows count={4} />
      </div>
    );
  }

  const { shop, settings, counts, comeback } = data;
  const change = comeback.previous.sales > 0 ? Math.round(((comeback.current.sales - comeback.previous.sales) / comeback.previous.sales) * 100) : null;

  const makeResetLink = () =>
    void action.run(async () => {
      const r = await adminApi<{ path: string }>(`shops/${id}/reset-link`, 'POST');
      setResetLink(`${location.origin}${r.path}`);
      load();
    });
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied');
    } catch {
      prompt('Copy this:', text);
    }
  };
  const pause = (e: FormEvent) => {
    e.preventDefault();
    void action.run(async () => {
      await adminApi(`shops/${id}/suspend`, 'POST', { reason: pauseReason });
      setPausing(false);
      setPauseReason('');
      toast(`${shop.name} paused`);
      load();
    });
  };
  const resume = async () => {
    if (!(await confirmDialog({ title: `Turn ${shop.name} back on?`, body: 'They can log in and give points again.', confirm: 'Turn on' }))) return;
    void action.run(async () => {
      await adminApi(`shops/${id}/unsuspend`, 'POST');
      toast(`${shop.name} is back on`);
      load();
    });
  };
  const addNote = (e: FormEvent) => {
    e.preventDefault();
    void action.run(async () => {
      await adminApi(`shops/${id}/notes`, 'POST', { note });
      setNote('');
      load();
    });
  };

  return (
    <>
      <a href="#/shops" className="back">
        <ArrowLeft size={16} /> Shops
      </a>
      <header className="page-head">
        <div>
          <h1>
            {shop.name} <StatusBadge status={shop.status} />
          </h1>
          <p>
            {shop.email} · joined {when(shop.created_at)} · last seen {ago(shop.last_seen_at)}
          </p>
        </div>
      </header>

      {shop.suspended_at && (
        <p className="alert alert-error">
          Paused {ago(shop.suspended_at)}: {shop.suspended_reason}
        </p>
      )}

      <section className="stats">
        <Stat icon={Users} label="Customers" value={num(shop.customers)} sub={`${num(counts.customersWithPin)} set a PIN`} />
        <Stat icon={Receipt} label="Bills, 30 days" value={num(shop.bills30)} sub={`${num(counts.billsAllTime)} all time · last ${ago(shop.last_bill)}`} />
        <Stat icon={IndianRupee} label="Sales, 30 days" value={rupees(shop.sales30)} />
        <Stat
          icon={change !== null && change < 0 ? TrendingDown : TrendingUp}
          label="Came back, 30 days"
          value={rupees(comeback.current.sales)}
          sub={`${num(comeback.current.customers)} returning customers${change !== null ? ` · ${change >= 0 ? '+' : ''}${num(change)}%` : ''}`}
        />
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>
              <Receipt size={18} /> Bills per day
            </h2>
            <span className="muted small">last 30 days</span>
          </div>
          <DailyBars daily={data.daily} />
          <dl className="facts">
            <div>
              <dt>Points per ₹100</dt>
              <dd>{settings.pointsPer100}</dd>
            </div>
            <div>
              <dt>Rewards</dt>
              <dd>
                {num(counts.rewards)} · {num(counts.redemptions)} redeemed
              </dd>
            </div>
            <div>
              <dt>Welcome / birthday bonus</dt>
              <dd>
                {settings.welcomeBonus} / {settings.birthdayBonus}
              </dd>
            </div>
            <div>
              <dt>Gold</dt>
              <dd>
                after {num(settings.goldThreshold)} · ×{settings.goldMultiplier}
              </dd>
            </div>
            <div>
              <dt>Visit limit / bill check</dt>
              <dd>
                {settings.maxVisitsPerDay || 'none'} / {settings.largeBill ? rupees(settings.largeBill) : 'off'}
              </dd>
            </div>
            <div>
              <dt>Blocked bills, 30 days</dt>
              <dd>{num(counts.blocked30)}</dd>
            </div>
          </dl>
          {counts.rewards === 0 && <p className="alert alert-error small">No rewards set up — customers have nothing to aim for. Worth mentioning on a call.</p>}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>
              <ShieldCheck size={18} /> Support
            </h2>
          </div>
          <ErrorText text={action.error} />

          <div className="support-action">
            <div>
              <strong>Password reset link</strong>
              <span className="muted small">Works once, for 24 hours. Send it to the owner yourself (WhatsApp, email).</span>
            </div>
            <button className="btn btn-soft" disabled={action.busy} onClick={makeResetLink}>
              <KeyRound size={17} /> Make link
            </button>
          </div>
          {resetLink && (
            <div className="copy-box">
              <code>{resetLink}</code>
              <button className="btn btn-sm" onClick={() => void copy(resetLink)}>
                <Copy size={15} /> Copy
              </button>
            </div>
          )}

          {shop.suspended_at ? (
            <div className="support-action">
              <div>
                <strong>Shop is paused</strong>
                <span className="muted small">They can't log in; new joins and bill QRs are refused. Customer wallets still open.</span>
              </div>
              <button className="btn btn-primary" disabled={action.busy} onClick={() => void resume()}>
                <Play size={17} /> Turn on
              </button>
            </div>
          ) : pausing ? (
            <form className="support-form" onSubmit={pause}>
              <label>
                Why pause {shop.name}?
                <input value={pauseReason} onChange={(e) => setPauseReason(e.target.value)} placeholder="e.g. Spam sign-ups, unpaid plan" required autoFocus />
              </label>
              <div className="actions">
                <button type="button" className="btn btn-ghost" onClick={() => setPausing(false)}>
                  Cancel
                </button>
                <button className="btn btn-danger" disabled={action.busy}>
                  <Pause size={17} /> Pause shop
                </button>
              </div>
            </form>
          ) : (
            <div className="support-action">
              <div>
                <strong>Pause this shop</strong>
                <span className="muted small">Stops logins and new points. Nothing is deleted; you can turn it back on.</span>
              </div>
              <button className="btn btn-ghost" onClick={() => setPausing(true)}>
                <Pause size={17} /> Pause
              </button>
            </div>
          )}

          <form className="support-form" onSubmit={addNote}>
            <label>
              <span>
                <StickyNote size={15} style={{ verticalAlign: '-2px' }} /> Notes (only admins see these)
              </span>
              <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Called on 15 Oct — wants staff training" required />
            </label>
            <button className="btn btn-soft" disabled={action.busy || !note.trim()}>
              Add note
            </button>
          </form>
          {data.notes.length > 0 && (
            <ul className="notes">
              {data.notes.map((n) => (
                <li key={n.id}>
                  <p>{n.note}</p>
                  <span className="muted small">
                    {n.admin} · {when(n.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {data.log.length > 0 && (
        <section className="card">
          <div className="card-head">
            <h2>
              <ScrollText size={18} /> Admin actions on this shop
            </h2>
          </div>
          <AdminLogList items={data.log} />
        </section>
      )}
    </>
  );
}

// ---------------------------------------------------------------- admin log

type LogItem = { id: number; action: string; detail: string; created_at: string; admin: string; merchant_id?: number | null };

function AdminLogList({ items }: { items: LogItem[] }) {
  return (
    <ul className="rows">
      {items.map((l) => (
        <li key={l.id}>
          <div className="row-item">
            <span className="row-main">
              <strong>{l.merchant_id ? <a href={`#/shops/${l.merchant_id}`}>{l.detail}</a> : l.detail}</strong>
              <span>
                {l.admin} · {when(l.created_at)}
              </span>
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function LogPage() {
  const [items, setItems] = useState<LogItem[] | null>(null);
  useEffect(() => void adminApi<LogItem[]>('log').then(setItems), []);
  return (
    <>
      <header className="page-head">
        <div>
          <h1>Admin log</h1>
          <p>Every reset link, pause and turn-on by any admin.</p>
        </div>
      </header>
      <section className="card">
        {!items ? <SkeletonRows /> : items.length ? <AdminLogList items={items} /> : <EmptyState icon={ScrollText} title="No admin actions yet" />}
      </section>
    </>
  );
}

// ---------------------------------------------------------------- shell

const NAV = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/shops', label: 'Shops', icon: Store },
  { path: '/log', label: 'Admin log', icon: ScrollText },
];

function AdminShell({ email, onLogout, children }: { email: string; onLogout: () => void; children: ReactNode }) {
  const hash = useAdminHash();
  const theme = useTheme();
  const active = (path: string) => (path === '/' ? hash === '/' : hash.startsWith(path));
  return (
    <div className="admin">
      <header className="admin-bar">
        <a href="#/" className="brand">
          <Logo /> <span>Habiturn Admin</span>
        </a>
        <nav>
          {NAV.map(({ path, label, icon: Icon }) => (
            <a key={path} href={`#${path}`} className={active(path) ? 'active' : ''}>
              <Icon size={17} /> <span>{label}</span>
            </a>
          ))}
        </nav>
        <span className="admin-email muted small">{email}</span>
        <button className="icon-btn" onClick={theme.toggle} aria-label="Toggle dark mode">
          <theme.Icon size={19} />
        </button>
        <button className="icon-btn" onClick={onLogout} aria-label="Log out">
          <LogOut size={19} />
        </button>
      </header>
      <main className="admin-page" key={hash}>
        {children}
      </main>
    </div>
  );
}

export function AdminApp() {
  const [email, setEmail] = useState<string | null | undefined>(getAdminToken() ? undefined : null);
  const hash = useAdminHash();

  useEffect(() => {
    document.title = 'Superadmin · Habiturn';
    if (getAdminToken()) adminApi<{ email: string }>('me').then((me) => setEmail(me.email), () => setEmail(null));
    const out = () => setEmail(null);
    addEventListener(ADMIN_LOGGED_OUT, out);
    return () => removeEventListener(ADMIN_LOGGED_OUT, out);
  }, []);

  if (email === undefined) return null;
  if (!email) return <AdminLogin onIn={setEmail} />;

  const logout = async () => {
    if (!(await confirmDialog({ title: 'Log out of superadmin?', confirm: 'Log out' }))) return;
    setAdminToken(null);
    setEmail(null);
  };

  const shopId = hash.match(/^\/shops\/(\d+)$/)?.[1];
  const page = shopId ? <ShopPage key={shopId} id={Number(shopId)} /> : hash.startsWith('/shops') ? <ShopsPage /> : hash.startsWith('/log') ? <LogPage /> : <OverviewPage />;

  return (
    <AdminShell email={email} onLogout={() => void logout()}>
      {page}
    </AdminShell>
  );
}

