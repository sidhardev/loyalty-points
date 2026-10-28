import { useEffect, useState, type FormEvent } from 'react';
import { BadgeIndianRupee, Check, Clock, Copy, Link2, MessageCircle, Store, TrendingUp } from 'lucide-react';
import { api, rupees, when } from '../api';
import { ErrorText, Logo, SkeletonRows, toast, useAction } from '../ui';

// Partners bring shops for a commission (server/src/partners.ts).
//  - /partners: what they earn and the sign-up form; signing up opens their own page
//  - /partner/<token>: their link to share, their shops and money. The secret link is the login, so the page says to
//    keep it.
// Both use the referral page's look (homepage colours, Archivo).

const FONTS = 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&display=swap';

function usePageLook(title: string) {
  useEffect(() => {
    document.title = title;
    if (!document.querySelector(`link[href="${FONTS}"]`)) document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: FONTS }));
    document.body.classList.add('referral-body');
    return () => document.body.classList.remove('referral-body');
  }, [title]);
}

const copy = async (text: string, done: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast(done);
  } catch {
    toast("Couldn't copy, press and hold the link instead", 'error');
  }
};

/** Opens WhatsApp with the text and lets them pick who to send it to. */
const shareOnWhatsApp = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

// ---------------------------------------------------------------- sign-up

export function PartnerSignup() {
  usePageLook('Become a Regularhood partner');
  const [form, setForm] = useState({ kind: 'agent' as 'agent' | 'business', name: '', business: '', phone: '', upi: '', city: '' });
  const { busy, error, run } = useAction();
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const { token } = await api<{ token: string }>('public/partners', 'POST', form);
      location.replace(`/partner/${token}?new=1`);
    });
  };

  return (
    <main className="auth referral-page">
      <section className="auth-hero">
        <div className="referral-top">
          <span className="brand">
            <Logo /> <span>Regularhood</span>
          </span>
        </div>
        <p className="referral-invited">Partner program</p>
        <h1>Bring shops to Regularhood, earn on every one</h1>
        <p>Regularhood is a loyalty card for small shops, on WhatsApp. Share your link with shop owners you know. When they join, you earn.</p>
        <ul className="referral-steps">
          <li>
            <span className="feature-icon">
              <Store size={18} />
            </span>
            ₹50 for every shop that really uses it (30 customers, 7 days). For individual partners.
          </li>
          <li>
            <span className="feature-icon">
              <BadgeIndianRupee size={18} />
            </span>
            20% of what your shops pay, every time they pay, renewals too. 30% from your 6th paying shop.
          </li>
          <li>
            <span className="feature-icon">
              <Clock size={18} />
            </span>
            Paid on UPI, 7 days after the shop pays. No fee to join.
          </li>
        </ul>
      </section>

      <div className="auth-form-wrap">
        <form className="card auth-card" onSubmit={submit}>
          <div>
            <h2 style={{ fontSize: 22 }}>Become a partner</h2>
            <p className="muted small">Takes a minute. You get your own link right away.</p>
          </div>
          <div className="chips" role="radiogroup" aria-label="I am">
            {(
              [
                ['agent', 'Individual'],
                ['business', 'A business'],
              ] as const
            ).map(([kind, label]) => (
              <button type="button" key={kind} role="radio" aria-checked={form.kind === kind} className={`chip ${form.kind === kind ? 'active' : ''}`} onClick={() => setForm({ ...form, kind })}>
                {label}
              </button>
            ))}
          </div>
          <label>
            Your name
            <input value={form.name} onChange={set('name')} autoComplete="name" required />
          </label>
          {form.kind === 'business' && (
            <label>
              Business name
              <input value={form.business} onChange={set('business')} placeholder="e.g. your billing software or distribution company" required />
            </label>
          )}
          <label>
            WhatsApp number
            <input type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} placeholder="98765 43210" required />
          </label>
          <label>
            <span>
              UPI ID <span className="muted">(optional, for payouts)</span>
            </span>
            <input value={form.upi} onChange={set('upi')} placeholder="name@upi" />
          </label>
          <label>
            <span>
              City <span className="muted">(optional)</span>
            </span>
            <input value={form.city} onChange={set('city')} autoComplete="address-level2" />
          </label>
          <ErrorText text={error} />
          <button className="btn btn-primary btn-lg" disabled={busy}>
            {busy ? 'Please wait…' : 'Get my partner link'}
          </button>
          <p className="muted small center">
            No spam, please: share your link with people you know. Partners who spam are stopped. <a href="/terms" target="_blank" rel="noopener">Terms</a>
          </p>
        </form>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------- the partner's own page

