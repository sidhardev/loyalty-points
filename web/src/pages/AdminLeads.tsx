import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Copy,
  IndianRupee,
  KeyRound,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  ScrollText,
  Search,
  Send,
  Settings2,
  Sparkles,
  Star,
  Target,
  Trash2,
  Users,
  Wand2,
} from 'lucide-react';
import { num, when, whatsapp } from '../api';
import { EmptyState, ErrorText, Sheet, SkeletonRows, confirmDialog, toast, useAction } from '../ui';
import type { AdminApi } from './AdminSeo';
import { WaThread, WhatsAppBar, useWhatsApp, type WaOverview } from './AdminWhatsApp';

// Admin → Leads: finds shops on Google Maps that could use Regularhood (server/src/leads.ts), scores them, and has
// Gemini write a pitch for each — a WhatsApp message (Hinglish and Hindi), what to say on a call, answers to the usual
// doubts. Each lead moves new → contacted → interested → joined; a shop that signs up from its pitch link (or with its
// phone number) is marked joined by itself. Every Places search and every pitch is costed here.

type LeadStatus = 'new' | 'contacted' | 'interested' | 'joined' | 'not_interested';
type Pitch = {
  fit: string;
  whatsapp: string;
  whatsappHindi: string;
  callOpener: string;
  talkingPoints: string[];
  rewardIdeas: string[];
  objections: { q: string; a: string }[];
  followUp: string;
};
type Lead = {
  id: number;
  search_id: number | null;
  name: string;
  category: string;
  shop_type: string;
  area: string;
  address: string;
  phone: string;
  mobile: number;
  website: string;
  maps_url: string;
  rating: number | null;
  reviews: number;
  score: number;
  reasons: string[];
  status: LeadStatus;
  notes: string;
  pitch: Pitch | null;
  pitch_cost_usd: number;
  created_at: string;
  contacted_at: string | null;
  link: string;
  wa_opted_out: number;
  last_inbound_at: string | null;
  wa?: { lastOut: string | null; lastIn: string | null } | null;
};
type SearchRow = { id: number; created_at: string; shop_type: string; area: string; pages: number; found: number; added: number; cost_usd: number };
type UsageRow = { kind: 'places' | 'ai' | 'wa'; id: number; ts: string; purpose: string; ref_id: number | null; results: number; model: string | null; cost_usd: number; free: number; ok: number; error: string | null };
type Cost = { calls: number; usd: number };
type Settings = { pricePer1000Usd: number; freePerMonth: number; monthlyBudgetUsd: number };
type KeyInfo = { source: 'panel' | 'env' | null; last4: string; envAlsoSet: boolean };
type Data = {
  settings: Settings;
  key: KeyInfo;
  geminiReady: boolean;
  model: string;
  usdToInr: number;
  nextCallUsd: number;
  cost: { placesMonth: Cost; placesAll: Cost; pitchMonth: Cost; pitchAll: Cost; waMonth: Cost; waAll: Cost };
  shopTypes: string[];
  searches: SearchRow[];
  leads: Lead[];
  usage: UsageRow[];
};

const STATUS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  interested: 'Interested',
  joined: 'Joined',
  not_interested: 'Not interested',
};

const PAGE = 60;

const copy = (text: string, what: string) =>
  navigator.clipboard.writeText(text).then(
    () => toast(`${what} copied`),
    () => toast('Could not copy — select the text and copy it by hand', 'error'),
  );

const fill = (text: string, lead: Lead) => text.replace(/\[link\]/gi, lead.link);

