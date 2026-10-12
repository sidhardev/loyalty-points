import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, num, type Reward } from '../api';
import { ErrorText, useAction } from '../ui';

export function Rewards() {
  const [list, setList] = useState<Reward[]>([]);
  const [form, setForm] = useState({ name: '', pointsCost: '' });
  const { busy, error, run } = useAction();
  const load = useCallback(() => void api<Reward[]>('rewards').then(setList), []);
  useEffect(load, [load]);

  const add = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await api('rewards', 'POST', { name: form.name, pointsCost: Number(form.pointsCost) });
      setForm({ name: '', pointsCost: '' });
      load();
    });
  };

  const remove = (r: Reward) => {
    if (!confirm(`Remove "${r.name}"?`)) return;
    void run(async () => {
      await api(`rewards/${r.id}`, 'DELETE');
      load();
    });
  };

  return (
    <>
      <header className="page-head">
        <h1>Rewards</h1>
        <p className="muted">What customers can get with their points.</p>
      </header>
      <form className="card inline-form" onSubmit={add}>
        <input placeholder="Reward, e.g. Free coffee" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input
          type="number"
          min="1"
          step="1"
          placeholder="Points needed"
          value={form.pointsCost}
          onChange={(e) => setForm({ ...form, pointsCost: e.target.value })}
          required
        />
        <button className="btn btn-primary" disabled={busy}>
          Add reward
        </button>
        <ErrorText text={error} />
      </form>
      <section className="reward-grid">
        {list.map((r) => (
          <div className="card reward" key={r.id}>
            <span className="reward-icon">🎁</span>
            <strong>{r.name}</strong>
            <span className="points">{num(r.points_cost)} points</span>
            <button className="link danger" onClick={() => remove(r)}>
              Remove
            </button>
          </div>
        ))}
        {!list.length && <p className="muted empty">No rewards yet — add your first one above.</p>}
      </section>
    </>
  );
}
