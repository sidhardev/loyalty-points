import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import QRCode from 'qrcode';
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  FileText,
  Globe2,
  Link2,
  Mail,
  MessageCircle,
  MessagesSquare,
  Rocket,
  Gift,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Pause,
  Phone,
  Play,
  Stamp,
  ScrollText,
  Search,
  ShieldCheck,
  Store,
  StickyNote,
  TrendingDown,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { daysAgo, num, when, whatsapp } from '../api';
import { trackedLink } from '../attribution';
import '../marketing.css';
import { EmptyState, ErrorText, Logo, Skeleton, SkeletonRows, confirmDialog, toast, useAction, useTheme } from '../ui';
import { SeoPage } from './AdminSeo';
import { StatusPage } from './AdminStatus';
import { LeadsPage } from './AdminLeads';
import { ChatsPage, WA_UNREAD } from './AdminChats';
import { VisitsPage, type PageEvent, type PageView } from './Visits';

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
  visits30: number;
  rewards30: number;
  last_visit: string | null;
  reward_name: string; // '' = hasn't set up their card yet
  visits_needed: number;
  status: Status;
  phone: string | null;
  source: string;
  signup_source: string;
  signup_medium: string;
  signup_campaign: string;
  signup_ref: string;
  signup_landing: string;
  referred_by: number | null;
  referred_by_name: string | null;
  referrals: number;
  on_landing: number; // 1 = listed on the homepage
  last_contact: string | null;
  last_contact_detail: string | null;
};
type Comeback = { customers: number; visits: number; wonBack: number; allVisits: number; rewards: number };

