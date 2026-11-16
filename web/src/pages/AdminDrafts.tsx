import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Copy, KeyRound, MessageCircle, RefreshCw, Sparkles, Trash2, WandSparkles } from 'lucide-react';
import { whatsapp } from '../api';
import { EmptyState, ErrorText, Sheet, SkeletonRows, confirmDialog, toast, useAction } from '../ui';
import type { AdminApi } from './AdminSeo';
import { Sub } from './AdminSub';

// Admin → Shops → "Draft message" (a sheet), and Admin → Settings (the Anthropic key, what Claude has cost, and the
// message types). Claude Haiku 5.5 writes the draft on the server from the shop's numbers and notes; the admin edits it
// and sends it from WhatsApp themselves.

type Template = { id: string; title: string; instruction: string; builtIn: boolean };
type Templates = { templates: Template[]; langs: string[]; model: string };
const LANG_LABELS: Record<string, string> = { hinglish: 'Hinglish', hindi: 'हिंदी', english: 'English' };
const LANG_KEY = 'lp_admin_draft_lang';

function savedLang() {
  try {
    return localStorage.getItem(LANG_KEY) || 'hinglish';
  } catch {
    return 'hinglish';
  }
}

export function DraftSheet({
  api,
  shop,
  onClose,
  onSent,
}: {
  api: AdminApi;
  shop: { id: number; name: string; phone: string | null };
  onClose: () => void;
  onSent: () => void;
}) {
  const [data, setData] = useState<Templates | null>(null);
  const [templateId, setTemplateId] = useState('');
  const [instruction, setInstruction] = useState('');
  const [lang, setLang] = useState(savedLang);
  const [message, setMessage] = useState('');
  const { busy, error, setError, run } = useAction();
  useEffect(() => void api<Templates>('drafts/templates').then(setData, (e) => setError((e as Error).message)), [api, setError]);

  const pickLang = (l: string) => {
    setLang(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      // Remembered for this visit only.
    }
  };

  const write = (e?: FormEvent) => {
    e?.preventDefault();
    void run(async () => {
      const r = await api<{ message: string }>(`drafts/shops/${shop.id}`, 'POST', { templateId: templateId || undefined, instruction, lang });
      setMessage(r.message);
    });
  };

  const copy = () => void navigator.clipboard.writeText(message).then(() => toast('Copied'));
  const send = () => {
    void api(`shops/${shop.id}/contacted`, 'POST', { channel: 'whatsapp', note: 'AI-drafted message' }).then(onSent, () => {});
    window.open(whatsapp(shop.phone!, message), '_blank', 'noopener');
  };

  return (
    <Sheet title={`Message for ${shop.name}`} onClose={onClose} wide>
      {!data ? (
        error ? <ErrorText text={error} /> : <SkeletonRows count={3} />
      ) : (
        <form className="draft-form" onSubmit={write}>
          <div>
            <p className="muted small" style={{ margin: '0 0 8px' }}>
              What kind of message?
            </p>
            <div className="draft-chips">
              {data.templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`chip${templateId === t.id ? ' active' : ''}`}
                  title={t.instruction}
                  onClick={() => setTemplateId(templateId === t.id ? '' : t.id)}
                >
                  {t.title}
                </button>
              ))}
            </div>
          </div>
          <label>
            {templateId ? 'Anything to add? (optional)' : 'Or tell Claude what to write'}
            <textarea
              rows={3}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g. Unko bolo Diwali offer ke liye reward badha sakte hain, aur poocho kal 5 min call ho sakti hai?"
            />
          </label>
          <div className="draft-row">
            <div className="seg">
              {data.langs.map((l) => (
                <button key={l} type="button" className={lang === l ? 'active' : ''} onClick={() => pickLang(l)}>
                  {LANG_LABELS[l] ?? l}
                </button>
              ))}
            </div>
            <button className="btn btn-primary" disabled={busy || (!templateId && !instruction.trim())}>
              {message ? <RefreshCw size={16} /> : <Sparkles size={16} />} {busy ? 'Writing…' : message ? 'Write again' : 'Write message'}
            </button>
          </div>
          <ErrorText text={error} />
          {message && (
            <>
              <label>
                Draft (edit before sending)
                <textarea rows={7} value={message} onChange={(e) => setMessage(e.target.value)} />
              </label>
              <div className="follow-actions">
                {shop.phone && (
                  <button type="button" className="btn btn-whatsapp" onClick={send} disabled={!message.trim()}>
                    <MessageCircle size={16} /> Open in WhatsApp
                  </button>
                )}
                <button type="button" className="btn btn-soft" onClick={copy}>
                  <Copy size={16} /> Copy
                </button>
              </div>
            </>
          )}
          <p className="muted small" style={{ margin: 0 }}>
            Written by {data.model === 'claude-haiku-5-5' ? 'Claude Haiku 5.5' : data.model} from this shop’s numbers and your notes. Nothing is sent until you
            send it. <a href="#/settings/templates">Manage message types</a>
          </p>
        </form>
      )}
    </Sheet>
  );
}

// ---------------------------------------------------------------- Settings page

type SettingsData = {
  key: { source: 'panel' | 'env' | null; last4: string };
  usage: { purpose: string; label: string; calls: number; usd: number; usd30: number }[];
};

