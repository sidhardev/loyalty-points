import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Bot, Eye, FileText, Globe, IndianRupee, KeyRound, Plus, RefreshCw, Rocket, Settings2, Trash2, Undo2, Upload, Wand2 } from 'lucide-react';
import { num, when } from '../api';
import { EmptyState, ErrorText, SkeletonRows, confirmDialog, toast, useAction } from '../ui';

// Admin → SEO pages: AI-written landing pages for each kind of shop (/for/<slug>, /hi/for/<slug>), written a few a day
// by Gemini on the server (server/src/seo.ts). Here: the schedule and budget, the queue of shop types, each page, and
// what every AI call cost. The Gemini key can be set here (stored encrypted on the server, never shown again) or come from
// GEMINI_API_KEY in the server's environment.

type Settings = {
  enabled: boolean;
  perDay: number;
  runHourIst: number;
  autoPublish: boolean;
  model: string;
  priceInUsd: number;
  priceOutUsd: number;
  monthlyBudgetUsd: number;
  usdToInr: number;
};
type Status = 'queued' | 'draft' | 'published' | 'failed';
type Page = {
  id: number;
  slug: string;
  lang: 'en' | 'hi';
  topic: string;
  notes: string;
  status: Status;
  title: string;
  description: string;
  error: string | null;
  cost_usd: number;
  created_at: string;
  generated_at: string | null;
  published_at: string | null;
  views: number;
};
type Usage = { id: number; ts: string; purpose: string; model: string; input_tokens: number; output_tokens: number; cost_usd: number; ok: number; error: string | null };
type Cost = { usd: number; calls: number };
type KeyInfo = { source: 'panel' | 'env' | null; last4: string; envAlsoSet: boolean };
type Overview = {
  settings: Settings;
  keySet: boolean;
  key: KeyInfo;
  today: { attempts: number; perDay: number };
  cost: { today: Cost; month: Cost; all: Cost };
  pages: Page[];
  usage: Usage[];
  site: string;
};

export type AdminApi = <T>(path: string, method?: string, body?: unknown) => Promise<T>;

const STATUS: Record<Status, string> = { queued: 'In queue', draft: 'Draft', published: 'Live', failed: 'Failed' };
const pagePath = (p: Pick<Page, 'lang' | 'slug'>) => `${p.lang === 'hi' ? '/hi' : ''}/for/${p.slug}`;