export function LeadsPage({ api }: { api: AdminApi }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'' | LeadStatus>('');
  const [searchId, setSearchId] = useState(0);
  const [q, setQ] = useState('');
  const [onlyMobile, setOnlyMobile] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [openId, setOpenId] = useState(0);
  const [bulk, setBulk] = useState('');
  const load = useCallback(() => void api<Data>('leads').then(setData, (e) => setError((e as Error).message)), [api]);
  useEffect(load, [load]);
  const { wa, reload: reloadWa } = useWhatsApp(api);
  const refresh = () => (load(), reloadWa());

  if (error) return <ErrorText text={error} />;
  if (!data) return <SkeletonRows count={6} />;

  const rate = data.usdToInr;
  const inr = (usd: number) => `₹${(usd * rate).toFixed(usd * rate < 10 ? 2 : 0)}`;
  const usd = (n: number) => `$${n < 1 ? n.toFixed(4) : n.toFixed(2)}`;
  const count = (s: LeadStatus) => data.leads.filter((l) => l.status === s).length;
  const needle = q.trim().toLowerCase();
  const list = data.leads.filter(
    (l) =>
      (!status || l.status === status) &&
      (!searchId || l.search_id === searchId) &&
      (!onlyMobile || l.mobile) &&
      (!needle || `${l.name} ${l.category} ${l.area} ${l.address} ${l.phone}`.toLowerCase().includes(needle)),
  );
  const open = data.leads.find((l) => l.id === openId);
  const setLead = (lead: Lead) => setData((d) => d && { ...d, leads: d.leads.map((l) => (l.id === lead.id ? { ...l, ...lead } : l)) });
  const totalUsd = data.cost.placesAll.usd + data.cost.pitchAll.usd + data.cost.waAll.usd;
  const joined = count('joined');

  /** Pitches for the best leads in the current list that don't have one yet, one after another. */
  const pitchTop = async (n: number) => {
    const todo = list.filter((l) => !l.pitch && l.status === 'new').slice(0, n);
    if (!todo.length) return toast('Every lead in this list already has a pitch');
    for (const [i, lead] of todo.entries()) {
      setBulk(`Writing pitch ${i + 1} of ${todo.length}…`);
      try {
        setLead(await api<Lead>(`leads/${lead.id}/pitch`, 'POST'));
      } catch (e) {
        toast((e as Error).message, 'error');
        break;
      }
    }
    setBulk('');
    load();
  };

  /** The intro template to the best new leads with a WhatsApp number that haven't been messaged. */
  const sendTop = async (n: number) => {
    if (!(await confirmDialog({ title: `Send the intro to the top ${n} new leads?`, body: 'Only leads with a mobile number that haven’t been messaged. Each delivered message is charged by Meta.', confirm: 'Send' })))
      return;
    setBulk('Sending…');
    try {
      const r = await api<{ sent: number; tried: number; error: string }>('whatsapp/bulk', 'POST', { count: n });
      toast(`${r.sent} of ${r.tried} sent`);
      if (r.error) toast(r.error, 'error');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
    setBulk('');
    refresh();
  };

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Lead finder</h1>
          <p>
            Shops on Google Maps that could use Regularhood, best fit first, each with a ready pitch written by {data.model}. A shop that signs up from its pitch
            link, or with the same phone number, moves to Joined by itself.
          </p>
        </div>
      </header>

      {!data.key.source && <p className="alert alert-error">No Google Maps key yet: press “Add Google Maps key” below to start finding shops.</p>}
      {!data.geminiReady && (
        <p className="alert alert-error">
          No Gemini key, so pitches can’t be written. Add one in <a href="#/seo">SEO pages</a>.
        </p>
      )}

      {wa && <WhatsAppBar api={api} wa={wa} onChanged={reloadWa} />}

      <section className="stats stats-6">
        <div className="stat">
          <span className="stat-label">
            <Users size={16} /> Leads
          </span>
          <strong>{num(data.leads.length)}</strong>
          <em>
            {num(count('new'))} new · {num(data.leads.filter((l) => l.mobile).length)} on WhatsApp
          </em>
        </div>
        <div className="stat">
          <span className="stat-label">
            <MessageCircle size={16} /> Contacted
          </span>
          <strong>{num(count('contacted') + count('interested') + joined + count('not_interested'))}</strong>
          <em>{num(count('interested'))} interested</em>
        </div>
        <div className="stat">
          <span className="stat-label">
            <Target size={16} /> Joined
          </span>
          <strong>{num(joined)}</strong>
          <em>{joined ? `${inr(totalUsd / joined)} per shop that joined` : 'from leads'}</em>
        </div>
        <div className="stat">
          <span className="stat-label">
            <MapPin size={16} /> Maps this month
          </span>
          <strong>{inr(data.cost.placesMonth.usd)}</strong>
          <em>
            {num(data.cost.placesMonth.calls)} searches · {num(Math.max(0, data.settings.freePerMonth - data.cost.placesMonth.calls))} free left
          </em>
        </div>
        <div className="stat">
          <span className="stat-label">
            <MessageCircle size={16} /> WhatsApp this month
          </span>
          <strong>{inr(data.cost.waMonth.usd)}</strong>
          <em>
            {num(wa?.month.templates ?? 0)} sent · {num(wa?.month.replied ?? 0)} replied
          </em>
        </div>
        <div className="stat">
          <span className="stat-label">
            <IndianRupee size={16} /> All time
          </span>
          <strong>{inr(totalUsd)}</strong>
          <em>
            Maps {usd(data.cost.placesAll.usd)} · AI {usd(data.cost.pitchAll.usd)} · WhatsApp {usd(data.cost.waAll.usd)} · AI this month{' '}
            {inr(data.cost.pitchMonth.usd)}
          </em>
        </div>
      </section>

      <SearchCard api={api} data={data} inr={inr} onDone={(id) => (setSearchId(id), setStatus(''), setShown(PAGE), load())} onSettings={load} />


      <section className="card">
        <div className="card-head">
          <h2>
            <Users size={18} /> Leads
          </h2>
          <div className="actions" style={{ margin: 0 }}>
            <button className="btn btn-sm btn-soft" disabled={!!bulk || !data.geminiReady} onClick={() => void pitchTop(5)}>
              <Wand2 size={15} /> {bulk || 'Write pitches for the top 5'}
            </button>
            {wa?.ready && (
              <button className="btn btn-sm btn-primary" disabled={!!bulk} onClick={() => void sendTop(10)}>
                <Send size={15} /> Send intro to the top 10
              </button>
            )}
          </div>
        </div>
        <div className="seg seg-scroll">
          {(['', 'new', 'contacted', 'interested', 'joined', 'not_interested'] as const).map((s) => (
            <button key={s} className={status === s ? 'active' : ''} onClick={() => (setStatus(s), setShown(PAGE))}>
              {s ? `${STATUS[s]} (${count(s)})` : `All (${data.leads.length})`}
            </button>
          ))}
        </div>
        <div className="leads-filters">
          <input value={q} onChange={(e) => (setQ(e.target.value), setShown(PAGE))} placeholder="Search name, area, phone" aria-label="Search leads" />
          <select value={searchId} onChange={(e) => (setSearchId(Number(e.target.value)), setShown(PAGE))} aria-label="From search">
            <option value={0}>All searches</option>
            {data.searches.map((s) => (
              <option key={s.id} value={s.id}>
                {s.shop_type} · {s.area}
              </option>
            ))}
          </select>
          <label className="poster-check">
            <input type="checkbox" checked={onlyMobile} onChange={(e) => (setOnlyMobile(e.target.checked), setShown(PAGE))} /> Only WhatsApp numbers
          </label>
        </div>
        {list.length ? (
          <div className="leads-list">
            {list.slice(0, shown).map((l) => (
              <LeadItem key={l.id} lead={l} api={api} wa={wa} onOpen={() => setOpenId(l.id)} onChange={setLead} onSent={refresh} />
            ))}
            {list.length > shown && (
              <button className="btn btn-soft" onClick={() => setShown(shown + PAGE)}>
                Show more ({num(list.length - shown)} left)
              </button>
            )}
          </div>
        ) : (
          <EmptyState icon={Search} title={data.leads.length ? 'No leads match' : 'No leads yet'} text={data.leads.length ? 'Try another filter.' : 'Search for a kind of shop in an area above.'} />
        )}
      </section>

      <HistoryCard data={data} usd={usd} inr={inr} />

      {open && <PitchSheet lead={open} api={api} wa={wa} geminiReady={data.geminiReady} usd={usd} onChange={setLead} onDeleted={load} onWa={refresh} onClose={() => setOpenId(0)} />}
    </>
  );
}

