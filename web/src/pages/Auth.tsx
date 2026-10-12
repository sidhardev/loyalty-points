import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, BarChart3, Coins, Gift, MessageCircle } from 'lucide-react';
import { api, setToken, type Merchant } from '../api';
import { ErrorText, Logo, useAction } from '../ui';

const FEATURES = [
  { icon: Coins, text: 'Points on every bill, by phone number' },
  { icon: Gift, text: 'Rewards and a Gold tier that bring regulars back' },
  { icon: MessageCircle, text: 'One-tap WhatsApp messages and reminders' },
  { icon: BarChart3, text: 'See who comes back, and how often' },
];

export function AuthPage({ onAuthed }: { onAuthed: (m: Merchant) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>(location.hash === '#signup' ? 'signup' : 'login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const { busy, error, setError, run } = useAction();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const { token, merchant } = await api<{ token: string; merchant: Merchant }>(
        `auth/${mode}`,
        'POST',
        mode === 'signup' ? form : { email: form.email, password: form.password },
      );
      setToken(token);
      onAuthed(merchant);
    });
  };

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  return (
    <main className="auth">
      <section className="auth-hero">
        <span className="brand">
          <Logo /> <span>Habiturn</span>
        </span>
        <h1>From first visit to “the usual”.</h1>
        <p>Habiturn turns walk-ins into regulars — points, rewards and reminders for your shop, with nothing for your customers to install.</p>
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
        <a className="customer-link" href="/login">
          Customer? Check your points <ArrowRight size={16} />
        </a>
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
          <Logo /> <span>Habiturn</span>
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
