import { useState } from 'react';
import { birthdayLabel, num, rupees, when, type Tier, type Transaction } from './api';

// Small pieces shared by the pages.

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

export const ErrorText = ({ text }: { text: string }) => (text ? <p className="alert alert-error">{text}</p> : null);

export const TierBadge = ({ tier }: { tier: Tier }) =>
  tier.name === 'Gold' ? <span className="tier tier-gold">★ Gold</span> : null;

export function describe(t: Transaction) {
  switch (t.type) {
    case 'earn':
      return `earned points on a ${rupees(t.amount ?? 0)} bill${t.note ? ` (${t.note})` : ''}`;
    case 'redeem':
      return `redeemed ${t.note}`;
    case 'bonus':
      return `got a ${t.note?.toLowerCase() ?? 'bonus'}`;
    default:
      return t.note ?? 'adjustment';
  }
}

export function Activity({
  items,
  showCustomer = true,
  onUndo,
}: {
  items: Transaction[];
  showCustomer?: boolean;
  onUndo?: (t: Transaction) => void;
}) {
  if (!items.length) return <p className="muted empty">No activity yet.</p>;
  return (
    <ul className="activity">
      {items.map((t) => (
        <li key={t.id} className={t.reversed ? 'is-reversed' : ''}>
          <span className={`badge ${t.points >= 0 ? 'badge-plus' : 'badge-minus'}`}>
            {t.points >= 0 ? '+' : '−'}
            {num(Math.abs(t.points))}
          </span>
          <span className="activity-text">
            {showCustomer && t.customer_id && (
              <a href={`#/customers/${t.customer_id}`}>
                <strong>{t.customer_name}</strong>{' '}
              </a>
            )}
            {describe(t)}
            {t.reversed ? <em className="muted small"> · undone</em> : null}
          </span>
          <span className="muted small nowrap">{when(t.created_at)}</span>
          {onUndo && !t.reversed && !t.reversal_of && (
            <button className="link small" onClick={() => onUndo(t)} title="Reverse this entry">
              Undo
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

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
        <button type="button" className="link small" onClick={() => onChange('')}>
          Clear
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

export const birthdayText = (b: string | null) => (b ? `🎂 ${birthdayLabel(b)}` : '');
