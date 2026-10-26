import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { BookOpen, Copy, KeyRound, Printer, Sparkles, Trash2 } from 'lucide-react';
import { when } from '../api';
import { EmptyState, ErrorText, SkeletonRows, confirmDialog, toast, useAction } from '../ui';
import type { AdminApi } from './AdminSeo';

// Admin → Playbooks: type a business we're pitching and Claude Haiku 5.5 writes the one-page Loyalty Playbook the cold
// message promised ("3 simple reward ideas for your kind of business"), plus the reply to send with it. Print it to PDF
// or copy it as text. Every playbook is kept, newest first.

type Playbook = {
  headline: string;
  intro: string;
  ideas: { title: string; how: string; why: string; example: string }[];
  firstWeek: string[];
  message: string;
};
type Saved = { id: number; created_at: string; business: string; businessType: string; city: string; notes: string; playbook: Playbook };
type Data = {
  key: { source: 'panel' | 'env' | null; last4: string };
  model: string;
  cost: { calls: number; usd: number };
  playbooks: Saved[];
};

const asText = (p: Playbook) =>
  [
    p.headline,
    '',
    p.intro,
    '',
    ...p.ideas.flatMap((idea, i) => [`${i + 1}. ${idea.title}`, idea.how, `Why it works: ${idea.why}`, `Say: “${idea.example}”`, '']),
    'Start this week:',
    ...p.firstWeek.map((s) => `• ${s}`),
  ].join('\n');

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Prints the playbook alone from a hidden frame, so the admin layout around it can't spill blank pages or clip it. */
function printPlaybook(p: Playbook, business: string) {
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
  document.body.append(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(`Loyalty Playbook – ${business}`)}</title><style>
    @page { size: A4; margin: 16mm; }
    body { font: 14px/1.55 system-ui, -apple-system, 'Segoe UI', sans-serif; color: #111; margin: 0; }
    .brand { margin: 0; color: #0f766e; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    h1 { margin: 4px 0 8px; font-size: 24px; }
    h3 { margin: 0 0 4px; font-size: 16px; }
    .intro { margin: 0 0 16px; color: #444; }
    ol { display: grid; gap: 12px; margin: 0 0 16px; padding-left: 20px; }
    li p { margin: 0 0 4px; }
    .why { color: #444; }
    .say { padding: 6px 10px; border-left: 3px solid #0f766e; background: #f0fdfa; font-style: italic; }
    li { break-inside: avoid; }
  </style></head><body>
    <p class="brand">Regularhood · Loyalty Playbook</p>
    <h1>${esc(p.headline)}</h1>
    <p class="intro">${esc(p.intro)}</p>
    <ol>${p.ideas
      .map(
        (i) =>
          `<li><h3>${esc(i.title)}</h3><p>${esc(i.how)}</p><p class="why"><strong>Why it works:</strong> ${esc(i.why)}</p><p class="say">“${esc(i.example)}”</p></li>`,
      )
      .join('')}</ol>
    <h3>Start this week</h3>
    <ul>${p.firstWeek.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
  </body></html>`);
  doc.close();
  const win = frame.contentWindow!;
  win.onafterprint = () => frame.remove();
  setTimeout(() => {
    win.focus();
    win.print();
    setTimeout(() => frame.remove(), 60_000); // in case afterprint never fires
  }, 100);
}

const copy = (text: string, what: string) =>
  navigator.clipboard.writeText(text).then(
    () => toast(`${what} copied`),
    () => toast('Could not copy'),
  );

export function PlaybooksPage({ api }: { api: AdminApi }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(0);
  const load = useCallback(() => void api<Data>('playbooks').then(setData, (e) => setError((e as Error).message)), [api]);
  useEffect(load, [load]);

  if (error) return <ErrorText text={error} />;
  if (!data) return <SkeletonRows count={4} />;

  const open = data.playbooks.find((p) => p.id === openId) ?? data.playbooks[0];
  const remove = async (p: Saved) => {
    if (!(await confirmDialog({ title: `Delete the playbook for ${p.business}?`, confirm: 'Delete' }))) return;
    await api(`playbooks/${p.id}`, 'DELETE');
    load();
  };

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Playbooks</h1>
          <p>
            One-page Loyalty Playbooks for the businesses you pitch, written by Claude Haiku 5.5. {data.cost.calls} written so far, $
            {data.cost.usd.toFixed(4)} in all.
          </p>
        </div>
      </header>
      {data.key.source ? (
        <NewPlaybook
          api={api}
          onDone={(id) => {
            setOpenId(id);
            load();
          }}
        />
      ) : null}
      <KeyCard api={api} info={data.key} onChange={load} />
      {open && (
        <section className="card">
          <div className="card-head">
            <h2>
              <BookOpen size={18} /> {open.business}
            </h2>
            <div className="playbook-actions">
              <button className="btn btn-ghost" onClick={() => copy(asText(open.playbook), 'Playbook')}>
                <Copy size={16} /> Copy text
              </button>
              <button className="btn btn-ghost" onClick={() => copy(open.playbook.message, 'Message')}>
                <Copy size={16} /> Copy message
              </button>
              <button className="btn btn-primary" onClick={() => printPlaybook(open.playbook, open.business)}>
                <Printer size={16} /> Print / PDF
              </button>
            </div>
          </div>
          <PlaybookSheet p={open.playbook} />
          <div className="playbook-message">
            <strong>Message to send with it</strong>
            <p>{open.playbook.message}</p>
          </div>
        </section>
      )}
      <section className="card">
        <div className="card-head">
          <h2>All playbooks</h2>
        </div>
        {data.playbooks.length ? (
          <div className="table-wrap">
            <table className="admin-table">
              <tbody>
                {data.playbooks.map((p) => (
                  <tr key={p.id} className={p.id === open?.id ? 'playbook-row-open' : ''}>
                    <td>
                      <button className="playbook-open" onClick={() => setOpenId(p.id)}>
                        {p.business}
                      </button>
                      <div className="muted small">
                        {p.businessType} · {p.city}
                      </div>
                    </td>
                    <td className="muted small">{when(p.created_at)}</td>
                    <td>
                      <button className="btn btn-ghost" aria-label={`Delete the playbook for ${p.business}`} onClick={() => void remove(p)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={BookOpen} title="No playbooks yet" text="Write one above when a business says yes to your message." />
        )}
      </section>
    </>
  );
}

function NewPlaybook({ api, onDone }: { api: AdminApi; onDone: (id: number) => void }) {
  const [f, setF] = useState({ business: '', businessType: '', city: '', notes: '' });
  const { busy, error, run } = useAction();
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const saved = await api<Saved>('playbooks', 'POST', f);
      toast(`Playbook for ${saved.business} is ready`);
      setF({ business: '', businessType: '', city: '', notes: '' });
      onDone(saved.id);
    });
  };
  return (
    <section className="card">
      <div className="card-head">
        <h2>
          <Sparkles size={18} /> New playbook
        </h2>
      </div>
      <form className="plans-form" onSubmit={submit}>
        <label>
          Business name
          <input value={f.business} onChange={set('business')} placeholder="Beauty On Call" maxLength={100} required />
        </label>
        <label>
          Kind of business
          <input value={f.businessType} onChange={set('businessType')} placeholder="Salon at home: waxing, spa" maxLength={200} required />
        </label>
        <label>
          City
          <input value={f.city} onChange={set('city')} placeholder="Agra" maxLength={60} required />
        </label>
        <label className="playbook-notes">
          Anything else (optional)
          <textarea
            value={f.notes}
            onChange={set('notes')}
            rows={3}
            maxLength={1000}
            placeholder="e.g. Brings services to clients' homes, so repeat bookings matter most"
          />
        </label>
        <div className="plans-form-save">
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Writing… (about 10 seconds)' : 'Write playbook'}
          </button>
        </div>
      </form>
      {error && <ErrorText text={error} />}
    </section>
  );
}

function PlaybookSheet({ p }: { p: Playbook }) {
  return (
    <article className="playbook-sheet">
      <p className="playbook-brand">Regularhood · Loyalty Playbook</p>
      <h1>{p.headline}</h1>
      <p className="playbook-intro">{p.intro}</p>
      <ol className="playbook-ideas">
        {p.ideas.map((idea) => (
          <li key={idea.title}>
            <h3>{idea.title}</h3>
            <p>{idea.how}</p>
            <p className="muted">
              <strong>Why it works:</strong> {idea.why}
            </p>
            <p className="playbook-say">“{idea.example}”</p>
          </li>
        ))}
      </ol>
      <h3>Start this week</h3>
      <ul>
        {p.firstWeek.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </article>
  );
}

function KeyCard({ api, info, onChange }: { api: AdminApi; info: Data['key']; onChange: () => void }) {
  const [key, setKey] = useState('');
  const { busy, error, run } = useAction();
  const save = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await api('playbooks/key', 'PUT', { key });
      setKey('');
      toast('Anthropic key saved');
      onChange();
    });
  };
  const removeKey = () =>
    void run(async () => {
      if (!(await confirmDialog({ title: 'Remove the Anthropic key?', confirm: 'Remove' }))) return;
      await api('playbooks/key', 'DELETE');
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
            : 'No key yet. Paste one from console.anthropic.com to start writing playbooks.'}{' '}
        It’s kept encrypted on the server and never shown again.
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
