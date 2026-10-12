import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Cake, Crown, MessageCircle, Search, UserPlus, Users, UserX } from 'lucide-react';
import { api, daysAgo, num, walletUrl, whatsapp, type Customer, type Merchant, type Reward } from '../api';
import { Avatar, BirthdayInput, EmptyState, ErrorText, Sheet, SkeletonRows, TierBadge, toast, useAction, useDataVersion } from '../ui';

type Filter = 'all' | 'gold' | 'inactive' | 'birthday';
type Sort = 'recent' | 'points' | 'name';

/** "We miss you" WhatsApp message, pointing at a reward they can already get (or are closest to). */
function reminder(shop: string, c: Customer, rewards: Reward[]) {
  const affordable = rewards.filter((r) => r.points_cost <= c.points).pop();
  const next = rewards.find((r) => r.points_cost > c.points);
  const hook = affordable
    ? `You can already get ${affordable.name} with your points!`
    : next
      ? `You're ${num(next.points_cost - c.points)} points away from ${next.name}.`
      : '';
  return `Hi ${c.name}, we miss you at ${shop}! 👋 You have ${num(c.points)} points waiting. ${hook}\nYour points: ${walletUrl(c.walletToken)}`;
}

function AddCustomer({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ name: '', phone: '', birthday: '' });
  const { busy, error, run } = useAction();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const r = await api<{ customer: Customer; bonuses: { points: number }[] }>('customers', 'POST', { ...form, birthday: form.birthday || undefined });
      toast(`${r.customer.name} added${r.bonuses.length ? ` with ${num(r.bonuses[0].points)} welcome points` : ''}`);
      onAdded();
      onClose();
    });
  };
  return (
    <Sheet title="Add customer" onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <label>
          Name
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
        </label>
        <label>
          Phone
          <input value={form.phone} inputMode="tel" onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="98765 43210" required />
        </label>
        <label>
          Birthday <span className="hint">optional</span>
          <BirthdayInput value={form.birthday} onChange={(birthday) => setForm({ ...form, birthday })} />
        </label>
        <ErrorText text={error} />
        <button className="btn btn-primary btn-lg" disabled={busy}>
          {busy ? 'Adding…' : 'Add customer'}
        </button>
      </form>
    </Sheet>
  );
}

export function Customers({ merchant, hash }: { merchant: Merchant; hash: string }) {
  const filter: Filter = (new URLSearchParams(hash.split('?')[1] ?? '').get('filter') as Filter) || 'all';
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [list, setList] = useState<Customer[] | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [adding, setAdding] = useState(false);
  const [sent, setSent] = useState<Set<number>>(new Set());
  const version = useDataVersion();

  const load = useCallback(() => {
    const timer = setTimeout(
      () => api<Customer[]>(`customers?q=${encodeURIComponent(q)}${filter === 'inactive' ? '&filter=inactive' : ''}`).then(setList),
      q ? 200 : 0,
    );
    return () => clearTimeout(timer);
  }, [q, filter]);
  useEffect(load, [load, version]);
  useEffect(() => void api<Reward[]>('rewards').then(setRewards), []);

  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const shown = useMemo(() => {
    let rows = list ?? [];
    if (filter === 'gold') rows = rows.filter((c) => c.tier.name === 'Gold');
    if (filter === 'birthday') rows = rows.filter((c) => c.birthday?.startsWith(month));
    if (filter !== 'inactive') {
      rows = [...rows].sort((a, b) =>
        sort === 'points' ? b.points - a.points : sort === 'name' ? a.name.localeCompare(b.name) : b.createdAt.localeCompare(a.createdAt),
      );
    }
    return rows;
  }, [list, filter, sort, month]);

  const chips: { id: Filter; label: string; icon?: typeof Users }[] = [
    { id: 'all', label: 'All' },
    { id: 'gold', label: 'Gold', icon: Crown },
    { id: 'inactive', label: `Not seen ${merchant.inactiveDays}d`, icon: UserX },
    { id: 'birthday', label: 'Birthday this month', icon: Cake },
  ];

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Customers</h1>
          <p>{list ? `${num(shown.length)} ${filter === 'all' ? 'in your program' : 'shown'}` : 'Everyone in your loyalty program'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          <UserPlus size={18} /> Add customer
        </button>
      </header>

      <div className="chips" role="tablist">
        {chips.map(({ id, label, icon: Icon }) => (
          <a key={id} href={id === 'all' ? '#/customers' : `#/customers?filter=${id}`} className={`chip ${filter === id ? 'active' : ''}`}>
            {Icon && <Icon size={14} />} {label}
          </a>
        ))}
      </div>

      <section className="card">
        <div className="form-row" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
          <div className="input-icon">
            <Search size={18} />
            <input placeholder="Name or phone" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search customers" />
          </div>
          {filter !== 'inactive' && (
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort" style={{ width: 'auto' }}>
              <option value="recent">Newest</option>
              <option value="points">Most points</option>
              <option value="name">A–Z</option>
            </select>
          )}
        </div>

        {filter === 'inactive' && shown.length > 0 && (
          <p className="small muted">Tap Remind to open WhatsApp with a ready message showing their points.</p>
        )}

        {!list ? (
          <SkeletonRows count={5} />
        ) : shown.length ? (
          <ul className="rows">
            {shown.map((c) => (
              <li key={c.id}>
                <a className="row-item" href={`#/customers/${c.id}`}>
                  <Avatar name={c.name} />
                  <span className="row-main">
                    <strong>
                      {c.name} <TierBadge tier={c.tier} />
                    </strong>
                    <span>
                      {c.phone}
                      {filter === 'inactive'
                        ? ` · ${c.lastVisit ? `last visit ${daysAgo(c.lastVisit)} days ago` : 'never visited'}`
                        : c.lastVisit
                          ? ` · visited ${daysAgo(c.lastVisit) === 0 ? 'today' : `${daysAgo(c.lastVisit)}d ago`}`
                          : ''}
                    </span>
                  </span>
                  <span className="row-end">
                    {filter === 'inactive' ? (
                      <span
                        className={`btn btn-sm ${sent.has(c.id) ? 'btn-soft' : 'btn-whatsapp'}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          open(whatsapp(c.phone, reminder(merchant.name, c, rewards)), '_blank');
                          setSent(new Set(sent).add(c.id));
                        }}
                        role="button"
                      >
                        <MessageCircle size={14} /> {sent.has(c.id) ? 'Sent' : 'Remind'}
                      </span>
                    ) : (
                      <span className="points-pill">{num(c.points)}</span>
                    )}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={filter === 'inactive' ? UserX : Users}
            title={
              q
                ? 'No customers match'
                : filter === 'inactive'
                  ? 'Everyone came back recently 🎉'
                  : filter === 'gold'
                    ? 'No Gold members yet'
                    : filter === 'birthday'
                      ? 'No birthdays this month'
                      : 'No customers yet'
            }
            text={
              !q && filter === 'all'
                ? 'Give points to a new phone number, or put your counter QR up so customers can join themselves.'
                : undefined
            }
            action={
              !q && filter === 'all' ? (
                <button className="btn btn-primary" onClick={() => setAdding(true)}>
                  <UserPlus size={18} /> Add customer
                </button>
              ) : undefined
            }
          />
        )}
      </section>

      {adding && <AddCustomer onClose={() => setAdding(false)} onAdded={load} />}
    </>
  );
}
