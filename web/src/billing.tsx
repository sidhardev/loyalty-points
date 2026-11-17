import { useEffect, useState, type ReactNode } from 'react';
import { Check, ChevronRight, Crown, FileSpreadsheet, Image, Lock, RotateCcw, Star, UserX, Users } from 'lucide-react';
import { api, LOGGED_OUT, num, timeZone, type Billing, type Currency, type Merchant, type PaidKind } from './api';
import { t, useLang } from './i18n';
import { ErrorText, Sheet, confetti, toast, useAction } from './ui';

// The shop's plan, shared by every screen: one copy of /billing that the topbar, sidebar, counter and Customers page
// all read, the Free plan's customer limit shown on each, the Pro sheet that any of them opens, and the card a Pro
// feature shows to a shop on Free.
//
// Free: up to the limit of customers. Pro adds what PRO_PERKS lists (server/src/plans.ts says the same); it is paid by
// the month, the year, or once for life (the limited Founding offer), always as one payment, never auto-debit.

// ---------------------------------------------------------------- shared billing

let current: Billing | null = null;
const listeners = new Set<(b: Billing | null) => void>();

function setBilling(b: Billing | null) {
  current = b;
  listeners.forEach((fn) => fn(b));
}

/** Fetches the plan again, e.g. after a new customer or a payment, and updates every screen showing it. */
const billingPath = () => `billing?tz=${encodeURIComponent(timeZone())}`;
export const refreshBilling = () => api<Billing>(billingPath()).then((b) => (setBilling(b), b));

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

export const isPro = (b: Billing) => b.plan === 'monthly' || b.plan === 'yearly' || b.plan === 'lifetime';

/** What Pro adds, in the order a shop owner cares about. The Plan page, the sheet and the locked cards show these. */
export const PRO_PERKS = [
  { id: 'unlimited', icon: Users, title: 'Unlimited customers', text: 'No customer limit. Every regular gets a card.' },
  { id: 'winback', icon: UserX, title: 'Bring back lost customers', text: 'See who stopped coming and remind them on WhatsApp in one tap.' },
  { id: 'review', icon: Star, title: 'More Google reviews', text: 'A review button on every customer’s card, and one tap to ask after a reward.' },
  { id: 'logo', icon: Image, title: 'Your logo on the card', text: 'Customers see your shop’s logo every time they open their card.' },
  { id: 'export', icon: FileSpreadsheet, title: 'Download in Excel', text: 'Your customers and every visit, as a spreadsheet.' },
] as const;
export type ProPerk = (typeof PRO_PERKS)[number]['id'];

export const KINDS: PaidKind[] = ['monthly', 'yearly', 'lifetime'];

/** How close the Free plan is to its limit: '' while there's room, then 'is-warn' from 80%, 'is-full' at the limit. */
function level(b: Billing & { limit: number }) {
  return b.customers >= b.limit ? 'is-full' : b.customers >= warnAt(b.limit) ? 'is-warn' : '';
}
const warnAt = (limit: number) => Math.ceil(limit * 0.8); // 12 of 15
const counterAt = (limit: number) => Math.ceil(limit * 0.9); // the counter stays quiet until the last few places
const FEW_SEATS = 30; // "Only … left" once lifetime places are running out

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

// ---------------------------------------------------------------- paying

const OPEN_PLAN = 'lp-open-plan';

/** Opens the Pro sheet from anywhere in the shop app. */
export const openPlan = () => dispatchEvent(new Event(OPEN_PLAN));

type Order = { orderId: string; amount: number; currency: Currency; keyId: string; shop: string; phone: string; email: string };
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

/** "₹1,499" or "$39": amounts are in paise or cents. */
export const price = (minor: number, currency: Currency = 'INR') =>
  currency === 'USD' ? `$${(minor / 100).toFixed(minor % 100 ? 2 : 0)}` : `₹${num(minor / 100)}`;