function SearchCard({
  api,
  data,
  inr,
  onDone,
  onSettings,
}: {
  api: AdminApi;
  data: Data;
  inr: (usd: number) => string;
  onDone: (searchId: number) => void;
  onSettings: () => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shopType, setShopType] = useState('');
  const [area, setArea] = useState('');
  const [pages, setPages] = useState(1);
  const { busy, error, run } = useAction();
  const s = data.settings;
  const freeLeft = Math.max(0, s.freePerMonth - data.cost.placesMonth.calls);
  const billed = Math.max(0, pages - freeLeft);
  const estimate = billed ? `about ${inr((billed * s.pricePer1000Usd) / 1000)}` : `free (${num(freeLeft)} free searches left this month)`;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const r = await api<{ searchId: number; found: number; added: number; costUsd: number; error: string }>('leads/search', 'POST', { shopType, area, pages });
      toast(`${r.found} shops found, ${r.added} new · cost ${inr(r.costUsd)}`);
      if (r.error) toast(r.error, 'error');
      onDone(r.searchId);
    });
  };
  return (
    <>
      <form className="card" onSubmit={submit}>
        <div className="card-head">
          <h2>
            <Search size={18} /> Find shops
          </h2>
          <button type="button" className={`btn btn-sm ${data.key.source ? 'btn-ghost' : 'btn-primary'}`} onClick={() => setSettingsOpen(true)}>
            <Settings2 size={15} /> {data.key.source ? 'Google Maps settings' : 'Add Google Maps key'}
          </button>
        </div>
        <div className="leads-search">
          <label>
            Kind of shop
            <input value={shopType} onChange={(e) => setShopType(e.target.value)} list="lead-shop-types" placeholder="e.g. Salon, Kirana store, Café" />
            <datalist id="lead-shop-types">
              {data.shopTypes.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>
          <label>
            Area or city
            <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Vijay Nagar, Indore" />
          </label>
          <label>
            How many
            <select value={pages} onChange={(e) => setPages(Number(e.target.value))}>
              <option value={1}>Up to 20 shops (1 search)</option>
              <option value={2}>Up to 40 shops (2 searches)</option>
              <option value={3}>Up to 60 shops (3 searches)</option>
            </select>
          </label>
          <button className="btn btn-primary" disabled={busy || !data.key.source || !shopType.trim() || !area.trim()}>
            <Search size={16} /> {busy ? 'Searching…' : 'Find shops'}
          </button>
        </div>
        <ErrorText text={error} />
        <p className="muted small" style={{ margin: 0 }}>
          Cost: {estimate}. A small area finds better shops than a whole city: “Salon in Vijay Nagar, Indore” rather than “Salon in Indore”. Shops found
          before keep their status and notes.
        </p>
      </form>
      {settingsOpen && (
        <Sheet title="Google Maps settings" wide onClose={() => setSettingsOpen(false)}>
          <PlacesCard api={api} data={data} onChanged={onSettings} />
        </Sheet>
      )}
    </>
  );
}

