import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, Crown, Gift, MessageCircle, Search, UserPlus } from 'lucide-react';
import { api, num, walletUrl, whatsapp, type Bonus, type Customer, type Merchant, type Reward } from '../api';
import {
  Avatar,
  BirthdayInput,
  ErrorText,
  Sheet,
  TierBadge,
  confirmDialog,
  dataChanged,
  toast,
  useAction,
  useGivePointsRequests,
} from '../ui';

// The counter flow: find the customer (or add them), enter the bill, done — with WhatsApp and redeem
// right on the success screen. Opened from the + button anywhere in the app.

type Earned = { points: number; bonuses: Bonus[]; isNew: boolean; customer: Customer; tierUp: boolean };
type Picked = { customer: Customer } | { newPhone: string };

const QUICK = [100, 200, 500, 1000];
const digits = (s: string) => s.replace(/\D/g, '');

/** WhatsApp message after a purchase, with the customer's wallet link. */
export const earnedMessage = (shop: string, r: Earned) =>
  [
    `Hi ${r.customer.name}! 🎉`,
    `You earned ${num(r.points + r.bonuses.reduce((a, b) => a + b.points, 0))} points at ${shop}.`,
    r.tierUp ? 'You are now a ★ Gold member!' : '',
    `Your balance: ${num(r.customer.points)} points.`,
    `See your points and rewards: ${walletUrl(r.customer.walletToken)}`,
  ]
    .filter(Boolean)
    .join('\n');

function FindStep({ onPick }: { onPick: (p: Picked) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [searched, setSearched] = useState('');

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearched('');
      return;
    }
    const timer = setTimeout(() => {
      api<Customer[]>(`customers?q=${encodeURIComponent(digits(q).length >= 3 ? digits(q) : q)}`).then((r) => {
        setResults(r.slice(0, 6));
        setSearched(q);
      });
    }, 180);
    return () => clearTimeout(timer);
  }, [query]);

  const phone = digits(query);
  const exact = results.find((c) => digits(c.phone).endsWith(phone.slice(-10)));
  const canAddNew = phone.length >= 10 && searched === query.trim() && !exact;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (exact) onPick({ customer: exact });
    else if (results.length === 1) onPick({ customer: results[0] });
    else if (canAddNew) onPick({ newPhone: query.trim() });
  };

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
      <div className="input-icon">
        <Search size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Customer phone or name"
          inputMode="search"
          autoFocus
          aria-label="Customer phone or name"
        />
      </div>
      {(results.length > 0 || canAddNew) && (
        <div className="lookup">
          {results.map((c) => (
            <button type="button" key={c.id} onClick={() => onPick({ customer: c })}>
              <Avatar name={c.name} />
              <span className="row-main">
                <strong>
                  {c.name} <TierBadge tier={c.tier} />
                </strong>
                <span>{c.phone}</span>
              </span>
              <span className="points-pill">{num(c.points)}</span>
            </button>
          ))}
          {canAddNew && (
            <button type="button" onClick={() => onPick({ newPhone: query.trim() })}>
              <span className="avatar" style={{ background: 'var(--brand-soft)', color: 'var(--brand-ink)' }}>
                <UserPlus size={18} />
              </span>
              <span className="row-main">
                <strong>New customer</strong>
                <span>Add {query.trim()} and give points</span>
              </span>
            </button>
          )}
        </div>
      )}
      {query.trim().length >= 2 && searched === query.trim() && !results.length && !canAddNew && (
        <p className="muted small center">No match. Type their full phone number to add them.</p>
      )}
      {query.trim().length < 2 && <p className="muted small center">Search by phone number or name.</p>}
    </form>
  );
}

function AmountStep({
  merchant,
  picked,
  onBack,
  onDone,
}: {
  merchant: Merchant;
  picked: Picked;
  onBack: () => void;
  onDone: (r: Earned) => void;
}) {
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');
  const { busy, error, run } = useAction();
  const amountRef = useRef<HTMLInputElement>(null);

  const isNew = 'newPhone' in picked;
  const customer = isNew ? null : picked.customer;
  const multiplier = customer?.tier.multiplier ?? 1;
  const points = Math.floor(((Number(amount) || 0) / 100) * merchant.pointsPer100 * multiplier);

  useEffect(() => {
    if (!isNew) amountRef.current?.focus();
  }, [isNew]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const r = await api<Earned>('points/earn', 'POST', {
        phone: isNew ? picked.newPhone : picked.customer.phone,
        amount: Number(amount),
        name: isNew ? name : undefined,
        birthday: isNew && birthday ? birthday : undefined,
      });
      dataChanged();
      onDone(r);
    });
  };

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
      <div className="picked">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Change customer">
          <ArrowLeft size={18} />
        </button>
        {customer ? (
          <>
            <Avatar name={customer.name} />
            <span className="row-main">
              <strong>
                {customer.name} <TierBadge tier={customer.tier} />
              </strong>
              <span>
                {customer.phone} · {num(customer.points)} points
              </span>
            </span>
          </>
        ) : (
          <span className="row-main">
            <strong>New customer</strong>
            <span>{'newPhone' in picked ? picked.newPhone : ''}</span>
          </span>
        )}
      </div>

      {isNew && (
        <div className="form-row">
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </label>
          <label>
            Birthday <span className="hint">optional</span>
            <BirthdayInput value={birthday} onChange={setBirthday} />
          </label>
        </div>
      )}

      <label>
        Bill amount
        <span className="amount-input">
          <span>₹</span>
          <input
            ref={amountRef}
            type="number"
            min="1"
            step="any"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            required
          />
        </span>
      </label>
      <div className="quick-amounts">
        {QUICK.map((q) => (
          <button type="button" key={q} onClick={() => setAmount(String(q))}>
            ₹{num(q)}
          </button>
        ))}
      </div>

      <div className="preview">
        <span>
          Points to give
          {multiplier > 1 && (
            <span className="small" style={{ display: 'block', fontWeight: 500 }}>
              <Crown size={12} /> Gold ×{multiplier}
            </span>
          )}
        </span>
        <strong className="tabular">+{num(points)}</strong>
      </div>

      <ErrorText text={error} />
      <button className="btn btn-primary btn-lg btn-block" disabled={busy || !amount || (isNew && !name.trim())}>
        {busy ? 'Adding…' : `Give ${num(points)} points`}
      </button>
    </form>
  );
}

