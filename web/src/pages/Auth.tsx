import { useState, type FormEvent } from 'react';
import { api, setToken, type Merchant } from '../api';
import { ErrorText, useAction } from '../ui';

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
      <div className="auth-side">
        <div className="brand brand-lg">⭐ Loyalty Points</div>
        <h1>Bring your customers back.</h1>
        <p>Give points on every bill, let customers spend them on rewards, and see who your regulars are.</p>
        <a className="customer-link" href="/login">
          Customer? Check your points →
        </a>
        <ul>
          <li>Points on every purchase, by phone number</li>
          <li>Rewards your customers actually want</li>
          <li>Every customer's history in one place</li>
        </ul>
      </div>
      <form className="card auth-card" onSubmit={submit}>
        <h2>{mode === 'login' ? 'Log in' : 'Create your shop account'}</h2>
        {mode === 'signup' && (
          <label>
            Shop name
            <input value={form.name} onChange={set('name')} placeholder="Chai Point, MG Road" required autoFocus />
          </label>
        )}
        <label>
          Email
          <input type="email" value={form.email} onChange={set('email')} required autoFocus={mode === 'login'} />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            required
            minLength={mode === 'signup' ? 8 : undefined}
            placeholder={mode === 'signup' ? 'At least 8 characters' : ''}
          />
        </label>
        <ErrorText text={error} />
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}
        </button>
        <p className="muted center">
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
    </main>
  );
}