const STATUS: Record<Status, { label: string; hint: string }> = {
  active: { label: 'Active', hint: 'Added visits in the last 7 days' },
  sleeping: { label: 'Sleeping', hint: 'Used it before, nothing for 7+ days' },
  new: { label: 'New', hint: 'Joined in the last 2 days' },
  never: { label: 'Never started', hint: 'Signed up but never added a visit' },
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
  s.status === 'sleeping'
    ? `No visits for ${daysAgo(s.last_visit!)} days — had ${num(s.visits30)} in the last 30`
    : `Joined ${ago(s.created_at)}, never added a visit${s.reward_name ? '' : ' (card not set up)'}`;

/** The shop's one rule, as the panel shows it. */
const cardRule = (s: Pick<Shop, 'reward_name' | 'visits_needed'>) => (s.reward_name ? `Every ${s.visits_needed} visits → ${s.reward_name}` : 'Not set up yet');

/** How a source label reads in the panel. */
const SOURCE_NAMES: Record<string, string> = {
  direct: 'Direct / unknown',
  card: 'Customer cards',
  google: 'Google',
  bing: 'Bing',
  whatsapp: 'WhatsApp',
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  x: 'X (Twitter)',
  producthunt: 'Product Hunt',
};
const sourceName = (s: string) => SOURCE_NAMES[s] ?? s;

/** A ready message for a shop that needs a nudge. */
function nudge(s: Shop) {
  if (s.status === 'sleeping') {
    return `Hi! This is the Regularhood team. ${s.name} added ${num(s.visits30)} visits last month, and your regulars are still collecting stamps. Is anything making it hard at the counter? Happy to help on a quick call.`;
  }
  return `Hi! This is the Regularhood team, thanks for signing up ${s.name}. Can we help you add your first visit? Just type the customer's phone number and tap Add visit — and print your counter poster from Settings so customers know about your card. Happy to set it up with you on a call.`;
}

/** WhatsApp / call / email buttons for a shop; using one records the contact in the admin log. */
function ContactButtons({ shop, onDone, compact }: { shop: Shop; onDone: () => void; compact?: boolean }) {
  const record = (channel: 'whatsapp' | 'call' | 'email' | 'visit') =>
    void adminApi(`shops/${shop.id}/contacted`, 'POST', { channel }).then(onDone, (e) => toast((e as Error).message, 'error'));
  const size = compact ? 'btn-sm' : '';
  return (
    <div className="follow-actions">
      {shop.phone && (
        <a className={`btn ${size} btn-whatsapp`} href={whatsapp(shop.phone, nudge(shop))} target="_blank" rel="noreferrer" onClick={() => record('whatsapp')}>
          <MessageCircle size={16} /> WhatsApp
        </a>
      )}
      {shop.phone && (
        <a className={`btn ${size} btn-soft`} href={`tel:${shop.phone}`} onClick={() => record('call')}>
          <Phone size={16} /> Call
        </a>
      )}
      <a
        className={`btn ${size} btn-soft`}
        href={`mailto:${shop.email}?subject=${encodeURIComponent(`Your Regularhood shop: ${shop.name}`)}&body=${encodeURIComponent(nudge(shop))}`}
        onClick={() => record('email')}
      >
        <Mail size={16} /> Email
      </a>
      <button className={`btn ${size} btn-ghost`} onClick={() => record('visit')}>
        <Check size={16} /> Visited / other
      </button>
    </div>
  );
}

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
          <Logo /> <span>Regularhood Admin</span>
        </span>
        <div>
          <h2 style={{ fontSize: 22 }}>Admin log in</h2>
          <p className="muted small">For the people who run Regularhood. Shops log in at /app.</p>
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
    visits24h: number;
    visits30: number;
    rewards30: number;
    notSetUp: number;
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
          sub={t && (t.shops ? `${Math.round((t.activeShops / t.shops) * 100)}% of shops added visits` : '')}
        />
        <Stat icon={Users} label="Customers" value={t && num(t.customers)} sub={t && `${num(t.newCustomers)} new this week`} />
        <Stat icon={Stamp} label="Visits, 30 days" value={t && num(t.visits30)} sub={t && `${num(t.visits24h)} in the last 24 hours`} />
        <Stat icon={Gift} label="Rewards given, 30 days" value={t && num(t.rewards30)} sub={t && (t.notSetUp ? `${num(t.notSetUp)} shops haven't set up their card` : 'every shop has its card set up')} />
      </section>

      <section className="card">
        <div className="card-head">
          <h2>
            <Phone size={18} /> Needs a call
          </h2>
          <a href="#/follow-up" className="small">
            Follow-up list
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

  const setLanding = (s: Shop, on: boolean) => {
    setShops((list) => list && list.map((x) => (x.id === s.id ? { ...x, on_landing: on ? 1 : 0 } : x)));
    adminApi(`shops/${s.id}/landing`, 'POST', { on }).then(
      () => toast(on ? `${s.name} is on the homepage` : `${s.name} is off the homepage`),
      (e) => {
        setShops((list) => list && list.map((x) => (x.id === s.id ? { ...x, on_landing: on ? 0 : 1 } : x)));
        toast((e as Error).message, 'error');
      },
    );
  };

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
                  <th>Card</th>
                  <th className="num">Customers</th>
                  <th className="num">Visits (30d)</th>
                  <th className="num">Rewards (30d)</th>
                  <th>Last visit</th>
                  <th>Joined</th>
                  <th>From</th>
                  <th title="Show this shop on the homepage">Homepage</th>
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
                    <td className={s.reward_name ? '' : 'muted'}>{cardRule(s)}</td>
                    <td className="num">{num(s.customers)}</td>
                    <td className="num">{num(s.visits30)}</td>
                    <td className="num">{num(s.rewards30)}</td>
                    <td>{ago(s.last_visit)}</td>
                    <td>{ago(s.created_at)}</td>
                    <td>
                      <span className="source-chip">{sourceName(s.source)}</span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="landing-check"
                        checked={!!s.on_landing}
                        disabled={!!s.suspended_at}
                        onChange={(e) => setLanding(s, e.target.checked)}
                        aria-label={`Show ${s.name} on the homepage`}
                      />
                    </td>
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
  settings: { visitsNeeded: number; rewardName: string; inactiveDays: number };
  counts: { visitsAllTime: number; rewardsAllTime: number; rewardsWaiting: number; cameBack: number; notSeen: number };
  comeback: { current: Comeback; previous: Comeback };
  daily: { day: string; visits: number; rewards: number }[];
  notes: { id: number; note: string; created_at: string; admin: string }[];
  log: { id: number; action: string; detail: string; created_at: string; admin: string }[];
};

