import { useEffect, useState } from 'react';
import { Check, ChevronRight, Crown, Infinity as InfinityIcon, Lock, MessageCircle, RotateCcw, Star, Users } from 'lucide-react';
import { api, LOGGED_OUT, num, type Billing, type Merchant } from './api';
import { t, useLang } from './i18n';
import { ErrorText, Sheet, confetti, toast, useAction } from './ui';

// The shop's plan, shared by every screen: one copy of /billing that the topbar, sidebar, counter and Customers page
// all read, the Free plan's customer limit shown on each, and the Founding Shop sheet that any of them opens.

// ---------------------------------------------------------------- shared billing

let current: Billing | null = null;
const listeners = new Set<(b: Billing | null) => void>();

function setBilling(b: Billing | null) {
  current = b;
  listeners.forEach((fn) => fn(b));
}

/** Fetches the plan again, e.g. after a new customer or a payment, and updates every screen showing it. */
export const refreshBilling = () => api<Billing>('billing').then((b) => (setBilling(b), b));

/** Forgets the last shop's plan, so a new login never shows it. */
export const clearBilling = () => setBilling(null);
addEventListener(LOGGED_OUT, clearBilling);

export function useBilling() {
  const [b, setB] = useState(current);
  useEffect(() => {
    listeners.add(setB);
    setB(current);
    return () => void listeners.delete(setB);
  }, []);
  return b;
}

const isFounding = (b: Billing) => b.plan === 'lifetime' || b.plan === 'yearly';

/** How close the Free plan is to its limit: '' while there's room, then 'is-warn' from 40, 'is-full' at the limit. */
function level(b: Billing & { limit: number }) {
  return b.customers >= b.limit ? 'is-full' : b.customers >= WARN_AT ? 'is-warn' : '';
}
const WARN_AT = 40;
const COUNTER_AT = 45; // the counter stays quiet until the last few places
const FEW_SEATS = 30; // "Only … left" once Founding places are running out

/** The Free plan's numbers, or null when the shop has no limit. */
function freeUsage(b: Billing | null) {
  if (!b || b.limit === null) return null;
  return { ...b, limit: b.limit, left: Math.max(0, b.limit - b.customers) };
}

function Meter({ b }: { b: Billing & { limit: number } }) {
  return (
    <span className="limit-bar" role="progressbar" aria-valuenow={b.customers} aria-valuemax={b.limit}>
      <span style={{ width: `${Math.min(100, (b.customers / b.limit) * 100)}%` }} />
    </span>
  );
}

// ---------------------------------------------------------------- the sheet

const OPEN_PLAN = 'lp-open-plan';

/** Opens the Founding Shop sheet from anywhere in the shop app. */
export const openPlan = () => dispatchEvent(new Event(OPEN_PLAN));

type Kind = 'lifetime' | 'yearly';
type Order = { orderId: string; amount: number; keyId: string; shop: string; phone: string; email: string };
type CheckoutAnswer = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayCheckout = new (options: object) => { open: () => void; on: (event: string, fn: (r: { error?: { description?: string } }) => void) => void };

/** Razorpay's checkout script, loaded the first time someone pays. */
function loadCheckout() {
  const w = window as unknown as { Razorpay?: RazorpayCheckout };
  if (w.Razorpay) return Promise.resolve(w.Razorpay);
  return new Promise<RazorpayCheckout>((resolve, reject) => {
    const s = Object.assign(document.createElement('script'), { src: 'https://checkout.razorpay.com/v1/checkout.js', async: true });
    s.onload = () => (w.Razorpay ? resolve(w.Razorpay) : reject(new Error('Could not open the payment page')));
    s.onerror = () => reject(new Error('Could not open the payment page. Check your internet and try again.'));
    document.head.appendChild(s);
  });
}

export const price = (paise: number) => `₹${num(paise / 100)}`;

/**
 * Pays for Founding Shop in Razorpay's checkout. Resolves when the checkout closes; `onPaid` runs once the plan is on,
 * which is right away, or a few seconds later when only Razorpay's webhook could confirm the payment.
 */
