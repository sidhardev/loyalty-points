import { useEffect, useState, type FormEvent } from 'react';
import { Gift, MessageCircle, Phone, UserX } from 'lucide-react';
import { api, setToken, type Merchant } from '../api';
import { trackEvent } from '../analytics';
import { arrival } from '../attribution';
import { GoogleButton } from '../google';
import { ErrorText, Logo, useAction } from '../ui';

const FEATURES = [
  { icon: Phone, text: 'Type the phone number, tap “Add visit”' },
  { icon: Gift, text: 'Every 5th visit, the app says “Give the reward”' },
  { icon: MessageCircle, text: 'Their card goes on WhatsApp in one tap' },
  { icon: UserX, text: 'See who stopped coming and remind them' },
];

/** A card made in the free stamp card maker (/tools/stamp-card-maker), sent along in the sign-up link. Kept for the tab,
 *  so it survives the Google step and a reload. */
type ToolCard = { shop: string; reward: string; visits: number; review: string };
const TOOL_CARD = 'rh_tool_card';

function readToolCard(): ToolCard | null {
  try {
    const q = new URLSearchParams(location.search);
    const reward = (q.get('reward') ?? '').trim().slice(0, 60);
    const visits = Number(q.get('visits'));
    const rule = reward && Number.isInteger(visits) && visits >= 2 && visits <= 50;
    const shop = (q.get('shop') ?? '').trim().slice(0, 80);
    const review = (q.get('review') ?? '').trim().slice(0, 500);
    if (rule || shop || review) {
      const card = { shop, reward: rule ? reward : '', visits: rule ? visits : 0, review };
      sessionStorage.setItem(TOOL_CARD, JSON.stringify(card));
      return card;
    }
    return JSON.parse(sessionStorage.getItem(TOOL_CARD) ?? 'null') as ToolCard | null;
  } catch {
    return null;
  }
}