/** Visits per day for the last 30 days, as simple bars. */
function DailyBars({ daily }: { daily: ShopDetail['daily'] }) {
  const byDay = new Map(daily.map((d) => [d.day, d]));
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() + 330 * 60_000 - (29 - i) * 86_400_000).toISOString().slice(0, 10);
    return { day: d, visits: byDay.get(d)?.visits ?? 0, rewards: byDay.get(d)?.rewards ?? 0 };
  });
  const max = Math.max(1, ...days.map((d) => d.visits));
  return (
    <div className="bars" role="img" aria-label={`Visits per day for 30 days, up to ${max} a day`}>
      {days.map((d) => (
        <span
          key={d.day}
          style={{ height: `${Math.max(3, (d.visits / max) * 100)}%` }}
          className={d.visits ? '' : 'zero'}
          title={`${d.day}: ${d.visits} visits${d.rewards ? `, ${d.rewards} rewards given` : ''}`}
        />
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
  const change = comeback.previous.visits > 0 ? Math.round(((comeback.current.visits - comeback.previous.visits) / comeback.previous.visits) * 100) : null;

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
    if (!(await confirmDialog({ title: `Turn ${shop.name} back on?`, body: 'They can log in and add visits again.', confirm: 'Turn on' }))) return;
    void action.run(async () => {
      await adminApi(`shops/${id}/unsuspend`, 'POST');
      toast(`${shop.name} is back on`);
      load();
    });
  };
  const toggleLanding = () =>
    void action.run(async () => {
      await adminApi(`shops/${id}/landing`, 'POST', { on: !shop.on_landing });
      toast(shop.on_landing ? `${shop.name} is off the homepage` : `${shop.name} is on the homepage`);
      load();
    });
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
            {shop.email}
            {shop.phone ? ` · ${shop.phone}` : ''} · joined {when(shop.created_at)} · last seen {ago(shop.last_seen_at)}
          </p>
          <p className="follow-meta">
            <span className="source-chip">From: {sourceName(shop.source)}</span>
            {shop.signup_campaign && !shop.referred_by && <span>Campaign: {shop.signup_campaign}</span>}
            {shop.referred_by && (
              <span>
                Via the customer card of <a href={`#/shops/${shop.referred_by}`}>{shop.referred_by_name}</a>
              </span>
            )}
            {shop.referrals > 0 && <span>Brought {num(shop.referrals)} new shops</span>}
            {shop.last_contact && <span>Last contacted {ago(shop.last_contact)}</span>}
          </p>
        </div>
      </header>
      <ContactButtons shop={shop} onDone={load} />

      {shop.suspended_at && (
        <p className="alert alert-error">
          Paused {ago(shop.suspended_at)}: {shop.suspended_reason}
        </p>
      )}

      <section className="stats">
        <Stat icon={Users} label="Customers" value={num(shop.customers)} sub={`${num(counts.cameBack)} came back at least once`} />
        <Stat icon={Stamp} label="Visits, 30 days" value={num(shop.visits30)} sub={`${num(counts.visitsAllTime)} all time · last ${ago(shop.last_visit)}`} />
        <Stat icon={Gift} label="Rewards given, 30 days" value={num(shop.rewards30)} sub={`${num(counts.rewardsAllTime)} all time · ${num(counts.rewardsWaiting)} waiting`} />
        <Stat
          icon={change !== null && change < 0 ? TrendingDown : TrendingUp}
          label="Came back, 30 days"
          value={num(comeback.current.customers)}
          sub={`${num(comeback.current.visits)} repeat visits${change !== null ? ` · ${change >= 0 ? '+' : ''}${num(change)}%` : ''}`}
        />
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>
              <Stamp size={18} /> Visits per day
            </h2>
            <span className="muted small">last 30 days</span>
          </div>
          <DailyBars daily={data.daily} />
          <dl className="facts">
            <div>
              <dt>Card</dt>
              <dd>{cardRule({ reward_name: settings.rewardName, visits_needed: settings.visitsNeeded })}</dd>
            </div>
            <div>
              <dt>Rewards waiting</dt>
              <dd>{num(counts.rewardsWaiting)} customers have a full card</dd>
            </div>
            <div>
              <dt>Won back, 30 days</dt>
              <dd>{num(comeback.current.wonBack)} came back after {settings.inactiveDays}+ days</dd>
            </div>
            <div>
              <dt>Not seen in {settings.inactiveDays} days</dt>
              <dd>{num(counts.notSeen)} customers</dd>
            </div>
          </dl>
          {!settings.rewardName && <p className="alert alert-error small">Hasn't set up their card yet — customers have nothing to aim for. Worth a call.</p>}
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
                <span className="muted small">They can't log in or add visits. Customers' cards still open.</span>
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
                <span className="muted small">Stops logins and new visits. Nothing is deleted; you can turn it back on.</span>
              </div>
              <button className="btn btn-ghost" onClick={() => setPausing(true)}>
                <Pause size={17} /> Pause
              </button>
            </div>
          )}

          <div className="support-action">
            <div>
              <strong>{shop.on_landing ? 'Shown on the homepage' : 'Show on the homepage'}</strong>
              <span className="muted small">
                {shop.suspended_at
                  ? 'Paused shops are never shown.'
                  : 'Lists the shop name and its card under “Shops using Regularhood”. Ask the owner first.'}
              </span>
            </div>
            <button className={shop.on_landing ? 'btn btn-ghost' : 'btn btn-soft'} disabled={action.busy} onClick={toggleLanding}>
              <Globe2 size={17} /> {shop.on_landing ? 'Remove' : 'Show'}
            </button>
          </div>

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

// ---------------------------------------------------------------- growth

type FunnelRow = { source: string; visitors: number; signups: number; started: number; active: number };
type Growth = {
  days: number;
  totals: Omit<FunnelRow, 'source'>;
  sources: FunnelRow[];
  cards: { shopId: number | null; shop: string; visitors: number; signups: number }[];
  signups: Shop[];
};

/** a as a share of b. Sign-ups can outnumber homepage visitors (people who go straight to /app), so that's said in words. */
const pct = (a: number, b: number) => (!b ? '–' : a > b ? 'more than' : `${Math.round((a / b) * 100)}%`);

/** Makes a homepage link that Growth counts under its own source, with a QR for flyers. */
function LinkBuilder() {
  const [source, setSource] = useState('');
  const [campaign, setCampaign] = useState('');
  const [qr, setQr] = useState('');
  const clean = (v: string) =>
    v
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-|-$/g, '');
  const url = clean(source) ? trackedLink(clean(source), clean(campaign)) : '';
  useEffect(() => {
    if (!url) return setQr('');
    void QRCode.toDataURL(url, { width: 600, margin: 2, color: { dark: '#0f2e24' } }).then(setQr);
  }, [url]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast('Link copied');
    } catch {
      prompt('Copy this link:', url);
    }
  };
  return (
    <section className="card">
      <div className="card-head">
        <h2>
          <Link2 size={18} /> Tracking link
        </h2>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        Make a separate link for each place you promote Regularhood: a WhatsApp group, a flyer, someone visiting shops. Sign-ups from it are counted
        under its own source above. WhatsApp doesn't tell the website where a click came from, so without a link like this those visits show as
        “direct”.
      </p>
      <div className="link-builder">
        <label>
          Source
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="whatsapp-group, flyer, ravi" />
        </label>
        <label>
          Campaign (optional)
          <input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="mg-road, diwali" />
        </label>
      </div>
      {url && (
        <>
          <div className="link-out">
            <span>{url}</span>
            <button className="btn btn-sm" onClick={() => void copy()}>
              <Copy size={15} /> Copy
            </button>
          </div>
          {qr && (
            <div className="link-qr">
              <img src={qr} alt={`QR code for ${url}`} />
              <a className="btn btn-soft" href={qr} download={`regularhood-${clean(source)}${clean(campaign) ? `-${clean(campaign)}` : ''}.png`}>
                <Download size={16} /> Download QR
              </a>
            </div>
          )}
        </>
      )}
    </section>
  );
}

