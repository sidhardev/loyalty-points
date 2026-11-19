import { useCallback, useEffect, useState } from 'react';
import { Crown, Gift, MessageCircle, Search, Users, UserX } from 'lucide-react';
import { api, daysAgo, num, phoneLabel, reminderMessage, whatsapp, type Customer, type Merchant } from '../api';
import { LimitStrip, ProLock, refreshBilling } from '../billing';
import '../counter.css';
import { t, useLang } from '../i18n';
import { EmptyState, SkeletonRows, useDataVersion } from '../ui';
import { messageLang } from './Counter';
import { ReportCard } from '../report';

type Filter = 'all' | 'reward' | 'inactive';

const seen = (c: Customer) => {
  if (!c.lastVisit) return t('no visits yet');
  const d = daysAgo(c.lastVisit);
  return d === 0 ? t('came today') : d === 1 ? t('came yesterday') : t('came {n} days ago', { n: d });
};

export function Customers({ merchant, hash, onSaved }: { merchant: Merchant; hash: string; onSaved: (m: Merchant) => void }) {
  useLang();
  const filter: Filter = (new URLSearchParams(hash.split('?')[1] ?? '').get('filter') as Filter) || 'all';
  const [q, setQ] = useState('');
  const [list, setList] = useState<Customer[] | null>(null);
  const [sent, setSent] = useState<Set<number>>(new Set());
  const version = useDataVersion();
  useEffect(() => void refreshBilling().catch(() => {}), [version]);
  // The "not seen" list is Pro; on Free the page shows what it would do instead.
  const locked = filter === 'inactive' && !merchant.pro;

  const load = useCallback(() => {
    if (locked) return setList(null);
    const timer = setTimeout(
      () => api<Customer[]>(`customers?q=${encodeURIComponent(q)}${filter === 'all' ? '' : `&filter=${filter}`}`).then(setList),
      q ? 200 : 0,
    );
    return () => clearTimeout(timer);
  }, [q, filter, locked]);
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

      <LimitStrip meter />

      {filter === 'all' && !q && <ReportCard merchant={merchant} onSaved={onSaved} />}

      <div className="chips" role="tablist">
        {chips.map(({ id, label, icon: Icon }) => (
          <a key={id} href={id === 'all' ? '#/customers' : `#/customers?filter=${id}`} className={`chip ${filter === id ? 'active' : ''}`}>
            {Icon && <Icon size={14} />} {label}
            {id === 'inactive' && !merchant.pro && <Crown size={12} aria-label={t('Pro')} />}
          </a>
        ))}
      </div>

      {locked ? (
        <ProLock perk="winback">
          <p className="small" style={{ margin: 0 }}>
            {t('Customers who haven’t come for {n} days show up here. Tap Remind and WhatsApp opens on your phone with a message about their stamps.', {
              n: merchant.inactiveDays,
            })}
          </p>
        </ProLock>
      ) : (
      <section className="card">
        <div className="input-icon">
          <Search size={18} />
          <input placeholder={t('Search number or name')} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search customers" />
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
                      {phoneLabel(c.phone, merchant.country)}
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
                          open(whatsapp(c.phone, reminderMessage(merchant, c, messageLang()), merchant.country), '_blank');
                          // Counted so a return soon after shows as brought back in the monthly report.
                          void api(`customers/${c.id}/reminded`, 'POST').catch(() => {});
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
      )}
    </>
  );
}
