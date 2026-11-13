import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Activity, CalendarDays, ExternalLink, KeyRound, LogOut, Settings2, Sparkles } from 'lucide-react';
import { num, when } from '../api';
import { EmptyState, ErrorText, SkeletonRows, confirmDialog, toast, useAction } from '../ui';
import type { AdminApi } from './AdminSeo';
import { Sub } from './AdminSub';

// Admin → Phusro: controls Phusro Digital Hub's AI studio (phusro.regularhood.in/studio, server/src/phusro.ts).
// Turn it on or off, set how many AI calls it may make a day, set its login code, sign out every device, and see
// what it has used and cost. Only calls that worked count toward the daily limit.

type Sum = { calls: number; usd: number };
type Data = {
  enabled: boolean;
  dailyLimit: number;
  model: string;
  codeSource: 'panel' | 'env' | null;
  usage: {
    today: Sum;
    month: Sum;
    all: Sum;
    recent: { id: number; ts: string; purpose: string; ok: number; error: string | null; cost_usd: number }[];
  };
};

const PURPOSE: Record<string, string> = {
  phusro_status: 'Status images',
  phusro_broadcast: 'WhatsApp broadcast',
  phusro_instagram: 'Instagram post',
  phusro_reel: 'Reel idea',
  phusro_google: 'Google post',
  phusro_review: 'Review reply',
  phusro_ideas: 'Offer ideas',
};

const usd = (n: number) => `$${n.toFixed(4)}`;

export function PhusroPage({ api }: { api: AdminApi }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => void api<Data>('phusro').then(setData, (e) => setError((e as Error).message)), [api]);
  useEffect(load, [load]);

  if (error) return <ErrorText text={error} />;
  if (!data) return <SkeletonRows count={4} />;
  const u = data.usage;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Phusro</h1>
          <p>
            Phusro Digital Hub’s AI studio, on Claude Haiku 5.5.{' '}
            <a href="https://phusro.regularhood.in/studio" target="_blank" rel="noopener noreferrer">
              Open studio <ExternalLink size={13} />
            </a>{' '}
            ·{' '}
            <a href="https://phusro.regularhood.in/" target="_blank" rel="noopener noreferrer">
              Website <ExternalLink size={13} />
            </a>
          </p>
        </div>
      </header>

      <section className="stats">
        <div className="stat">
          <span className="stat-label">
            <Activity size={16} /> Today
          </span>
          <strong>
            {num(u.today.calls)} / {num(data.dailyLimit)}
          </strong>
          <em>{data.enabled ? `${num(Math.max(0, data.dailyLimit - u.today.calls))} left today` : 'Studio is off'}</em>
        </div>
        <div className="stat">
          <span className="stat-label">
            <CalendarDays size={16} /> This month
          </span>
          <strong>{num(u.month.calls)}</strong>
          <em>{usd(u.month.usd)}</em>
        </div>
        <div className="stat">
          <span className="stat-label">
            <Sparkles size={16} /> All time
          </span>
          <strong>{num(u.all.calls)}</strong>
          <em>{usd(u.all.usd)}</em>
        </div>
      </section>

      <Sub id="settings">
        <SettingsCard api={api} data={data} onChange={setData} />
        <CodeCard api={api} data={data} onChange={setData} />
      </Sub>

      <Sub id="usage">
        <section className="card">
          <div className="card-head">
            <h2>Recent AI calls</h2>
          </div>
          {u.recent.length ? (
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>What</th>
                    <th>Result</th>
                    <th>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {u.recent.map((r) => (
                    <tr key={r.id}>
                      <td className="muted small">{when(r.ts)}</td>
                      <td>{PURPOSE[r.purpose] ?? r.purpose}</td>
                      <td style={r.ok ? undefined : { color: 'var(--bad)' }}>{r.ok ? 'OK' : (r.error ?? 'Failed')}</td>
                      <td className="muted small">{usd(r.cost_usd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={Sparkles} title="No AI calls yet" text="Calls from the Phusro studio will show here." />
          )}
        </section>
      </Sub>
    </>
  );
}

function SettingsCard({ api, data, onChange }: { api: AdminApi; data: Data; onChange: (d: Data) => void }) {
  const [form, setForm] = useState({ enabled: data.enabled, dailyLimit: data.dailyLimit });
  const { busy, error, run } = useAction();
  const save = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      onChange(await api<Data>('phusro/settings', 'PUT', form));
      toast('Saved');
    });
  };
  return (
    <form className="card" onSubmit={save}>
      <div className="card-head">
        <h2>
          <Settings2 size={18} /> Studio
        </h2>
      </div>
      <label className="poster-check">
        <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} /> Studio is on (off = nobody can log in or
        use the AI)
      </label>
      <label>
        AI calls per day
        <input type="number" min="0" max="500" value={form.dailyLimit} onChange={(e) => setForm({ ...form, dailyLimit: Number(e.target.value) })} />
        <span className="hint">One call = one batch of status images or one set of marketing text. Resets at midnight UTC (5:30 AM India).</span>
      </label>
      <div className="plans-form-save">
        <button className="btn btn-primary" disabled={busy}>
          Save
        </button>
      </div>
      {error && <ErrorText text={error} />}
    </form>
  );
}

function CodeCard({ api, data, onChange }: { api: AdminApi; data: Data; onChange: (d: Data) => void }) {
  const [code, setCode] = useState('');
  const { busy, error, run } = useAction();
  const save = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      onChange(await api<Data>('phusro/code', 'PUT', { code }));
      void navigator.clipboard?.writeText(code).catch(() => {});
      setCode('');
      toast('New code saved and copied. Everyone using the old code is signed out.');
    });
  };
  const signOut = () =>
    void run(async () => {
      if (!(await confirmDialog({ title: 'Sign out every device from the Phusro studio?', confirm: 'Sign out' }))) return;
      onChange(await api<Data>('phusro/sign-out', 'POST'));
      toast('Everyone is signed out');
    });
  const generate = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(5));
    setCode(`phusro-${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')}`);
  };
  return (
    <form className="card" onSubmit={save}>
      <div className="card-head">
        <h2>
          <KeyRound size={18} /> Login code
        </h2>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        {data.codeSource === 'panel'
          ? 'Using the code set here.'
          : data.codeSource === 'env'
            ? 'Using PHUSRO_CODE from the server. A code set here takes its place.'
            : 'No code yet: nobody can log in.'}{' '}
        It’s kept encrypted and never shown again, so copy it before you leave.
      </p>
      <label>
        New code
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6 to 40 letters, numbers, - or _" autoComplete="off" spellCheck={false} required />
      </label>
      <div className="plans-form-save">
        <button type="button" className="btn btn-ghost" onClick={generate}>
          Make one for me
        </button>
        <button className="btn btn-primary" disabled={busy || !code}>
          Save code
        </button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={signOut}>
          <LogOut size={16} /> Sign out all devices
        </button>
      </div>
      {error && <ErrorText text={error} />}
    </form>
  );
}
