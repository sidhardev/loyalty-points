import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  Cake,
  Copy,
  Crown,
  ExternalLink,
  Gift,
  History,
  KeyRound,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { api, birthdayLabel, daysAgo, num, rupees, walletUrl, when, whatsapp, type Customer, type Merchant, type Reward, type Transaction } from '../api';
import {
  Activity,
  Avatar,
  BirthdayInput,
  EmptyState,
  ErrorText,
  Sheet,
  Skeleton,
  SkeletonRows,
  TierBadge,
  confirmDialog,
  dataChanged,
  describe,
  openGivePoints,
  toast,
  useAction,
  useDataVersion,
} from '../ui';

type Detail = { customer: Customer; stats: { visits: number; spent: number }; history: Transaction[] };

function EditSheet({ customer, onClose, onSaved }: { customer: Customer; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: customer.name, phone: customer.phone, birthday: customer.birthday ?? '' });
  const { busy, error, run } = useAction();
  const save = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await api(`customers/${customer.id}`, 'PATCH', { ...form, birthday: form.birthday || null });
      toast('Customer updated');
      onSaved();
      onClose();
    });
  };
  return (
    <Sheet title="Edit customer" onClose={onClose}>
      <form onSubmit={save} style={{ display: 'grid', gap: 14 }}>
        <label>
          Name
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label>
          Phone
          <input value={form.phone} inputMode="tel" onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
        </label>
        <label>
          Birthday
          <BirthdayInput value={form.birthday} onChange={(birthday) => setForm({ ...form, birthday })} />
        </label>
        <ErrorText text={error} />
        <button className="btn btn-primary btn-lg" disabled={busy}>
          Save changes
        </button>
      </form>
    </Sheet>
  );
}

function AdjustSheet({ customer, onClose, onSaved }: { customer: Customer; onClose: () => void; onSaved: () => void }) {
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const { busy, error, run } = useAction();
  const save = (e: FormEvent) => {
    e.preventDefault();
    const delta = (mode === 'add' ? 1 : -1) * Math.abs(Number(points));
    void run(async () => {
      await api(`customers/${customer.id}/adjust`, 'POST', { points: delta, reason });
      toast(`${delta > 0 ? 'Added' : 'Removed'} ${num(Math.abs(delta))} points`);
      dataChanged();
      onSaved();
      onClose();
    });
  };
  return (
    <Sheet title="Adjust points" onClose={onClose}>
      <form onSubmit={save} style={{ display: 'grid', gap: 14 }}>
        <p className="muted small">Fix a mistake. To reverse a single entry, use Undo in the history instead.</p>
        <div className="seg" style={{ justifySelf: 'start' }}>
          <button type="button" className={mode === 'add' ? 'active' : ''} onClick={() => setMode('add')}>
            Add points
          </button>
          <button type="button" className={mode === 'remove' ? 'active' : ''} onClick={() => setMode('remove')}>
            Remove points
          </button>
        </div>
        <label>
          Points
          <input type="number" min="1" step="1" inputMode="numeric" value={points} onChange={(e) => setPoints(e.target.value)} required autoFocus />
        </label>
        <label>
          Reason
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Points given to the wrong person" required />
        </label>
        <ErrorText text={error} />
        <button className="btn btn-primary btn-lg" disabled={busy}>
          {mode === 'add' ? 'Add' : 'Remove'} {points ? num(Number(points)) : ''} points
        </button>
      </form>
    </Sheet>
  );
}

