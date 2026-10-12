import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Gift, Pencil, Plus, Trash2 } from 'lucide-react';
import { api, num, type Reward } from '../api';
import { EmptyState, ErrorText, Sheet, Skeleton, confirmDialog, toast, useAction, useDataVersion } from '../ui';

type RewardRow = Reward & { redeemed: number };

const IDEAS = [
  { name: 'Free coffee', pointsCost: 100 },
  { name: '10% off your bill', pointsCost: 250 },
  { name: 'Free dessert', pointsCost: 300 },
];

function RewardSheet({ reward, onClose, onSaved }: { reward?: RewardRow; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: reward?.name ?? '', pointsCost: reward ? String(reward.points_cost) : '' });
  const { busy, error, run } = useAction();
  const save = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const body = { name: form.name, pointsCost: Number(form.pointsCost) };
      if (reward) await api(`rewards/${reward.id}`, 'PATCH', body);
      else await api('rewards', 'POST', body);
      toast(reward ? 'Reward updated' : `${form.name} added`);
      onSaved();
      onClose();
    });
  };
  return (
    <Sheet title={reward ? 'Edit reward' : 'New reward'} onClose={onClose}>
      <form onSubmit={save} style={{ display: 'grid', gap: 14 }}>
        <label>
          Reward
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Free coffee" required autoFocus />
        </label>
        <label>
          Points needed
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={form.pointsCost}
            onChange={(e) => setForm({ ...form, pointsCost: e.target.value })}
            required
          />
        </label>
        <ErrorText text={error} />
        <button className="btn btn-primary btn-lg" disabled={busy}>
          {reward ? 'Save' : 'Add reward'}
        </button>
      </form>
    </Sheet>
  );
}

export function Rewards() {
  const [list, setList] = useState<RewardRow[] | null>(null);
  const [editing, setEditing] = useState<RewardRow | 'new' | null>(null);
  const version = useDataVersion();
  const load = useCallback(() => void api<RewardRow[]>('rewards').then(setList), []);
  useEffect(load, [load, version]);

  const remove = async (r: RewardRow) => {
    if (!(await confirmDialog({ title: `Remove ${r.name}?`, body: 'Customers won’t see it any more. Past redemptions stay in their history.', confirm: 'Remove', danger: true }))) return;
    await api(`rewards/${r.id}`, 'DELETE');
    toast(`${r.name} removed`);
    load();
  };

  const addIdea = async (idea: (typeof IDEAS)[number]) => {
    await api('rewards', 'POST', idea);
    toast(`${idea.name} added`);
    load();
  };

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Rewards</h1>
          <p>What customers can get with their points.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          <Plus size={18} /> New reward
        </button>
      </header>

      {!list ? (
        <div className="reward-grid">
          {[0, 1, 2].map((i) => (
            <div className="card" key={i}>
              <Skeleton h={44} w={44} />
              <Skeleton h={18} w="60%" />
              <Skeleton h={14} w="40%" />
            </div>
          ))}
        </div>
      ) : list.length ? (
        <div className="reward-grid">
          {list.map((r) => (
            <div className="card reward-card" key={r.id}>
              <span className="reward-icon">
                <Gift size={22} />
              </span>
              <h3>{r.name}</h3>
              <span className="points-pill" style={{ justifySelf: 'start' }}>
                {num(r.points_cost)} points
              </span>
              <span className="muted small">
                Redeemed {num(r.redeemed)} time{r.redeemed === 1 ? '' : 's'}
              </span>
              <div className="actions">
                <button className="btn btn-sm btn-soft" onClick={() => setEditing(r)}>
                  <Pencil size={14} /> Edit
                </button>
                <button className="btn btn-sm btn-ghost danger" onClick={() => remove(r)}>
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <section className="card">
          <EmptyState
            icon={Gift}
            title="Create your first reward"
            text="Rewards give customers a reason to come back. Start with one of these, or make your own."
            action={
              <div className="actions" style={{ justifyContent: 'center' }}>
                {IDEAS.map((idea) => (
                  <button key={idea.name} className="btn btn-sm btn-soft" onClick={() => addIdea(idea)}>
                    <Plus size={14} /> {idea.name} · {idea.pointsCost}
                  </button>
                ))}
              </div>
            }
          />
        </section>
      )}

      {editing && <RewardSheet reward={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSaved={load} />}
    </>
  );
}
