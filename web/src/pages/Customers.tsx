import { useCallback, useEffect, useState } from 'react';
import { Crown, Gift, MessageCircle, Search, Users, UserX } from 'lucide-react';
import { api, daysAgo, num, phoneLabel, walletUrl, whatsapp, type Billing, type Customer, type Merchant } from '../api';
import '../counter.css';
import { t, useLang } from '../i18n';
import { EmptyState, SkeletonRows, useDataVersion } from '../ui';

type Filter = 'all' | 'reward' | 'inactive';

/** "We miss you" WhatsApp message with how close they are to the reward. */
function reminder(m: Merchant, c: Customer) {
  const left = Math.max(0, m.visitsNeeded - c.stamps);
  const hook = left ? `Only ${left} more visit${left === 1 ? '' : 's'} for ${m.rewardName}!` : `Your ${m.rewardName} is waiting!`;
  return `We miss you at ${m.name}! 👋 ${hook}\nYour card: ${walletUrl(c.walletToken)}`;
}

const seen = (c: Customer) => {
  if (!c.lastVisit) return t('no visits yet');
  const d = daysAgo(c.lastVisit);
  return d === 0 ? t('came today') : d === 1 ? t('came yesterday') : t('came {n} days ago', { n: d });
};

export function Customers({ merchant, hash }: { merchant: Merchant; hash: string }) {
  useLang();
  const filter: Filter = (new URLSearchParams(hash.split('?')[1] ?? '').get('filter') as Filter) || 'all';
  const [q, setQ] = useState('');
  const [list, setList] = useState<Customer[] | null>(null);
  const [sent, setSent] = useState<Set<number>>(new Set());
  const version = useDataVersion();
  const [billing, setBilling] = useState<Billing | null>(null);
  useEffect(() => void api<Billing>('billing').then(setBilling, () => {}), [version]);
  const nearLimit = billing?.limit != null && billing.customers >= billing.limit - 10;

  const load = useCallback(() => {
    const timer = setTimeout(
      () => api<Customer[]>(`customers?q=${encodeURIComponent(q)}${filter === 'all' ? '' : `&filter=${filter}`}`).then(setList),
      q ? 200 : 0,
    );
    return () => clearTimeout(timer);
  }, [q, filter]);
  useEffect(load, [load, version]);

  const chips: { id: Filter; label: string; icon?: typeof Users }[] = [
    { id: 'all', label: t('All') },
    { id: 'reward', label: t('Reward waiting'), icon: Gift },
    { id: 'inactive', label: t('Not seen {n} days', { n: merchant.inactiveDays }), icon: UserX },
  ];

  return (
    <>
      <header className="page-head">
        <div>
          <h1>{t('Customers')}</h1>
          <p>{list ? `${num(list.length)} ${filter === 'all' ? (list.length === 1 ? t('customer') : t('customers')) : t('shown')}` : t('Everyone who visited')}</p>
        </div>
      </header>

      {nearLimit && billing?.limit != null && (
        <a className={`alert ${billing.customers >= billing.limit ? 'alert-error' : 'alert-ok'}`} href="#/plan">
          <Crown size={16} />{' '}
          {billing.customers >= billing.limit
            ? t('{n} of {limit} customers: new numbers can’t be added on the Free plan. Become a Founding Shop →', { n: num(billing.customers), limit: num(billing.limit) })
            : t('{n} of {limit} customers on the Free plan. See Founding Shop →', { n: num(billing.customers), limit: num(billing.limit) })}
        </a>
      )}

      <div className="chips" role="tablist">
        {chips.map(({ id, label, icon: Icon }) => (
          <a key={id} href={id === 'all' ? '#/customers' : `#/customers?filter=${id}`} className={`chip ${filter === id ? 'active' : ''}`}>
            {Icon && <Icon size={14} />} {label}
          </a>
        ))}
      </div>

      <section className="card">
        <div className="input-icon">
          <Search size={18} />
          <input placeholder={t('Search phone number')} inputMode="tel" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search customers" />
        </div>

        {filter === 'inactive' && !!list?.length && <p className="small muted">{t('Tap Remind to open WhatsApp with a ready message.')}</p>}

        {!list ? (
          <SkeletonRows count={5} />
        ) : list.length ? (
          <ul className="rows">
            {list.map((c) => (
              <li key={c.id}>
                <a className="row-item" href={`#/customers/${c.id}`}>
                  <span className="row-main">
                    <strong className="tabular">
                      {phoneLabel(c.phone)}
                      {c.name ? <span className="muted"> · {c.name}</span> : null}
                    </strong>
                    <span>{seen(c)}</span>
                  </span>
                  <span className="row-end">
                    {filter === 'inactive' ? (
                      <span
                        className={`btn btn-sm ${sent.has(c.id) ? 'btn-soft' : 'btn-whatsapp'}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          open(whatsapp(c.phone, reminder(merchant, c)), '_blank');
                          setSent(new Set(sent).add(c.id));
                        }}
                        role="button"
                      >
                        <MessageCircle size={14} /> {sent.has(c.id) ? t('Sent') : t('Remind')}
                      </span>
                    ) : c.rewardDue ? (
                      <span className="reward-pill">🎁 {t('Reward')}</span>
                    ) : (
                      <span className="stamp-count">
                        {c.stamps}/{merchant.visitsNeeded}
                      </span>
                    )}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={filter === 'inactive' ? UserX : filter === 'reward' ? Gift : Users}
            title={
              q
                ? t('No number matches')
                : filter === 'inactive'
                  ? t('Everyone came back recently 🎉')
                  : filter === 'reward'
                    ? t('No rewards waiting')
                    : t('No customers yet')
            }
            text={!q && filter === 'all' ? t('Add a visit with a phone number — the customer shows up here.') : undefined}
            action={
              !q && filter === 'all' ? (
                <a className="btn btn-primary" href="#/">
                  {t('Add a visit')}
                </a>
              ) : undefined
            }
          />
        )}
      </section>
    </>
  );
}
