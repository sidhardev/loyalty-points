import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Check, CheckCheck, Copy, MessageCircle, RefreshCw, Send, ShieldCheck, Trash2 } from 'lucide-react';
import { when } from '../api';
import { ErrorText, confirmDialog, toast, useAction } from '../ui';
import type { AdminApi } from './AdminSeo';

// WhatsApp Cloud API for Admin → Leads (server/src/whatsapp.ts): the setup card (number, token, webhook, template,
// limits and prices) and the chat with one lead. A lead that hasn't written to us can only get the approved template;
// once they reply, free messages are allowed for 24 hours (and the AI pitch goes out by itself if that's switched on).

export type WaSettings = {
  phoneNumberId: string;
  wabaId: string;
  graphVersion: string;
  templateName: string;
  templateLang: string;
  templateParams: number;
  templateBody: string;
  autoPitch: boolean;
  dailyLimit: number;
  marketingPriceUsd: number;
  utilityPriceUsd: number;
  monthlyBudgetUsd: number;
  verifyToken: string;
};
type SecretInfo = { source: 'panel' | 'env' | null; last4: string };
type Suggested = { name: string; body: string; yes: string; no: string };
export type WaOverview = {
  settings: WaSettings;
  secrets: { token: SecretInfo; appSecret: SecretInfo };
  ready: boolean;
  webhookUrl: string;
  sentToday: number;
  month: { usd: number; templates: number; read: number; replied: number };
  suggested: { hi: Suggested; en: Suggested };
};
type Template = { name: string; language: string; status: string; category: string; body: string; params: number };
type PhoneInfo = { display_phone_number?: string; verified_name?: string; quality_rating?: string; messaging_limit_tier?: string; name_status?: string };
export type WaMessage = { id: number; direction: 'out' | 'in'; kind: string; body: string; status: string; error: string | null; category: string | null; cost_usd: number; created_at: string };

const copy = (text: string, what: string) =>
  navigator.clipboard.writeText(text).then(
    () => toast(`${what} copied`),
    () => toast('Could not copy', 'error'),
  );

export function useWhatsApp(api: AdminApi) {
  const [wa, setWa] = useState<WaOverview | null>(null);
  const load = useCallback(() => void api<WaOverview>('whatsapp').then(setWa, () => setWa(null)), [api]);
  useEffect(load, [load]);
  return { wa, reload: load };
}