/** The pay button: UPI in India; card or PayPal for dollars. */
export const payLabel = (b: Billing, kind: PaidKind) =>
  b.currency === 'USD' ? t('Pay {price}', { price: price(b.prices[kind], 'USD') }) : t('Pay {price} with UPI', { price: price(b.prices[kind]) });

const DESCRIPTION: Record<PaidKind, string> = { monthly: 'Regularhood Pro · 1 month', yearly: 'Regularhood Pro · 1 year', lifetime: 'Regularhood Pro · lifetime' };

/**
 * Pays for Pro in Razorpay's checkout. Resolves when the checkout closes; `onPaid` runs once the plan is on, which is
 * right away, or a few seconds later when only Razorpay's webhook could confirm the payment.
 */
export async function payPro(kind: PaidKind, onPaid: (b: Billing) => void) {
  const [Razorpay, order] = await Promise.all([loadCheckout(), api<Order>('billing/order', 'POST', { kind, tz: timeZone() })]);
  const paid = (next: Billing) => {
    setBilling(next);
    onPaid(next);
  };
  await new Promise<void>((resolve, reject) => {
    const checkout = new Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: 'Regularhood',
      description: DESCRIPTION[kind],
      prefill: { name: order.shop, contact: order.phone, email: order.email },
      notes: { shop: order.shop },
      theme: { color: '#047857' },
      handler: (r: CheckoutAnswer) =>
        void api<Billing>('billing/verify', 'POST', { orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }).then(
          (next) => {
            paid(next);
            confetti();
            toast(next.plan === 'lifetime' ? t('Welcome, Founding Shop #{n}!', { n: next.foundingNo ?? '' }) : t('Welcome to Pro!'));
            resolve();
          },
          // Paid, but our check failed: Razorpay's webhook will still switch the plan on.
          () => {
            toast(t('Payment received. Your plan will switch on in a few minutes.'));
            setTimeout(() => void api<Billing>(billingPath()).then(paid), 5000);
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

/** Whether lifetime can be bought now: on sale, a place left, and not already lifetime. */
export const lifetimeOpen = (b: Billing) => b.plan !== 'lifetime' && b.open && b.seats.left > 0;

/** The ways to pay, as radio buttons. Lifetime drops out when it isn't on sale or the places are gone. */
export function PriceOptions({ b, kind, setKind, busy, notes }: { b: Billing; kind: PaidKind; setKind: (k: PaidKind) => void; busy: boolean; notes?: boolean }) {
  useLang();
  const perMonth = b.currency === 'USD' ? Math.round(b.prices.yearly / 12) : Math.round(b.prices.yearly / 12 / 100) * 100;
  const saving = Math.round((1 - b.prices.yearly / (b.prices.monthly * 12)) * 100);
  const kinds = KINDS.filter((k) => k !== 'lifetime' || lifetimeOpen(b));
  const name: Record<PaidKind, string> = { monthly: t('Monthly'), yearly: t('Yearly'), lifetime: t('Lifetime') };
  const per: Record<PaidKind, string> = { monthly: t('/ month'), yearly: t('/ year'), lifetime: t('once') };
  const note: Record<PaidKind, string> = {
    monthly: t('Try it for a month. Renew when you want.'),
    yearly: t('About {price} a month.', { price: price(perMonth, b.currency) }),
    lifetime: t('Pay once, Pro for good. Only {left} of {total} places.', { left: num(b.seats.left), total: num(b.seats.total) }),
  };
  return (
    <div className="plan-options" role="radiogroup" aria-label={t('Choose how to pay')}>
      {kinds.map((k) => (
        <button key={k} type="button" role="radio" aria-checked={kind === k} className={`plan-option ${kind === k ? 'selected' : ''}`} disabled={busy} onClick={() => setKind(k)}>
          <span className="plan-radio" aria-hidden />
          <span className="plan-option-main">
            <span className="plan-option-name">{name[k]}</span>
            {notes && <span className="plan-option-note">{note[k]}</span>}
          </span>
          <span className="plan-option-price">
            <strong>{price(b.prices[k], b.currency)}</strong>
            <span>{per[k]}</span>
          </span>
          {k === 'yearly' && saving > 0 && <span className="plan-best">{t('Save {n}%', { n: saving })}</span>}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- the sheet

/** Mounted once in the shop app; shows the Pro sheet whenever something calls openPlan(). */
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

/** Pro in one look: what you get, the prices, one button. The Plan page has the full details. */
function PlanSheet({ onMerchant, onClose }: { onMerchant: (m: Merchant) => void; onClose: () => void }) {
  useLang();
  const b = useBilling();
  const [kind, setKind] = useState<PaidKind>('yearly');
  const { busy, error, run } = useAction();
  if (!b) return null;

  const lapsed = (b.paidPlan === 'monthly' || b.paidPlan === 'yearly') && !isPro(b);
  const usage = freeUsage(b);
  const pick = kind === 'lifetime' && !lifetimeOpen(b) ? 'yearly' : kind;

  const buy = () =>
    void run(() =>
      payPro(pick, () => {
        void api<Merchant>('me').then(onMerchant); // the counter, Customers and Settings switch on the Pro features
        onClose();
      }),
    );

  return (
    <Sheet className="plan-sheet" onClose={onClose}>
      <div className="plan-sheet-hero">
        <span className="plan-crown">
          <Crown size={24} />
        </span>
        <h2>{t('Regularhood Pro')}</h2>
        <p>
          {lapsed
            ? t('Your Pro plan has ended. Renew to add new customers again.')
            : usage && usage.left === 0
              ? t('Your {limit} free spots are full. Get unlimited to add new customers.', { limit: num(usage.limit) })
              : usage
                ? t('You’ve used {n} of {limit} free customers.', { n: num(usage.customers), limit: num(usage.limit) })
                : t('For shops that want regulars to come back without chasing them.')}
        </p>
      </div>

      <ul className="plan-sheet-perks">
        {PRO_PERKS.map(({ id, icon: Icon, title }) => (
          <li key={id}>
            <Icon size={18} /> {t(title)}
          </li>
        ))}
      </ul>

      <PriceOptions b={b} kind={pick} setKind={setKind} busy={busy} />

      {pick === 'lifetime' && b.seats.left <= FEW_SEATS && (
        <p className="plan-sheet-seats">{t('Only {left} of {total} lifetime places left', { left: num(b.seats.left), total: num(b.seats.total) })}</p>
      )}
      <ErrorText text={error} />
      <button className="btn btn-primary btn-xl" disabled={busy} onClick={buy}>
        {busy ? t('Opening payment…') : payLabel(b, pick)}
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

/** What a Pro feature shows a shop on Free: the feature, why it helps, and the way to Pro. */
export function ProLock({ perk, children }: { perk: ProPerk; children?: ReactNode }) {
  useLang();
  const p = PRO_PERKS.find((x) => x.id === perk)!;
  const Icon = p.icon;
  return (
    <section className="card pro-lock">
      <div className="card-head">
        <h2>
          <Icon size={18} /> {t(p.title)}
        </h2>
        <span className="badge badge-gold">
          <Crown size={13} /> {t('Pro')}
        </span>
      </div>
      <p className="muted small">{t(p.text)}</p>
      {children}
      <button type="button" className="btn btn-primary" onClick={openPlan}>
        <Crown size={17} /> {t('Get Pro')}
      </button>
    </section>
  );
}

// ---------------------------------------------------------------- where the limit shows

/** Phone topbar: "9/15" with a thin meter, or a small crown for Pro shops. */
export function LimitPill() {
  useLang();
  const b = useBilling();
  if (b && isPro(b)) {
    return (
      <a className="founding-pill" href="#/plan">
        <Crown size={14} /> {t('Pro')}
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
  if (!u || (near && u.customers < counterAt(u.limit))) return null;
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
  if (!u || u.customers < warnAt(u.limit)) return null;
  return (
    <button type="button" className="limit-after" onClick={openPlan}>
      {u.left === 0 ? t('That was your last free customer') : t('{n} free customers left', { n: num(u.left) })}
    </button>
  );
}