export function SeoPage({ api, adminToken }: { api: AdminApi; adminToken: () => string | null }) {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'' | Status>('');
  const [busyId, setBusyId] = useState(0);
  const load = useCallback(() => void api<Overview>('seo').then(setData, (e) => setError((e as Error).message)), [api]);
  useEffect(load, [load]);

  const usd = (n: number) => `$${n < 1 ? n.toFixed(4) : n.toFixed(2)}`;
  const inr = (n: number) => `₹${(n * (data?.settings.usdToInr ?? 88)).toFixed(n * (data?.settings.usdToInr ?? 88) < 10 ? 2 : 0)}`;

  const act = async (id: number, path: string, method = 'POST', done = 'Done') => {
    setBusyId(id);
    try {
      await api(path, method);
      toast(done);
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
      load();
    } finally {
      setBusyId(0);
    }
  };

  /** Opens the page as visitors will see it, drafts included (the preview needs the admin's login). */
  const preview = async (p: Page) => {
    const tab = open('', '_blank');
    try {
      const res = await fetch(`/api/admin/seo/pages/${p.id}/html`, { headers: { authorization: `Bearer ${adminToken()}` } });
      if (!res.ok) throw new Error('Could not load the preview');
      const url = URL.createObjectURL(new Blob([await res.text()], { type: 'text/html' }));
      if (tab) tab.location.href = url;
      else open(url, '_blank');
    } catch (e) {
      tab?.close();
      toast((e as Error).message, 'error');
    }
  };

  if (error) return <ErrorText text={error} />;
  if (!data) return <SkeletonRows count={6} />;

  const counts = (s: Status) => data.pages.filter((p) => p.status === s).length;
  const list = filter ? data.pages.filter((p) => p.status === filter) : data.pages;
  const s = data.settings;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>SEO pages</h1>
          <p>
            A page for every kind of shop, in English and Hindi, written by {s.model}. Live pages are in the{' '}
            <a href="/sitemap.xml" target="_blank" rel="noreferrer">
              sitemap
            </a>{' '}
            straight away.
          </p>
        </div>
      </header>

      {!data.keySet && <p className="alert alert-error">No Gemini API key yet. Add one below; until then nothing is written.</p>}

      <KeyCard api={api} info={data.key} model={s.model} onChanged={load} />

      <section className="stats">
        <div className="stat">
          <span className="stat-label">
            <Globe size={16} /> Live pages
          </span>
          <strong>{num(counts('published'))}</strong>
          <em>
            {num(counts('draft'))} drafts · {num(counts('queued'))} in queue{counts('failed') ? ` · ${num(counts('failed'))} failed` : ''}
          </em>
        </div>
        <div className="stat">
          <span className="stat-label">
            <Bot size={16} /> Today
          </span>
          <strong>
            {num(data.today.attempts)} / {num(data.today.perDay)}
          </strong>
          <em>{s.enabled ? `automatic pages, from ${s.runHourIst}:00 India time` : 'automatic writing is off'}</em>
        </div>
        <div className="stat">
          <span className="stat-label">
            <IndianRupee size={16} /> This month
          </span>
          <strong>{inr(data.cost.month.usd)}</strong>
          <em>
            {usd(data.cost.month.usd)} of {usd(s.monthlyBudgetUsd)} budget · {num(data.cost.month.calls)} calls
          </em>
        </div>
        <div className="stat">
          <span className="stat-label">
            <IndianRupee size={16} /> All time
          </span>
          <strong>{inr(data.cost.all.usd)}</strong>
          <em>
            {usd(data.cost.all.usd)} · last 24 h {usd(data.cost.today.usd)}
          </em>
        </div>
      </section>

      <div className="grid-2">
        <SettingsCard api={api} settings={s} onSaved={load} />
        <QueueCard api={api} onAdded={load} />
      </div>

      <section className="card">
        <div className="card-head">
          <h2>
            <FileText size={18} /> Pages
          </h2>
          <button className="btn btn-sm btn-primary" disabled={!!busyId || !data.keySet || !counts('queued')} onClick={() => void act(-1, 'seo/generate-next', 'POST', 'Page written')}>
            <Wand2 size={15} /> {busyId === -1 ? 'Writing… (up to a minute)' : 'Write next now'}
          </button>
        </div>
        <div className="seg seg-scroll">
          {(['', 'published', 'draft', 'queued', 'failed'] as const).map((f) => (
            <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
              {f ? `${STATUS[f]} (${counts(f)})` : `All (${data.pages.length})`}
            </button>
          ))}
        </div>
        {list.length ? (
          <div className="table-wrap">
            <table className="admin-table seo-table">
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Status</th>
                  <th className="num">Views</th>
                  <th className="num">Cost</th>
                  <th>Updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>
                        {p.topic} <span className="source-chip">{p.lang === 'hi' ? 'हिंदी' : 'English'}</span>
                      </strong>
                      <span className="muted small">
                        {p.status === 'published' ? (
                          <a href={pagePath(p)} target="_blank" rel="noreferrer">
                            {pagePath(p)}
                          </a>
                        ) : (
                          pagePath(p)
                        )}
                        {p.title ? ` · ${p.title}` : ''}
                      </span>
                      {p.error && <span className="small" style={{ color: 'var(--bad)' }}>{p.error}</span>}
                    </td>
                    <td>
                      <span className={`status seo-${p.status}`}>{STATUS[p.status]}</span>
                    </td>
                    <td className="num">{num(p.views)}</td>
                    <td className="num">{p.cost_usd ? inr(p.cost_usd) : '–'}</td>
                    <td>{p.generated_at ? when(p.generated_at) : '–'}</td>
                    <td>
                      <div className="seo-actions">
                        {p.status !== 'queued' && p.status !== 'failed' && (
                          <button className="icon-btn" title="Preview" onClick={() => void preview(p)}>
                            <Eye size={17} />
                          </button>
                        )}
                        {p.status === 'draft' && (
                          <button className="icon-btn" title="Publish" disabled={!!busyId} onClick={() => void act(p.id, `seo/pages/${p.id}/publish`, 'POST', 'Published')}>
                            <Upload size={17} />
                          </button>
                        )}
                        {p.status === 'published' && (
                          <button className="icon-btn" title="Take offline (back to draft)" disabled={!!busyId} onClick={() => void act(p.id, `seo/pages/${p.id}/unpublish`, 'POST', 'Taken offline')}>
                            <Undo2 size={17} />
                          </button>
                        )}
                        {p.status === 'failed' && (
                          <button className="icon-btn" title="Put back in the queue" disabled={!!busyId} onClick={() => void act(p.id, `seo/pages/${p.id}/retry`, 'POST', 'Back in the queue')}>
                            <RefreshCw size={17} />
                          </button>
                        )}
                        <button
                          className="icon-btn"
                          title={p.status === 'queued' ? 'Write now' : 'Rewrite'}
                          disabled={!!busyId || !data.keySet}
                          onClick={async () => {
                            if (p.status === 'published' && !(await confirmDialog({ title: `Rewrite “${p.topic}”?`, body: 'The live page is replaced by a new version.', confirm: 'Rewrite' }))) return;
                            void act(p.id, `seo/pages/${p.id}/generate`, 'POST', 'Page written');
                          }}
                        >
                          {busyId === p.id ? <RefreshCw size={17} className="spin" /> : <Wand2 size={17} />}
                        </button>
                        <button
                          className="icon-btn"
                          title="Delete"
                          disabled={!!busyId}
                          onClick={async () => {
                            if (!(await confirmDialog({ title: `Delete “${p.topic}” (${p.lang})?`, body: 'It disappears from the site and the sitemap.', confirm: 'Delete', danger: true }))) return;
                            void act(p.id, `seo/pages/${p.id}`, 'DELETE', 'Deleted');
                          }}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={FileText} title="No pages here" text="Add kinds of shops to the queue, or add the suggested ones." />
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>
            <Bot size={18} /> AI calls
          </h2>
          <span className="muted small">latest 40 · priced at {usd(s.priceInUsd)} / {usd(s.priceOutUsd)} per 1M tokens in / out</span>
        </div>
        {data.usage.length ? (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Model</th>
                  <th className="num">Tokens in</th>
                  <th className="num">Tokens out</th>
                  <th className="num">Cost</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {data.usage.map((u) => (
                  <tr key={u.id}>
                    <td>{when(u.ts)}</td>
                    <td>{u.model}</td>
                    <td className="num">{num(u.input_tokens)}</td>
                    <td className="num">{num(u.output_tokens)}</td>
                    <td className="num">
                      {usd(u.cost_usd)} <span className="muted small">{inr(u.cost_usd)}</span>
                    </td>
                    <td>{u.ok ? 'OK' : <span style={{ color: 'var(--bad)' }}>{u.error}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted small">No AI calls yet.</p>
        )}
      </section>
    </>
  );
}

function SettingsCard({ api, settings, onSaved }: { api: AdminApi; settings: Settings; onSaved: () => void }) {
  const [form, setForm] = useState(settings);
  const { busy, error, run } = useAction();
  useEffect(() => setForm(settings), [settings]);
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setForm((f) => ({ ...f, [key]: value }));
  const save = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await api('seo/settings', 'PUT', form);
      toast('Settings saved');
      onSaved();
    });
  };
  const perPage = 0.005; // about: 3k tokens in, 2.5k out at Flash-Lite prices
  return (
    <form className="card" onSubmit={save}>
      <div className="card-head">
        <h2>
          <Settings2 size={18} /> Schedule & budget
        </h2>
      </div>
      <label className="poster-check">
        <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} /> Write pages automatically every day
      </label>
      <div className="form-row">
        <label>
          Pages per day
          <input type="number" min="0" max="20" value={form.perDay} onChange={(e) => set('perDay', Number(e.target.value))} />
          <span className="hint">About ${(form.perDay * 30 * perPage).toFixed(2)} a month.</span>
        </label>
        <label>
          Start at (India time)
          <select value={form.runHourIst} onChange={(e) => set('runHourIst', Number(e.target.value))}>
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="poster-check">
        <input type="checkbox" checked={form.autoPublish} onChange={(e) => set('autoPublish', e.target.checked)} /> Publish new pages straight away (off = they wait as drafts)
      </label>
      <label>
        Gemini model
        <input value={form.model} onChange={(e) => set('model', e.target.value)} spellCheck={false} />
      </label>
      <div className="form-row">
        <label>
          $ per 1M input tokens
          <input type="number" step="0.01" min="0" value={form.priceInUsd} onChange={(e) => set('priceInUsd', Number(e.target.value))} />
        </label>
        <label>
          $ per 1M output tokens
          <input type="number" step="0.01" min="0" value={form.priceOutUsd} onChange={(e) => set('priceOutUsd', Number(e.target.value))} />
        </label>
      </div>
      <div className="form-row">
        <label>
          Monthly budget ($)
          <input type="number" step="0.5" min="0" value={form.monthlyBudgetUsd} onChange={(e) => set('monthlyBudgetUsd', Number(e.target.value))} />
          <span className="hint">Writing stops for the month once it's reached.</span>
        </label>
        <label>
          ₹ per $
          <input type="number" step="0.5" min="1" value={form.usdToInr} onChange={(e) => set('usdToInr', Number(e.target.value))} />
          <span className="hint">Only for showing costs in rupees.</span>
        </label>
      </div>
      <ErrorText text={error} />
      <button className="btn btn-primary" disabled={busy}>
        {busy ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}

function QueueCard({ api, onAdded }: { api: AdminApi; onAdded: () => void }) {
  const [topics, setTopics] = useState('');
  const [notes, setNotes] = useState('');
  const [langs, setLangs] = useState({ en: true, hi: true });
  const { busy, error, run } = useAction();
  const add = (body: object) =>
    void run(async () => {
      const r = await api<{ added: number }>('seo/queue', 'POST', body);
      toast(r.added ? `${r.added} pages added to the queue` : 'Those are already in the queue');
      setTopics('');
      setNotes('');
      onAdded();
    });
  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        add({ topics, notes, langs: (['en', 'hi'] as const).filter((l) => langs[l]) });
      }}
    >
      <div className="card-head">
        <h2>
          <Plus size={18} /> Add kinds of shops
        </h2>
      </div>
      <label>
        Kinds of shops (one per line)
        <textarea rows={4} value={topics} onChange={(e) => setTopics(e.target.value)} placeholder={'Gym\nMobile repair shop\nBoutique'} />
      </label>
      <label>
        Notes for the writer (optional)
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. focus on small towns, mention festival season" />
      </label>
      <div className="poster-options">
        <label className="poster-check">
          <input type="checkbox" checked={langs.en} onChange={(e) => setLangs({ ...langs, en: e.target.checked })} /> English
        </label>
        <label className="poster-check">
          <input type="checkbox" checked={langs.hi} onChange={(e) => setLangs({ ...langs, hi: e.target.checked })} /> हिंदी
        </label>
      </div>
      <ErrorText text={error} />
      <div className="actions">
        <button className="btn btn-primary" disabled={busy || !topics.trim()}>
          <Plus size={16} /> Add to queue
        </button>
        <button type="button" className="btn btn-soft" disabled={busy} onClick={() => add({ suggested: true })}>
          <Rocket size={16} /> Add 30 suggested
        </button>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        Each kind of shop gets its own page in each language: /for/gym and /hi/for/gym. Pages are written in queue order.
      </p>
    </form>
  );
}