function DoneStep({
  merchant,
  result,
  onMore,
  onClose,
}: {
  merchant: Merchant;
  result: Earned;
  onMore: () => void;
  onClose: () => void;
}) {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [customer, setCustomer] = useState(result.customer);
  const { busy, run } = useAction();
  useEffect(() => void api<Reward[]>('rewards').then(setRewards), []);

  const total = result.points + result.bonuses.reduce((a, b) => a + b.points, 0);
  const affordable = rewards.filter((r) => r.points_cost <= customer.points);
  const next = rewards.find((r) => r.points_cost > customer.points);

  const redeem = async (r: Reward) => {
    if (!(await confirmDialog({ title: `Redeem ${r.name}?`, body: `${num(r.points_cost)} points will be taken from ${customer.name}.`, confirm: 'Redeem' }))) return;
    void run(async () => {
      const res = await api<{ customer: Customer }>('points/redeem', 'POST', { customerId: customer.id, rewardId: r.id });
      setCustomer(res.customer);
      dataChanged();
      toast(`${customer.name} redeemed ${r.name}`);
    });
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="success">
        <span className="success-burst">
          <Check size={34} strokeWidth={3} />
        </span>
        <span className="success-points tabular">+{num(total)}</span>
        <span className="muted">
          points for <strong style={{ color: 'var(--ink)' }}>{customer.name}</strong> · balance {num(customer.points)}
        </span>
        {result.bonuses.length > 0 && (
          <span className="small muted">
            includes {result.bonuses.map((b) => `${num(b.points)} ${b.label.toLowerCase()}`).join(' + ')}
          </span>
        )}
      </div>

      {result.tierUp && (
        <div className="callout">
          <Crown size={20} />
          <div>
            <strong>{customer.name} is now a Gold member!</strong>
            <div className="small muted">They'll earn ×{merchant.goldMultiplier} points from now on.</div>
          </div>
        </div>
      )}

      {affordable.map((r) => (
        <div className="callout" key={r.id}>
          <Gift size={20} />
          <div>
            <strong>Can redeem {r.name}</strong>
            <div className="small muted">{num(r.points_cost)} points</div>
          </div>
          <button className="btn btn-sm" disabled={busy} onClick={() => redeem(r)}>
            Redeem
          </button>
        </div>
      ))}
      {!affordable.length && next && (
        <p className="small muted center">
          {num(next.points_cost - customer.points)} more points to {next.name}
        </p>
      )}

      <a
        className="btn btn-whatsapp btn-lg btn-block"
        href={whatsapp(customer.phone, earnedMessage(merchant.name, { ...result, customer }))}
        target="_blank"
        rel="noreferrer"
      >
        <MessageCircle size={18} /> Send on WhatsApp
      </a>
      <div className="actions" style={{ justifyContent: 'space-between' }}>
        <button className="btn btn-soft" onClick={onMore}>
          Next customer
        </button>
        <a
          className="btn btn-ghost"
          href={`#/customers/${customer.id}`}
          onClick={onClose}
        >
          View profile
        </a>
      </div>
    </div>
  );
}

/** Mounted once in the shell; opens whenever openGivePoints() is called. */
export function GivePointsHost({ merchant }: { merchant: Merchant }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [result, setResult] = useState<Earned | null>(null);

  const reset = () => {
    setPicked(null);
    setResult(null);
  };

  const onOpen = useCallback((phone: string) => {
    setResult(null);
    setOpen(true);
    if (!phone) return setPicked(null);
    api<Customer[]>(`customers?q=${encodeURIComponent(phone)}`).then((r) => {
      const c = r.find((x) => x.phone === phone);
      setPicked(c ? { customer: c } : null);
    });
  }, []);
  useGivePointsRequests(onOpen);

  if (!open) return null;
  const close = () => {
    setOpen(false);
    reset();
  };

  return (
    <Sheet title={result ? 'Points added' : 'Give points'} onClose={close}>
      {result ? (
        <DoneStep merchant={merchant} result={result} onMore={reset} onClose={close} />
      ) : picked ? (
        <AmountStep merchant={merchant} picked={picked} onBack={() => setPicked(null)} onDone={setResult} />
      ) : (
        <FindStep onPick={setPicked} />
      )}
    </Sheet>
  );
}