export async function payFounding(kind: Kind, onPaid: (b: Billing) => void) {
  const [Razorpay, order] = await Promise.all([loadCheckout(), api<Order>('billing/order', 'POST', { kind })]);
  const paid = (next: Billing) => {
    setBilling(next);
    onPaid(next);
  };
  await new Promise<void>((resolve, reject) => {
    const checkout = new Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: 'INR',
      name: 'Regularhood',
      description: kind === 'lifetime' ? 'Founding Shop · lifetime' : 'Founding Shop · 1 year',
      prefill: { name: order.shop, contact: order.phone, email: order.email },
      notes: { shop: order.shop },
      theme: { color: '#047857' },
      handler: (r: CheckoutAnswer) =>
        void api<Billing>('billing/verify', 'POST', { orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }).then(
          (next) => {
            paid(next);
            confetti();
            toast(t('Welcome, Founding Shop #{n}!', { n: next.foundingNo ?? '' }));
            resolve();
          },
          // Paid, but our check failed: Razorpay's webhook will still switch the plan on.
          () => {
            toast(t('Payment received. Your plan will switch on in a few minutes.'));
            setTimeout(() => void api<Billing>('billing').then(paid), 5000);
            resolve();
          },
        ),
      modal: {
        ondismiss: () => {
          void api('billing/checkout-event', 'POST', { orderId: order.orderId, event: 'closed' }).catch(() => {});
          resolve();
        },
      },
    });
    checkout.on('payment.failed', (r) => {
      void api('billing/checkout-event', 'POST', { orderId: order.orderId, event: 'failed', reason: r.error?.description ?? '' }).catch(() => {});
      reject(new Error(r.error?.description || 'Payment failed'));
    });
    checkout.open();
  });
}

/** Mounted once in the shop app; shows the Founding Shop sheet whenever something calls openPlan(). */
export function PlanHost({ onMerchant }: { onMerchant: (m: Merchant) => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => {
      setOpen(true);
      void refreshBilling().catch(() => {}); // fresh places left and customer count
    };
    addEventListener(OPEN_PLAN, show);
    return () => removeEventListener(OPEN_PLAN, show);
  }, []);
  return open ? <PlanSheet onMerchant={onMerchant} onClose={() => setOpen(false)} /> : null;
}

/** Founding Shop in one look: what you get, two prices, one button. The Plan page has the full details. */
function PlanSheet({ onMerchant, onClose }: { onMerchant: (m: Merchant) => void; onClose: () => void }) {
  useLang();
  const b = useBilling();
  const [kind, setKind] = useState<Kind>('lifetime');
  const { busy, error, run } = useAction();
  if (!b) return null;

  const founding = isFounding(b);
  const lapsed = b.paidPlan === 'yearly' && !founding;
  // Same rules as the Plan page: renewals can always pay, new shops need sales open and a place left.
  const soldOut = !founding && !lapsed && (!b.open || b.seats.left === 0);
  const usage = freeUsage(b);

  const buy = () =>
    void run(() =>
      payFounding(kind, () => {
        void api<Merchant>('me').then(onMerchant); // the counter and Settings switch to the Founding Shop extras
        onClose();
      }),
    );

  return (
    <Sheet className="plan-sheet" onClose={onClose}>
      <div className="plan-sheet-hero">
        <span className="plan-crown">
          <Crown size={24} />
        </span>
        <h2>{t('Founding Shop')}</h2>
        <p>
          {lapsed
            ? t('Your yearly plan has ended. Renew to add new customers again.')
            : usage && usage.left === 0
              ? t('Your {limit} free spots are full. Get unlimited to add new customers.', { limit: num(usage.limit) })
              : usage
                ? t('You’ve used {n} of {limit} free customers.', { n: num(usage.customers), limit: num(usage.limit) })
                : t('For shops that want regulars to come back without chasing them.')}
        </p>
      </div>

      <ul className="plan-sheet-perks">
        <li>
          <Users size={18} /> {t('Unlimited customers')}
        </li>
        <li>
          <MessageCircle size={18} /> {t('WhatsApp cards sent automatically')}
        </li>
        <li>
          <Star size={18} /> {t('More Google reviews')}
        </li>
      </ul>

      <div className="plan-options" role="radiogroup" aria-label={t('Choose how to pay')}>
        {(['lifetime', 'yearly'] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            className={`plan-option ${kind === k ? 'selected' : ''}`}
            disabled={busy || soldOut}
            onClick={() => setKind(k)}
          >
            <span className="plan-radio" aria-hidden />
            <span className="plan-option-main">
              <span className="plan-option-name">
                {k === 'lifetime' ? (
                  <>
                    <InfinityIcon size={16} /> {t('Lifetime')}
                  </>
                ) : (
                  t('Yearly')
                )}
              </span>
            </span>
            <span className="plan-option-price">
              <strong>{price(b.prices[k])}</strong>
              <span>{k === 'lifetime' ? t('once') : t('/ year')}</span>
            </span>
            {k === 'lifetime' && <span className="plan-best">{t('Best value')}</span>}
          </button>
        ))}
      </div>

      {!founding && !lapsed && !soldOut && (
        <p className="plan-sheet-seats">
          {t(b.seats.left <= FEW_SEATS ? 'Only {left} of {total} Founding places left' : '{left} of {total} places left', {
            left: num(b.seats.left),
            total: num(b.seats.total),
          })}
        </p>
      )}
      <ErrorText text={error} />
      <button className="btn btn-primary btn-xl" disabled={busy || soldOut} onClick={buy}>
        {soldOut
          ? !b.open
            ? t('Founding Shop is not on sale right now')
            : t('All Founding Shop places are taken')
          : busy
            ? t('Opening payment…')
            : t('Pay {price} with UPI', { price: price(b.prices[kind]) })}
      </button>
      <div className="plan-sheet-foot">
        <span>
          <RotateCcw size={14} /> {t('7-day full refund')}
        </span>
        <span>
          <Check size={14} /> {t('No auto-debit')}
        </span>
      </div>
      <a className="plan-sheet-more" href="#/plan" onClick={onClose}>
        {t('See full plan details')}
      </a>
    </Sheet>
  );
}

