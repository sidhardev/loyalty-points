import { useEffect, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  Crown,
  Gift,
  Info,
  Moon,
  SlidersHorizontal,
  Sparkles,
  Star,
  Sun,
  Undo2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { birthdayLabel, num, rupees, when, type Tier, type Transaction } from './api';

// Shared building blocks: feedback (toasts, confirm dialogs), sheets, and small display pieces.

// ---------------------------------------------------------------- app-wide events

const DATA_CHANGED = 'lp-data-changed';
const OPEN_GIVE = 'lp-open-give';

/** Tell every page that points/customers changed (e.g. after giving points from the sheet). */
export const dataChanged = () => dispatchEvent(new Event(DATA_CHANGED));

/** A number that goes up whenever data changes; add it to a load effect's dependencies. */
export function useDataVersion() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    addEventListener(DATA_CHANGED, bump);
    return () => removeEventListener(DATA_CHANGED, bump);
  }, []);
  return version;
}

/** Opens the "Give points" sheet, optionally for a known customer phone. */
export const openGivePoints = (phone?: string) => dispatchEvent(new CustomEvent(OPEN_GIVE, { detail: phone ?? '' }));

export function useGivePointsRequests(onOpen: (phone: string) => void) {
  useEffect(() => {
    const handler = (e: Event) => onOpen((e as CustomEvent<string>).detail);
    addEventListener(OPEN_GIVE, handler);
    return () => removeEventListener(OPEN_GIVE, handler);
  }, [onOpen]);
}

// ---------------------------------------------------------------- toasts

type Toast = { id: number; text: string; kind: 'ok' | 'error' | 'info' };
let toastListener: ((t: Toast) => void) | null = null;
let toastId = 0;

