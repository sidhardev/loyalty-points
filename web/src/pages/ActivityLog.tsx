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
import { EmptyState, SkeletonRows } from '../ui';

// Who changed what: undos, adjustments, deletes, PIN resets, settings, blocked and unusually large bills.

type Entry = {
  id: number;
  actor: 'shop' | 'customer';
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
  redeem: Gift,
  reward: Gift,
  settings: SettingsIcon,
  export: FileDown,
};

/** Entries worth a second look. */
const ATTENTION = new Set(['limit_blocked', 'large_bill', 'adjust', 'undo', 'delete_customer', 'reset_pin', 'settings', 'export']);

export function ActivityLog() {
  const [items, setItems] = useState<Entry[] | null>(null);
  const [filter, setFilter] = useState<'all' | 'attention'>('all');

  useEffect(() => void api<Entry[]>('activity?limit=500').then(setItems), []);

  const shown = items?.filter((e) => filter === 'all' || ATTENTION.has(e.action));

  return (
    <>
      <a href="#/settings" className="back">
        <ArrowLeft size={16} /> Settings
      </a>
      <header className="page-head">
        <div>
          <h1>Activity log</h1>
          <p>Every change, undo and blocked attempt — by your shop or by customers.</p>
        </div>
      </header>

      <section className="card">
        <div className="seg" style={{ justifySelf: 'start' }}>
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
            All
          </button>
          <button className={filter === 'attention' ? 'active' : ''} onClick={() => setFilter('attention')}>
            Needs a look
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
                          (e.customer_name ?? 'Shop')
                        )}
                      </strong>
                      <span className="log-detail">{e.detail}</span>
                      <span>{when(e.created_at)}</span>
                    </div>
                    <span className={`badge ${e.actor === 'customer' ? 'badge-plus' : ''}`}>{e.actor === 'customer' ? 'Customer' : 'Shop'}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={ScrollText} title="Nothing here yet" text="Undos, adjustments, deletes, PIN resets, setting changes and blocked bills show up here." />
        )}
      </section>
    </>
  );
}
