import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bell, ChevronRight, Coins, Crown, Database, Download, ExternalLink, FileSpreadsheet, Gift, Printer, QrCode, ScrollText, ShieldCheck, Store } from 'lucide-react';
import { api, download, joinUrl, num, rupees, type Merchant } from '../api';
import { downloadPoster, PosterPrint, PosterSvg, type PosterTheme } from '../poster';
import '../poster.css';
import { ErrorText, toast, useAction } from '../ui';

/** The counter poster: customers scan it to join and see their points. Prints on A4 or saves as a PNG. */
function JoinQr({ merchant }: { merchant: Merchant }) {
  const url = joinUrl(merchant.joinCode);
  const [theme, setTheme] = useState<PosterTheme>(() => (localStorage.getItem('lp_poster_theme') as PosterTheme) || 'green');
  const [hindi, setHindi] = useState(() => localStorage.getItem('lp_poster_hi') !== '0');
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try {
      localStorage.setItem('lp_poster_theme', theme);
      localStorage.setItem('lp_poster_hi', hindi ? '1' : '0');
    } catch {
      // Just not remembered.
    }
  }, [theme, hindi]);

  const poster = { shop: merchant.name, url, pointsPer100: merchant.pointsPer100, welcomeBonus: merchant.welcomeBonus, theme, hindi };

  const save = async () => {
    const svg = ref.current?.querySelector('svg');
    if (!svg) return;
    setSaving(true);
    try {
      await downloadPoster(svg, `${merchant.name.replace(/[^\w]+/g, '-').toLowerCase() || 'shop'}-poster.png`);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card">
      <div className="card-head">
        <h2>
          <QrCode size={18} /> Counter poster
        </h2>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        Put it where people pay. Customers scan it, enter their name, phone and a PIN, and join your program
        {merchant.welcomeBonus ? ` with ${num(merchant.welcomeBonus)} welcome points` : ''}.
      </p>
      <div className="poster-options">
        <div className="seg" role="group" aria-label="Poster colour">
          <button type="button" className={theme === 'green' ? 'active' : ''} onClick={() => setTheme('green')}>
            Green
          </button>
          <button type="button" className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>
            Light (saves ink)
          </button>
        </div>
        <label className="poster-check">
          <input type="checkbox" checked={hindi} onChange={(e) => setHindi(e.target.checked)} /> Hindi lines
        </label>
      </div>
      <div className="poster-sheet" ref={ref}>
        <PosterSvg {...poster} />
      </div>
      <PosterPrint {...poster} />
      <div className="actions">
        <button className="btn btn-primary" onClick={() => print()}>
          <Printer size={17} /> Print (A4)
        </button>
        <button className="btn btn-soft" onClick={() => void save()} disabled={saving}>
          <Download size={17} /> {saving ? 'Saving…' : 'Download PNG'}
        </button>
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
    phone: merchant.phone,
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
          phone: form.phone,
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
            <label>
              Your WhatsApp number
              <input type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} placeholder="98765 43210" />
              <span className="hint">Only for Habiturn support. Customers don't see it.</span>
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
