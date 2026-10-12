import { useEffect, useState, type FormEvent } from 'react';
import QRCode from 'qrcode';
import { Bell, ChevronRight, Coins, Crown, Database, Download, ExternalLink, FileSpreadsheet, Gift, Printer, QrCode, ScrollText, ShieldCheck, Store } from 'lucide-react';
import { api, download, joinUrl, num, rupees, type Merchant } from '../api';
import { ErrorText, toast, useAction } from '../ui';

/** Printable counter poster: customers scan it to join and see their points. */
function JoinQr({ merchant }: { merchant: Merchant }) {
  const url = joinUrl(merchant.joinCode);
  const [qr, setQr] = useState('');
  useEffect(() => {
    QRCode.toDataURL(url, { width: 480, margin: 1, color: { dark: '#141416' } }).then(setQr);
  }, [url]);

  return (
    <section className="card">
      <div className="card-head">
        <h2>
          <QrCode size={18} /> Counter QR code
        </h2>
      </div>
      <p className="muted small">
        Customers scan it, enter their name, phone and a PIN, and join your program
        {merchant.welcomeBonus ? ` with ${num(merchant.welcomeBonus)} welcome points` : ''}.
      </p>
      <div className="poster" id="poster">
        <strong>{merchant.name}</strong>
        <span>Scan to join our rewards</span>
        {qr && <img src={qr} alt={`QR code for ${url}`} />}
        <em>
          Earn {merchant.pointsPer100} points on every ₹100
          {merchant.welcomeBonus ? ` · ${num(merchant.welcomeBonus)} points free when you join` : ''}
        </em>
      </div>
      <div className="actions">
        <button className="btn btn-primary" onClick={() => print()}>
          <Printer size={17} /> Print poster
        </button>
        {qr && (
          <a className="btn btn-soft" href={qr} download="join-qr.png">
            <Download size={17} /> Download
          </a>
        )}
        <a className="btn btn-ghost" href={url} target="_blank" rel="noreferrer">
          <ExternalLink size={17} /> Open
        </a>
      </div>
      {location.hostname === 'localhost' && (
        <p className="alert alert-error small">
          This QR points to localhost, which customers' phones can't open. Open the app from its public address and print it from there.
        </p>
      )}
    </section>
  );
}

/** Activity log and spreadsheet downloads. */
function YourData({ merchant }: { merchant: Merchant }) {
  const [busy, setBusy] = useState('');
  const save = async (path: string, file: string) => {
    setBusy(path);
    try {
      await download(path, file);
      toast('Downloaded');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy('');
    }
  };
  const date = new Date().toISOString().slice(0, 10);
  return (
    <section className="card">
      <div className="card-head">
        <h2>
          <Database size={18} /> Your data
        </h2>
      </div>
      <a className="row-item link-row" href="#/activity">
        <ScrollText size={19} />
        <span className="row-main">
          <strong>Activity log</strong>
          <span>Undos, adjustments, deletes, blocked and large bills{merchant.largeBill ? ` (above ${rupees(merchant.largeBill)})` : ''}</span>
        </span>
        <ChevronRight size={18} />
      </a>
      <p className="muted small" style={{ margin: 0 }}>
        Download a spreadsheet (opens in Excel or Google Sheets). Keep a copy as a backup.
      </p>
      <div className="actions">
        <button className="btn btn-soft" disabled={!!busy} onClick={() => void save('export/customers.csv', `customers-${date}.csv`)}>
          <FileSpreadsheet size={17} /> {busy === 'export/customers.csv' ? 'Preparing…' : 'Customers'}
        </button>
        <button className="btn btn-soft" disabled={!!busy} onClick={() => void save('export/transactions.csv', `points-history-${date}.csv`)}>
          <FileSpreadsheet size={17} /> {busy === 'export/transactions.csv' ? 'Preparing…' : 'Points history'}
        </button>
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
    maxVisitsPerDay: String(merchant.maxVisitsPerDay),
    largeBill: String(merchant.largeBill),
  });
  const { busy, error, run } = useAction();

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

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
          maxVisitsPerDay: Number(form.maxVisitsPerDay),
          largeBill: Number(form.largeBill),
        }),
      );
      toast('Settings saved');
    });
  };

  const rate = Number(form.pointsPer100) || 0;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Settings</h1>
          <p>{merchant.email}</p>
        </div>
      </header>
      <div className="grid-2">
        <form className="card" onSubmit={save}>
          <div className="settings-section">
            <h3>
              <Store size={17} /> Shop
            </h3>
            <label>
              Shop name
              <input value={form.name} onChange={set('name')} required />
            </label>
          </div>

          <div className="settings-section">
            <h3>
              <Coins size={17} /> Earning
            </h3>
            <label>
              Points for every ₹100 spent
              <input type="number" min="1" max="1000" step="1" value={form.pointsPer100} onChange={set('pointsPer100')} required />
              <span className="hint">A ₹450 bill gives {num(Math.floor(4.5 * rate))} points.</span>
            </label>
          </div>

          <div className="settings-section">
            <h3>
              <Gift size={17} /> Bonuses
            </h3>
            <div className="form-row">
              <label>
                Welcome bonus
                <input type="number" min="0" step="1" value={form.welcomeBonus} onChange={set('welcomeBonus')} required />
                <span className="hint">When a customer joins. 0 = off.</span>
              </label>
              <label>
                Birthday bonus
                <input type="number" min="0" step="1" value={form.birthdayBonus} onChange={set('birthdayBonus')} required />
                <span className="hint">On a visit within a week of their birthday, once a year.</span>
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h3>
              <Crown size={17} /> Gold tier
            </h3>
            <div className="form-row">
              <label>
                Gold after earning
                <input type="number" min="1" step="1" value={form.goldThreshold} onChange={set('goldThreshold')} required />
                <span className="hint">Lifetime points.</span>
              </label>
              <label>
                Gold members earn ×
                <input type="number" min="1" max="5" step="0.1" value={form.goldMultiplier} onChange={set('goldMultiplier')} required />
                <span className="hint">
                  ₹450 → {num(Math.floor(4.5 * rate * (Number(form.goldMultiplier) || 1)))} points for Gold.
                </span>
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h3>
              <Bell size={17} /> Reminders
            </h3>
            <label>
              Days without a visit before a customer counts as inactive
              <input type="number" min="7" max="365" step="1" value={form.inactiveDays} onChange={set('inactiveDays')} required />
            </label>
          </div>

          <div className="settings-section">
            <h3>
              <ShieldCheck size={17} /> Safety
            </h3>
            <div className="form-row">
              <label>
                Visits per customer in 24 hours
                <input type="number" min="0" max="50" step="1" value={form.maxVisitsPerDay} onChange={set('maxVisitsPerDay')} required />
                <span className="hint">More are blocked and logged. 0 = no limit.</span>
              </label>
              <label>
                Double-check bills above ₹
                <input type="number" min="0" step="1" value={form.largeBill} onChange={set('largeBill')} required />
                <span className="hint">Asks “are you sure?” and logs it. 0 = off.</span>
              </label>
            </div>
          </div>

          <ErrorText text={error} />
          <button className="btn btn-primary btn-lg" disabled={busy}>
            {busy ? 'Saving…' : 'Save settings'}
          </button>
        </form>
        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <JoinQr merchant={merchant} />
          <YourData merchant={merchant} />
        </div>
      </div>
    </>
  );
}
