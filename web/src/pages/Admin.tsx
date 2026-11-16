import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import QRCode from 'qrcode';
import {
  Activity,
  BadgeIndianRupee,
  HeartPulse,
  Trophy,
  BellRing,
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileText,
  Globe2,
  Link2,
  BookOpen,
  Mail,
  MessageCircle,
  MessagesSquare,
  Handshake,
  Rocket,
  Gift,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Pause,
  Phone,
  Play,
  Stamp,
  ScrollText,
  Search,
  Settings,
  Sparkles,
  ShieldCheck,
  Store,
  StickyNote,
  TrendingDown,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { daysAgo, num, rupees, when } from '../api';
import { trackedLink } from '../attribution';
import '../marketing.css';
import { EmptyState, ErrorText, Logo, Skeleton, SkeletonRows, confirmDialog, toast, useAction, useTheme } from '../ui';
import { PlansPage } from './AdminPlans';
import { SeoPage } from './AdminSeo';
import { StatusPage } from './AdminStatus';
import { LeadsPage } from './AdminLeads';
import { PartnersPage } from './AdminPartners';
import { PlaybooksPage } from './AdminPlaybooks';
import { DraftSheet, SettingsPage } from './AdminDrafts';
import { PhusroPage } from './AdminPhusro';
import { ChatsPage, WA_UNREAD } from './AdminChats';
import { VisitsPage, type PageDraft, type PageEvent, type PageView, type VisitShop } from './Visits';
import { Sub, SubtabContext } from './AdminSub';
import { Delta, KpiTile, Meter, ShareBar, TrendBars } from './AdminCharts';

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

/** A Blob body (a file for WhatsApp chats) goes as it is, with its own type; anything else as JSON. */
async function adminApi<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const token = getAdminToken();
  const file = body instanceof Blob ? body : null;
  const res = await fetch(`/api/admin/${path}`, {
    method,
    headers: {
      ...(file ? { 'content-type': file.type || 'application/octet-stream' } : body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: file ?? (body ? JSON.stringify(body) : undefined),
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
  plan: string; // stored plan: free | grandfathered | monthly | yearly | lifetime
  activePlan: string; // in force now (a yearly plan that ran out is free)
  plan_expires_at: string | null;
  founding_no: number | null;
  google: number; // 1 = logs in with Google
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

/** Saves the number as a contact in Admin → Chats (keeping an existing name) and opens its chat there. */
function openWaChat(phone: string, name: string, then?: () => void) {
  void adminApi<{ phone: string }>('whatsapp/contacts', 'POST', { phone, name, keepName: true }).then(
    (r) => {
      then?.();
      location.hash = `/chats/${r.phone}`;
    },
    (e) => toast((e as Error).message, 'error'),
  );
}

/**
 * WhatsApp / call / email buttons for a shop; using one records the contact in the admin log. WhatsApp opens the shop's
 * chat in Admin → Chats (sent from the business number), saving the shop as a contact there if it isn't one yet.
 */
function ContactButtons({ shop, onDone, compact }: { shop: Shop; onDone: () => void; compact?: boolean }) {
  const record = (channel: 'whatsapp' | 'call' | 'email' | 'visit') =>
    void adminApi(`shops/${shop.id}/contacted`, 'POST', { channel }).then(onDone, (e) => toast((e as Error).message, 'error'));
  const openChat = () => openWaChat(shop.phone!, shop.name, () => record('whatsapp'));
  const size = compact ? 'btn-sm' : '';
  return (
    <div className="follow-actions">
      {shop.phone && (
        <button className={`btn ${size} btn-whatsapp`} onClick={openChat} title="Open this shop's chat in Admin → Chats">
          <MessageCircle size={16} /> WhatsApp
        </button>
      )}
      {shop.phone && (
        <a className={`btn ${size} btn-soft`} href={`tel:${shop.phone}`} onClick={() => record('call')}>
          <Phone size={16} /> Call
        </a>
      )}
      {shop.email && (
        <a
          className={`btn ${size} btn-soft`}
          href={`mailto:${shop.email}?subject=${encodeURIComponent(`Your Regularhood shop: ${shop.name}`)}&body=${encodeURIComponent(nudge(shop))}`}
          onClick={() => record('email')}
        >
          <Mail size={16} /> Email
        </a>
      )}
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
  series: { day: string; visits: number; rewards: number; signups: number; customers: number; activeShops: number; revenue: number; visitors: number }[];
  money: { allTime: number; thisMonth: number; lastMonth: number; paidCount: number; refunded: number; abandoned30: number; mrr: number };
  plans: Record<'free' | 'grandfathered' | 'monthly' | 'yearly' | 'lifetime', number>;
  statuses: Record<Status, number>;
  health: { customers: number; repeat: number; startedShops: number; visitsAllTime: number; rewardsAllTime: number; google: number; onLanding: number; referred: number };
  topShops: { id: number; name: string; status: Status; visits30: number; customers: number; rewards30: number; activePlan: string }[];
  activity: { kind: 'signup' | 'payment' | 'admin'; shopId: number | null; text: string; at: string }[];
  seats: { total: number; left: number };
};

type Metric = 'visits' | 'signups' | 'customers' | 'activeShops' | 'revenue' | 'visitors' | 'rewards';
const METRICS: { key: Metric; label: string; money?: boolean }[] = [
  { key: 'visits', label: 'Visits' },
  { key: 'signups', label: 'Shop sign-ups' },
  { key: 'customers', label: 'New customers' },
  { key: 'activeShops', label: 'Shops adding visits' },
  { key: 'rewards', label: 'Rewards' },
  { key: 'revenue', label: 'Revenue', money: true },
  { key: 'visitors', label: 'Website visitors' },
];

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const ACTIVITY_ICON = { signup: Store, payment: BadgeIndianRupee, admin: ScrollText } as const;

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
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [metric, setMetric] = useState<Metric>('visits');
  useEffect(() => void adminApi<Overview>('overview').then(setData, (e) => setError((e as Error).message)), []);
  const t = data?.totals;

  // This period and the one before it, from the 90 daily rows (no "before" for 90 days).
  const now = data?.series.slice(-days) ?? [];
  const prev = data && days * 2 <= data.series.length ? data.series.slice(-days * 2, -days) : null;
  const sum = (rows: Overview['series'] | null, k: Metric) => (rows ? rows.reduce((n, r) => n + r[k], 0) : null);
  const kpi = (k: Metric) => ({
    value: data ? (k === 'revenue' ? rupees(sum(now, k)!) : num(sum(now, k)!)) : undefined,
    delta: data ? <Delta now={sum(now, k)!} before={sum(prev, k)} /> : undefined,
    spark: data ? now.map((r) => r[k]) : undefined,
  });
  const m = METRICS.find((x) => x.key === metric)!;
  const h = data?.health;
  const pro = data ? data.plans.monthly + data.plans.yearly + data.plans.lifetime : 0;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>{greeting()} 👋</h1>
          <p>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            {t && ` · ${num(t.visits24h)} visits in the last 24 hours across ${num(t.shops)} shops`}
          </p>
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

      <section className="kpis">
        <KpiTile icon={<BadgeIndianRupee size={16} />} label="Revenue" {...kpi('revenue')} sub={data && `${rupees(data.money.allTime / 100)} all time`} href="#/plans" />
        <KpiTile icon={<Stamp size={16} />} label="Visits added" {...kpi('visits')} sub={t && `${num(t.visits24h)} in the last 24 hours`} />
        <KpiTile icon={<Store size={16} />} label="New shops" {...kpi('signups')} sub={t && `${num(t.shops)} shops in all`} href="#/growth" />
        <KpiTile icon={<Users size={16} />} label="New customers" {...kpi('customers')} sub={t && `${num(t.customers)} customers in all`} />
        <KpiTile icon={<Gift size={16} />} label="Rewards given" {...kpi('rewards')} sub={h && `${num(h.rewardsAllTime)} all time`} />
        <KpiTile icon={<Globe2 size={16} />} label="Website visitors" {...kpi('visitors')} sub="browsers per day, added up" href="#/visits" />
      </section>

      <section className="card">
        <div className="card-head">
          <h2>
            <Activity size={18} /> Trend
          </h2>
          <span className="muted small">
            {data && (m.money ? rupees(sum(now, metric)!) : num(sum(now, metric)!))} in {days} days
          </span>
        </div>
        <div className="chip-row" role="tablist">
          {METRICS.map((x) => (
            <button key={x.key} role="tab" aria-selected={metric === x.key} className={`chip${metric === x.key ? ' on' : ''}`} onClick={() => setMetric(x.key)}>
              {x.label}
            </button>
          ))}
        </div>
        {data ? (
          <TrendBars label={m.label} data={now.map((r) => ({ day: r.day, value: r[metric] }))} format={(n) => (m.money ? rupees(n) : num(n))} />
        ) : (
          <Skeleton h={220} />
        )}
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>
              <Store size={18} /> Shops by status
            </h2>
            <span className="muted small">{t && `${t.shops ? Math.round((t.activeShops / t.shops) * 100) : 0}% active this week`}</span>
          </div>
          {data ? (
            <ShareBar
              parts={(['active', 'new', 'sleeping', 'never', 'paused'] as Status[]).map((s) => ({
                key: s,
                label: STATUS[s].label,
                value: data.statuses[s] ?? 0,
                cls: `sh-${s}`,
                href: `#/shops/${s}`,
              }))}
            />
          ) : (
            <SkeletonRows count={3} />
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>
              <BadgeIndianRupee size={18} /> Plans & money
            </h2>
            <a href="#/plans" className="small">
              Plans
            </a>
          </div>
          {data ? (
            <>
              <div className="money-row">
                <div>
                  <span>This month</span>
                  <strong>{rupees(data.money.thisMonth / 100)}</strong>
                  <Delta now={data.money.thisMonth} before={data.money.lastMonth} />
                </div>
                <div>
                  <span title="Monthly plans + yearly plans ÷ 12, at today's prices">Monthly run-rate</span>
                  <strong>{rupees(Math.round(data.money.mrr))}</strong>
                </div>
                <div>
                  <span>Pro shops</span>
                  <strong>{num(pro)}</strong>
                  <em>{t?.shops ? `${Math.round((pro / t.shops) * 100)}% of shops` : ''}</em>
                </div>
              </div>
              <ShareBar
                parts={[
                  { key: 'lifetime', label: 'Pro · lifetime', value: data.plans.lifetime, cls: 'pl-lifetime' },
                  { key: 'yearly', label: 'Pro · yearly', value: data.plans.yearly, cls: 'pl-yearly' },
                  { key: 'monthly', label: 'Pro · monthly', value: data.plans.monthly, cls: 'pl-monthly' },
                  { key: 'grandfathered', label: 'Early shop', value: data.plans.grandfathered, cls: 'pl-early' },
                  { key: 'free', label: 'Free', value: data.plans.free, cls: 'pl-free' },
                ]}
              />
              <p className="muted small" style={{ margin: 0 }}>
                Founding places: {num(data.seats.total - data.seats.left)} of {num(data.seats.total)} taken · {num(data.money.paidCount)} payments
                {data.money.abandoned30 ? ` · ${num(data.money.abandoned30)} checkouts not finished (30 days)` : ''}
                {data.money.refunded ? ` · ${num(data.money.refunded)} refunded` : ''}
              </p>
            </>
          ) : (
            <SkeletonRows count={3} />
          )}
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>
              <HeartPulse size={18} /> Platform health
            </h2>
          </div>
          {h && t ? (
            <div className="meters">
              <Meter label="Shops that started (added a visit)" value={h.startedShops} of={t.shops} note={`${num(h.startedShops)} of ${num(t.shops)} shops`} />
              <Meter label="Shops active this week" value={t.activeShops} of={t.shops} note={`${num(t.activeShops)} shops added a visit in 7 days`} />
              <Meter label="Customers who came back" value={h.repeat} of={h.customers} note={`${num(h.repeat)} of ${num(h.customers)} have 2+ visits`} />
              <Meter label="Card set up" value={t.shops - t.notSetUp} of={t.shops} note={t.notSetUp ? `${num(t.notSetUp)} shops still have no reward` : 'Every shop has a reward'} />
              <dl className="facts">
                <div>
                  <dt>Customers per started shop</dt>
                  <dd>{h.startedShops ? num(Math.round(h.customers / h.startedShops)) : '–'}</dd>
                </div>
                <div>
                  <dt>Rewards per 100 visits</dt>
                  <dd>{h.visitsAllTime ? num(Math.round((h.rewardsAllTime / h.visitsAllTime) * 100)) : '–'}</dd>
                </div>
                <div>
                  <dt>Log in with Google</dt>
                  <dd>{num(h.google)} shops</dd>
                </div>
                <div>
                  <dt>Came via another shop</dt>
                  <dd>{num(h.referred)} shops</dd>
                </div>
              </dl>
            </div>
          ) : (
            <SkeletonRows count={4} />
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>
              <Trophy size={18} /> Top shops
            </h2>
            <span className="muted small">visits, last 30 days</span>
          </div>
          {!data ? (
            <SkeletonRows count={5} />
          ) : data.topShops.length ? (
            <ol className="leader">
              {data.topShops.map((s, i) => (
                <li key={s.id}>
                  <a href={`#/shops/${s.id}`}>
                    <b>{i + 1}</b>
                    <span className="leader-name">
                      <strong>{s.name}</strong>
                      <em>
                        {num(s.customers)} customers · {num(s.rewards30)} rewards
                        {['monthly', 'yearly', 'lifetime'].includes(s.activePlan) ? ' · Pro' : ''}
                      </em>
                    </span>
                    <span className="leader-bar">
                      <i style={{ width: `${(s.visits30 / data.topShops[0].visits30) * 100}%` }} />
                    </span>
                    <strong className="leader-n">{num(s.visits30)}</strong>
                  </a>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState icon={Trophy} title="No visits yet" text="Shops show up here once they add visits." />
          )}
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>
              <Phone size={18} /> Needs a call {data && data.attention.length > 0 && <span className="count-pill">{data.attention.length}</span>}
            </h2>
            <a href="#/follow-up" className="small">
              Follow-up list
            </a>
          </div>
          {!data ? (
            <SkeletonRows count={3} />
          ) : data.attention.length ? (
            <ul className="rows">
              {data.attention.slice(0, 8).map((s) => (
                <li key={s.id}>
                  <a className="row-item" href={`#/shops/${s.id}`} style={{ color: 'inherit' }}>
                    <span className="row-main">
                      <strong>
                        {s.name} <StatusBadge status={s.status} />
                      </strong>
                      <span>{reason(s)}</span>
                    </span>
                    <span className="muted small">{s.last_contact ? `contacted ${ago(s.last_contact)}` : 'not contacted'}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={ShieldCheck} title="Everyone's active" text="No shop has gone quiet. 🎉" />
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>
              <BellRing size={18} /> Latest activity
            </h2>
            <a href="#/log" className="small">
              Admin log
            </a>
          </div>
          {!data ? (
            <SkeletonRows count={5} />
          ) : data.activity.length ? (
            <ul className="feed">
              {data.activity.map((a, i) => {
                const Icon = ACTIVITY_ICON[a.kind];
                const text = a.kind === 'signup' ? `${a.text} signed up` : a.kind === 'payment' ? `Payment: ${a.text}` : a.text;
                return (
                  <li key={i} className={`feed-${a.kind}`}>
                    <i>
                      <Icon size={14} />
                    </i>
                    <span>{a.shopId ? <a href={`#/shops/${a.shopId}`}>{text}</a> : text}</span>
                    <em>{ago(a.at)}</em>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted small">Nothing yet.</p>
          )}
        </section>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- shops

/** "Pro · lifetime (Founding #3)", "Pro · monthly to …", "Free", "Early shop" — a shop's plan in a few words. */
const planLabel = (s: Pick<Shop, 'plan' | 'activePlan' | 'founding_no' | 'plan_expires_at'>) => {
  if (s.activePlan === 'lifetime') return `Pro · lifetime (Founding #${s.founding_no})`;
  if (s.activePlan === 'yearly' || s.activePlan === 'monthly') return `Pro · ${s.activePlan} to ${when(s.plan_expires_at!)}`;
  if (s.activePlan === 'grandfathered') return 'Early shop (no limit)';
  return s.plan === 'yearly' || s.plan === 'monthly' ? `Free (${s.plan} ran out)` : 'Free';
};

type Payment = { id: number; kind: string; amount_paise: number; razorpay_order_id: string; razorpay_payment_id: string | null; status: string; created_at: string; paid_at: string | null };

const FILTERS: { key: '' | Status; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'sleeping', label: 'Sleeping' },
  { key: 'new', label: 'New' },
  { key: 'never', label: 'Never started' },
  { key: 'paused', label: 'Paused' },
];

type SortKey = 'created_at' | 'name' | 'customers' | 'visits30' | 'rewards30' | 'last_visit';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'created_at', label: 'Newest' },
  { key: 'visits30', label: 'Most visits' },
  { key: 'customers', label: 'Most customers' },
  { key: 'rewards30', label: 'Most rewards' },
  { key: 'last_visit', label: 'Last visit' },
  { key: 'name', label: 'Name' },
];
const PLAN_FILTERS: { key: string; label: string }[] = [
  { key: '', label: 'Any plan' },
  { key: 'pro', label: 'Pro (paid)' },
  { key: 'free', label: 'Free' },
  { key: 'grandfathered', label: 'Early shop' },
];
const isPaid = (s: Pick<Shop, 'activePlan'>) => ['monthly', 'yearly', 'lifetime'].includes(s.activePlan);

/** The visible shops as a CSV file (counts only, as the panel shows them). */
function exportShops(list: Shop[]) {
  const cols: [string, (s: Shop) => string | number][] = [
    ['id', (s) => s.id],
    ['name', (s) => s.name],
    ['email', (s) => s.email],
    ['phone', (s) => s.phone ?? ''],
    ['status', (s) => s.status],
    ['plan', (s) => s.activePlan],
    ['customers', (s) => s.customers],
    ['visits_30d', (s) => s.visits30],
    ['rewards_30d', (s) => s.rewards30],
    ['last_visit', (s) => s.last_visit ?? ''],
    ['joined', (s) => s.created_at],
    ['source', (s) => sourceName(s.source)],
    ['card', (s) => cardRule(s)],
  ];
  const cell = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const csv = [cols.map((c) => c[0]).join(','), ...list.map((s) => cols.map((c) => cell(c[1](s))).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv' }));
  a.download = `regularhood-shops-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function ShopsPage() {
  const hash = useAdminHash();
  const fromHash = hash.split('/')[2] as Status | undefined;
  const filter: '' | Status = fromHash && fromHash in STATUS ? fromHash : '';
  const setFilter = (f: '' | Status) => (location.hash = f ? `/shops/${f}` : '/shops');
  const [q, setQ] = useState('');
  const [plan, setPlan] = useState('');
  const [sort, setSort] = useState<SortKey>('created_at');
  const [all, setAll] = useState<Shop[] | null>(null);
  const [drafting, setDrafting] = useState<Shop | null>(null);
  const [billing, setBilling] = useState<{ payments: (Payment & { shopId: number; name: string })[]; seats: { total: number; left: number } } | null>(null);
  useEffect(() => void adminApi<NonNullable<typeof billing>>('payments').then(setBilling), []);
  const paid = billing?.payments.filter((p) => p.status === 'paid') ?? [];

  useEffect(() => {
    const timer = setTimeout(() => {
      void adminApi<Shop[]>(`shops?q=${encodeURIComponent(q)}`).then(setAll);
    }, 200);
    return () => clearTimeout(timer);
  }, [q]);

  const byPlan = (all ?? []).filter((s) => !plan || (plan === 'pro' ? isPaid(s) : s.activePlan === plan));
  const count = (f: '' | Status) => byPlan.filter((s) => !f || s.status === f).length;
  const shops = all
    ? byPlan
        .filter((s) => !filter || s.status === filter)
        .sort((a, b) =>
          sort === 'name'
            ? a.name.localeCompare(b.name)
            : sort === 'created_at' || sort === 'last_visit'
              ? (b[sort] ?? '').localeCompare(a[sort] ?? '')
              : b[sort] - a[sort],
        )
    : null;
  const setShops = setAll;

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
  const sortHead = (key: SortKey, label: string, cls = '') => (
    <th className={`${cls} sortable${sort === key ? ' sorted' : ''}`} onClick={() => setSort(key)} aria-sort={sort === key ? 'descending' : undefined}>
      {label}
      {sort === key && <ChevronDown size={13} />}
    </th>
  );

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Shops</h1>
          <p>
            {shops
              ? `${num(shops.length)} shown · ${num(byPlan.filter(isPaid).length)} on Pro · ${num(shops.filter((s) => s.google).length)} log in with Google`
              : 'Loading…'}
          </p>
          {billing && (
            <p className="follow-meta">
              <span>
                Lifetime: {num(billing.seats.total - billing.seats.left)} of {num(billing.seats.total)} places taken
              </span>
              <span>
                {num(paid.length)} payments · {rupees(paid.reduce((n, p) => n + p.amount_paise, 0) / 100)}
              </span>
              {paid[0] && (
                <span>
                  Last: <a href={`#/shops/${paid[0].shopId}`}>{paid[0].name}</a> {ago(paid[0].paid_at)}
                </span>
              )}
            </p>
          )}
        </div>
        <button className="btn btn-soft" disabled={!shops?.length} onClick={() => shops && exportShops(shops)}>
          <Download size={16} /> Export CSV
        </button>
      </header>
      <section className="card">
        <div className="toolbar">
          <div className="input-icon">
            <Search size={18} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search shop name, email or phone" aria-label="Search shops" />
          </div>
          <select value={plan} onChange={(e) => setPlan(e.target.value)} aria-label="Filter by plan">
            {PLAN_FILTERS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort shops">
            {SORTS.map((x) => (
              <option key={x.key} value={x.key}>
                Sort: {x.label}
              </option>
            ))}
          </select>
        </div>
        <div className="seg seg-scroll">
          {FILTERS.map((f) => (
            <button key={f.key} className={filter === f.key ? 'active' : ''} onClick={() => setFilter(f.key)}>
              {f.label}
              {all && <span className="seg-count">{num(count(f.key))}</span>}
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
                  {sortHead('name', 'Shop')}
                  <th>Status</th>
                  <th>Card</th>
                  {sortHead('customers', 'Customers', 'num')}
                  {sortHead('visits30', 'Visits (30d)', 'num')}
                  {sortHead('rewards30', 'Rewards (30d)', 'num')}
                  {sortHead('last_visit', 'Last visit')}
                  {sortHead('created_at', 'Joined')}
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
                      <span className="muted small">{s.email || s.phone}</span>
                      {['monthly', 'yearly', 'lifetime'].includes(s.activePlan) && <span className="source-chip">{planLabel(s)}</span>}
                      {!!s.google && (
                        <span className="source-chip" title="Logs in with Google">
                          Google
                        </span>
                      )}
                      <button
                        className="btn btn-sm btn-soft shop-draft-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDrafting(s);
                        }}
                        title={`Draft a message for ${s.name}`}
                      >
                        <Sparkles size={14} /> Draft message
                      </button>
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
      {drafting && <DraftSheet api={adminApi} shop={drafting} onClose={() => setDrafting(null)} onSent={() => toast(`Marked ${drafting.name} as contacted`)} />}
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
  payments: Payment[];
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
  const [planForm, setPlanForm] = useState<{ plan: string; reason: string } | null>(null);
  const [drafting, setDrafting] = useState(false);
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
  const savePlan = (e: FormEvent) => {
    e.preventDefault();
    void action.run(async () => {
      await adminApi(`shops/${id}/plan`, 'POST', planForm);
      setPlanForm(null);
      toast(`${shop.name}'s plan changed`);
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
            {[shop.email, shop.phone].filter(Boolean).join(' · ')} · joined {when(shop.created_at)} · last seen {ago(shop.last_seen_at)}
          </p>
          <p className="follow-meta">
            <span className="source-chip">From: {sourceName(shop.source)}</span>
            <span className="source-chip">Plan: {planLabel(shop)}</span>
            <span className="source-chip">Login: {shop.google ? 'Google' : 'Password'}</span>
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
      <div className="follow-actions">
        <ContactButtons shop={shop} onDone={load} />
        <button className="btn btn-primary" onClick={() => setDrafting(true)}>
          <Sparkles size={16} /> Draft message
        </button>
      </div>
      {drafting && <DraftSheet api={adminApi} shop={shop} onClose={() => setDrafting(false)} onSent={load} />}

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

          {planForm ? (
            <form className="support-form" onSubmit={savePlan}>
              <label>
                Plan
                <select value={planForm.plan} onChange={(e) => setPlanForm({ ...planForm, plan: e.target.value })}>
                  <option value="free">Free (customer limit)</option>
                  <option value="grandfathered">Early shop (no limit, no Pro features)</option>
                  <option value="monthly">Pro · 1 month from today</option>
                  <option value="yearly">Pro · 1 year from today</option>
                  <option value="lifetime">Pro · lifetime (takes a Founding place)</option>
                </select>
              </label>
              <label>
                Why?
                <input value={planForm.reason} onChange={(e) => setPlanForm({ ...planForm, reason: e.target.value })} placeholder="e.g. Paid by UPI, UTR 4321…" required />
              </label>
              <div className="actions">
                <button type="button" className="btn btn-ghost" onClick={() => setPlanForm(null)}>
                  Cancel
                </button>
                <button className="btn btn-primary" disabled={action.busy}>
                  Save plan
                </button>
              </div>
            </form>
          ) : (
            <div className="support-action">
              <div>
                <strong>Plan: {planLabel(shop)}</strong>
                <span className="muted small">
                  {data.payments.length
                    ? data.payments.map((p) => `${p.kind} ₹${num(p.amount_paise / 100)} ${p.status} ${ago(p.paid_at ?? p.created_at)}`).join(' · ')
                    : 'No Razorpay payments. Refunds are made in the Razorpay dashboard, then set the plan here.'}
                </span>
              </div>
              <button className="btn btn-ghost" onClick={() => setPlanForm({ plan: shop.plan, reason: '' })}>
                <BadgeIndianRupee size={17} /> Change
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

      <Sub id="funnel">
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
      </Sub>

      <Sub id="signups">
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
      </Sub>

      <Sub id="links">
        <LinkBuilder />
      </Sub>
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
                  <button className="btn btn-sm btn-whatsapp" onClick={() => openWaChat(d.phone!, d.name)} title={ask(d)}>
                    <MessageCircle size={15} /> Ask
                  </button>
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

const fetchViews = (from: string, to: string) => adminApi<{ views: PageView[]; events: PageEvent[]; drafts: PageDraft[]; shops: VisitShop[] }>(`analytics?from=${from}&to=${to}`);

// ---------------------------------------------------------------- shell

type NavItem = { path: string; label: string; icon: typeof Store; subs?: [id: string, label: string][] };

// Sidebar groups. A page's subs split its cards into subtabs (#/plans/health); the first is the default.
const NAV: { group: string; items: NavItem[] }[] = [
  { group: '', items: [{ path: '/', label: 'Overview', icon: LayoutDashboard }] },
  {
    group: 'Shops',
    items: [
      { path: '/shops', label: 'Shops', icon: Store },
      { path: '/follow-up', label: 'Follow up', icon: Phone },
      { path: '/log', label: 'Admin log', icon: ScrollText },
    ],
  },
  {
    group: 'Money',
    items: [
      {
        path: '/plans',
        label: 'Plans',
        icon: BadgeIndianRupee,
        subs: [
          ['payments', 'Payments'],
          ['health', 'Payment health'],
          ['shops', 'Paying shops'],
          ['offer', 'Offer'],
        ],
      },
    ],
  },
  {
    group: 'Growth',
    items: [
      {
        path: '/growth',
        label: 'Growth',
        icon: Rocket,
        subs: [
          ['funnel', 'Funnel'],
          ['signups', 'Sign-ups & referrals'],
          ['links', 'Tracking links'],
        ],
      },
      {
        path: '/partners',
        label: 'Partners',
        icon: Handshake,
        subs: [
          ['payouts', 'Payouts'],
          ['partners', 'Partners'],
        ],
      },
      {
        path: '/visits',
        label: 'Visits',
        icon: Globe2,
        subs: [
          ['traffic', 'Traffic'],
          ['homepage', 'Homepage'],
          ['journeys', 'Visitor journeys'],
          ['recent', 'Recent views'],
        ],
      },
      {
        path: '/leads',
        label: 'Leads',
        icon: Target,
        subs: [
          ['leads', 'Find & pitch'],
          ['costs', 'Cost log'],
        ],
      },
    ],
  },
  {
    group: 'WhatsApp',
    items: [
      { path: '/chats', label: 'Chats', icon: MessagesSquare },
      {
        path: '/status',
        label: 'WhatsApp status',
        icon: MessageCircle,
        subs: [
          ['ideas', 'Ideas'],
          ['brand', 'Logos & posts'],
        ],
      },
    ],
  },
  {
    group: 'Content',
    items: [
      {
        path: '/seo',
        label: 'SEO pages',
        icon: FileText,
        subs: [
          ['pages', 'Pages'],
          ['queue', 'Queue & schedule'],
          ['ai', 'AI calls & key'],
        ],
      },
      {
        path: '/playbooks',
        label: 'Playbooks',
        icon: BookOpen,
        subs: [
          ['list', 'Playbooks'],
          ['key', 'API key'],
        ],
      },
      {
        path: '/phusro',
        label: 'Phusro',
        icon: Store,
        subs: [
          ['settings', 'Limit & login'],
          ['usage', 'AI calls'],
        ],
      },
    ],
  },
  {
    group: 'Setup',
    items: [
      {
        path: '/settings',
        label: 'Settings',
        icon: Settings,
        subs: [
          ['ai', 'Claude API key'],
          ['templates', 'Message types'],
        ],
      },
    ],
  },
];

const NAV_ITEMS = NAV.flatMap((g) => g.items);
const RAIL = 'lp_admin_rail';

/** The sidebar item a hash belongs to, and its open subtab (null when the page has none). */
function navAt(hash: string) {
  const item = NAV_ITEMS.find((i) => i.path !== '/' && (hash === i.path || hash.startsWith(`${i.path}/`))) ?? NAV_ITEMS[0];
  const want = hash.slice(item.path.length + 1).split('/')[0];
  const sub = item.subs ? (item.subs.find(([id]) => id === want) ?? item.subs[0])[0] : null;
  return { item, sub };
}

function AdminShell({ email, onLogout, children }: { email: string; onLogout: () => void; children: ReactNode }) {
  const hash = useAdminHash();
  const theme = useTheme();
  const { item: current, sub } = navAt(hash);
  const [rail, setRail] = useState(() => {
    try {
      return localStorage.getItem(RAIL) === '1';
    } catch {
      return false;
    }
  });
  const toggleRail = () => {
    setRail(!rail);
    try {
      localStorage.setItem(RAIL, rail ? '' : '1');
    } catch {
      // Remembered for this visit only.
    }
  };
  // On phones the sidebar is a drawer; picking a page closes it.
  const [drawer, setDrawer] = useState(false);
  useEffect(() => setDrawer(false), [hash]);
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
  // A shop's own page is a new page; a subtab of the same page keeps it (and its loaded data).
  const pageKey = /^\/shops\/\d+/.test(hash) ? hash : current.path;

  return (
    <div className={`admin${rail ? ' admin-rail' : ''}${drawer ? ' admin-drawer' : ''}`}>
      <aside className="admin-side">
        <a href="#/" className="brand">
          <Logo /> <span>Regularhood Admin</span>
        </a>
        <nav>
          {NAV.map(({ group, items }) => (
            <div key={group} className="side-group">
              {group && <p className="side-label">{group}</p>}
              {items.map(({ path, label, icon: Icon, subs }) => (
                <div key={path} className={`side-item${path === current.path ? ' active' : ''}`}>
                  <a href={`#${path}`} title={rail ? label : undefined}>
                    <Icon size={18} /> <span>{label}</span>
                    {path === '/chats' && unread > 0 && <em className="nav-badge">{unread}</em>}
                  </a>
                  {subs && (
                    <div className="side-subs">
                      <b>{label}</b>
                      {subs.map(([id, subLabel]) => (
                        <a key={id} href={`#${path}/${id}`} className={path === current.path && id === sub ? 'active' : ''}>
                          {subLabel}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </nav>
        <div className="side-foot">
          <span className="admin-email muted small">{email}</span>
          <button className="icon-btn" onClick={theme.toggle} aria-label="Toggle dark mode">
            <theme.Icon size={18} />
          </button>
          <button className="icon-btn side-rail-btn" onClick={toggleRail} aria-label={rail ? 'Expand the sidebar' : 'Collapse the sidebar'}>
            {rail ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <button className="icon-btn" onClick={onLogout} aria-label="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <button className="side-scrim" onClick={() => setDrawer(false)} aria-label="Close the menu" />
      <div className="admin-main">
        <header className="admin-top">
          <button className="icon-btn" onClick={() => setDrawer(true)} aria-label="Open the menu">
            <Menu size={20} />
            {unread > 0 && <i className="side-dot" />}
          </button>
          <a href="#/" className="brand">
            <Logo /> <span>Regularhood Admin</span>
          </a>
        </header>
        <main className="admin-page" key={pageKey}>
          {current.subs && (
            <nav className="admin-tabs">
              {current.subs.map(([id, label]) => (
                <a key={id} href={`#${current.path}/${id}`} className={id === sub ? 'active' : ''}>
                  {label}
                </a>
              ))}
            </nav>
          )}
          <SubtabContext.Provider value={sub}>{children}</SubtabContext.Provider>
        </main>
      </div>
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
  ) : hash.startsWith('/plans') ? (
    <PlansPage api={adminApi} />
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
  ) : hash.startsWith('/partners') ? (
    <PartnersPage api={adminApi} />
  ) : hash.startsWith('/playbooks') ? (
    <PlaybooksPage api={adminApi} />
  ) : hash.startsWith('/phusro') ? (
    <PhusroPage api={adminApi} />
  ) : hash.startsWith('/status') ? (
    <StatusPage api={adminApi} />
  ) : hash.startsWith('/visits') ? (
    <VisitsPage fetchViews={fetchViews} />
  ) : hash.startsWith('/settings') ? (
    <SettingsPage api={adminApi} />
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