// ---------------------------------------------------------------- where the limit shows

/** Phone topbar: "23/50" with a thin meter, or a small crown for Founding Shops. */
export function LimitPill() {
  useLang();
  const b = useBilling();
  if (b && isFounding(b)) {
    return (
      <a className="founding-pill" href="#/plan">
        <Crown size={14} /> {t('Founding')}
      </a>
    );
  }
  const u = freeUsage(b);
  if (!u) return null;
  return (
    <button
      type="button"
      className={`limit-pill ${level(u)}`}
      onClick={openPlan}
      aria-label={t('{n} of {limit} free customers. See plans', { n: num(u.customers), limit: num(u.limit) })}
    >
      {num(u.customers)}/{num(u.limit)}
      <Meter b={u} />
    </button>
  );
}

/** Desktop sidebar: the same numbers, with room for a word. */
export function LimitCard() {
  useLang();
  const u = freeUsage(useBilling());
  if (!u) return null;
  return (
    <button type="button" className={`limit-card ${level(u)}`} onClick={openPlan}>
      <span className="limit-card-top">
        <span>{t('Free plan')}</span>
        <b>
          {num(u.customers)}/{num(u.limit)}
        </b>
      </span>
      <Meter b={u} />
      <span className="limit-go">{u.left === 0 ? t('Full · Get unlimited →') : t('Get unlimited →')}</span>
    </button>
  );
}

/**
 * One tappable line. On the counter it shows only for the last few places (`near`), so the screen stays about adding
 * visits; on the Customers page it always shows, with a meter.
 */
export function LimitStrip({ near, meter }: { near?: boolean; meter?: boolean }) {
  useLang();
  const u = freeUsage(useBilling());
  if (!u || (near && u.customers < COUNTER_AT)) return null;
  const full = u.left === 0;
  return (
    <button type="button" className={`limit-strip ${level(u)}`} onClick={openPlan}>
      <span className="limit-strip-line">
        {!meter && (full ? <Lock size={18} /> : <Users size={18} />)}
        <span className="limit-strip-text">
          {meter
            ? full
              ? t('{n}/{limit} free customers · full', { n: num(u.customers), limit: num(u.limit) })
              : t('{n}/{limit} free customers · {left} left', { n: num(u.customers), limit: num(u.limit), left: num(u.left) })
            : full
              ? t('Free plan full: no new customers')
              : t('Only {n} new customers left', { n: num(u.left) })}
        </span>
        <span className="limit-go">
          {t('Get unlimited')} <ChevronRight size={16} />
        </span>
      </span>
      {meter && <Meter b={u} />}
    </button>
  );
}

/** After a new customer's first visit: one quiet line, only once the Free plan is nearly used up. */
export function LimitAfterVisit() {
  useLang();
  const u = freeUsage(useBilling());
  if (!u || u.customers < WARN_AT) return null;
  return (
    <button type="button" className="limit-after" onClick={openPlan}>
      {u.left === 0 ? t('That was your last free customer') : t('{n} free customers left', { n: num(u.left) })}
    </button>
  );
}