export function SettingsPage({ api }: { api: AdminApi }) {
  const [data, setData] = useState<SettingsData | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => void api<SettingsData>('settings').then(setData, (e) => setError((e as Error).message)), [api]);
  useEffect(load, [load]);

  if (error) return <ErrorText text={error} />;
  if (!data) return <SkeletonRows count={4} />;
  return (
    <>
      <header className="page-head">
        <div>
          <h1>Settings</h1>
          <p>The Claude API key and the message types for shop drafts.</p>
        </div>
      </header>
      <Sub id="ai">
        <KeyCard api={api} info={data.key} onChange={load} />
        <section className="card">
          <div className="card-head">
            <h2>
              <Sparkles size={18} /> What Claude has cost
            </h2>
          </div>
          {data.usage.length ? (
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Used for</th>
                    <th className="num">Calls</th>
                    <th className="num">Last 30 days</th>
                    <th className="num">All time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.usage.map((u) => (
                    <tr key={u.purpose}>
                      <td>{u.label}</td>
                      <td className="num">{u.calls}</td>
                      <td className="num">${u.usd30.toFixed(4)}</td>
                      <td className="num">${u.usd.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted small">No Claude calls yet.</p>
          )}
        </section>
      </Sub>
      <Sub id="templates">
        <TemplatesCard api={api} />
      </Sub>
    </>
  );
}

function KeyCard({ api, info, onChange }: { api: AdminApi; info: SettingsData['key']; onChange: () => void }) {
  const [key, setKey] = useState('');
  const { busy, error, run } = useAction();
  const save = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await api('settings/key', 'PUT', { key });
      setKey('');
      toast('Anthropic key saved');
      onChange();
    });
  };
  const removeKey = () =>
    void run(async () => {
      if (!(await confirmDialog({ title: 'Remove the Anthropic key?', body: 'Message drafts, playbooks and Phusro stop working until a key is set again.', confirm: 'Remove' }))) return;
      await api('settings/key', 'DELETE');
      onChange();
    });
  return (
    <section className="card">
      <div className="card-head">
        <h2>
          <KeyRound size={18} /> Anthropic API key
        </h2>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        {info.source === 'panel'
          ? `Using the key set here (…${info.last4}).`
          : info.source === 'env'
            ? `Using ANTHROPIC_API_KEY from the server (…${info.last4}). A key set here takes its place.`
            : 'No key yet. Paste one from console.anthropic.com.'}{' '}
        Shop message drafts, Playbooks and Phusro all use it. It’s checked with Anthropic, kept encrypted on the server and never shown again.
      </p>
      <form className="plans-form" onSubmit={save}>
        <label>
          New key
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-ant-…" autoComplete="off" required />
        </label>
        <div className="plans-form-save">
          <button className="btn btn-primary" disabled={busy || !key}>
            Check and save
          </button>
          {info.source === 'panel' && (
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={removeKey}>
              Remove
            </button>
          )}
        </div>
      </form>
      {error && <ErrorText text={error} />}
    </section>
  );
}

function TemplatesCard({ api }: { api: AdminApi }) {
  const [data, setData] = useState<Templates | null>(null);
  const [form, setForm] = useState({ title: '', instruction: '' });
  const { busy, error, run } = useAction();
  const load = useCallback(() => void api<Templates>('drafts/templates').then(setData), [api]);
  useEffect(load, [load]);

  const add = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await api('drafts/templates', 'POST', form);
      setForm({ title: '', instruction: '' });
      toast('Message type added');
      load();
    });
  };
  const remove = async (t: Template) => {
    if (!(await confirmDialog({ title: `Delete “${t.title}”?`, confirm: 'Delete' }))) return;
    await api(`drafts/templates/${t.id}`, 'DELETE').then(load, (e) => toast((e as Error).message, 'error'));
  };

  return (
    <>
      <section className="card">
        <div className="card-head">
          <h2>
            <WandSparkles size={18} /> New message type
          </h2>
        </div>
        <p className="muted small" style={{ margin: 0 }}>
          Tell Claude what this kind of message should do, in any language. It shows up as a choice in every shop’s “Draft message”.
        </p>
        <form className="plans-form" onSubmit={add}>
          <label>
            Name
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Diwali greeting" maxLength={80} required />
          </label>
          <label>
            What the message should say
            <textarea
              rows={3}
              value={form.instruction}
              onChange={(e) => setForm({ ...form, instruction: e.target.value })}
              placeholder="Diwali ki wishes do, aur suggest karo ki is hafte customers ko double stamp de sakte hain"
              maxLength={1000}
              required
            />
          </label>
          <div className="plans-form-save">
            <button className="btn btn-primary" disabled={busy}>
              Add
            </button>
          </div>
        </form>
        {error && <ErrorText text={error} />}
      </section>
      <section className="card">
        <div className="card-head">
          <h2>Message types</h2>
        </div>
        {!data ? (
          <SkeletonRows count={4} />
        ) : data.templates.length ? (
          <ul className="draft-templates">
            {data.templates.map((t) => (
              <li key={t.id}>
                <div>
                  <strong>{t.title}</strong> {t.builtIn && <span className="source-chip">Built in</span>}
                  <p className="muted small">{t.instruction}</p>
                </div>
                {!t.builtIn && (
                  <button className="icon-btn" onClick={() => void remove(t)} aria-label={`Delete ${t.title}`}>
                    <Trash2 size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={WandSparkles} title="No message types" text="Add one above." />
        )}
      </section>
    </>
  );
}