export function WhatsAppCard({ api, wa, inr, onChanged }: { api: AdminApi; wa: WaOverview; inr: (usd: number) => string; onChanged: () => void }) {
  const [form, setForm] = useState(wa.settings);
  const [token, setToken] = useState('');
  const [secret, setSecret] = useState('');
  const [phone, setPhone] = useState<PhoneInfo | null>(null);
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [newLang, setNewLang] = useState<'hi' | 'en'>('hi');
  const [newBody, setNewBody] = useState(wa.suggested.hi.body);
  const { busy, error, setError, run } = useAction();
  useEffect(() => setForm(wa.settings), [wa.settings]);
  const s = wa.settings;
  const set = <K extends keyof WaSettings>(key: K, value: WaSettings[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = (body: Partial<WaSettings>, done = 'Saved') =>
    void run(async () => {
      await api('whatsapp/settings', 'PUT', body);
      toast(done);
      onChanged();
    });
  const saveToken = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await api('whatsapp/token', 'PUT', { token });
      setToken('');
      toast('Token checked and saved');
      onChanged();
    });
  };
  const saveSecret = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await api('whatsapp/app-secret', 'PUT', { secret });
      setSecret('');
      toast('App secret saved');
      onChanged();
    });
  };
  const removeToken = async () => {
    if (!(await confirmDialog({ title: 'Remove the WhatsApp token?', body: 'Messages stop until you add one again.', confirm: 'Remove', danger: true }))) return;
    void run(async () => {
      await api('whatsapp/token', 'DELETE');
      onChanged();
    });
  };
  const checkPhone = () => void run(async () => setPhone(await api<PhoneInfo>('whatsapp/phone')));
  const loadTemplates = () => void run(async () => setTemplates(await api<Template[]>('whatsapp/templates')));
  const pick = (t: Template) => save({ templateName: t.name, templateLang: t.language, templateParams: t.params, templateBody: t.body }, `Using “${t.name}”`);
  const create = () =>
    void run(async () => {
      await api('whatsapp/templates', 'POST', { lang: newLang, body: newBody });
      toast('Sent to Meta for review. Load templates in a while and pick it once it’s approved.');
      setTemplates(await api<Template[]>('whatsapp/templates'));
    });

  const secretLine = (info: SecretInfo, env: string) =>
    info.source === 'panel' ? `set here, ending …${info.last4}` : info.source === 'env' ? `from ${env} in the server’s .env, ending …${info.last4}` : 'not set';

  return (
    <section className="card">
      <div className="card-head">
        <h2>
          <MessageCircle size={18} /> WhatsApp API
        </h2>
        <span className={`badge ${wa.ready ? 'badge-plus' : 'badge-neutral'}`}>{wa.ready ? 'Ready to send' : 'Not set up'}</span>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        Today {wa.sentToday} of {s.dailyLimit} intro messages · this month {wa.month.templates} sent, {wa.month.read} read, {wa.month.replied} replied ·{' '}
        {inr(wa.month.usd)} of ${s.monthlyBudgetUsd} budget
      </p>

      <h3 className="wa-step">1. Number</h3>
      <div className="form-row wa-3">
        <label>
          Phone number ID
          <input value={form.phoneNumberId} onChange={(e) => set('phoneNumberId', e.target.value)} placeholder="from WhatsApp → API setup" />
        </label>
        <label>
          WhatsApp Business Account ID
          <input value={form.wabaId} onChange={(e) => set('wabaId', e.target.value)} placeholder="same page" />
        </label>
        <label>
          API version
          <input value={form.graphVersion} onChange={(e) => set('graphVersion', e.target.value)} />
        </label>
      </div>
      <div className="actions">
        <button className="btn btn-soft btn-sm" disabled={busy} onClick={() => save({ phoneNumberId: form.phoneNumberId, wabaId: form.wabaId, graphVersion: form.graphVersion })}>
          Save IDs
        </button>
        <button className="btn btn-soft btn-sm" disabled={busy || !s.phoneNumberId || !wa.secrets.token.source} onClick={checkPhone}>
          <ShieldCheck size={15} /> Check number
        </button>
      </div>
      {phone && (
        <p className="small wa-phone">
          <strong>{phone.verified_name}</strong> {phone.display_phone_number} · quality <strong>{phone.quality_rating ?? '–'}</strong> · limit {phone.messaging_limit_tier ?? '–'}
          {phone.name_status && phone.name_status !== 'APPROVED' ? ` · name ${phone.name_status}` : ''}
        </p>
      )}

      <h3 className="wa-step">2. Access token</h3>
      <p className="small" style={{ margin: 0 }}>
        Token: {secretLine(wa.secrets.token, 'WHATSAPP_TOKEN')}
        {wa.secrets.token.source === 'panel' && (
          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void removeToken()}>
            <Trash2 size={14} /> Remove
          </button>
        )}
      </p>
      <form className="key-row" onSubmit={saveToken}>
        <input type="password" autoComplete="off" spellCheck={false} value={token} onChange={(e) => (setToken(e.target.value), setError(''))} placeholder="Permanent token of a system user" aria-label="WhatsApp access token" />
        <button className="btn btn-primary" disabled={busy || !token.trim() || !s.phoneNumberId}>
          {busy ? 'Checking…' : 'Save token'}
        </button>
      </form>
      <p className="muted small" style={{ margin: 0 }}>
        Use a permanent token (Business settings → System users → Generate token, with whatsapp_business_messaging and whatsapp_business_management). The
        24-hour test token stops working tomorrow. It’s checked with Meta before saving, stored encrypted, and never shown again.
      </p>

      <h3 className="wa-step">3. Webhook (deliveries and replies)</h3>
      <div className="wa-copy">
        <span>Callback URL</span>
        <code>{wa.webhookUrl}</code>
        <button className="btn btn-ghost btn-sm" onClick={() => void copy(wa.webhookUrl, 'URL')} aria-label="Copy callback URL">
          <Copy size={14} />
        </button>
      </div>
      <div className="wa-copy">
        <span>Verify token</span>
        <code>{s.verifyToken}</code>
        <button className="btn btn-ghost btn-sm" onClick={() => void copy(s.verifyToken, 'Verify token')} aria-label="Copy verify token">
          <Copy size={14} />
        </button>
      </div>
      <p className="small" style={{ margin: 0 }}>
        App secret: {secretLine(wa.secrets.appSecret, 'WHATSAPP_APP_SECRET')}. Replies are ignored until it’s set: it proves a message really came from Meta.
      </p>
      <form className="key-row" onSubmit={saveSecret}>
        <input type="password" autoComplete="off" spellCheck={false} value={secret} onChange={(e) => (setSecret(e.target.value), setError(''))} placeholder="App secret (app → Settings → Basic)" aria-label="App secret" />
        <button className="btn btn-primary" disabled={busy || !secret.trim()}>
          Save secret
        </button>
      </form>
      <p className="muted small" style={{ margin: 0 }}>
        In the Meta app: WhatsApp → Configuration → Webhook → paste both, then subscribe to <strong>messages</strong>.
      </p>

      <h3 className="wa-step">4. Intro template</h3>
      <p className="small" style={{ margin: 0 }}>
        {s.templateName ? (
          <>
            Using <strong>{s.templateName}</strong> ({s.templateLang}). {'{{1}}'} = shop name{s.templateParams > 1 ? ', {{2}} = kind of shop' : ''}
            {s.templateParams > 2 ? ', {{3}} = area' : ''}.
          </>
        ) : (
          'No template chosen yet.'
        )}
      </p>
      <div className="actions">
        <button className="btn btn-soft btn-sm" disabled={busy || !s.wabaId || !wa.secrets.token.source} onClick={loadTemplates}>
          <RefreshCw size={15} /> Load templates
        </button>
      </div>
      {templates && (
        <div className="wa-templates">
          {templates.length ? (
            templates.map((t) => (
              <div key={`${t.name}-${t.language}`} className={`wa-template${t.name === s.templateName && t.language === s.templateLang ? ' active' : ''}`}>
                <div>
                  <strong>{t.name}</strong>{' '}
                  <span className={`badge ${t.status === 'APPROVED' ? 'badge-plus' : 'badge-neutral'}`}>{t.status}</span>{' '}
                  <span className="muted small">
                    {t.language} · {t.category}
                  </span>
                  <p className="small" lang={t.language}>
                    {t.body}
                  </p>
                </div>
                <button className="btn btn-sm btn-soft" disabled={busy || t.status !== 'APPROVED' || t.params > 3} onClick={() => pick(t)}>
                  Use
                </button>
              </div>
            ))
          ) : (
            <p className="muted small">No templates yet. Create one below.</p>
          )}
        </div>
      )}
      <details className="wa-create">
        <summary>Create the intro template</summary>
        <div className="seg">
          {(['hi', 'en'] as const).map((l) => (
            <button key={l} className={newLang === l ? 'active' : ''} onClick={() => (setNewLang(l), setNewBody(wa.suggested[l].body))}>
              {l === 'hi' ? 'हिंदी' : 'Hinglish'}
            </button>
          ))}
        </div>
        <textarea rows={6} value={newBody} onChange={(e) => setNewBody(e.target.value)} lang={newLang} aria-label="Template text" />
        <p className="muted small" style={{ margin: 0 }}>
          {'{{1}}'} is the shop’s name and {'{{2}}'} its kind. Buttons: “{wa.suggested[newLang].yes}” and “{wa.suggested[newLang].no}”. Meta reviews it as a
          marketing template, usually within minutes to a day.
        </p>
        <div className="actions">
          <button className="btn btn-primary btn-sm" disabled={busy || !s.wabaId || !wa.secrets.token.source || !newBody.trim()} onClick={create}>
            <Send size={15} /> Send to Meta for review
          </button>
        </div>
      </details>

      <h3 className="wa-step">5. Limits and prices</h3>
      <label className="poster-check">
        <input type="checkbox" checked={form.autoPitch} onChange={(e) => set('autoPitch', e.target.checked)} /> When an owner taps yes or replies, send them the AI
        pitch with the sign-up link straight away
      </label>
      <div className="form-row wa-4">
        <label>
          Intro messages / day
          <input type="number" min="0" value={form.dailyLimit} onChange={(e) => set('dailyLimit', Number(e.target.value))} />
        </label>
        <label>
          $ per marketing msg
          <input type="number" min="0" step="0.0001" value={form.marketingPriceUsd} onChange={(e) => set('marketingPriceUsd', Number(e.target.value))} />
        </label>
        <label>
          $ per utility msg
          <input type="number" min="0" step="0.0001" value={form.utilityPriceUsd} onChange={(e) => set('utilityPriceUsd', Number(e.target.value))} />
        </label>
        <label>
          Budget / month ($)
          <input type="number" min="0" step="0.5" value={form.monthlyBudgetUsd} onChange={(e) => set('monthlyBudgetUsd', Number(e.target.value))} />
        </label>
      </div>
      <ErrorText text={error} />
      <div className="actions">
        <button
          className="btn btn-soft btn-sm"
          disabled={busy}
          onClick={() =>
            save({
              autoPitch: form.autoPitch,
              dailyLimit: form.dailyLimit,
              marketingPriceUsd: form.marketingPriceUsd,
              utilityPriceUsd: form.utilityPriceUsd,
              monthlyBudgetUsd: form.monthlyBudgetUsd,
            })
          }
        >
          Save limits
        </button>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        Meta charges per delivered template; replies inside the 24 hours are free. Check Meta’s current rate card for India and set the price here. A new
        number can message 250 people a day and starts at high quality: keep the daily number low at first, since blocks and reports from shops that didn’t
        expect a message lower the quality rating and can get the number limited.
      </p>
    </section>
  );
}

