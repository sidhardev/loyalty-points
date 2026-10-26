import { useCallback, useEffect, useState } from 'react';
import { Check, Crown, Infinity as InfinityIcon, Users } from 'lucide-react';
import { api, num, parseTime, type Billing, type Merchant } from '../api';
import { t, useLang } from '../i18n';
import { ErrorText, Skeleton, confetti, toast, useAction } from '../ui';

// The shop's plan: Free (up to 50 customers) or Founding Shop (no limit), bought once for life or for a year through
// Razorpay's checkout. Only the first few shops can be Founding Shops; the page says how many places are left.

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

const price = (paise: number) => `₹${num(paise / 100)}`;
const date = (sqlTime: string) => parseTime(sqlTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export function Plan({ merchant }: { merchant: Merchant }) {
  useLang();
  const [b, setB] = useState<Billing | null>(null);
  const { busy, error, setError, run } = useAction();
  const load = useCallback(() => void api<Billing>('billing').then(setB, (e: Error) => setError(e.message)), [setError]);
  useEffect(load, [load]);

  const buy = (kind: 'lifetime' | 'yearly') =>
    void run(async () => {
      const [Razorpay, order] = await Promise.all([loadCheckout(), api<Order>('billing/order', 'POST', { kind })]);
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
                setB(next);
                confetti();
                toast(t('Welcome, Founding Shop #{n}!', { n: next.foundingNo ?? '' }));
                resolve();
              },
              // Paid, but our check failed: Razorpay's webhook will still switch the plan on.
              () => {
                toast(t('Payment received. Your plan will switch on in a few minutes.'));
                setTimeout(load, 5000);
                resolve();
              },
            ),
          modal: { ondismiss: () => resolve() },
        });
        checkout.on('payment.failed', (r) => reject(new Error(r.error?.description || 'Payment failed')));
        checkout.open();
      });
    });

  if (!b) {
    return (
      <div className="card">
        <ErrorText text={error} />
        <Skeleton h={28} w="40%" />
        <Skeleton h={120} />
      </div>
    );
  }

  const founding = b.plan === 'lifetime' || b.plan === 'yearly';
  const soldOut = b.seats.left === 0 && !founding && b.paidPlan !== 'yearly';
  const taken = b.seats.total - b.seats.left;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>{t('Your plan')}</h1>
          <p>{merchant.name}</p>
        </div>
      </header>

      <section className="card plan-now">
        <div className="card-head">
          <h2>
            {founding ? <Crown size={18} /> : <Users size={18} />}{' '}
            {founding ? t('Founding Shop #{n}', { n: b.foundingNo ?? '' }) : b.plan === 'grandfathered' ? t('Early shop') : t('Free')}
          </h2>
          {b.plan === 'lifetime' && <span className="badge badge-plus">{t('For life')}</span>}
          {b.plan === 'yearly' && b.expiresAt && <span className="badge badge-plus">{t('Until {date}', { date: date(b.expiresAt) })}</span>}
        </div>
        {b.limit === null ? (
          <p className="muted" style={{ margin: 0 }}>
            {t('{n} customers · no limit', { n: num(b.customers) })}
          </p>
        ) : (
          <>
            <p className="muted" style={{ margin: 0 }}>
              {t('{n} of {limit} customers on the Free plan', { n: num(b.customers), limit: num(b.limit) })}
            </p>
            <div className="plan-meter" role="progressbar" aria-valuenow={b.customers} aria-valuemax={b.limit}>
              <span style={{ width: `${Math.min(100, (b.customers / b.limit) * 100)}%` }} className={b.customers >= b.limit ? 'full' : ''} />
            </div>
            {b.paidPlan === 'yearly' && <p className="alert alert-error">{t('Your yearly plan has ended. Renew to add new customers again.')}</p>}
          </>
        )}
        {b.plan === 'grandfathered' && (
          <p className="muted small" style={{ margin: 0 }}>
            {t('You joined before plans existed, so you keep every feature with no limit. Thank you!')}
          </p>
        )}
      </section>

      {b.plan !== 'lifetime' && (
        <section className="card">
          <div className="card-head">
            <h2>
              <Crown size={18} /> {t('Become a Founding Shop')}
            </h2>
            <span className={`badge ${soldOut ? 'badge-minus' : 'badge-plus'}`}>
              {soldOut ? t('All places taken') : t('{left} of {total} places left', { left: num(b.seats.left), total: num(b.seats.total) })}
            </span>
          </div>
          <div className="plan-seats" aria-hidden>
            <span style={{ width: `${(taken / b.seats.total) * 100}%` }} />
          </div>
          <ul className="plan-perks">
            {[t('Unlimited customers'), t('Price locked for as long as you stay'), t('Every new feature we add'), t('Your Founding Shop number, for good')].map((p) => (
              <li key={p}>
                <Check size={16} /> {p}
              </li>
            ))}
          </ul>
          <ErrorText text={error} />
          <div className="plan-options">
            <button className="plan-option best" disabled={busy || soldOut} onClick={() => buy('lifetime')}>
              <span className="badge badge-plus">{t('Best value')}</span>
              <strong>{price(b.prices.lifetime)}</strong>
              <span>
                <InfinityIcon size={15} /> {t('Once, for life')}
              </span>
            </button>
            <button className="plan-option" disabled={busy || soldOut} onClick={() => buy('yearly')}>
              <strong>{price(b.prices.yearly)}</strong>
              <span>{b.plan === 'yearly' || b.paidPlan === 'yearly' ? t('Renew for 1 more year') : t('A year, renew at the same price')}</span>
            </button>
          </div>
          <p className="muted small" style={{ margin: 0 }}>
            {t('Pay by UPI, card or net banking through Razorpay. Full refund within 7 days if it is not for you.')}{' '}
            <a href="/refunds" target="_blank" rel="noreferrer">
              {t('Refund policy')}
            </a>
          </p>
        </section>
      )}
    </>
  );
}
