import { useCallback, useEffect, useState } from 'react';
import { Activity as ActivityIcon, Cake, ChevronRight, Coins, Gift, IndianRupee, Plus, Repeat, TrendingDown, TrendingUp, Users, UserX } from 'lucide-react';
import { api, birthdayLabel, num, rupees, walletUrl, whatsapp, type Customer, type Merchant, type Transaction } from '../api';
import { Activity, Avatar, EmptyState, InstallBanner, Skeleton, SkeletonRows, openGivePoints, useDataVersion } from '../ui';

type Comeback = { customers: number; visits: number; sales: number; wonBack: number; allSales: number; rewards: number };

type DashboardData = {
  totals: { customers: number; issued: number; redeemed: number; redemptions: number; sales: number; inactive: number };
  today: { visits: number; points: number; sales: number };
  birthdays: (Customer & { daysUntilBirthday: number })[];
  recent: Transaction[];
  comeback: { current: Comeback; previous: Comeback };
};

/**
 * The answer to "is this working?": how much customers who came back spent in the last 30 days,
 * compared with the 30 days before.
 */
function ComebackCard({ data, merchant }: { data: DashboardData['comeback'] | undefined; merchant: Merchant }) {
  if (!data) {
    return (
      <section className="comeback">
        <Skeleton h={22} w="50%" />
        <Skeleton h={44} w="40%" />
        <Skeleton h={16} w="70%" />
      </section>
    );
  }
  const { current: now, previous: before } = data;

  if (!now.visits) {
    return (
      <section className="comeback">
        <div className="comeback-head">
          <h2>
            <Repeat size={18} /> Customers who came back
          </h2>
          <span>Last 30 days</span>
        </div>
        <p className="comeback-empty">
          When customers return, you'll see here how much they spend. Give points on every bill — and try a{' '}
          <a href="#/settings">welcome bonus</a> or a <a href="#/customers?filter=inactive">"we miss you" message</a> to bring them back.
        </p>
      </section>
    );
  }

  const change = before.sales > 0 ? Math.round(((now.sales - before.sales) / before.sales) * 100) : null;
  const share = now.allSales > 0 ? Math.round((now.sales / now.allSales) * 100) : 0;
  const Trend = change !== null && change < 0 ? TrendingDown : TrendingUp;

  return (
    <section className="comeback">
      <div className="comeback-head">
        <h2>
          <Repeat size={18} /> Customers who came back
        </h2>
        <span>Last 30 days</span>
      </div>
      <div className="comeback-main">
        <strong className="tabular">{rupees(now.sales)}</strong>
        <span>
          spent by <b>{num(now.customers)}</b> returning customer{now.customers === 1 ? '' : 's'} on <b>{num(now.visits)}</b> repeat visit
          {now.visits === 1 ? '' : 's'}
        </span>
      </div>
      {change !== null ? (
        <span className={`trend ${change < 0 ? 'down' : 'up'}`}>
          <Trend size={15} /> {change >= 0 ? '+' : ''}
          {num(change)}% vs the 30 days before ({rupees(before.sales)})
        </span>
      ) : (
        <span className="trend up">
          <TrendingUp size={15} /> Your first month of returning customers
        </span>
      )}
      <div className="comeback-facts">
        <div>
          <strong className="tabular">{share}%</strong>
          <span>of sales</span>
        </div>
        <a href="#/customers?filter=inactive">
          <strong className="tabular">{num(now.wonBack)}</strong>
          <span>back after {merchant.inactiveDays}+ days</span>
        </a>
        <div>
          <strong className="tabular">{num(now.rewards)}</strong>
          <span>reward{now.rewards === 1 ? '' : 's'} given</span>
        </div>
      </div>
      <p className="comeback-note">A return visit is any bill after a customer's first one.</p>
    </section>
  );
}

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export function Dashboard({ merchant }: { merchant: Merchant }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const version = useDataVersion();
  const load = useCallback(() => {
    api<DashboardData>(`dashboard?tz=${-new Date().getTimezoneOffset()}`).then(setData);
  }, []);
  useEffect(load, [load, version]);

  const t = data?.totals;
  const stats = [
    { icon: Users, label: 'Customers', value: t && num(t.customers) },
    { icon: Coins, label: 'Points given', value: t && num(t.issued) },
    { icon: Gift, label: 'Rewards redeemed', value: t && num(t.redemptions), sub: t && `${num(t.redeemed)} points` },
    { icon: IndianRupee, label: 'Sales with points', value: t && rupees(t.sales) },
  ];

  return (
    <>
      <header className="page-head">
        <div>
          <p style={{ marginTop: 0 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} · {merchant.name}
          </p>
          <h1>{greeting()} 👋</h1>
        </div>
      </header>

      <InstallBanner id="shop" title="Install Regularhood on this phone" text="Opens in one tap from your home screen." />

      <section className="hero-cta">
        <div className="hero-cta-top">
          <div>
            <h2>Customer at the counter?</h2>
            <p>Give points in seconds — show a bill QR, scan their card, or type their number.</p>
          </div>
          <button className="btn btn-lg" onClick={() => openGivePoints()}>
            <Plus size={20} /> Give points
          </button>
        </div>
        <div className="today">
          <div>
            <span>Visits today</span>
            <strong>{data ? num(data.today.visits) : '—'}</strong>
          </div>
          <div>
            <span>Points today</span>
            <strong>{data ? num(data.today.points) : '—'}</strong>
          </div>
          <div>
            <span>Sales today</span>
            <strong>{data ? rupees(data.today.sales) : '—'}</strong>
          </div>
        </div>
      </section>

      <ComebackCard data={data?.comeback} merchant={merchant} />

      <section className="stats">
        {stats.map(({ icon: Icon, label, value, sub }) => (
          <div className="stat" key={label}>
            <span className="stat-label">
              <Icon size={16} /> {label}
            </span>
            {value !== undefined ? <strong>{value}</strong> : <Skeleton h={30} w="60%" />}
            {sub && <em>{sub}</em>}
          </div>
        ))}
      </section>

      {t && t.inactive > 0 && (
        <a className="notice" href="#/customers?filter=inactive">
          <span className="notice-icon">
            <UserX size={18} />
          </span>
          <div>
            <strong>
              {num(t.inactive)} customer{t.inactive === 1 ? " hasn't" : "s haven't"} visited in {merchant.inactiveDays} days
            </strong>
            <div className="small muted">Send a "we miss you" message with their points.</div>
          </div>
          <ChevronRight size={18} />
        </a>
      )}

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>
              <Cake size={18} /> Birthdays this week
            </h2>
          </div>
          {!data ? (
            <SkeletonRows count={2} />
          ) : data.birthdays.length ? (
            <ul className="rows">
              {data.birthdays.map((c) => (
                <li key={c.id}>
                  <div className="row-item">
                    <Avatar name={c.name} />
                    <a className="row-main" href={`#/customers/${c.id}`} style={{ color: 'inherit' }}>
                      <strong>{c.name}</strong>
                      <span>
                        {c.daysUntilBirthday === 0 ? 'Today 🎉' : `In ${c.daysUntilBirthday} day${c.daysUntilBirthday === 1 ? '' : 's'}`} ·{' '}
                        {c.birthday && birthdayLabel(c.birthday)}
                      </span>
                    </a>
                    <a
                      className="btn btn-sm btn-whatsapp"
                      target="_blank"
                      rel="noreferrer"
                      href={whatsapp(
                        c.phone,
                        `Happy birthday${c.daysUntilBirthday ? ' in advance' : ''}, ${c.name}! 🎂 Visit ${merchant.name} this week${
                          merchant.birthdayBonus ? ` and get ${num(merchant.birthdayBonus)} bonus points` : ''
                        }. Your points: ${walletUrl(c.walletToken)}`,
                      )}
                    >
                      Wish
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">
              No birthdays in the next 7 days.{' '}
              {!merchant.birthdayBonus && (
                <>
                  Set a <a href="#/settings">birthday bonus</a> to make them special.
                </>
              )}
            </p>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>
              <ActivityIcon size={18} /> Recent activity
            </h2>
            <a href="#/customers" className="small">
              All customers
            </a>
          </div>
          {!data ? (
            <SkeletonRows />
          ) : data.recent.length ? (
            <Activity items={data.recent} />
          ) : (
            <EmptyState
              icon={Coins}
              title="No points given yet"
              text="Give your first customer points — they'll show up here."
              action={
                <button className="btn btn-primary" onClick={() => openGivePoints()}>
                  <Plus size={18} /> Give points
                </button>
              }
            />
          )}
        </section>
      </div>
    </>
  );
}
