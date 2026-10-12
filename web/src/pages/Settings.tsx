import { useEffect, useState, type FormEvent } from 'react';
import QRCode from 'qrcode';
import { api, joinUrl, num, type Merchant } from '../api';
import { ErrorText, useAction } from '../ui';

/** Printable counter poster: customers scan it to join and see their points. */
function JoinQr({ merchant }: { merchant: Merchant }) {
  const url = joinUrl(merchant.joinCode);
  const [qr, setQr] = useState('');
  useEffect(() => {
    QRCode.toDataURL(url, { width: 480, margin: 1, color: { dark: '#18181b' } }).then(setQr);
  }, [url]);

  return (
    <section className="card qr-card">
      <h2>Counter QR code</h2>
      <p className="muted small">Customers scan it, enter their name and phone, and join your program{merchant.welcomeBonus ? ` with ${num(merchant.welcomeBonus)} welcome points` : ''}.</p>
      <div className="poster" id="poster">
        <strong>{merchant.name}</strong>
        <span>Scan to join our rewards</span>
        {qr && <img src={qr} alt={`QR code for ${url}`} />}
        <em>
          Earn {merchant.pointsPer100} points on every ₹100
          {merchant.welcomeBonus ? ` · ${num(merchant.welcomeBonus)} points free when you join` : ''}
        </em>
      </div>
      <div className="row-inline">
        <button className="btn btn-primary" onClick={() => print()}>
          Print poster
        </button>
        {qr && (
          <a className="btn" href={qr} download="join-qr.png">
            Download QR
          </a>
        )}
        <a className="link small" href={url} target="_blank" rel="noreferrer">
          Open join page
        </a>
      </div>
    </section>
  );
}

export function Settings({ merchant, onSaved }: { merchant: Merchant; onSaved: (m: Merchant) => void }) {
  const [form, setForm] = useState({
    name: merchant.name,
    pointsPer100: String(merchant.pointsPer100),
    welcomeBonus: String(merchant.welcomeBonus),
    birthdayBonus: String(merchant.birthdayBonus),
    goldThreshold: String(merchant.goldThreshold),
    goldMultiplier: String(merchant.goldMultiplier),
    inactiveDays: String(merchant.inactiveDays),
  });
  const [saved, setSaved] = useState(false);
  const { busy, error, run } = useAction();

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => {
    setSaved(false);
    setForm({ ...form, [key]: e.target.value });
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      onSaved(
        await api<Merchant>('me', 'PATCH', {
          name: form.name,
          pointsPer100: Number(form.pointsPer100),
          welcomeBonus: Number(form.welcomeBonus),
          birthdayBonus: Number(form.birthdayBonus),
          goldThreshold: Number(form.goldThreshold),
          goldMultiplier: Number(form.goldMultiplier),
          inactiveDays: Number(form.inactiveDays),
        }),
      );
      setSaved(true);
    });
  };

  const rate = Number(form.pointsPer100) || 0;

  return (
    <>
      <header className="page-head">
        <h1>Settings</h1>
        <p className="muted">{merchant.email}</p>
      </header>
      <div className="grid">
        <form className="card" onSubmit={save}>
          <h2>Your program</h2>
          <label>
            Shop name
            <input value={form.name} onChange={set('name')} required />
          </label>
          <label>
            Points for every ₹100 spent
            <input type="number" min="1" max="1000" step="1" value={form.pointsPer100} onChange={set('pointsPer100')} required />
          </label>
          <p className="muted small">Example: a ₹450 bill gives {num(Math.floor(4.5 * rate))} points.</p>

          <h3>Bonuses</h3>
          <div className="row">
            <label>
              Welcome bonus (points)
              <input type="number" min="0" step="1" value={form.welcomeBonus} onChange={set('welcomeBonus')} required />
            </label>
            <label>
              Birthday bonus (points)
              <input type="number" min="0" step="1" value={form.birthdayBonus} onChange={set('birthdayBonus')} required />
            </label>
          </div>
          <p className="muted small">Welcome bonus is given when a customer joins. Birthday bonus is added on their visit within a week of their birthday, once a year. 0 = off.</p>

          <h3>★ Gold tier</h3>
          <div className="row">
            <label>
              Gold after earning (points)
              <input type="number" min="1" step="1" value={form.goldThreshold} onChange={set('goldThreshold')} required />
            </label>
            <label>
              Gold members earn ×
              <input type="number" min="1" max="5" step="0.1" value={form.goldMultiplier} onChange={set('goldMultiplier')} required />
            </label>
          </div>
          <p className="muted small">
            Customers who have earned {num(Number(form.goldThreshold) || 0)} points in total become Gold and get{' '}
            {num(Math.floor(4.5 * rate * (Number(form.goldMultiplier) || 1)))} points on a ₹450 bill.
          </p>

          <h3>Reminders</h3>
          <label>
            A customer is "inactive" after this many days without a visit
            <input type="number" min="7" max="365" step="1" value={form.inactiveDays} onChange={set('inactiveDays')} required />
          </label>

          <ErrorText text={error} />
          {saved && <p className="alert alert-ok">Saved.</p>}
          <button className="btn btn-primary" disabled={busy}>
            Save
          </button>
        </form>
        <JoinQr merchant={merchant} />
      </div>
    </>
  );
}
