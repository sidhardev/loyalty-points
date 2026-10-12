import { useCallback, useEffect, useState } from 'react';
import { Activity as ActivityIcon, Cake, ChevronRight, Coins, Gift, IndianRupee, Plus, Users, UserX } from 'lucide-react';
import { api, birthdayLabel, num, rupees, walletUrl, whatsapp, type Customer, type Merchant, type Transaction } from '../api';
import { Activity, Avatar, EmptyState, InstallBanner, Skeleton, SkeletonRows, openGivePoints, useDataVersion } from '../ui';

type DashboardData = {
  totals: { customers: number; issued: number; redeemed: number; redemptions: number; sales: number; inactive: number };
  today: { visits: number; points: number; sales: number };
  birthdays: (Customer & { daysUntilBirthday: number })[];
  recent: Transaction[];
};

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

      <InstallBanner id="shop" title="Install the app on this phone" text="Opens in one tap from your home screen." />

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