const TICKS: Record<string, ReactNode> = {
  sent: <Check size={13} />,
  delivered: <CheckCheck size={13} />,
  read: <CheckCheck size={13} className="wa-read" />,
};

/** One message: theirs on the left, ours on the right with WhatsApp's ticks and what it cost. */
export function WaBubble({ m }: { m: WaMessage }) {
  return (
    <div className={`wa-msg ${m.direction}${m.status === 'failed' ? ' failed' : ''}`}>
      <p>{m.body}</p>
      <span>
        {m.kind === 'template' ? 'intro · ' : ''}
        {when(m.created_at)}
        {m.direction === 'out' && (m.status === 'failed' ? ` · failed: ${m.error ?? ''}` : <> {TICKS[m.status]}</>)}
        {m.cost_usd ? ` · $${m.cost_usd.toFixed(4)}` : ''}
      </span>
    </div>
  );
}

/** The WhatsApp chat with one lead, inside the lead's sheet. */
export function WaThread({
  api,
  wa,
  leadId,
  mobile,
  optedOut,
  lastInbound,
  hasPitch,
  onChanged,
}: {
  api: AdminApi;
  wa: WaOverview;
  leadId: number;
  mobile: boolean;
  optedOut: boolean;
  lastInbound: string | null;
  hasPitch: boolean;
  onChanged: () => void;
}) {
  const [messages, setMessages] = useState<WaMessage[] | null>(null);
  const [text, setText] = useState('');
  const { busy, error, run } = useAction();
  const load = useCallback(() => void api<WaMessage[]>(`whatsapp/leads/${leadId}`).then(setMessages, () => setMessages([])), [api, leadId]);
  useEffect(load, [load]);
  const lastIn = [...(messages ?? [])].reverse().find((m) => m.direction === 'in')?.created_at ?? lastInbound;
  const windowEnds = lastIn ? Date.parse(`${lastIn.replace(' ', 'T')}Z`) + 24 * 3_600_000 : 0;
  const open = windowEnds > Date.now();
  const sentIntro = (messages ?? []).some((m) => m.direction === 'out' && m.kind === 'template' && m.status !== 'failed');
  const act = (path: string, body?: object, done = 'Sent') =>
    void run(async () => {
      setMessages(await api<WaMessage[]>(`whatsapp/leads/${leadId}/${path}`, 'POST', body));
      toast(done);
      onChanged();
    });

  return (
    <div className="lead-block">
      <div className="card-head">
        <h3>WhatsApp chat</h3>
        <button className="btn btn-ghost btn-sm" onClick={load} aria-label="Refresh chat">
          <RefreshCw size={14} />
        </button>
      </div>
      {optedOut && <p className="alert alert-error small">They asked not to be messaged. Nothing more is sent to this number.</p>}
      {messages?.length ? (
        <div className="wa-thread">
          {messages.map((m) => (
            <WaBubble key={m.id} m={m} />
          ))}
        </div>
      ) : (
        <p className="muted small" style={{ margin: 0 }}>
          {messages ? 'No messages yet.' : 'Loading…'}
        </p>
      )}
      {!optedOut && mobile && wa.ready && (
        <>
          <p className="muted small" style={{ margin: 0 }}>
            {open
              ? `They replied: free messages allowed until ${new Date(windowEnds).toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' })}.`
              : sentIntro
                ? 'Waiting for a reply. Until they answer, only the template can be sent.'
                : 'They haven’t been messaged yet. The first message has to be the approved template.'}
          </p>
          <div className="actions">
            {!open && (
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => act('template', undefined, 'Intro sent')}>
                <Send size={15} /> {sentIntro ? 'Send the intro again' : 'Send intro template'}
              </button>
            )}
            {open && (
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => act('pitch', undefined, 'Pitch sent')}>
                <Send size={15} /> {hasPitch ? 'Send the pitch' : 'Write and send the pitch'}
              </button>
            )}
          </div>
          {open && (
            <form
              className="key-row"
              onSubmit={(e) => {
                e.preventDefault();
                act('text', { text });
                setText('');
              }}
            >
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a reply" aria-label="Reply" />
              <button className="btn btn-primary" disabled={busy || !text.trim()}>
                <Send size={16} />
              </button>
            </form>
          )}
        </>
      )}
      {!wa.ready && <p className="muted small">Set up the WhatsApp API on the Leads page to send from here.</p>}
      <ErrorText text={error} />
    </div>
  );
}