export function CustomerPage({ id, merchant }: { id: number; merchant: Merchant }) {
  const [data, setData] = useState<Detail | null>(null);
  const [missing, setMissing] = useState(false);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [sheet, setSheet] = useState<'edit' | 'adjust' | null>(null);
  const { busy, error, run } = useAction();
  const version = useDataVersion();

  const load = useCallback(() => {
    api<Detail>(`customers/${id}`)
      .then(setData)
      .catch(() => setMissing(true));
    api<Reward[]>('rewards').then(setRewards);
  }, [id]);
  useEffect(load, [load, version]);

  if (missing) {
    return <EmptyState icon={History} title="Customer not found" action={<a href="#/customers" className="btn">Back to customers</a>} />;
  }
  if (!data) {
    return (
      <div className="card">
        <Skeleton h={64} w={64} />
        <Skeleton h={24} w="40%" />
        <SkeletonRows count={3} />
      </div>
    );
  }

  const { customer, stats, history } = data;
  const wallet = walletUrl(customer.walletToken);

  const act = (action: () => Promise<void>) =>
    void run(async () => {
      await action();
      dataChanged();
    });

  const redeem = async (reward: Reward) => {
    if (!(await confirmDialog({ title: `Redeem ${reward.name}?`, body: `${num(reward.points_cost)} points will be taken from ${customer.name}.`, confirm: 'Redeem' }))) return;
    act(async () => {
      await api('points/redeem', 'POST', { customerId: customer.id, rewardId: reward.id });
      toast(`${customer.name} redeemed ${reward.name}`);
    });
  };

  const undo = async (t: Transaction) => {
    if (!(await confirmDialog({ title: 'Undo this entry?', body: `${describe(t)} (${t.points > 0 ? '+' : ''}${num(t.points)} points) will be reversed.`, confirm: 'Undo' }))) return;
    act(async () => {
      await api(`transactions/${t.id}/undo`, 'POST');
      toast('Entry undone');
    });
  };

  const resetPin = async () => {
    if (!(await confirmDialog({ title: `Reset ${customer.name}'s PIN?`, body: 'They can set a new one from their wallet link. Send it on WhatsApp next.', confirm: 'Reset PIN' }))) return;
    act(async () => {
      await api(`customers/${customer.id}/reset-pin`, 'POST');
      toast('PIN reset — send them their link to set a new one');
    });
  };

  const remove = async () => {
    if (!(await confirmDialog({ title: `Delete ${customer.name}?`, body: 'Their points and whole history will be deleted. This can’t be undone.', confirm: 'Delete', danger: true }))) return;
    void run(async () => {
      await api(`customers/${customer.id}`, 'DELETE');
      toast(`${customer.name} deleted`);
      dataChanged();
      location.hash = '/customers';
    });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(wallet);
      toast('Wallet link copied');
    } catch {
      prompt('Copy this link:', wallet);
    }
  };

  const goldPct = Math.min(100, (customer.lifetimePoints / merchant.goldThreshold) * 100);

  return (
    <>
      <a href="#/customers" className="back">
        <ArrowLeft size={16} /> Customers
      </a>

      <ErrorText text={error} />

      <div className="grid-2">
        <div className="stack">
          <section className="card">
            <div className="profile-top">
              <Avatar name={customer.name} size="lg" />
              <div style={{ minWidth: 0 }}>
                <h1>
                  {customer.name} <TierBadge tier={customer.tier} />
                </h1>
                <div className="profile-meta">
                  <span>
                    <Phone size={14} /> {customer.phone}
                  </span>
                  {customer.birthday && (
                    <span>
                      <Cake size={14} /> {birthdayLabel(customer.birthday)}
                    </span>
                  )}
                  <span>
                    <KeyRound size={14} /> {customer.hasPin ? 'PIN set' : 'No PIN'}
                  </span>
                </div>
              </div>
            </div>

            <div className="profile-balance">
              <div>
                <span className="muted small">Points balance</span>
                <strong>{num(customer.points)}</strong>
              </div>
              <button className="btn btn-primary" onClick={() => openGivePoints(customer.phone)}>
                <Plus size={18} /> Give points
              </button>
            </div>

            <div className="mini-stats">
              <div>
                <span>Visits</span>
                <strong>{num(stats.visits)}</strong>
              </div>
              <div>
                <span>Spent</span>
                <strong>{rupees(stats.spent)}</strong>
              </div>
              <div>
                <span>Last visit</span>
                <strong>{customer.lastVisit ? (daysAgo(customer.lastVisit) === 0 ? 'Today' : `${daysAgo(customer.lastVisit)}d ago`) : '—'}</strong>
              </div>
            </div>

            {customer.tier.name !== 'Gold' && (
              <div style={{ display: 'grid', gap: 6 }}>
                <div className="reward-row-head small">
                  <span className="muted">
                    <Crown size={13} /> {num(customer.tier.toGold)} points to Gold
                  </span>
                  <span className="muted">
                    {num(customer.lifetimePoints)} / {num(merchant.goldThreshold)}
                  </span>
                </div>
                <div className="meter">
                  <span style={{ width: `${goldPct}%` }} />
                </div>
              </div>
            )}

            <div className="actions">
              <a
                className="btn btn-sm btn-whatsapp"
                href={whatsapp(customer.phone, `Hi ${customer.name}! Here are your ${merchant.name} points and rewards: ${wallet}`)}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={15} /> Send wallet
              </a>
              <button className="btn btn-sm btn-soft" onClick={copy}>
                <Copy size={15} /> Copy link
              </button>
              <a className="btn btn-sm btn-soft" href={wallet} target="_blank" rel="noreferrer">
                <ExternalLink size={15} /> Open wallet
              </a>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>
                <Gift size={18} /> Rewards
              </h2>
            </div>
            {rewards.length ? (
              <div>
                {rewards.map((r) => {
                  const pct = Math.min(100, (customer.points / r.points_cost) * 100);
                  const ready = customer.points >= r.points_cost;
                  return (
                    <div className="reward-row" key={r.id}>
                      <div className="reward-row-head">
                        <span>
                          <strong>{r.name}</strong>
                          <span className="muted small"> · {num(r.points_cost)} pts</span>
                        </span>
                        {ready ? (
                          <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => redeem(r)}>
                            Redeem
                          </button>
                        ) : (
                          <span className="muted small">{num(r.points_cost - customer.points)} to go</span>
                        )}
                      </div>
                      <div className="meter">
                        <span style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="muted small">
                No rewards yet. <a href="#/rewards">Create one</a>
              </p>
            )}
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Manage</h2>
            </div>
            <div className="actions">
              <button className="btn btn-sm btn-soft" onClick={() => setSheet('edit')}>
                <Pencil size={15} /> Edit details
              </button>
              <button className="btn btn-sm btn-soft" onClick={() => setSheet('adjust')}>
                <SlidersHorizontal size={15} /> Adjust points
              </button>
              {customer.hasPin && (
                <button className="btn btn-sm btn-soft" onClick={resetPin}>
                  <KeyRound size={15} /> Reset PIN
                </button>
              )}
              <button className="btn btn-sm btn-ghost danger" onClick={remove}>
                <Trash2 size={15} /> Delete
              </button>
            </div>
            <p className="muted tiny">Member since {when(customer.createdAt)}</p>
          </section>
        </div>

        <section className="card">
          <div className="card-head">
            <h2>
              <History size={18} /> History
            </h2>
            <span className="muted small">{num(history.length)} entries</span>
          </div>
          {history.length ? (
            <Activity items={history} showCustomer={false} onUndo={undo} />
          ) : (
            <EmptyState icon={History} title="No activity yet" text="Points they earn and rewards they redeem will show here." />
          )}
        </section>
      </div>

      {sheet === 'edit' && <EditSheet customer={customer} onClose={() => setSheet(null)} onSaved={load} />}
      {sheet === 'adjust' && <AdjustSheet customer={customer} onClose={() => setSheet(null)} onSaved={load} />}
    </>
  );
}
