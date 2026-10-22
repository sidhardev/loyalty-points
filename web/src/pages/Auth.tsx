import { useEffect, useState, type FormEvent } from 'react';
import { Gift, MessageCircle, Phone, UserX } from 'lucide-react';
import { api, setToken, type Merchant } from '../api';
import { trackEvent } from '../analytics';
import { arrival } from '../attribution';
import { ErrorText, Logo, useAction } from '../ui';

const FEATURES = [
  { icon: Phone, text: 'Type the phone number, tap “Add visit”' },
  { icon: Gift, text: 'Every 5th visit, the app says “Give the reward”' },
  { icon: MessageCircle, text: 'Their card goes on WhatsApp in one tap' },
  { icon: UserX, text: 'See who stopped coming and remind them' },
];

export function AuthPage({ onAuthed }: { onAuthed: (m: Merchant) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>(location.hash === '#signup' ? 'signup' : 'login');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const { busy, error, setError, run } = useAction();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const { token, merchant } = await api<{ token: string; merchant: Merchant }>(
        `auth/${mode}`,
        'POST',
        mode === 'signup' ? { ...form, attribution: arrival() } : { email: form.email, password: form.password },
      );
      setToken(token);
      if (mode === 'signup') trackEvent('signup', 'shop');
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
          <div>
            <h2 style={{ fontSize: 22 }}>{mode === 'login' ? 'Welcome back' : 'Create your shop account'}</h2>
            <p className="muted small">{mode === 'login' ? 'Log in to your shop.' : 'Free, and ready in under a minute.'}</p>
          </div>
          {mode === 'signup' && (
            <label>
              Shop name
              <input value={form.name} onChange={set('name')} placeholder="Chai Point, MG Road" required autoFocus />
            </label>
          )}
          <label>
            Email
            <input type="email" autoComplete="email" value={form.email} onChange={set('email')} required autoFocus={mode === 'login'} />
          </label>
          {mode === 'signup' && (
            <label>
              WhatsApp number <span className="muted">(optional)</span>
              <input type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} placeholder="98765 43210" />
              <span className="hint">So we can help you set up. We never share it.</span>
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
