import { useEffect, useState } from 'react';
import { BellRing, Check, Crown, Infinity as InfinityIcon, Lock, MessageCircle, RotateCcw, ShieldCheck, Star, Users, X } from 'lucide-react';
import { api, num, parseTime, type Merchant } from '../api';
import { payFounding, price, refreshBilling, useBilling } from '../billing';
import { t, useLang } from '../i18n';
import { ErrorText, Skeleton, useAction } from '../ui';

// The shop's plan: Free (a customer limit) or Founding Shop, bought once for life or for a year through Razorpay's
// checkout. Founding Shop has no customer limit, sends customers WhatsApp messages by itself and asks for Google
// reviews. Only the first few shops can be Founding Shops; the page says how many places are left.

type Kind = 'lifetime' | 'yearly';

const date = (sqlTime: string) => parseTime(sqlTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** What Founding Shop adds, in the order a shop owner cares about. */
const PERKS = [
  { icon: Users, title: 'Unlimited customers', text: 'No customer limit. Every regular gets a card.' },
  { icon: MessageCircle, title: 'Automatic WhatsApp', text: 'Their card after every visit and “reward ready”, sent for you. No tapping at the counter.' },
  { icon: BellRing, title: '“We miss you” by itself', text: 'Customers who stop coming get a reminder with their stamps, once.' },
  { icon: Star, title: 'More Google reviews', text: 'After a reward, customers get your review link. More reviews, higher on Maps.' },
  { icon: Lock, title: 'Founding price, locked', text: 'Every feature we add later, without paying more.' },
];

/** Free vs Founding Shop, row by row. */
const COMPARE: [string, boolean | string, boolean | string][] = [
  ['Customers', 'Limited', 'Unlimited'],
  ['Stamp card, poster, status image', true, true],
  ['Send card on WhatsApp (one tap)', true, true],
  ['Card and “reward ready” sent automatically', false, true],
  ['“We miss you” sent automatically', false, true],
  ['Google review requests', false, true],
];

export function Plan({ merchant, onMerchant }: { merchant: Merchant; onMerchant: (m: Merchant) => void }) {
  useLang();
  const b = useBilling();
  const [kind, setKind] = useState<Kind>('lifetime');
  const { busy, error, setError, run } = useAction();
  useEffect(() => void refreshBilling().catch((e: Error) => setError(e.message)), [setError]);

  const buy = () =>
    void run(() =>
      payFounding(kind, () => void api<Merchant>('me').then(onMerchant)), // the counter and Settings switch to the Founding Shop extras
    );

  if (!b) {
    return (
      <div className="plan-page">
        <ErrorText text={error} />
        <Skeleton h={120} />
        <Skeleton h={380} />
      </div>
    );
  }

  const founding = b.plan === 'lifetime' || b.plan === 'yearly';
  const lapsed = b.paidPlan === 'yearly' && !founding;
  // Shops renewing a yearly plan can always pay; new ones need sales to be open and a place left.
  const closed = !b.open && !founding && !lapsed;
  const soldOut = closed || (b.seats.left === 0 && !founding && !lapsed);
  const taken = b.seats.total - b.seats.left;
  // Lifetime costs this many years of the yearly plan.
  const years = Math.round((b.prices.lifetime / b.prices.yearly) * 10) / 10;

  return (
    <div className="plan-page">
      <header className="page-head">
        <div>
          <h1>{t('Your plan')}</h1>
          <p>{merchant.name}</p>
        </div>
      </header>

      {/* where the shop stands now */}
      <section className={`card plan-now ${founding ? 'is-founding' : ''}`}>
        <div className="plan-now-head">
          <span className="plan-now-icon">{founding ? <Crown size={22} /> : <Users size={22} />}</span>
          <div>
            <span className="plan-now-label">{t('Current plan')}</span>
            <strong>{founding ? t('Founding Shop #{n}', { n: b.foundingNo ?? '' }) : b.plan === 'grandfathered' ? t('Early shop') : t('Free')}</strong>
          </div>
          {b.plan === 'lifetime' && <span className="badge badge-plus">{t('For life')}</span>}
          {b.plan === 'yearly' && b.expiresAt && <span className="badge badge-plus">{t('Until {date}', { date: date(b.expiresAt) })}</span>}
        </div>
        {b.limit === null ? (
          <p className="plan-now-line">{t('{n} customers · no limit', { n: num(b.customers) })}</p>
        ) : (
          <div className="plan-now-usage">
            <div className="plan-now-line">
              <span>{t('{n} of {limit} customers on the Free plan', { n: num(b.customers), limit: num(b.limit) })}</span>
              <b>{num(Math.max(0, b.limit - b.customers))} {t('left')}</b>
            </div>
            <div className="plan-meter" role="progressbar" aria-valuenow={b.customers} aria-valuemax={b.limit}>
              <span style={{ width: `${Math.min(100, (b.customers / b.limit) * 100)}%` }} className={b.customers >= b.limit ? 'full' : ''} />
            </div>
          </div>
        )}
        {lapsed && <p className="alert alert-error small">{t('Your yearly plan has ended. Renew to add new customers again.')}</p>}
        {b.plan === 'grandfathered' && <p className="muted small plan-now-line">{t('You joined before plans existed, so you keep unlimited customers. Founding Shop adds automatic WhatsApp and Google reviews.')}</p>}
        {founding && (
          <a className="btn btn-soft plan-now-cta" href="#/settings">
            <MessageCircle size={17} /> {t('Set up automatic WhatsApp and reviews')}
          </a>
        )}
      </section>

      {b.plan !== 'lifetime' && (
        <section className="card plan-offer">
          <div className="plan-offer-head">
            <span className="plan-crown">
              <Crown size={20} />
            </span>
            <div>
              <h2>{b.plan === 'yearly' ? t('Renew or go lifetime') : t('Become a Founding Shop')}</h2>
              <p className="muted small">{t('For shops that want regulars to come back without chasing them.')}</p>
            </div>
          </div>

          <div className="plan-seats-row">
            <span>{closed ? t('Not on sale right now') : soldOut ? t('All places taken') : t('{left} of {total} places left', { left: num(b.seats.left), total: num(b.seats.total) })}</span>
            <div className="plan-seats" aria-hidden>
              <span style={{ width: `${Math.max(2, (taken / b.seats.total) * 100)}%` }} />
            </div>
          </div>

          <ul className="plan-perks">
            {PERKS.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <span className="plan-perk-icon">
                  <Icon size={18} />
                </span>
                <span>
                  <strong>{t(title)}</strong>
                  <span>{t(text)}</span>
                </span>
              </li>
            ))}
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
                  <span className="plan-option-note">
                    {k === 'lifetime' ? t('Pay once, use for good. Same as {y} years of yearly.', { y: years }) : t('Renew each year at the same price. Nothing charged automatically.')}
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

          <ErrorText text={error} />
          <button className="btn btn-primary btn-xl plan-pay" disabled={busy || soldOut} onClick={buy}>
            {busy ? t('Opening payment…') : t('Pay {price} with UPI', { price: price(b.prices[kind]) })}
          </button>
          <ul className="plan-trust">
            <li>
              <ShieldCheck size={15} /> {t('UPI, cards, net banking via Razorpay')}
            </li>
            <li>
              <RotateCcw size={15} /> {t('Full refund within 7 days')}{' '}
              <a href="/refunds" target="_blank" rel="noreferrer">
                {t('Policy')}
              </a>
            </li>
            <li>
              <Check size={15} /> {t('No auto-debit')}
            </li>
          </ul>
        </section>
      )}

      {!founding && (
        <section className="card plan-compare">
          <h2>{t('Free vs Founding Shop')}</h2>
          <table>
            <thead>
              <tr>
                <th />
                <th>{t('Free')}</th>
                <th>
                  <Crown size={14} /> {t('Founding')}
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([label, free, paid]) => (
                <tr key={label}>
                  <td>{t(label)}</td>
                  {[free, paid].map((v, i) => (
                    <td key={i} className={v === false ? 'no' : 'yes'}>
                      {typeof v === 'string' ? t(v) : v ? <Check size={17} aria-label={t('Yes')} /> : <X size={16} aria-label={t('No')} />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
