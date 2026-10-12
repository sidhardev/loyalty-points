import { useState, type FormEvent } from 'react';
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
  const [mode, setMode] = useState<'login' | 'signup'>('login');
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
          <Logo /> <span>Loyalty Points</span>
        </span>
        <h1>Bring your customers back.</h1>
        <p>A simple loyalty program for your shop — points, rewards and reminders, without any app for your customers.</p>
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