export function AuthPage({ onAuthed }: { onAuthed: (m: Merchant) => void }) {
  const [card] = useState(readToolCard);
  const rule = card?.reward ? { visitsNeeded: card.visits, rewardName: card.reward } : undefined;
  const reviewUrl = card?.review || undefined;
  const [mode, setMode] = useState<'login' | 'signup'>(location.hash === '#signup' || card ? 'signup' : 'login');
  const [form, setForm] = useState({ name: card?.shop ?? '', email: '', password: '', phone: '', login: '' });
  const { busy, error, setError, run } = useAction();
  // A new Google account: its token waits here while the shop name and WhatsApp number are asked for.
  const [google, setGoogle] = useState<{ credential: string; email: string } | null>(null);

  const withGoogle = (credential: string, details?: { name: string; phone: string }) =>
    run(async () => {
      const r = await api<{ token: string; merchant: Merchant } | { needs: 'details'; email: string; name: string }>('auth/google', 'POST', {
        credential,
        ...details,
        attribution: arrival(),
        rule,
        reviewUrl,
      });
      if ('needs' in r) {
        // A new Google account; Admin → Visits shows who got this far but didn't finish.
        trackEvent('click', 'Google sign-in: asked for shop name and number');
        setGoogle({ credential, email: r.email });
        return;
      }
      setToken(r.token);
      if (details) trackEvent('signup', card ? `shop-google: from ${card.reward ? 'stamp card maker' : 'review QR maker'}` : 'shop-google');
      onAuthed(r.merchant);
    });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (google) return void withGoogle(google.credential, { name: form.name, phone: form.phone });
    void run(async () => {
      const { token, merchant } = await api<{ token: string; merchant: Merchant }>(
        `auth/${mode}`,
        'POST',
        mode === 'signup' ? { name: form.name, phone: form.phone, email: form.email, password: form.password, attribution: arrival(), rule, reviewUrl } : { login: form.login, password: form.password },
      );
      setToken(token);
      if (mode === 'signup') trackEvent('signup', card ? `shop: from ${card.reward ? 'stamp card maker' : 'review QR maker'}` : 'shop');
      onAuthed(merchant);
    });
  };

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  return (
    <main className="auth">
      <section className="auth-hero">
        <span className="brand">
          <Logo /> <span>Regularhood</span>
        </span>
        <h1>From first visit to “the usual”.</h1>
        <p>A stamp card on the customer’s phone number. No app, no QR codes, no points — for you or your customers.</p>
        <ul>
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text}>
              <span className="feature-icon">
                <Icon size={18} />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </section>

      <div className="auth-form-wrap">
        <form className="card auth-card" onSubmit={submit}>
          {google ? (
            <>
              <div>
                <h2 style={{ fontSize: 22 }}>One last step</h2>
                <p className="muted small">Signed in as {google.email}. Tell us about your shop.</p>
              </div>
              <label>
                Shop name
                <input value={form.name} onChange={set('name')} placeholder="Sharma General Store, MG Road" required autoFocus />
              </label>
              <label>
                WhatsApp number
                <input type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} placeholder="98765 43210" required />
                <span className="hint">For your account and reminders. We never share it.</span>
              </label>
              <ErrorText text={error} />
              <button className="btn btn-primary btn-lg" disabled={busy}>
                {busy ? 'Please wait…' : 'Create account'}
              </button>
              <p className="muted small center">
                By creating an account you agree to the <a href="/terms" target="_blank" rel="noopener">Terms</a> and{' '}
                <a href="/privacy" target="_blank" rel="noopener">Privacy policy</a>.
              </p>
              <p className="muted small center">
                <button
                  type="button"
                  className="link"
                  onClick={() => {
                    setGoogle(null);
                    setError('');
                  }}
                >
                  Back
                </button>
              </p>
            </>
          ) : (
            <>
              <div>
                <h2 style={{ fontSize: 22 }}>{mode === 'login' ? 'Welcome back' : 'Create your shop account'}</h2>
                <p className="muted small">{mode === 'login' ? 'Log in to your shop.' : 'Free, and ready in under a minute.'}</p>
              </div>
              {mode === 'signup' && card?.reward && (
                <div className="tool-card-note">
                  <span className="tool-card-kicker">Your card</span>
                  <strong>
                    Every {card.visits} visits: {card.reward}
                  </strong>
                  <span className="muted small">It goes live on customers’ phone numbers as soon as you create the account.</span>
                </div>
              )}
              <GoogleButton text={mode === 'login' ? 'signin_with' : 'signup_with'} onCredential={(c) => void withGoogle(c)} />
              {mode === 'signup' && (
                <label>
                  Shop name
                  <input value={form.name} onChange={set('name')} placeholder="Chai Point, MG Road" required autoFocus />
                </label>
              )}
              {mode === 'login' ? (
                <label>
                  WhatsApp number or email
                  <input autoComplete="username" value={form.login} onChange={set('login')} placeholder="98765 43210" required autoFocus />
                </label>
              ) : (
                <label>
                  WhatsApp number
                  <input type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} placeholder="98765 43210" required />
                  <span className="hint">You log in with it. We never share it.</span>
                </label>
              )}
              <label>
                Password
                <input
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={form.password}
                  onChange={set('password')}
                  required
                  minLength={mode === 'signup' ? 8 : undefined}
                  placeholder={mode === 'signup' ? 'At least 8 characters' : ''}
                />
              </label>
              {mode === 'signup' && (
                <label>
                  <span>
                    Email <span className="muted">(optional)</span>
                  </span>
                  <input type="email" autoComplete="email" value={form.email} onChange={set('email')} />
                </label>
              )}
              <ErrorText text={error} />
              <button className="btn btn-primary btn-lg" disabled={busy}>
                {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
              </button>
              {mode === 'signup' && (
                <p className="muted small center">
                  By creating an account you agree to the <a href="/terms" target="_blank" rel="noopener">Terms</a> and{' '}
                  <a href="/privacy" target="_blank" rel="noopener">Privacy policy</a>.
                </p>
              )}
              <p className="muted small center">
                {mode === 'login' ? 'New here? ' : 'Already have an account? '}
                <button
                  type="button"
                  className="link"
                  onClick={() => {
                    setMode(mode === 'login' ? 'signup' : 'login');
                    setError('');
                  }}
                >
                  {mode === 'login' ? 'Create an account' : 'Log in'}
                </button>
              </p>
            </>
          )}
        </form>
      </div>
    </main>
  );
}

/** /reset/<token> — a one-time link from support to choose a new password. */
export function ResetPassword({ token }: { token: string }) {
  const [shop, setShop] = useState<{ shop: string; email: string } | null>(null);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({ password: '', again: '' });
  const { busy, error, setError, run } = useAction();
  const path = `auth/reset/${encodeURIComponent(token)}`;

  useEffect(() => {
    api<{ shop: string; email: string }>(path).then(setShop, (err) => setLoadError((err as Error).message));
  }, [path]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (form.password !== form.again) return setError("The passwords don't match");
    void run(async () => {
      const { token: session } = await api<{ token: string }>(path, 'POST', { password: form.password });
      setToken(session);
      location.replace('/app');
    });
  };

  return (
    <main className="public">
      <form className="card auth-card" onSubmit={submit}>
        <span className="brand">
          <Logo /> <span>Regularhood</span>
        </span>
        {loadError ? (
          <>
            <h2 style={{ fontSize: 22 }}>Link not working</h2>
            <ErrorText text={loadError} />
            <a className="btn" href="/app">
              Go to log in
            </a>
          </>
        ) : (
          <>
            <div>
              <h2 style={{ fontSize: 22 }}>Choose a new password</h2>
              <p className="muted small">{shop ? `${shop.shop} · ${shop.email}` : 'Checking the link…'}</p>
            </div>
            <label>
              New password
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                placeholder="At least 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoFocus
              />
            </label>
            <label>
              Type it again
              <input type="password" autoComplete="new-password" value={form.again} onChange={(e) => setForm({ ...form, again: e.target.value })} required />
            </label>
            <ErrorText text={error} />
            <button className="btn btn-primary btn-lg" disabled={busy || !shop}>
              {busy ? 'Saving…' : 'Save and log in'}
            </button>
          </>
        )}
      </form>
    </main>
  );
}
