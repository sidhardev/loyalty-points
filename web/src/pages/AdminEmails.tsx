import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, CalendarDays, CheckCheck, Copy, KeyRound, Mail, MailOpen, Search, Send, Settings2 } from 'lucide-react';
import { num, when } from '../api';
import { EmptyState, ErrorText, SkeletonRows, confirmDialog, toast, useAction } from '../ui';
import type { AdminApi } from './AdminSeo';
import { Sub } from './AdminSub';

// Admin → Emails (server/src/emails.ts): every email sent and what Resend says happened to it, every "Forgot
// password" request, and the automatic emails (welcome, win-back, nudge) with their settings and wording.

type Settings = { welcome: boolean; winback: boolean; winbackDays: number; nudge: boolean; nudgeDays: number; dailyCap: number };
type Preview = { subject: string; text: string; html: string };
type LogRow = {
  id: number;
  merchant_id: number | null;
  shop: string | null;
  to_email: string;
  kind: string;
  subject: string;
  status: string;
  error: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  created_at: string;
  updated_at: string;
};
type ResetRow = {
  id: number;
  merchant_id: number;
  shop: string;
  email: string | null;
  phone: string | null;
  channel: 'email' | 'whatsapp';
  attempts: number;
  result: 'used' | 'replaced' | null;
  expired: number;
  created_at: string;
  used_at: string | null;
  email_status: string | null;
  email_error: string | null;
};
type Data = {
  ready: boolean;
  from: string;
  usage: { today: number; month: number; dayLimit: number; monthLimit: number };
  kinds: { kind: string; total: number; failed: number; delivered: number; opened: number; bounced: number }[];
  log: LogRow[];
  resets: ResetRow[];
  settings: Settings;
  due: { winback: string[]; nudge: string[] };
  optedOut: number;
  resetWhatsApp: boolean;
  webhook: { url: string; source: 'panel' | 'env' | null; last4: string };
  previews: { welcome: Preview; winback: Preview; nudge: Preview };
};

const KIND: Record<string, string> = { reset: 'Reset code', welcome: 'Welcome', winback: 'Win-back', nudge: 'First-visit nudge', test: 'Test' };
const STATUS: Record<string, { label: string; tone: string }> = {
  sent: { label: 'Sent', tone: 'new' },
  delayed: { label: 'Delayed', tone: 'sleeping' },
  delivered: { label: 'Delivered', tone: 'active' },
  opened: { label: 'Opened', tone: 'active' },
  clicked: { label: 'Clicked', tone: 'active' },
  failed: { label: 'Failed', tone: 'never' },
  bounced: { label: 'Bounced', tone: 'never' },
  complained: { label: 'Spam report', tone: 'never' },
};

function Status({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, tone: 'paused' };
  return <span className={`status status-${s.tone}`}>{s.label}</span>;
}