type Terms = { activeBonus: number; activeCustomers: number; activeDays: number; baseRate: number; highRate: number; highAfter: number; holdDays: number };
type Data = {
  partner: { name: string; code: string; kind: 'agent' | 'business'; business: string; upi: string; stopped: boolean };
  terms: Terms;
  totals: { shops: number; active: number; paying: number; sent: number; due: number; hold: number };
  shops: { name: string; joined: string; plan: string; customers: number; days: number; paused: boolean; active: boolean }[];
  earnings: { kind: 'active' | 'payment'; shop: string; what: string; amount: number; status: 'hold' | 'due' | 'sent'; dueAt: string; sentAt: string | null }[];
};

const LANGS = [
  ['', 'English'],
  ['hi', 'हिन्दी'],
  ['ml', 'മലയാളം'],
] as const;

const paise = (n: number) => rupees(n / 100);

export function PartnerPage({ token }: { token: string }) {
  usePageLook('My partner page · Regularhood');
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [lang, setLang] = useState('');
  const isNew = new URLSearchParams(location.search).has('new');

  useEffect(() => {
    api<Data>(`public/partners/${encodeURIComponent(token)}`).then(setData, (e) => setError((e as Error).message));
  }, [token]);

  if (error)
    return (
      <main className="referral-page" style={{ minHeight: '100vh' }}>
        <div className="page" style={{ maxWidth: 640 }}>
          <ErrorText text={error} />
        </div>
      </main>
    );

  const link = data ? `${location.origin}/?p=${data.partner.code}${lang ? `&lang=${lang}` : ''}` : '';
  const pitch = `Namaste! Apni dukaan ke regular customers ke liye ek free loyalty card, WhatsApp pe. Customer ka number daalo, visit add karo, aur kuch visits ke baad unhe ek gift do. Shuru karna free hai: ${link}`;
  const pageLink = `${location.origin}/partner/${token}`;
  const t = data?.terms;
  const paidShops = data?.totals.paying ?? 0;

  return (
    <main className="referral-page" style={{ minHeight: '100vh' }}>
      <div className="page" style={{ maxWidth: 760 }}>
        <div className="referral-top">
          <span className="brand">
            <Logo /> <span>Regularhood partner</span>
          </span>
        </div>

        {!data ? (
          <SkeletonRows count={4} />
        ) : (
          <>
            <div>
              <h1 style={{ margin: 0 }}>Hi {data.partner.name.split(' ')[0]} 👋</h1>
              <p className="muted" style={{ margin: '4px 0 0' }}>
                {data.partner.business ? `${data.partner.business} · ` : ''}Partner code <strong>{data.partner.code}</strong>
              </p>
            </div>

            {data.partner.stopped && <ErrorText text="Your partner link has been stopped. Shops that join from it now don't count. Message us on WhatsApp if this is a mistake." />}

            {isNew && (
              <section className="card" style={{ borderColor: 'var(--brand)' }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>Save this page</h2>
                <p className="muted small" style={{ margin: 0 }}>
                  This page is your login: there is no password. Bookmark it or send the link to yourself on WhatsApp, so you can come back to see your shops and money.
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <a className="btn btn-whatsapp btn-sm" href={shareOnWhatsApp(`My Regularhood partner page: ${pageLink}`)} target="_blank" rel="noreferrer">
                    <MessageCircle size={15} /> Send to my WhatsApp
                  </a>
                  <button className="btn btn-soft btn-sm" onClick={() => void copy(pageLink, 'Page link copied')}>
                    <Copy size={15} /> Copy page link
                  </button>
                </div>
              </section>
            )}

            <section className="card">
              <h2 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Link2 size={18} /> Your link for shops
              </h2>
              <p className="muted small" style={{ margin: 0 }}>
                A shop that signs up from this link is yours. Pick the language the shop owner reads.
              </p>
              <div className="chips">
                {LANGS.map(([code, label]) => (
                  <button key={code} className={`chip ${lang === code ? 'active' : ''}`} onClick={() => setLang(code)}>
                    {label}
                  </button>
                ))}
              </div>
              <code style={{ wordBreak: 'break-all', fontSize: 15 }}>{link}</code>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a className="btn btn-whatsapp btn-sm" href={shareOnWhatsApp(pitch)} target="_blank" rel="noreferrer">
                  <MessageCircle size={15} /> Share on WhatsApp
                </a>
                <button className="btn btn-soft btn-sm" onClick={() => void copy(link, 'Link copied')}>
                  <Copy size={15} /> Copy link
                </button>
              </div>
              <p className="muted small" style={{ margin: 0 }}>
                Shop owner already signed up without your link? Message us on WhatsApp with the shop's name and we'll add it to you.
              </p>
            </section>

            <section className="stats" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              <div className="stat">
                <span className="stat-label">
                  <Store size={16} /> Your shops
                </span>
                <strong>{data.totals.shops}</strong>
                <em>
                  {data.totals.active} active · {paidShops} paying
                </em>
              </div>
              <div className="stat">
                <span className="stat-label">
                  <BadgeIndianRupee size={16} /> Paid to you
                </span>
                <strong>{paise(data.totals.sent)}</strong>
                <em>
                  {paise(data.totals.due)} coming next{data.totals.hold ? ` · ${paise(data.totals.hold)} on hold` : ''}
                </em>
              </div>
            </section>

            <section className="card">
              <h2 style={{ margin: 0, fontSize: 18 }}>Your money</h2>
              {data.earnings.length ? (
                <ul className="rows">
                  {data.earnings.map((e, i) => (
                    <li key={i}>
                      <div className="row-item">
                        <span className="row-main">
                          <strong>
                            {e.shop} · {paise(e.amount)}
                          </strong>
                          <span>
                            {e.what} ·{' '}
                            {e.status === 'sent'
                              ? `sent ${when(e.sentAt!)}`
                              : e.status === 'due'
                                ? 'we send it soon'
                                : `on hold until ${when(e.dueAt)}`}
                          </span>
                        </span>
                        <span className={`badge ${e.status === 'sent' ? 'badge-plus' : 'badge-neutral'}`}>
                          {e.status === 'sent' ? <Check size={13} /> : <Clock size={13} />} {e.status === 'sent' ? 'Sent' : e.status === 'due' ? 'Due' : 'On hold'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted small" style={{ margin: 0 }}>
                  Nothing yet. Share your link: your money shows here as your shops start using Regularhood.
                </p>
              )}
              {!data.partner.upi && data.earnings.length > 0 && <p className="small" style={{ margin: 0 }}>Send us your UPI ID on WhatsApp so we can pay you.</p>}
            </section>

            <section className="card">
              <h2 style={{ margin: 0, fontSize: 18 }}>Your shops</h2>
              {data.shops.length ? (
                <ul className="rows">
                  {data.shops.map((s, i) => (
                    <li key={i}>
                      <div className="row-item">
                        <span className="row-main">
                          <strong>{s.name}</strong>
                          <span>
                            Joined {when(s.joined)} · {s.customers} customers, {s.days} days
                            {s.paused ? ' · paused' : ''}
                          </span>
                        </span>
                        {(s.plan === 'lifetime' || s.plan === 'yearly') && <span className="badge badge-plus">Paying</span>}
                        {s.active ? (
                          <span className="badge badge-plus">Active</span>
                        ) : (
                          <span className="badge badge-neutral">
                            {Math.min(s.customers, t!.activeCustomers)}/{t!.activeCustomers} · {Math.min(s.days, t!.activeDays)}/{t!.activeDays}d
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted small" style={{ margin: 0 }}>
                  No shops yet.
                </p>
              )}
            </section>

            {t && (
              <section className="card">
                <h2 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={18} /> How you earn
                </h2>
                <ul className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
                  {t.activeBonus > 0 && (
                    <li>
                      {paise(t.activeBonus)} for each shop that becomes active: {t.activeCustomers} different customers, with visits on {t.activeDays} different days.
                    </li>
                  )}
                  <li>
                    {t.baseRate}% of every payment your shops make, renewals too. From your {t.highAfter + 1}th paying shop on, {t.highRate}%.
                  </li>
                  <li>Payment money is sent {t.holdDays} days after the shop pays. If the shop gets a refund, nothing is paid for it.</li>
                  <li>Paid on UPI. Spamming shops or groups stops your link.</li>
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
