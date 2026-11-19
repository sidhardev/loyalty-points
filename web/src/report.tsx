import { useEffect, useState, type FormEvent } from 'react';
import { ChevronRight, Crown, Lock, MessageCircle, TrendingUp } from 'lucide-react';
import { api, num, type Merchant } from './api';
import { counterAt, freeUsage, isPro, level, openPlan, price, showAt, useBilling } from './billing';
import { t, useLang } from './i18n';
import { useDataVersion } from './ui';

// The monthly report (server/src/report.ts): how often regulars came back this month and, with the shop's average
// bill, about how much money that is, next to what Pro costs. Shown on the Customers page; the counter has one line.

type Month = { month: string; visits: number; regularVisits: number; regulars: number; newCustomers: number; wonBack: number; reminded: number; broughtBack: number };
export type Report = { avgBill: number; inactiveDays: number; notSeen: number; reminderDays: number; current: Month; previous: Month };

/** Each country's own money, for the shop's average bill. */
const CURRENCY: Record<string, string> = {
  IN: 'INR', AE: 'AED', SA: 'SAR', QA: 'QAR', KW: 'KWD', OM: 'OMR', BH: 'BHD', NP: 'NPR', BD: 'BDT', LK: 'LKR', SG: 'SGD', GB: 'GBP', US: 'USD', CA: 'CAD', AU: 'AUD',
};