/** The Google Maps key (write-only, like the Gemini key) and the Places price, free calls and budget. */
function PlacesCard({ api, data, onChanged }: { api: AdminApi; data: Data; onChanged: () => void }) {
  const [key, setKey] = useState('');
  const [form, setForm] = useState(data.settings);
  const { busy, error, setError, run } = useAction();
  useEffect(() => setForm(data.settings), [data.settings]);
  const info = data.key;
  const saveKey = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await api('leads/key', 'PUT', { key });
      setKey('');
      toast('Key checked and saved');
      onChanged();
    });
  };
  const test = () =>
    void run(async () => {
      await api('leads/key/test', 'POST');
      toast('The key works with the Places API');
    });
  const remove = async () => {
    const body = info.envAlsoSet ? 'The key from the server’s .env file is used again.' : 'Searches stop until you add a key.';
    if (!(await confirmDialog({ title: 'Remove this key?', body, confirm: 'Remove', danger: true }))) return;
    void run(async () => {
      await api('leads/key', 'DELETE');
      toast('Key removed');
      onChanged();
    });
  };
  const saveSettings = () =>
    void run(async () => {
      await api('leads/settings', 'PUT', form);
      toast('Settings saved');
      onChanged();
    });
  const status =
    info.source === 'panel'
      ? `Using the key set here, ending …${info.last4}${info.envAlsoSet ? ' (it overrides GOOGLE_MAPS_API_KEY in the server’s .env)' : ''}.`
      : info.source === 'env'
        ? `Using GOOGLE_MAPS_API_KEY from the server’s .env, ending …${info.last4}. A key saved here replaces it.`
        : 'No key set.';
  return (
    <div className="wa-settings">
      <div className="card-head">
        <h2>
          <KeyRound size={18} /> Key
        </h2>
        {info.source && (
          <div className="actions" style={{ margin: 0 }}>
            <button type="button" className="btn btn-sm btn-soft" disabled={busy} onClick={test}>
              Test
            </button>
            {info.source === 'panel' && (
              <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => void remove()}>
                <Trash2 size={15} /> Remove
              </button>
            )}
          </div>
        )}
      </div>
      <p className="small" style={{ margin: 0 }}>
        {status}
      </p>
      <form className="key-row" onSubmit={saveKey}>
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={key}
          onChange={(e) => (setKey(e.target.value), setError(''))}
          placeholder={info.source ? 'Paste a new key to replace it' : 'Paste your Google Maps API key'}
          aria-label="Google Maps API key"
        />
        <button className="btn btn-primary" disabled={busy || !key.trim()}>
          {busy ? 'Checking…' : 'Save key'}
        </button>
      </form>
      <p className="muted small" style={{ margin: 0 }}>
        In Google Cloud, turn on <strong>Places API (New)</strong> for the key. It’s checked with a free search before saving, stored encrypted, and never
        shown again.
      </p>
      <div className="form-row leads-settings">
        <label>
          $ per 1000 searches
          <input type="number" min="0" step="0.01" value={form.pricePer1000Usd} onChange={(e) => setForm({ ...form, pricePer1000Usd: Number(e.target.value) })} />
        </label>
        <label>
          Free searches / month
          <input type="number" min="0" value={form.freePerMonth} onChange={(e) => setForm({ ...form, freePerMonth: Number(e.target.value) })} />
        </label>
        <label>
          Budget / month ($)
          <input type="number" min="0" step="0.5" value={form.monthlyBudgetUsd} onChange={(e) => setForm({ ...form, monthlyBudgetUsd: Number(e.target.value) })} />
        </label>
      </div>
      <ErrorText text={error} />
      <div className="actions">
        <button type="button" className="btn btn-soft btn-sm" disabled={busy} onClick={saveSettings}>
          <Settings2 size={15} /> Save cost settings
        </button>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        Each search asks Google for phone, website and rating: the “Text Search Enterprise” price (about $35 per 1000, first 1000 a month free when this was
        built). Check Google’s current price and change it here; searches stop once the month’s billed cost reaches the budget. Pitches are counted against the
        AI budget in SEO pages.
      </p>
    </div>
  );
}