const RANGES = [7, 30, 90] as const;

function GrowthPage() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [data, setData] = useState<Growth | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setData(null);
    void adminApi<Growth>(`growth?days=${days}`).then(setData, (e) => setError((e as Error).message));
  }, [days]);
  const t = data?.totals;
  const steps = t
    ? [
        { label: 'Homepage visitors', value: t.visitors, note: 'people on the homepage' },
        { label: 'Signed up', value: t.signups, note: `${pct(t.signups, t.visitors)} of visitors` },
        { label: 'Added first visit', value: t.started, note: `${pct(t.started, t.signups)} of sign-ups` },
        { label: 'Active this week', value: t.active, note: `${pct(t.active, t.started)} of those who started` },
      ]
    : [];
  const max = Math.max(1, ...steps.map((s) => s.value));

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Growth</h1>
          <p>Where new shops come from, and how many of them start using Regularhood.</p>
        </div>
        <div className="seg">
          {RANGES.map((d) => (
            <button key={d} className={days === d ? 'active' : ''} onClick={() => setDays(d)}>
              {d} days
            </button>
          ))}
        </div>
      </header>
      <ErrorText text={error} />

      <section className="card">
        <div className="card-head">
          <h2>
            <Rocket size={18} /> Funnel
          </h2>
          <span className="muted small">last {days} days</span>
        </div>
        {!data ? (
          <SkeletonRows count={4} />
        ) : (
          <div className="funnel">
            {steps.map((s) => (
              <div className="funnel-step" key={s.label}>
                <span>{s.label}</span>
                <div className="funnel-bar">
                  <i style={{ width: `${(s.value / max) * 100}%` }} />
                </div>
                <strong>
                  {num(s.value)}
                  <em>{s.note}</em>
                </strong>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>
            <Globe2 size={18} /> By source
          </h2>
        </div>
        {!data ? (
          <SkeletonRows count={3} />
        ) : data.sources.length ? (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th className="num">Visitors</th>
                  <th className="num">Sign-ups</th>
                  <th className="num">Started</th>
                  <th className="num">Active</th>
                  <th className="num">Visitor → sign-up</th>
                </tr>
              </thead>
              <tbody>
                {data.sources.map((r) => (
                  <tr key={r.source}>
                    <td>
                      <strong>{sourceName(r.source)}</strong>
                    </td>
                    <td className="num">{num(r.visitors)}</td>
                    <td className="num">{num(r.signups)}</td>
                    <td className="num">{num(r.started)}</td>
                    <td className="num">{num(r.active)}</td>
                    <td className="num">{r.visitors ? pct(r.signups, r.visitors) : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Globe2} title="No visits or sign-ups yet" text="Share a tracking link (below) to get started." />
        )}
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>
              <Users size={18} /> Shops bringing shops
            </h2>
          </div>
          <p className="muted small" style={{ margin: 0 }}>
            Customers see a small “Run a shop? Get it free” link on their stamp card. These shops' customers clicked it.
          </p>
          {!data ? (
            <SkeletonRows count={2} />
          ) : data.cards.length ? (
            <ul className="rows">
              {data.cards.map((c) => (
                <li key={`${c.shopId}-${c.shop}`}>
                  <div className="row-item">
                    <span className="row-main">
                      <strong>{c.shopId ? <a href={`#/shops/${c.shopId}`}>{c.shop}</a> : c.shop}</strong>
                      <span>
                        {num(c.visitors)} visitors · {num(c.signups)} sign-ups
                      </span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">None yet.</p>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>
              <Store size={18} /> Latest sign-ups
            </h2>
            <a href="#/follow-up" className="small">
              Follow up
            </a>
          </div>
          {!data ? (
            <SkeletonRows count={3} />
          ) : data.signups.length ? (
            <ul className="rows">
              {data.signups.slice(0, 12).map((s) => (
                <li key={s.id}>
                  <a className="row-item" href={`#/shops/${s.id}`} style={{ color: 'inherit' }}>
                    <span className="row-main">
                      <strong>
                        {s.name} <StatusBadge status={s.status} />
                      </strong>
                      <span>
                        joined {ago(s.created_at)}
                        {s.referred_by_name ? ` · via ${s.referred_by_name}` : s.signup_campaign ? ` · ${s.signup_campaign}` : ''}
                      </span>
                    </span>
                    <span className="source-chip">{sourceName(s.source)}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">No sign-ups in this period.</p>
          )}
        </section>
      </div>

      <ReferralRewardsCard />

      <LinkBuilder />
    </>
  );
}

type RewardDue = { shopId: number; name: string; phone: string | null; kind: 'standee' | 'upi'; n: number; active: number; selfActive: boolean };
type RewardSent = { shopId: number; name: string; kind: 'standee' | 'upi'; n: number; sent_at: string };

/** Shops that earned a referral reward (server/src/referrals.ts): message them for an address or UPI ID, send it, mark it sent. */
function ReferralRewardsCard() {
  const [data, setData] = useState<{ due: RewardDue[]; sent: RewardSent[]; upiAmount: number } | null>(null);
  const [error, setError] = useState('');
  const { busy, run } = useAction();
  const load = useCallback(() => void adminApi<typeof data>('referral-rewards').then(setData, (e) => setError((e as Error).message)), []);
  useEffect(load, [load]);

  const what = (kind: RewardDue['kind']) => (kind === 'standee' ? 'Counter standee' : `₹${data?.upiAmount ?? 100} on UPI`);
  const why = (d: RewardDue) =>
    d.kind === 'upi' ? `${d.n * 3} shops brought` : d.active > 0 ? 'brought their first shop' : 'joined from a shop’s link and started';
  const ask = (d: RewardDue) =>
    d.kind === 'standee'
      ? `Namaste! ${d.active > 0 ? `${d.name} ne Regularhood pe ek nayi dukaan jodi hai` : `${d.name} ne Regularhood pe 20 visits poori kar li hain`}, isliye aapko ek free counter standee milega 🎉 Kripya apna poora address (pincode ke saath) bhejiye.`
      : `Namaste! ${d.name} se aayi dukaanon ke liye aapko ₹${data?.upiAmount ?? 100} milenge 🎉 Kripya apna UPI ID bhejiye.`;
  const markSent = (d: RewardDue) =>
    run(async () => {
      if (!(await confirmDialog({ title: `Mark ${what(d.kind).toLowerCase()} sent to ${d.name}?`, confirm: 'Mark sent' }))) return;
      await adminApi('referral-rewards', 'POST', { shopId: d.shopId, kind: d.kind, n: d.n });
      toast('Marked sent');
      load();
    });

  return (
    <section className="card">
      <div className="card-head">
        <h2>
          <Gift size={18} /> Referral rewards to send
        </h2>
        <span className="muted small">standee for the first shop · ₹{data?.upiAmount ?? 100} per 3 shops</span>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        A brought shop counts once it adds 20 visits on 3 different days. Message the shop for an address or UPI ID, send the reward, then mark it sent.
      </p>
      <ErrorText text={error} />
      {!data ? (
        <SkeletonRows count={2} />
      ) : data.due.length ? (
        <ul className="rows">
          {data.due.map((d) => (
            <li key={`${d.shopId}-${d.kind}-${d.n}`}>
              <div className="row-item">
                <span className="row-main">
                  <strong>
                    <a href={`#/shops/${d.shopId}`}>{d.name}</a> · {what(d.kind)}
                  </strong>
                  <span>{why(d)}</span>
                </span>
                {d.phone && (
                  <a className="btn btn-sm btn-whatsapp" href={whatsapp(d.phone, ask(d))} target="_blank" rel="noreferrer">
                    <MessageCircle size={15} /> Ask
                  </a>
                )}
                <button className="btn btn-sm btn-soft" disabled={busy} onClick={() => void markSent(d)}>
                  <Check size={15} /> Sent
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">Nothing to send right now.</p>
      )}
      {data && data.sent.length > 0 && (
        <details>
          <summary className="small muted">Sent before ({data.sent.length})</summary>
          <ul className="rows">
            {data.sent.map((r) => (
              <li key={`${r.shopId}-${r.kind}-${r.n}`} className="small">
                <a href={`#/shops/${r.shopId}`}>{r.name}</a> · {what(r.kind)} · {ago(r.sent_at)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- follow up

const needsStart = (s: Shop) => s.status === 'new' || s.status === 'never';

/** Shops worth a message: new ones that haven't started, and ones that went quiet. Contacted in the last 3 days go last. */
function FollowUpPage() {
  const [shops, setShops] = useState<Shop[] | null>(null);
  const [show, setShow] = useState<'start' | 'quiet'>('start');
  const load = useCallback(() => void adminApi<Shop[]>('shops').then(setShops), []);
  useEffect(load, [load]);

  const recent = (s: Shop) => Boolean(s.last_contact) && daysAgo(s.last_contact!) < 3;
  const inTab = (s: Shop, tab: typeof show) => (tab === 'start' ? needsStart(s) : s.status === 'sleeping');
  const list = (shops ?? [])
    .filter((s) => inTab(s, show))
    .sort((a, b) => Number(recent(a)) - Number(recent(b)) || (show === 'start' ? b.created_at.localeCompare(a.created_at) : b.visits30 - a.visits30));
  const count = (tab: typeof show) => (shops ?? []).filter((s) => inTab(s, tab)).length;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Follow up</h1>
          <p>A message in the first days keeps a shop for months. Each button opens a ready message and marks the shop as contacted.</p>
        </div>
      </header>
      <div className="seg">
        <button className={show === 'start' ? 'active' : ''} onClick={() => setShow('start')}>
          Help them start{shops ? ` (${count('start')})` : ''}
        </button>
        <button className={show === 'quiet' ? 'active' : ''} onClick={() => setShow('quiet')}>
          Gone quiet{shops ? ` (${count('quiet')})` : ''}
        </button>
      </div>
      {!shops ? (
        <SkeletonRows count={4} />
      ) : list.length ? (
        <div className="follow-list">
          {list.map((s) => (
            <article key={s.id} className={`follow-card ${recent(s) ? 'done' : ''}`}>
              <div className="follow-top">
                <a href={`#/shops/${s.id}`}>
                  <strong>{s.name}</strong> <StatusBadge status={s.status} />
                </a>
                <span className="source-chip">{sourceName(s.source)}</span>
              </div>
              <div className="follow-meta">
                <span>{reason(s)}</span>
                <span>{s.phone || s.email}</span>
                <span>{s.last_contact ? `Contacted ${ago(s.last_contact)}` : 'Not contacted yet'}</span>
                {!s.phone && <span>No phone number, so email only</span>}
              </div>
              <ContactButtons shop={s} onDone={load} compact />
            </article>
          ))}
        </div>
      ) : (
        <EmptyState icon={ShieldCheck} title="Nobody to chase" text={show === 'start' ? 'Every new shop has added its first visit.' : 'No shop has gone quiet.'} />
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

// ---------------------------------------------------------------- visits

const fetchViews = (from: string, to: string) => adminApi<{ views: PageView[]; events: PageEvent[] }>(`analytics?from=${from}&to=${to}`);

// ---------------------------------------------------------------- shell

const NAV = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/shops', label: 'Shops', icon: Store },
  { path: '/growth', label: 'Growth', icon: Rocket },
  { path: '/follow-up', label: 'Follow up', icon: Phone },
  { path: '/leads', label: 'Leads', icon: Target },
  { path: '/chats', label: 'Chats', icon: MessagesSquare },
  { path: '/seo', label: 'SEO pages', icon: FileText },
  { path: '/status', label: 'WhatsApp status', icon: MessageCircle },
  { path: '/visits', label: 'Visits', icon: Globe2 },
  { path: '/log', label: 'Admin log', icon: ScrollText },
];

function AdminShell({ email, onLogout, children }: { email: string; onLogout: () => void; children: ReactNode }) {
  const hash = useAdminHash();
  const theme = useTheme();
  const active = (path: string) => (path === '/' ? hash === '/' : hash.startsWith(path));
  // WhatsApp replies not opened yet, on the Chats menu item.
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    const check = () => void adminApi<{ unread: number }>('whatsapp/unread').then((r) => setUnread(r.unread), () => {});
    check();
    const timer = setInterval(check, 30_000);
    const onChats = (e: Event) => setUnread((e as CustomEvent<number>).detail);
    addEventListener(WA_UNREAD, onChats);
    return () => (clearInterval(timer), removeEventListener(WA_UNREAD, onChats));
  }, [hash]);
  return (
    <div className="admin">
      <header className="admin-bar">
        <a href="#/" className="brand">
          <Logo /> <span>Regularhood Admin</span>
        </a>
        <nav>
          {NAV.map(({ path, label, icon: Icon }) => (
            <a key={path} href={`#${path}`} className={active(path) ? 'active' : ''}>
              <Icon size={17} /> <span>{label}</span>
              {path === '/chats' && unread > 0 && <em className="nav-badge">{unread}</em>}
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
    document.title = 'Superadmin · Regularhood';
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
  const page = shopId ? (
    <ShopPage key={shopId} id={Number(shopId)} />
  ) : hash.startsWith('/shops') ? (
    <ShopsPage />
  ) : hash.startsWith('/growth') ? (
    <GrowthPage />
  ) : hash.startsWith('/follow-up') ? (
    <FollowUpPage />
  ) : hash.startsWith('/seo') ? (
    <SeoPage api={adminApi} adminToken={getAdminToken} />
  ) : hash.startsWith('/chats') ? (
    <ChatsPage api={adminApi} />
  ) : hash.startsWith('/leads') ? (
    <LeadsPage api={adminApi} />
  ) : hash.startsWith('/status') ? (
    <StatusPage api={adminApi} />
  ) : hash.startsWith('/visits') ? (
    <VisitsPage fetchViews={fetchViews} />
  ) : hash.startsWith('/log') ? (
    <LogPage />
  ) : (
    <OverviewPage />
  );

  return (
    <AdminShell email={email} onLogout={() => void logout()}>
      {page}
    </AdminShell>
  );
}

