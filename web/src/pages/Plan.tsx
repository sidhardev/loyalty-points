import { useEffect, useState } from 'react';
import { Check, Crown, RotateCcw, Settings as SettingsIcon, ShieldCheck, Users, X } from 'lucide-react';
import { api, num, parseTime, type Merchant } from '../api';
import { isPro, payLabel, WhyPro, type BuyKind, payPro, PriceOptions, PRO_PERKS, refreshBilling, useBilling } from '../billing';
import { t, useLang } from '../i18n';
import { ErrorText, Skeleton, useAction } from '../ui';

// The shop's plan: Free (a customer limit) or Pro, bought for a month or a year through Razorpay's
// checkout. What Pro adds is PRO_PERKS (billing.tsx); the server checks the same list (plans.ts).

const date = (sqlTime: string) => parseTime(sqlTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** Free vs Pro, row by row. */
const COMPARE: [string, boolean | string, boolean | string][] = [
  ['Customers', 'Limited', 'Unlimited'],
  ['Stamp card, poster, status image', true, true],
  ['Send card on WhatsApp (one tap)', true, true],
  ['List of customers who stopped coming, with reminders', false, true],
  ['Google review button and request', false, true],
  ['Your logo on the card', false, true],
  ['Download in Excel', false, true],
];

export function Plan({ merchant, onMerchant }: { merchant: Merchant; onMerchant: (m: Merchant) => void }) {
  useLang();
  const b = useBilling();
  const [kind, setKind] = useState<BuyKind>('yearly');
  const { busy, error, setError, run } = useAction();
  useEffect(() => void refreshBilling().catch((e: Error) => setError(e.message)), [setError]);

  if (!b) {
    return (
      <div className="plan-page">
        <ErrorText text={error} />
        <Skeleton h={120} />
        <Skeleton h={380} />
      </div>
    );
  }

  const pro = isPro(b);
  const lapsed = (b.paidPlan === 'monthly' || b.paidPlan === 'yearly') && !pro;
  const pick = kind;
  const buy = () => void run(() => payPro(pick, () => void api<Merchant>('me').then(onMerchant)));
  const current = b.plan === 'lifetime' ? t('Pro · Founding Shop #{n}', { n: b.foundingNo ?? '' }) : pro ? t('Pro') : t('Free');

  return (
    <div className="plan-page">
      <header className="page-head">
        <div>
          <h1>{t('Your plan')}</h1>
          <p>{merchant.name}</p>
        </div>
      </header>

      {/* where the shop stands now */}
      <section className={`card plan-now ${pro ? 'is-founding' : ''}`}>
        <div className="plan-now-head">
          <span className="plan-now-icon">{pro ? <Crown size={22} /> : <Users size={22} />}</span>
          <div>
            <span className="plan-now-label">{t('Current plan')}</span>
            <strong>{current}</strong>
          </div>
          {b.plan === 'lifetime' && <span className="badge badge-plus">{t('For life')}</span>}
          {(b.plan === 'monthly' || b.plan === 'yearly') && b.expiresAt && <span className="badge badge-plus">{t('Until {date}', { date: date(b.expiresAt) })}</span>}
        </div>
        {b.limit === null ? (
          <p className="plan-now-line">{t('{n} customers · no limit', { n: num(b.customers) })}</p>
        ) : (
          <div className="plan-now-usage">
            <div className="plan-now-line">
              <span>{t('{n} of {limit} customers on the Free plan', { n: num(b.customers), limit: num(b.limit) })}</span>
              <b>
                {num(Math.max(0, b.limit - b.customers))} {t('left')}
              </b>
            </div>
            <div className="plan-meter" role="progressbar" aria-valuenow={b.customers} aria-valuemax={b.limit}>
              <span style={{ width: `${Math.min(100, (b.customers / b.limit) * 100)}%` }} className={b.customers >= b.limit ? 'full' : ''} />
            </div>
          </div>
        )}
        {lapsed && <p className="alert alert-error small">{t('Your Pro plan has ended. Renew to add new customers again.')}</p>}
        {pro && (
          <a className="btn btn-soft plan-now-cta" href="#/settings">
            <SettingsIcon size={17} /> {t('Add your logo and Google review link')}
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
              <h2>{pro ? t('Add more time') : t('Get Regularhood Pro')}</h2>
              <p className="muted small">{t('For shops that want regulars to come back without chasing them.')}</p>
            </div>
          </div>

          <ul className="plan-perks">
            {PRO_PERKS.map(({ id, icon: Icon, title, text }) => (
              <li key={id}>
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

          <WhyPro b={b} />
          <PriceOptions b={b} kind={pick} setKind={setKind} busy={busy} notes />
          {pro && <p className="muted small">{t('Time you buy now is added after your current plan ends.')}</p>}

          <ErrorText text={error} />
          <button className="btn btn-primary btn-xl plan-pay" disabled={busy} onClick={buy}>
            {busy ? t('Opening payment…') : payLabel(b, pick)}
          </button>
          <ul className="plan-trust">
            <li>
              <ShieldCheck size={15} /> {b.currency === 'USD' ? t('Card or PayPal, in US dollars, via Razorpay') : t('UPI, cards, net banking via Razorpay')}
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

      {!pro && (
        <section className="card plan-compare">
          <h2>{t('Free vs Pro')}</h2>
          <table>
            <thead>
              <tr>
                <th />
                <th>{t('Free')}</th>
                <th>
                  <Crown size={14} /> {t('Pro')}
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
