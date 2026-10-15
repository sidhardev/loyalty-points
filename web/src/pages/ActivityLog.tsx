import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  FileDown,
  Gift,
  KeyRound,
  Pencil,
  ScrollText,
  Settings as SettingsIcon,
  SlidersHorizontal,
  Trash2,
  Undo2,
  type LucideIcon,
} from 'lucide-react';
import { api, when } from '../api';
import { t, useLang } from '../i18n';
import { EmptyState, SkeletonRows } from '../ui';

// Who changed what: rewards given, undos, deleted customers, number and setting changes, exports. Entries from the
// points system (adjustments, PIN resets, blocked and large bills) stay in the list with their own icons.

type Entry = {
  id: number;
  actor: 'shop' | 'customer' | 'admin';
  action: string;
  detail: string;
  customer_id: number | null;
  customer_name: string | null;
  created_at: string;
};

const ICONS: Record<string, LucideIcon> = {
  limit_blocked: Ban,
  large_bill: AlertTriangle,
  adjust: SlidersHorizontal,
  undo: Undo2,
  delete_customer: Trash2,
  edit_customer: Pencil,
  reset_pin: KeyRound,
  pin: KeyRound,
  password: KeyRound,
  redeem: Gift,
  reward: Gift,
  settings: SettingsIcon,
  export: FileDown,
};

/** Entries worth a second look. */
const ATTENTION = new Set(['undo', 'delete_customer', 'edit_customer', 'settings', 'export', 'limit_blocked', 'large_bill', 'adjust', 'reset_pin']);

export function ActivityLog() {
  useLang();
  const [items, setItems] = useState<Entry[] | null>(null);
  const [filter, setFilter] = useState<'all' | 'attention'>('all');

  useEffect(() => void api<Entry[]>('activity?limit=500').then(setItems), []);

  const shown = items?.filter((e) => filter === 'all' || ATTENTION.has(e.action));

  return (
    <>
      <a href="#/settings" className="back">
        <ArrowLeft size={16} /> {t('Settings')}
      </a>
      <header className="page-head">
        <div>
          <h1>{t('Activity log')}</h1>
          <p>{t('Every reward, undo and change — by your shop or by Regularhood support.')}</p>
        </div>
      </header>

      <section className="card">
        <div className="seg" style={{ justifySelf: 'start' }}>
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
            {t('All')}
          </button>
          <button className={filter === 'attention' ? 'active' : ''} onClick={() => setFilter('attention')}>
            {t('Needs a look')}
          </button>
        </div>

        {!shown ? (
          <SkeletonRows count={5} />
        ) : shown.length ? (
          <ul className="rows">
            {shown.map((e) => {
              const Icon = ICONS[e.action] ?? ScrollText;
              const warn = e.action === 'limit_blocked' || e.action === 'large_bill' || e.action === 'delete_customer';
              return (
                <li key={e.id}>
                  <div className="row-item">
                    <span className={`activity-icon ${warn ? 'warn' : 'adjust'}`}>
                      <Icon size={17} />
                    </span>
                    <div className="row-main">
                      <strong>
                        {e.customer_id && e.action !== 'delete_customer' ? (
                          <a href={`#/customers/${e.customer_id}`} style={{ color: 'inherit' }}>
                            {e.customer_name}
                          </a>
                        ) : (
                          (e.customer_name ?? t('Shop'))
                        )}
                      </strong>
                      <span className="log-detail">{e.detail}</span>
                      <span>{when(e.created_at)}</span>
                    </div>
                    <span className={`badge ${e.actor === 'customer' ? 'badge-plus' : ''}`}>
                      {e.actor === 'customer' ? t('Customer') : e.actor === 'admin' ? t('Support') : t('Shop')}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={ScrollText} title={t('Nothing here yet')} text={t('Rewards given, undos, deleted customers and setting changes show up here.')} />
        )}
      </section>
    </>
  );
}
