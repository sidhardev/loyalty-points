import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import QRCode from 'qrcode';
import { ArrowLeft, Check, Crown, Gift, MessageCircle, QrCode, RefreshCw, ScanLine, Search, Ticket, UserPlus } from 'lucide-react';
import { api, claimUrl, num, rupees, spendFor, walletUrl, whatsapp, type Bonus, type Customer, type Merchant, type Reward } from '../api';
import { QrScanner } from '../scanner';
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
// Two no-typing shortcuts: show a bill QR the customer scans, or scan the member card on their phone.

type Earned = { points: number; bonuses: Bonus[]; isNew: boolean; customer: Customer; tierUp: boolean };
type Picked = { customer: Customer } | { newPhone: string };
type Mode = 'find' | 'scan' | 'bill' | 'code';

/** Bills above the shop's check amount need a second "yes" — catches an extra zero typed by mistake. */
async function largeBillOk(merchant: Merchant, amount: number) {
  if (!merchant.largeBill || amount <= merchant.largeBill) return true;
  return confirmDialog({
    title: `${rupees(amount)} — is that right?`,
    body: `This is above your ${rupees(merchant.largeBill)} check. It will be noted in the activity log.`,
    confirm: 'Yes, it’s right',
    cancel: 'Fix amount',
  });
}

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

const touch = matchMedia('(pointer: coarse)').matches;

function FindStep({ onPick, onMode }: { onPick: (p: Picked) => void; onMode: (m: Mode) => void }) {
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
      <div className="give-modes">
        <button type="button" onClick={() => onMode('bill')}>
          <QrCode size={22} />
          <strong>Bill QR</strong>
          <span>Customer scans it</span>
        </button>
        <button type="button" onClick={() => onMode('scan')}>
          <ScanLine size={22} />
          <strong>Scan card</strong>
          <span>Their member QR</span>
        </button>
        <button type="button" onClick={() => onMode('code')}>
          <Ticket size={22} />
          <strong>Reward code</strong>
          <span>From their phone</span>
        </button>
      </div>
      <span className="or">or find by phone</span>
      <div className="input-icon">
        <Search size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Customer phone or name"
          inputMode="search"
          autoFocus={!touch}
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

/** Scan the member card QR on the customer's phone (or their wallet link QR). */
function ScanStep({ onPick }: { onPick: (p: Picked) => void }) {
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  const onScan = (text: string) =>
    api<Customer>(`customers/scan?code=${encodeURIComponent(text)}`)
      .then((customer) => onPick({ customer }))
      .catch((err) => setError((err as Error).message));

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <QrScanner key={attempt} onScan={onScan} />
      {error ? (
        <>
          <ErrorText text={error} />
          <button
            className="btn btn-soft"
            onClick={() => {
              setError('');
              setAttempt((a) => a + 1);
            }}
          >
            <RefreshCw size={17} /> Scan again
          </button>
        </>
      ) : (
        <p className="muted small center">Ask the customer to open their points page and tap “My card”.</p>
      )}
    </div>
  );
}

type CodePreview = { code: string; reward: Reward; customer: Customer };

/** The customer picked a reward in their wallet and shows a 4-digit code; the shop checks it and hands it over. */
function RedeemCodeStep({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<CodePreview | null>(null);
  const { busy, error, setError, run } = useAction();

  const check = (value: string) => {
    setCode(value);
    setPreview(null);
    setError('');
    if (value.length === 4) void run(async () => setPreview(await api<CodePreview>(`redeem-codes/${value}`)));
  };

  const give = () =>
    void run(async () => {
      const r = await api<{ reward: string; customer: Customer }>(`redeem-codes/${code}`, 'POST');
      dataChanged();
      toast(`Give ${r.customer.name}: ${r.reward} 🎁`);
      onDone();
    });

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <label>
        4-digit code on the customer's phone
        <input
          className="code-input tabular"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          placeholder="••••"
          value={code}
          onChange={(e) => check(e.target.value.replace(/\D/g, '').slice(0, 4))}
          autoFocus
        />
      </label>
      <ErrorText text={error} />
      {preview && (
        <>
          <div className="picked">
            <Avatar name={preview.customer.name} />
            <span className="row-main">
              <strong>
                {preview.customer.name} <TierBadge tier={preview.customer.tier} />
              </strong>
              <span>
                {preview.customer.phone} · {num(preview.customer.points)} points
              </span>
            </span>
          </div>
          <div className="preview">
            <span>
              <Gift size={16} style={{ verticalAlign: '-3px' }} /> {preview.reward.name}
            </span>
            <strong className="tabular">−{num(preview.reward.points_cost)}</strong>
          </div>
          <button className="btn btn-primary btn-lg btn-block" disabled={busy} onClick={give}>
            <Check size={18} /> Give {preview.reward.name}
          </button>
        </>
      )}
      {!preview && !error && <p className="muted small center">The customer taps “Get it” on a reward in their points page to get a code.</p>}
    </div>
  );
}

type Claim = { code: string; expiresAt: string; amount: number; qr: string };