/** What happened on WhatsApp, for the list: replied beats read beats delivered. */
function waLabel(l: Lead) {
  if (l.wa_opted_out) return { text: 'Opted out', cls: 'badge-minus' };
  if (l.wa?.lastIn) return { text: 'Replied', cls: 'badge-plus' };
  const out = l.wa?.lastOut;
  if (!out) return null;
  return { text: { sent: 'Sent', delivered: 'Delivered', read: 'Read', failed: 'Failed' }[out] ?? out, cls: out === 'failed' ? 'badge-minus' : 'badge-neutral' };
}

function LeadItem({
  lead: l,
  api,
  wa,
  onOpen,
  onChange,
  onSent,
}: {
  lead: Lead;
  api: AdminApi;
  wa: WaOverview | null;
  onOpen: () => void;
  onChange: (lead: Lead) => void;
  onSent: () => void;
}) {
  const [sending, setSending] = useState(false);
  const setStatus = (status: LeadStatus) =>
    void api<Lead>(`leads/${l.id}`, 'PUT', { status }).then(onChange, (e) => toast((e as Error).message, 'error'));
  const viaApi = Boolean(wa?.ready) && !l.wa?.lastOut && !l.wa_opted_out;
  /** Through the API: the approved intro template. Without it: opens WhatsApp on this device with the pitch. */
  const send = async () => {
    if (!viaApi) {
      open(whatsapp(l.phone, l.pitch ? fill(l.pitch.whatsapp, l) : ''), '_blank');
      if (l.status === 'new') setStatus('contacted');
      return;
    }
    setSending(true);
    try {
      await api(`whatsapp/leads/${l.id}/template`, 'POST');
      toast(`Intro sent to ${l.name}`);
      onSent();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSending(false);
    }
  };
  const badge = waLabel(l);
  return (
    <article className="lead">
      <button className="lead-main" onClick={onOpen}>
        <span className={`lead-score${l.score >= 70 ? ' hot' : l.score >= 50 ? ' warm' : ''}`} title={l.reasons.join('\n')}>
          {l.score}
        </span>
        <span className="lead-text">
          <strong>{l.name}</strong>
          <span className="muted small">
            {[l.category || l.shop_type, l.area].filter(Boolean).join(' · ')}
            {l.rating ? (
              <>
                {' · '}
                <Star size={12} className="lead-star" /> {l.rating} ({num(l.reviews)})
              </>
            ) : null}
          </span>
          <span className="small lead-phone">
            {l.phone || 'No phone'}
            {l.mobile ? <span className="badge badge-plus">WhatsApp</span> : null}
            {l.pitch ? <span className="badge badge-neutral">Pitch ready</span> : null}
            {badge && <span className={`badge ${badge.cls}`}>WhatsApp: {badge.text}</span>}
          </span>
        </span>
      </button>
      <div className="lead-actions">
        <select value={l.status} onChange={(e) => setStatus(e.target.value as LeadStatus)} aria-label="Status" className={`lead-status s-${l.status}`}>
          {(Object.keys(STATUS) as LeadStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS[s]}
            </option>
          ))}
        </select>
        {l.mobile && !l.wa_opted_out ? (
          <button
            className="btn btn-sm btn-soft"
            disabled={sending}
            onClick={() => void send()}
            title={viaApi ? 'Send the approved intro template through the WhatsApp API' : 'Open WhatsApp on this device with the pitch'}
          >
            {viaApi ? <Send size={15} /> : <MessageCircle size={15} />} {sending ? 'Sending…' : viaApi ? 'Send intro' : 'WhatsApp'}
          </button>
        ) : null}
        {l.phone && (
          <a className="btn btn-sm btn-ghost" href={`tel:${l.phone.replace(/\s/g, '')}`} aria-label={`Call ${l.name}`}>
            <Phone size={15} />
          </a>
        )}
        <button className="btn btn-sm btn-primary" onClick={onOpen}>
          <Sparkles size={15} /> Pitch
        </button>
      </div>
    </article>
  );
}