/** An amount in the shop's own money, rounded: "₹4,600", "AED 230". */
export function money(amount: number, countryCode = 'IN') {
  const currency = CURRENCY[countryCode] ?? 'INR';
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${num(Math.round(amount))}`;
  }
}

const monthName = (ym: string) => new Date(`${ym}-15T00:00:00`).toLocaleString('en-IN', { month: 'long' });

const tz = () => -new Date().getTimezoneOffset();

export function useReport() {
  const [report, setReport] = useState<Report | null>(null);
  const version = useDataVersion();
  useEffect(() => void api<Report>(`report?tz=${tz()}`).then(setReport).catch(() => {}), [version]);
  return [report, setReport] as const;
}

/** One line under "Today" on the counter: "This month: regulars came back 23 times · about ₹4,600". */
export function ReportLine({ merchant }: { merchant: Merchant }) {
  useLang();
  const [r] = useReport();
  if (!r || !r.current.visits) return null;
  // Before anyone comes back: say what this line will show, so the first return visit is something to look for.
  if (!r.current.regularVisits) {
    return (
      <a className="report-line" href="#/customers">
        <TrendingUp size={15} />{' '}
        {r.current.newCustomers === 1
          ? t('This month: 1 new customer on your card. When they come back, it shows here.')
          : t('This month: {n} new customers on your card. When they come back, it shows here.', { n: num(r.current.newCustomers) })}
      </a>
    );
  }
  return (
    <a className="report-line" href="#/customers">
      <TrendingUp size={15} />{' '}
      {r.current.regularVisits === 1 ? t('This month: a regular came back once') : t('This month: regulars came back {n} times', { n: num(r.current.regularVisits) })}
      {r.avgBill > 0 && <> · <b>{t('about {money}', { money: money(r.current.regularVisits * r.avgBill, merchant.country) })}</b></>}
    </a>
  );
}

/**
 * The Free plan's places, once 10 of 15 are used (`near`: only the last few, on the counter), told as what the card
 * has already brought in rather than as a countdown. Tap for plans.
 */
export function LimitValue({ merchant, near }: { merchant: Merchant; near?: boolean }) {
  useLang();
  const u = freeUsage(useBilling());
  const [r] = useReport();
  if (!u || u.customers < (near ? counterAt(u.limit) : showAt(u.limit))) return null;
  const back = r?.current.regularVisits ?? 0;
  const avgBill = r?.avgBill ?? 0;
  const full = u.left === 0;
  const earned =
    back > 0 && avgBill > 0
      ? t('Regulars came back {n} times this month, about {money}.', { n: num(back), money: money(back * avgBill, merchant.country) })
      : back > 0
        ? t('Regulars came back {n} times this month.', { n: num(back) })
        : '';
  const places = !full
    ? t('{n} of {limit} free places left.', { n: num(u.left), limit: num(u.limit) })
    : u.graceLeft > 0
      ? t('Free plan full. {n} more new customers can still join.', { n: num(u.graceLeft) })
      : t('Free plan full: new customers can’t get a card.');
  return (
    <button type="button" className={`limit-strip ${level(u)}`} onClick={openPlan}>
      <span className="limit-strip-line">
        {full ? <Lock size={18} /> : <TrendingUp size={18} />}
        <span className="limit-strip-text">
          {earned && <b>{earned} </b>}
          {places}
        </span>
        <span className="limit-go">
          {t('Get unlimited')} <ChevronRight size={16} />
        </span>
      </span>
    </button>
  );
}

/** The report card at the top of the Customers page. */
export function ReportCard({ merchant, onSaved }: { merchant: Merchant; onSaved: (m: Merchant) => void }) {
  useLang();
  const [r, setReport] = useReport();
  const b = useBilling();
  if (!r) return null;
  const { current: c, previous: p, avgBill } = r;
  const pro = merchant.pro;
  const value = (n: number) => money(n * avgBill, merchant.country);
  const proPrice = b ? price(b.prices.monthly, b.currency) : '';

  return (
    <section className="card report">
      <div className="card-head">
        <h2>
          <TrendingUp size={18} /> {t('{month} so far', { month: monthName(c.month) })}
        </h2>
        {p.visits > 0 && (
          <span className="small muted">
            {t('{month}: {n} return visits', { month: monthName(p.month), n: num(p.regularVisits) })}
            {avgBill > 0 && ` · ${value(p.regularVisits)}`}
          </span>
        )}
      </div>

      <div className="report-main">
        <div>
          <strong className="report-big tabular">{num(c.regularVisits)}</strong>
          <span>{c.regularVisits === 1 ? t('time a regular came back') : t('times regulars came back')}</span>
        </div>
        {avgBill > 0 && (
          <div>
            <strong className="report-big tabular">{value(c.regularVisits)}</strong>
            <span>{t('about, at {money} a visit', { money: money(avgBill, merchant.country) })}</span>
          </div>
        )}
      </div>

      <p className="small muted report-facts">
        {t('{n} regulars', { n: num(c.regulars) })} · {t('{n} new customers', { n: num(c.newCustomers) })}
        {c.wonBack > 0 && <> · {t('{n} came back after {d}+ days away', { n: num(c.wonBack), d: r.inactiveDays })}</>}
      </p>

      {!avgBill && <AvgBillForm merchant={merchant} onSaved={(m) => { onSaved(m); setReport({ ...r, avgBill: m.avgBill }); }} />}

      {pro ? (
        c.broughtBack > 0 ? (
          <p className="report-win">
            <MessageCircle size={16} />
            <span>
              {t('Your reminders brought back {n} customers', { n: num(c.broughtBack) })}
              {avgBill > 0 && <> {t('(about {money})', { money: value(c.broughtBack) })}</>}
              {proPrice && b && isPro(b) && b.plan !== 'lifetime' && <>. {t('Pro costs {price} a month.', { price: proPrice })}</>}
            </span>
          </p>
        ) : r.notSeen > 0 ? (
          <a className="report-win" href="#/customers?filter=inactive">
            <MessageCircle size={16} />
            <span>{t('{n} customers haven’t come for {d} days. Remind them now →', { n: num(r.notSeen), d: r.inactiveDays })}</span>
          </a>
        ) : null
      ) : r.notSeen > 0 ? (
        <div className="report-win report-locked">
          <Crown size={16} />
          <span>
            {t('{n} customers haven’t come for {d} days.', { n: num(r.notSeen), d: r.inactiveDays })}{' '}
            {avgBill > 0
              ? t('If half came back once, that is about {money}.', { money: value(Math.ceil(r.notSeen / 2)) })
              : t('Pro reminds them on WhatsApp in one tap.')}
            {proPrice && <> {t('Pro is {price} a month.', { price: proPrice })}</>}
          </span>
          <button type="button" className="btn btn-primary btn-sm" onClick={openPlan}>
            {t('Get Pro')}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function AvgBillForm({ merchant, onSaved }: { merchant: Merchant; onSaved: (m: Merchant) => void }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onSaved(await api<Merchant>('me', 'PATCH', { avgBill: Math.round(Number(value)) }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="report-bill" onSubmit={save}>
      <label htmlFor="avg-bill">{t('What does a customer spend on one visit, about?')}</label>
      <div className="report-bill-row">
        <input id="avg-bill" type="number" inputMode="numeric" min="1" max="1000000" step="1" placeholder={money(100, merchant.country)} value={value} onChange={(e) => setValue(e.target.value)} required />
        <button className="btn btn-primary btn-sm" disabled={busy || !value}>
          {t('Show in money')}
        </button>
      </div>
      {error && <p className="small" style={{ color: 'var(--bad)', margin: 0 }}>{error}</p>}
    </form>
  );
}