export function EmailsPage({ api }: { api: AdminApi }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({ kind: '', status: '', q: '' });
  const load = useCallback(() => {
    const qs = new URLSearchParams(Object.entries(filter).filter(([, v]) => v)).toString();
    void api<Data>(`emails${qs ? `?${qs}` : ''}`).then(setData, (e) => setError((e as Error).message));
  }, [api, filter]);
  useEffect(load, [load]);

  if (error) return <ErrorText text={error} />;
  if (!data) return <SkeletonRows count={5} />;
  const sum = (k: 'total' | 'failed' | 'delivered' | 'opened' | 'bounced') => data.kinds.reduce((n, r) => n + r[k], 0);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Emails</h1>
          <p>
            {data.ready ? `Sending from ${data.from} through Resend.` : 'Email is off: set the Resend key in Settings → Email key.'}{' '}
            {!data.webhook.source && 'Delivery and opens show once the Resend webhook is set up (Automatic → Delivery tracking).'}
          </p>
        </div>
      </header>

      <section className="stats">
        <div className="stat">
          <span className="stat-label">
            <Send size={16} /> Today
          </span>
          <strong>
            {num(data.usage.today)} / {num(data.usage.dayLimit)}
          </strong>
          <em>Resend free plan, per day</em>
        </div>
        <div className="stat">
          <span className="stat-label">
            <CalendarDays size={16} /> This month
          </span>
          <strong>
            {num(data.usage.month)} / {num(data.usage.monthLimit)}
          </strong>
          <em>per month</em>
        </div>
        <div className="stat">
          <span className="stat-label">
            <CheckCheck size={16} /> Delivered, 30 days
          </span>
          <strong>
            {num(sum('delivered'))} / {num(sum('total'))}
          </strong>
          <em>{num(sum('opened'))} opened</em>
        </div>
        <div className="stat">
          <span className="stat-label">
            <AlertTriangle size={16} /> Problems, 30 days
          </span>
          <strong>{num(sum('failed') + sum('bounced'))}</strong>
          <em>
            {num(sum('failed'))} failed · {num(sum('bounced'))} bounced or spam
          </em>
        </div>
      </section>

      <Sub id="sent">
        <section className="card">
          <div className="card-head">
            <h2>
              <Mail size={18} /> Sent emails
            </h2>
          </div>
          <div className="actions" style={{ flexWrap: 'wrap' }}>
            <select value={filter.kind} onChange={(e) => setFilter({ ...filter, kind: e.target.value })} aria-label="Type" style={{ width: 'auto' }}>
              <option value="">All types</option>
              {Object.entries(KIND).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })} aria-label="Status" style={{ width: 'auto' }}>
              <option value="">Any status</option>
              {['sent', 'delivered', 'opened', 'failed', 'bounced', 'complained', 'delayed'].map((s) => (
                <option key={s} value={s}>
                  {STATUS[s].label}
                </option>
              ))}
            </select>
            <label className="search-box" style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 180px' }}>
              <Search size={15} />
              <input placeholder="Shop or email" defaultValue={filter.q} onKeyDown={(e) => e.key === 'Enter' && setFilter({ ...filter, q: e.currentTarget.value })} />
            </label>
          </div>
          {data.log.length ? (
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Shop</th>
                    <th>To</th>
                    <th>Type</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.log.map((r) => (
                    <tr key={r.id} title={r.subject}>
                      <td className="muted small">{when(r.created_at)}</td>
                      <td>{r.merchant_id ? <a href={`#/shops/${r.merchant_id}`}>{r.shop ?? `Shop ${r.merchant_id}`}</a> : <span className="muted">–</span>}</td>
                      <td className="small">{r.to_email}</td>
                      <td>{KIND[r.kind] ?? r.kind}</td>
                      <td>
                        <Status status={r.status} />
                        {r.opened_at && r.status !== 'opened' && r.status !== 'clicked' && <span className="muted small"> · opened</span>}
                        {r.error && <div className="small" style={{ color: 'var(--bad)' }}>{r.error}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={Mail} title="No emails yet" text="Reset codes, welcomes and win-backs will show here as they go out." />
          )}
        </section>
      </Sub>

      <Sub id="resets">
        <ResetWaysCard api={api} data={data} onSaved={load} />
        <section className="card">
          <div className="card-head">
            <h2>
              <KeyRound size={18} /> Forgot password requests
            </h2>
          </div>
          {data.resets.length ? (
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Shop</th>
                    <th>By</th>
                    <th>Code sent</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {data.resets.map((r) => (
                    <tr key={r.id}>
                      <td className="muted small">{when(r.created_at)}</td>
                      <td>
                        <a href={`#/shops/${r.merchant_id}`}>{r.shop}</a>
                      </td>
                      <td className="small">{r.channel === 'email' ? `Email · ${r.email ?? ''}` : `WhatsApp · ${r.phone ?? ''}`}</td>
                      <td>
                        {r.channel === 'whatsapp' ? <span className="muted small">Reply on WhatsApp</span> : r.email_status ? <Status status={r.email_status} /> : <span className="muted small">–</span>}
                        {r.email_error && <div className="small" style={{ color: 'var(--bad)' }}>{r.email_error}</div>}
                      </td>
                      <td>
                        {r.result === 'used' ? (
                          <span className="status status-active">Password changed</span>
                        ) : r.result === 'replaced' ? (
                          <span className="status status-paused">Asked again</span>
                        ) : r.expired ? (
                          <span className="status status-never">Not used, expired</span>
                        ) : (
                          <span className="status status-new">Waiting</span>
                        )}
                        {r.attempts > 0 && <span className="muted small"> · {r.attempts} wrong</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={KeyRound} title="No reset requests yet" text="When a shop taps “Forgot password?”, it shows here." />
          )}
        </section>
      </Sub>

      <Sub id="auto">
        <AutoCard api={api} data={data} onSaved={load} />
        <WebhookCard api={api} data={data} onSaved={load} />
        <PreviewCard data={data} />
      </Sub>
    </>
  );
}

/** Which ways "Forgot password" offers: email always (with a Resend key); WhatsApp only when switched on here. */
function ResetWaysCard({ api, data, onSaved }: { api: AdminApi; data: Data; onSaved: () => void }) {
  const { busy, error, run } = useAction();
  const toggle = (on: boolean) =>
    void run(async () => {
      if (on && !(await confirmDialog({ title: 'Turn on reset by WhatsApp?', body: 'Only if the WhatsApp number receives messages: the owner sends RESET and the webhook must answer with the code.', confirm: 'Turn on' }))) return;
      await api('emails/reset-whatsapp', 'PUT', { on });
      toast(on ? 'Shops can now reset by WhatsApp too' : 'Reset is by email only');
      onSaved();
    });
  return (
    <section className="card">
      <div className="card-head">
        <h2>
          <KeyRound size={18} /> How shops can reset
        </h2>
      </div>
      <p className="small" style={{ margin: 0 }}>
        <strong>Email:</strong> {data.ready ? 'on' : 'off (no Resend key)'} · <strong>WhatsApp:</strong> {data.resetWhatsApp ? 'on' : 'off'}
      </p>
      <label className="poster-check">
        <input type="checkbox" checked={data.resetWhatsApp} disabled={busy} onChange={(e) => toggle(e.target.checked)} /> Let shops reset by WhatsApp too (they send RESET to
        our number and get the code back). Off: the login page asks for the account’s email only.
      </label>
      {error && <ErrorText text={error} />}
    </section>
  );
}

function AutoCard({ api, data, onSaved }: { api: AdminApi; data: Data; onSaved: () => void }) {
  const [form, setForm] = useState(data.settings);
  const { busy, error, run } = useAction();
  useEffect(() => setForm(data.settings), [data.settings]);
  const save = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const turningOn = (!data.settings.winback && form.winback) || (!data.settings.nudge && form.nudge);
      if (
        turningOn &&
        !(await confirmDialog({
          title: 'Start automatic emails?',
          body: `Right now ${form.winback ? data.due.winback.length : 0} shops are due a win-back and ${form.nudge ? data.due.nudge.length : 0} a nudge. They go out between 10 AM and 7 PM India time, up to ${form.dailyCap} a day.`,
          confirm: 'Start',
        }))
      )
        return;
      await api('emails/settings', 'PUT', form);
      toast('Saved');
      onSaved();
    });
  };
  const test = () =>
    void run(async () => {
      const r = await api<{ to: string }>('emails/test', 'POST');
      toast(`Test email sent to ${r.to}`);
      onSaved();
    });
  return (
    <form className="card" onSubmit={save}>
      <div className="card-head">
        <h2>
          <Settings2 size={18} /> Automatic emails
        </h2>
        <button type="button" className="btn btn-soft btn-sm" disabled={busy || !data.ready} onClick={test}>
          <Send size={15} /> Send me a test
        </button>
      </div>
      <label className="poster-check">
        <input type="checkbox" checked={form.welcome} onChange={(e) => setForm({ ...form, welcome: e.target.checked })} /> Welcome email right after sign-up
      </label>
      <label className="poster-check">
        <input type="checkbox" checked={form.winback} onChange={(e) => setForm({ ...form, winback: e.target.checked })} /> Win-back: a shop added visits before, then none
        for
        <input
          type="number"
          min="1"
          max="365"
          value={form.winbackDays}
          onChange={(e) => setForm({ ...form, winbackDays: Number(e.target.value) })}
          style={{ width: '5em', margin: '0 6px' }}
        />
        days (once per quiet spell, at most once in 30 days) · {data.due.winback.length} due now
      </label>
      <label className="poster-check">
        <input type="checkbox" checked={form.nudge} onChange={(e) => setForm({ ...form, nudge: e.target.checked })} /> Nudge: a shop signed up
        <input type="number" min="1" max="365" value={form.nudgeDays} onChange={(e) => setForm({ ...form, nudgeDays: Number(e.target.value) })} style={{ width: '5em', margin: '0 6px' }} />
        days ago and never added a visit (once) · {data.due.nudge.length} due now
      </label>
      <label>
        Win-back and nudge emails per day
        <input type="number" min="0" max="90" value={form.dailyCap} onChange={(e) => setForm({ ...form, dailyCap: Number(e.target.value) })} style={{ maxWidth: '8em' }} />
        <span className="hint">
          Resend’s free plan sends 100 a day in all; this leaves room for reset codes and welcomes. {data.optedOut ? `${data.optedOut} shops unsubscribed or bounced and are skipped.` : ''}
        </span>
      </label>
      {(data.due.winback.length > 0 || data.due.nudge.length > 0) && (
        <p className="muted small" style={{ margin: 0 }}>
          {data.due.winback.length > 0 && `Win-back due: ${data.due.winback.slice(0, 8).join(', ')}${data.due.winback.length > 8 ? '…' : ''}. `}
          {data.due.nudge.length > 0 && `Nudge due: ${data.due.nudge.slice(0, 8).join(', ')}${data.due.nudge.length > 8 ? '…' : ''}.`}
        </p>
      )}
      <div className="plans-form-save">
        <button className="btn btn-primary" disabled={busy}>
          Save
        </button>
      </div>
      {error && <ErrorText text={error} />}
    </form>
  );
}

function WebhookCard({ api, data, onSaved }: { api: AdminApi; data: Data; onSaved: () => void }) {
  const [secret, setSecret] = useState('');
  const { busy, error, run } = useAction();
  const save = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await api('emails/webhook-secret', 'PUT', { secret });
      setSecret('');
      toast('Saved: deliveries and opens will now show');
      onSaved();
    });
  };
  const remove = () =>
    void run(async () => {
      if (!(await confirmDialog({ title: 'Remove the webhook secret?', body: 'Emails keep sending; delivery and opens stop updating.', confirm: 'Remove' }))) return;
      await api('emails/webhook-secret', 'DELETE');
      onSaved();
    });
  return (
    <form className="card" onSubmit={save}>
      <div className="card-head">
        <h2>
          <MailOpen size={18} /> Delivery tracking
        </h2>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        {data.webhook.source
          ? `On (secret …${data.webhook.last4}${data.webhook.source === 'env' ? ', from RESEND_WEBHOOK_SECRET on the server' : ''}).`
          : 'Off: emails show only “Sent” (Resend took them).'}{' '}
        In Resend → Webhooks → Add webhook, paste this URL, tick all email events, save, then paste the signing secret (whsec_…) here.
      </p>
      <div className="actions">
        <code className="small" style={{ wordBreak: 'break-all' }}>
          {data.webhook.url}
        </code>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => void navigator.clipboard?.writeText(data.webhook.url).then(() => toast('Copied'), () => {})}
        >
          <Copy size={14} /> Copy
        </button>
      </div>
      <div className="plans-form">
        <label>
          Signing secret
          <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="whsec_…" autoComplete="off" required />
        </label>
        <div className="plans-form-save">
          <button className="btn btn-primary" disabled={busy || !secret}>
            Save
          </button>
          {data.webhook.source === 'panel' && (
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={remove}>
              Remove
            </button>
          )}
        </div>
      </div>
      {error && <ErrorText text={error} />}
    </form>
  );
}

function PreviewCard({ data }: { data: Data }) {
  const [which, setWhich] = useState<'welcome' | 'winback' | 'nudge'>('welcome');
  const p = data.previews[which];
  return (
    <section className="card">
      <div className="card-head">
        <h2>
          <Mail size={18} /> What they say
        </h2>
        <div className="seg">
          {(['welcome', 'winback', 'nudge'] as const).map((k) => (
            <button key={k} type="button" className={which === k ? 'active' : ''} onClick={() => setWhich(k)}>
              {KIND[k]}
            </button>
          ))}
        </div>
      </div>
      <p className="small" style={{ margin: 0 }}>
        <strong>Subject:</strong> {p.subject}
      </p>
      <iframe title="Email preview" srcDoc={p.html} sandbox="" style={{ width: '100%', height: 360, border: '1px solid var(--line)', borderRadius: 10, background: '#fff' }} />
      <p className="muted small" style={{ margin: 0 }}>
        Shown for a made-up shop. Automatic emails also carry an unsubscribe link at the bottom.
      </p>
    </section>
  );
}