/** Set, test or remove the Gemini key. The key is write-only: the panel only ever sees its last 4 characters. */
function KeyCard({ api, info, model, onChanged }: { api: AdminApi; info: KeyInfo; model: string; onChanged: () => void }) {
  const [key, setKey] = useState('');
  const { busy, error, setError, run } = useAction();
  const save = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await api('seo/key', 'PUT', { key });
      setKey('');
      toast('Key checked and saved');
      onChanged();
    });
  };
  const test = () =>
    void run(async () => {
      await api('seo/key/test', 'POST');
      toast(`The key works with ${model}`);
    });
  const remove = async () => {
    const body = info.envAlsoSet ? 'The key from the server’s .env file is used again.' : 'There will be no key, and no pages are written until you add one.';
    if (!(await confirmDialog({ title: 'Remove this key?', body, confirm: 'Remove', danger: true }))) return;
    void run(async () => {
      await api('seo/key', 'DELETE');
      toast('Key removed');
      onChanged();
    });
  };
  const status =
    info.source === 'panel'
      ? `Using the key set here, ending …${info.last4}${info.envAlsoSet ? ' (it overrides the one in the server’s .env)' : ''}.`
      : info.source === 'env'
        ? `Using the key from the server’s .env (GEMINI_API_KEY), ending …${info.last4}. A key saved here replaces it.`
        : 'No key set.';
  return (
    <form className="card" onSubmit={save}>
      <div className="card-head">
        <h2>
          <KeyRound size={18} /> Gemini API key
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
      <div className="key-row">
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            setError('');
          }}
          placeholder={info.source ? 'Paste a new key to replace it' : 'Paste your Gemini API key'}
          aria-label="Gemini API key"
        />
        <button className="btn btn-primary" disabled={busy || !key.trim()}>
          {busy ? 'Checking…' : 'Save key'}
        </button>
      </div>
      <ErrorText text={error} />
      <p className="muted small" style={{ margin: 0 }}>
        The key is checked with Google before it’s saved, stored encrypted on the server, and never shown again. Get one at{' '}
        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
          aistudio.google.com/apikey
        </a>
        .
      </p>
    </form>
  );
}