/** The shop types the bill; the customer scans the QR with their phone and the points land in their wallet. */
function BillStep({ merchant, onDone }: { merchant: Merchant; onDone: (r: Earned) => void }) {
  const [amount, setAmount] = useState('');
  const [claim, setClaim] = useState<Claim | null>(null);
  const [left, setLeft] = useState(0);
  const { busy, error, run } = useAction();
  const open = useRef<string | null>(null); // shown but unclaimed, so it's cancelled if the sheet closes
  const pointsFor = (bill: number) => Math.floor((bill / 100) * merchant.pointsPer100);

  const cancel = () => {
    if (open.current) void api(`claims/${open.current}`, 'DELETE').catch(() => {});
    open.current = null;
  };
  useEffect(() => cancel, []);

  const show = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!(await largeBillOk(merchant, Number(amount)))) return;
    void run(async () => {
      cancel();
      const c = await api<Omit<Claim, 'qr'>>('claims', 'POST', { amount: Number(amount) });
      const qr = await QRCode.toDataURL(claimUrl(c.code), { width: 560, margin: 1, color: { dark: '#141416' } });
      open.current = c.code;
      setLeft(Math.round((Date.parse(c.expiresAt) - Date.now()) / 1000));
      setClaim({ ...c, qr });
    });
  };

  // Count down, and check every second whether the customer has scanned it.
  useEffect(() => {
    if (!claim) return;
    let alive = true;
    const tick = async () => {
      setLeft(Math.max(0, Math.round((Date.parse(claim.expiresAt) - Date.now()) / 1000)));
      const s = await api<{ status: 'waiting' | 'claimed' | 'expired'; result?: Earned }>(`claims/${claim.code}`).catch(() => null);
      if (alive && s?.status === 'claimed' && s.result) {
        alive = false;
        open.current = null;
        dataChanged();
        onDone(s.result);
      }
    };
    const timer = setInterval(tick, 1000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [claim, onDone]);

  if (claim) {
    const expired = left <= 0;
    return (
      <div style={{ display: 'grid', gap: 14 }}>
        <div className={`bill-qr ${expired ? 'expired' : ''}`}>
          <img src={claim.qr} alt="Bill QR code for the customer to scan" />
        </div>
        <div className="center" style={{ display: 'grid', gap: 4 }}>
          <strong className="tabular" style={{ fontSize: 20 }}>
            ₹{num(claim.amount)} · +{num(pointsFor(claim.amount))} points
          </strong>
          {expired ? (
            <span className="muted small">This QR has expired.</span>
          ) : (
            <span className="waiting">
              <span className="pulse" aria-hidden /> Waiting for the customer to scan · {Math.floor(left / 60)}:
              {String(left % 60).padStart(2, '0')}
            </span>
          )}
        </div>
        <ErrorText text={error} />
        {expired && (
          <button className="btn btn-primary btn-lg" disabled={busy} onClick={() => show()}>
            <RefreshCw size={18} /> Show a new QR
          </button>
        )}
        <button
          className="btn btn-ghost"
          onClick={() => {
            cancel();
            setClaim(null);
          }}
        >
          Change amount
        </button>
        {location.hostname === 'localhost' && (
          <p className="alert alert-error small">
            This QR points to localhost, which customers' phones can't open. Open the app from its public (https) address.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={show} style={{ display: 'grid', gap: 14 }}>
      <label>
        Bill amount
        <span className="amount-input">
          <span>₹</span>
          <input
            type="number"
            min="1"
            step="any"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            required
            autoFocus
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
      <p className="muted small">
        The customer scans it with their phone camera and gets the points — new customers join on the spot. Gold members get their extra
        points automatically.
      </p>
      <ErrorText text={error} />
      <button className="btn btn-primary btn-lg btn-block" disabled={busy || !amount}>
        <QrCode size={18} /> Show QR for {num(pointsFor(Number(amount) || 0))} points
      </button>
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

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!(await largeBillOk(merchant, Number(amount)))) return;
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
          {num(next.points_cost - customer.points)} more points (about {rupees(spendFor(next.points_cost - customer.points, merchant.pointsPer100, customer.tier.multiplier))} of shopping) to {next.name}
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
  const [mode, setMode] = useState<Mode>('find');
  const [picked, setPicked] = useState<Picked | null>(null);
  const [result, setResult] = useState<Earned | null>(null);

  const reset = () => {
    setMode('find');
    setPicked(null);
    setResult(null);
  };
  const pick = (p: Picked) => {
    setMode('find');
    setPicked(p);
  };

  const onOpen = useCallback((phone: string) => {
    setResult(null);
    setMode('find');
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

  const back = (
    <button className="icon-btn" onClick={() => setMode('find')} aria-label="Back">
      <ArrowLeft size={18} />
    </button>
  );
  const titles: Record<Mode, string> = { find: 'Give points', bill: 'Bill QR', scan: 'Scan member card', code: 'Reward code' };
  const title = result ? 'Points added' : mode === 'find' ? titles.find : <>{back} {titles[mode]}</>;

  return (
    <Sheet title={title} onClose={close}>
      {result ? (
        <DoneStep merchant={merchant} result={result} onMore={reset} onClose={close} />
      ) : picked ? (
        <AmountStep merchant={merchant} picked={picked} onBack={() => setPicked(null)} onDone={setResult} />
      ) : mode === 'bill' ? (
        <BillStep merchant={merchant} onDone={setResult} />
      ) : mode === 'scan' ? (
        <ScanStep onPick={pick} />
      ) : mode === 'code' ? (
        <RedeemCodeStep onDone={close} />
      ) : (
        <FindStep onPick={pick} onMode={setMode} />
      )}
    </Sheet>
  );
}