function PitchSheet({
  lead: l,
  api,
  wa,
  geminiReady,
  usd,
  onChange,
  onDeleted,
  onWa,
  onClose,
}: {
  lead: Lead;
  api: AdminApi;
  wa: WaOverview | null;
  geminiReady: boolean;
  usd: (n: number) => string;
  onChange: (lead: Lead) => void;
  onDeleted: () => void;
  onWa: () => void;
  onClose: () => void;
}) {
  const [lang, setLang] = useState<'hinglish' | 'hindi'>('hinglish');
  const [notes, setNotes] = useState(l.notes);
  const { busy, error, run } = useAction();
  const write = () => void run(async () => onChange(await api<Lead>(`leads/${l.id}/pitch`, 'POST')));
  const saveNotes = () =>
    void run(async () => {
      onChange(await api<Lead>(`leads/${l.id}`, 'PUT', { notes }));
      toast('Notes saved');
    });
  const send = (text: string) => {
    open(whatsapp(l.phone, fill(text, l)), '_blank');
    if (l.status === 'new') void api<Lead>(`leads/${l.id}`, 'PUT', { status: 'contacted' }).then(onChange);
  };
  const remove = async () => {
    if (!(await confirmDialog({ title: `Delete ${l.name}?`, body: 'A later search may find it again.', confirm: 'Delete', danger: true }))) return;
    void run(async () => {
      await api(`leads/${l.id}`, 'DELETE');
      onClose();
      onDeleted();
    });
  };
  const p = l.pitch;
  const message = p ? fill(lang === 'hindi' ? p.whatsappHindi : p.whatsapp, l) : '';

  return (
    <Sheet title={l.name} onClose={onClose}>
      <div className="lead-info small">
        <span>{[l.category || l.shop_type, l.address].filter(Boolean).join(' · ')}</span>
        <span>
          {l.rating ? `★ ${l.rating} from ${num(l.reviews)} reviews · ` : ''}
          {l.phone || 'No phone'}
          {l.website && (
            <>
              {' · '}
              <a href={l.website} target="_blank" rel="noreferrer">
                Website
              </a>
            </>
          )}
          {l.maps_url && (
            <>
              {' · '}
              <a href={l.maps_url} target="_blank" rel="noreferrer">
                Google Maps
              </a>
            </>
          )}
        </span>
        <span className="muted">
          Fit {l.score}/100: {l.reasons.join(' · ')}
        </span>
      </div>

      {!p ? (
        <div className="lead-empty">
          <p className="muted small" style={{ margin: 0 }}>
            No pitch yet. One costs well under ₹1 with {geminiReady ? 'the current model' : 'Gemini (add a key in SEO pages first)'}.
          </p>
          <button className="btn btn-primary" disabled={busy || !geminiReady} onClick={write}>
            <Wand2 size={16} /> {busy ? 'Writing… (up to a minute)' : 'Write pitch'}
          </button>
        </div>
      ) : (
        <>
          <p className="lead-fit small">{p.fit}</p>
          <div className="lead-block">
            <div className="card-head">
              <h3>First WhatsApp message</h3>
              <div className="seg">
                <button className={lang === 'hinglish' ? 'active' : ''} onClick={() => setLang('hinglish')}>
                  Hinglish
                </button>
                <button className={lang === 'hindi' ? 'active' : ''} onClick={() => setLang('hindi')}>
                  हिंदी
                </button>
              </div>
            </div>
            <pre className="lead-msg">{message}</pre>
            <div className="actions">
              {l.mobile ? (
                <button className="btn btn-primary btn-sm" onClick={() => send(lang === 'hindi' ? p.whatsappHindi : p.whatsapp)}>
                  <MessageCircle size={15} /> Open in my WhatsApp
                </button>
              ) : null}
              <button className="btn btn-soft btn-sm" onClick={() => void copy(message, 'Message')}>
                <Copy size={15} /> Copy
              </button>
            </div>
          </div>

          <div className="lead-block">
            <h3>On a call or visit</h3>
            <p className="small" style={{ margin: 0 }}>
              {p.callOpener}
            </p>
            <ul className="small">
              {p.talkingPoints.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
            <h3>Reward ideas for them</h3>
            <ul className="small">
              {p.rewardIdeas.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>

          <div className="lead-block">
            <h3>If they say…</h3>
            {p.objections.map((o, i) => (
              <p key={i} className="small" style={{ margin: 0 }}>
                <strong>“{o.q}”</strong>
                <br />
                {o.a}
              </p>
            ))}
          </div>

          <div className="lead-block">
            <h3>Follow-up after 2–3 days</h3>
            <pre className="lead-msg">{fill(p.followUp, l)}</pre>
            <div className="actions">
              {l.mobile ? (
                <button className="btn btn-soft btn-sm" onClick={() => send(p.followUp)}>
                  <MessageCircle size={15} /> Open in my WhatsApp
                </button>
              ) : null}
              <button className="btn btn-soft btn-sm" onClick={() => void copy(fill(p.followUp, l), 'Follow-up')}>
                <Copy size={15} /> Copy
              </button>
            </div>
          </div>
        </>
      )}

      {wa && l.phone && (
        <WaThread
          api={api}
          wa={wa}
          leadId={l.id}
          mobile={Boolean(l.mobile)}
          optedOut={Boolean(l.wa_opted_out)}
          lastInbound={l.last_inbound_at}
          hasPitch={Boolean(p)}
          onChanged={onWa}
        />
      )}

      <label>
        Notes
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What they said, when to call back…" />
      </label>
      <ErrorText text={error} />
      <div className="actions">
        <button className="btn btn-soft btn-sm" disabled={busy || notes === l.notes} onClick={saveNotes}>
          Save notes
        </button>
        {p && (
          <button className="btn btn-soft btn-sm" disabled={busy || !geminiReady} onClick={write}>
            <RefreshCw size={15} /> {busy ? 'Writing…' : 'Write a new pitch'}
          </button>
        )}
        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void remove()}>
          <Trash2 size={15} /> Delete lead
        </button>
      </div>
      <p className="muted small" style={{ margin: 0, overflowWrap: 'anywhere' }}>
        Sign-up link in the pitch: {l.link}
        {l.pitch_cost_usd ? ` · pitches for this shop cost ${usd(l.pitch_cost_usd)}` : ''}
        {l.contacted_at ? ` · first contacted ${when(l.contacted_at)}` : ''}
      </p>
    </Sheet>
  );
}

/** Every search and every AI pitch, with what it cost. */
function HistoryCard({ data, usd, inr }: { data: Data; usd: (n: number) => string; inr: (n: number) => string }) {
  const [tab, setTab] = useState<'searches' | 'calls'>('searches');
  return (
    <section className="card">
      <div className="card-head">
        <h2>
          <ScrollText size={18} /> Cost log
        </h2>
        <div className="seg">
          <button className={tab === 'searches' ? 'active' : ''} onClick={() => setTab('searches')}>
            Searches
          </button>
          <button className={tab === 'calls' ? 'active' : ''} onClick={() => setTab('calls')}>
            Every call
          </button>
        </div>
      </div>
      {tab === 'searches' ? (
        data.searches.length ? (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Search</th>
                  <th className="num">Calls</th>
                  <th className="num">Found</th>
                  <th className="num">New</th>
                  <th className="num">Cost</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {data.searches.map((s) => (
                  <tr key={s.id}>
                    <td>
                      {s.shop_type} · {s.area}
                    </td>
                    <td className="num">{s.pages}</td>
                    <td className="num">{s.found}</td>
                    <td className="num">{s.added}</td>
                    <td className="num">{s.cost_usd ? `${inr(s.cost_usd)} (${usd(s.cost_usd)})` : 'free'}</td>
                    <td>{when(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted small">No searches yet.</p>
        )
      ) : data.usage.length ? (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Call</th>
                <th className="num">Results / tokens</th>
                <th className="num">Cost</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {data.usage.map((u) => (
                <tr key={`${u.kind}${u.id}`}>
                  <td>
                    {u.kind === 'places' ? 'Google Maps search' : u.kind === 'wa' ? `WhatsApp ${u.purpose}${u.model ? ` (${u.model})` : ''}` : `Pitch (${u.model})`}
                    {!u.ok && <span className="muted small"> · failed: {u.error}</span>}
                  </td>
                  <td className="num">{num(u.results)}</td>
                  <td className="num">{u.kind === 'places' && u.ok && u.free ? 'free' : usd(u.cost_usd)}</td>
                  <td>{when(u.ts)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted small">No calls yet.</p>
      )}
    </section>
  );
}
