import { useEffect, useState, type FormEvent } from 'react';
import { Gift, MessageCircle, Phone } from 'lucide-react';
import { api, getToken, setToken, type Merchant } from '../api';
import { trackEvent } from '../analytics';
import { arrival } from '../attribution';
import { LangToggle, t, useLang } from '../i18n';
import { ErrorText, Logo, useAction } from '../ui';

// /r/<join code>: a shop's share link. Says which shop invited them, what Regularhood does in three lines, and the
// standee they get too, with the sign-up form right there. main.tsx tags the visit as this shop's referral
// (utm_source=shop), so the sign-up counts for the shop that shared it (server/src/referrals.ts).

type Inviter = { shop: string; visitsNeeded: number; rewardName: string };

// The homepage's look (landing.css): counter paper, logo green and marigold, Archivo; in dark mode its deep-green
// night panels instead of the app's near-black.
const FONTS = 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&display=swap';

const STEPS = [
  { icon: Phone, text: 'Type the customer’s phone number, tap “Add visit”' },
  { icon: Gift, text: 'On the last visit, the app says “Give the reward”' },
  { icon: MessageCircle, text: 'Customers keep coming back. Free to start.' },
];

export function Referral({ code }: { code: string }) {
  useLang();
  const [inviter, setInviter] = useState<Inviter | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' });
  const { busy, error, run } = useAction();
  const loggedIn = Boolean(getToken());

  useEffect(() => {
    document.title = 'Join Regularhood';
    api<Inviter>(`public/join/${encodeURIComponent(code)}`).then(setInviter, () => setInviter(null));
    if (!document.querySelector(`link[href="${FONTS}"]`)) document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: FONTS }));
    // The page's own background behind it too, so scrolling past the edges doesn't show the app's.
    document.body.classList.add('referral-body');
    return () => document.body.classList.remove('referral-body');
  }, [code]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const { token } = await api<{ token: string; merchant: Merchant }>('auth/signup', 'POST', { ...form, attribution: arrival() });
      setToken(token);
      trackEvent('signup', 'shop');
      location.replace('/app');
    });
  };

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  return (
    <main className="auth referral-page">
      <section className="auth-hero">
        <div className="referral-top">
          <span className="brand">
            <Logo /> <span>Regularhood</span>
          </span>
          <LangToggle />
        </div>
        {inviter ? (
          <>
            <p className="referral-invited">{t('{shop} invited you', { shop: inviter.shop })}</p>
            <h1>{t('A loyalty card for your shop, like {shop} has', { shop: inviter.shop })}</h1>
            {inviter.rewardName.trim() && (
              <p className="referral-rule">
                🎁 {inviter.shop}: {t('Every {n} visits → {reward}', { n: inviter.visitsNeeded, reward: inviter.rewardName })}
              </p>
            )}
          </>
        ) : (
          <h1>{t('A loyalty card for your shop')}</h1>
        )}
        <ul className="referral-steps">
          {STEPS.map(({ icon: Icon, text }) => (
            <li key={text}>
              <span className="feature-icon">
                <Icon size={18} />
              </span>
              {t(text)}
            </li>
          ))}
        </ul>
        <p className="referral-gift">
          <span aria-hidden>🪧</span>
          <span>{t('Add 20 visits and we send you a free counter standee with your shop name.')}</span>
        </p>
      </section>

      <div className="auth-form-wrap">
        {loggedIn ? (
          <div className="card auth-card">
            <h2 style={{ fontSize: 22 }}>{t('You already have a shop account')}</h2>
            <a className="btn btn-primary btn-lg" href="/app">
              {t('Open my shop')}
            </a>
          </div>
        ) : (
          <form className="card auth-card" onSubmit={submit}>
            <div>
              <h2 style={{ fontSize: 22 }}>{t('Start your card')}</h2>
              <p className="muted small">{t('Free, and ready in under a minute.')}</p>
            </div>
            <label>
              {t('Shop name')}
              <input value={form.name} onChange={set('name')} placeholder="Chai Point, MG Road" required />
            </label>
            <label>
              <span>
                {t('WhatsApp number')} <span className="muted">({t('optional')})</span>
              </span>
              <input type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} placeholder="98765 43210" />
            </label>
            <label>
              {t('Email')}
              <input type="email" autoComplete="email" value={form.email} onChange={set('email')} required />
            </label>
            <label>
              {t('Password')}
              <input
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={set('password')}
                required
                minLength={8}
                placeholder={t('At least 8 characters')}
              />
            </label>
            <ErrorText text={error} />
            <button className="btn btn-primary btn-lg" disabled={busy}>
              {busy ? t('Please wait…') : t('Create my shop account')}
            </button>
            <p className="muted small center">
              {t('Already have an account?')} <a href="/app">{t('Log in')}</a>
              <br />
              <a href="/">{t('See how Regularhood works')}</a>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