export const toast = (text: string, kind: Toast['kind'] = 'ok') => toastListener?.({ id: ++toastId, text, kind });

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    toastListener = (t) => {
      setItems((list) => [...list.slice(-2), t]);
      setTimeout(() => setItems((list) => list.filter((x) => x.id !== t.id)), 3200);
    };
    return () => {
      toastListener = null;
    };
  }, []);
  const icons = { ok: CheckCircle2, error: AlertTriangle, info: Info };
  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((t) => {
        const Icon = icons[t.kind];
        return (
          <div key={t.id} className={`toast ${t.kind}`}>
            <Icon size={18} /> {t.text}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- confirm dialog

type ConfirmOptions = { title: string; body?: ReactNode; confirm?: string; danger?: boolean };
type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };
let confirmListener: ((p: Pending) => void) | null = null;

/** A styled replacement for window.confirm. */
export const confirmDialog = (options: ConfirmOptions) =>
  new Promise<boolean>((resolve) => (confirmListener ? confirmListener({ ...options, resolve }) : resolve(window.confirm(options.title))));

export function ConfirmHost() {
  const [pending, setPending] = useState<Pending | null>(null);
  useEffect(() => {
    confirmListener = setPending;
    return () => {
      confirmListener = null;
    };
  }, []);
  if (!pending) return null;
  const close = (ok: boolean) => {
    pending.resolve(ok);
    setPending(null);
  };
  return (
    <div className="overlay" onClick={() => close(false)}>
      <div className="dialog" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>{pending.title}</h2>
        {pending.body && <p>{pending.body}</p>}
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => close(false)}>
            Cancel
          </button>
          <button className={`btn ${pending.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => close(true)} autoFocus>
            {pending.confirm ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- sheet (bottom sheet on phones, dialog on desktop)

export function Sheet({ title, onClose, children }: { title: ReactNode; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <span className="sheet-grip" aria-hidden />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- theme

export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('lp_theme', next);
    } catch {
      // The toggle still works for this visit without storage.
    }
    setTheme(next);
  };
  return { theme, toggle, Icon: theme === 'dark' ? Sun : Moon };
}

// ---------------------------------------------------------------- forms

/** Runs a form action, showing its error message if it fails. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, run };
}

export const ErrorText = ({ text }: { text: string }) =>
  text ? (
    <p className="alert alert-error" role="alert">
      <AlertTriangle size={16} /> {text}
    </p>
  ) : null;

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Birthday as MM-DD (no year needed). */
export function BirthdayInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [m, d] = value ? value.split('-') : ['', ''];
  const set = (month: string, day: string) => onChange(month && day ? `${month}-${day}` : '');
  return (
    <span className="birthday">
      <select value={m} onChange={(e) => set(e.target.value, d || '01')} aria-label="Birthday month">
        <option value="">Month</option>
        {MONTH_NAMES.map((name, i) => (
          <option key={name} value={String(i + 1).padStart(2, '0')}>
            {name}
          </option>
        ))}
      </select>
      <select value={d} onChange={(e) => set(m || '01', e.target.value)} aria-label="Birthday day">
        <option value="">Day</option>
        {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map((day) => (
          <option key={day} value={day}>
            {Number(day)}
          </option>
        ))}
      </select>
      {value && (
        <button type="button" className="icon-btn" onClick={() => onChange('')} aria-label="Clear birthday">
          <X size={16} />
        </button>
      )}
    </span>
  );
}

/** 4-digit PIN field (numeric keypad on phones, hidden as it's typed). */
export function PinInput({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <input
      className="pin"
      type="password"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]{4}"
      maxLength={4}
      placeholder="••••"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
      autoFocus={autoFocus}
      required
    />
  );
}

// ---------------------------------------------------------------- display

export const Logo = () => (
  <span className="logo" aria-hidden>
    <Star size={17} fill="currentColor" />
  </span>
);

const AVATAR_COLORS = ['#047857', '#2563eb', '#7c3aed', '#db2777', '#0e7490', '#b45309', '#4f46e5', '#be123c'];

export function Avatar({ name, size }: { name: string; size?: 'lg' }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return (
    <span className={`avatar ${size === 'lg' ? 'avatar-lg' : ''}`} style={{ background: AVATAR_COLORS[hue] }} aria-hidden>
      {initials || '?'}
    </span>
  );
}

export const TierBadge = ({ tier }: { tier: Tier }) =>
  tier.name === 'Gold' ? (
    <span className="badge tier-gold">
      <Crown size={12} /> Gold
    </span>
  ) : null;

export const Skeleton = ({ h = 16, w = '100%' }: { h?: number; w?: number | string }) => (
  <span className="skeleton" style={{ display: 'block', height: h, width: w }} />
);

export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div className="rows">
      {Array.from({ length: count }, (_, i) => (
        <div className="row-item" key={i}>
          <Skeleton h={36} w={36} />
          <div className="row-main" style={{ gap: 6 }}>
            <Skeleton h={14} w="55%" />
            <Skeleton h={12} w="35%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={24} />
      </span>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function describe(t: Transaction) {
  switch (t.type) {
    case 'earn':
      return `Bill of ${rupees(t.amount ?? 0)}${t.note ? ` · ${t.note}` : ''}`;
    case 'redeem':
      return `Redeemed ${t.note}`;
    case 'bonus':
      return t.note ?? 'Bonus';
    default:
      return t.note ?? 'Adjustment';
  }
}

const TYPE_ICON: Record<Transaction['type'], LucideIcon> = { earn: Coins, redeem: Gift, bonus: Sparkles, adjust: SlidersHorizontal };

export function Activity({
  items,
  showCustomer = true,
  onUndo,
}: {
  items: Transaction[];
  showCustomer?: boolean;
  onUndo?: (t: Transaction) => void;
}) {
  return (
    <ul className="rows">
      {items.map((t) => {
        const Icon = TYPE_ICON[t.type];
        return (
          <li key={t.id} className={t.reversed ? 'is-reversed' : ''}>
            <div className="row-item">
              <span className={`activity-icon ${t.type}`}>
                <Icon size={17} />
              </span>
              <div className="row-main">
                <strong>
                  {showCustomer && t.customer_id ? (
                    <a href={`#/customers/${t.customer_id}`} style={{ color: 'inherit' }}>
                      {t.customer_name}
                    </a>
                  ) : (
                    describe(t)
                  )}
                </strong>
                <span>
                  {showCustomer ? `${describe(t)} · ` : ''}
                  {when(t.created_at)}
                  {t.reversed ? ' · undone' : ''}
                </span>
              </div>
              <div className="row-end">
                <span className={`badge ${t.points >= 0 ? 'badge-plus' : 'badge-minus'}`}>
                  {t.points >= 0 ? '+' : '−'}
                  {num(Math.abs(t.points))}
                </span>
                {onUndo && !t.reversed && !t.reversal_of && (
                  <button className="link tiny" onClick={() => onUndo(t)}>
                    <Undo2 size={12} /> Undo
                  </button>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export const birthdayText = (b: string | null) => (b ? birthdayLabel(b) : '');
