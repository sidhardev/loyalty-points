import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bell, ChevronRight, Crown, Database, Download, FileSpreadsheet, Gift, LogOut, MessageCircle, Printer, ScrollText, Store, UserCog } from 'lucide-react';
import { api, download, type Merchant } from '../api';
import '../counter.css';
import { downloadPoster, PosterPrint, PosterSvg, type PosterTheme } from '../poster';
import '../poster.css';
import { ReferralCard, ShareCard } from '../share';
import { LangToggle, t, useLang } from '../i18n';
import { ErrorText, confirmDialog, toast, useAction, useTheme } from '../ui';
import { AutoWhatsApp } from './AutoWhatsApp';
import { Stamps, messageLang } from './Counter';

/** The counter poster: tells customers the rule and that they only need to say their number. Prints on A4 or saves as a PNG. */
function Poster({ merchant }: { merchant: Merchant }) {
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

  const poster = { shop: merchant.name, visitsNeeded: merchant.visitsNeeded, rewardName: merchant.rewardName, theme, hindi };

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
          <Printer size={18} /> {t('Counter poster')}
        </h2>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        {t('Put it where people pay, so customers know about your card and tell you their number.')}
      </p>
      <div className="poster-options">
        <div className="seg" role="group" aria-label="Poster colour">
          <button type="button" className={theme === 'green' ? 'active' : ''} onClick={() => setTheme('green')}>
            {t('Green')}
          </button>
          <button type="button" className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>
            {t('Light (saves ink)')}
          </button>
        </div>
        <label className="poster-check">
          <input type="checkbox" checked={hindi} onChange={(e) => setHindi(e.target.checked)} /> {t('Hindi lines')}
        </label>
      </div>
      <div className="poster-sheet" ref={ref}>
        <PosterSvg {...poster} />
      </div>
      <PosterPrint {...poster} />
      <div className="actions">
        <button className="btn btn-primary" onClick={() => print()}>
          <Printer size={17} /> {t('Print (A4)')}
        </button>
        <button className="btn btn-soft" onClick={() => void save()} disabled={saving}>
          <Download size={17} /> {saving ? t('Saving…') : t('Download PNG')}
        </button>
      </div>
    </section>
  );
}

/** Activity log and spreadsheet downloads. */
function YourData() {
  const [busy, setBusy] = useState('');
  const save = async (path: string, file: string) => {
    setBusy(path);
    try {
      await download(path, file);
      toast(t('Downloaded'));
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
          <Database size={18} /> {t('Your data')}
        </h2>
      </div>
      <a className="row-item link-row" href="#/plan">
        <Crown size={19} />
        <span className="row-main">
          <strong>{t('Your plan')}</strong>
          <span>{t('Customer limit and Founding Shop')}</span>
        </span>
        <ChevronRight size={18} />
      </a>
      <a className="row-item link-row" href="#/activity">
        <ScrollText size={19} />
        <span className="row-main">
          <strong>{t('Activity log')}</strong>
          <span>{t('Rewards given, undos, deleted customers and changes')}</span>
        </span>
        <ChevronRight size={18} />
      </a>
      <p className="muted small" style={{ margin: 0 }}>
        {t('Download a spreadsheet (opens in Excel or Google Sheets). Keep a copy as a backup.')}
      </p>
      <div className="actions">
        <button className="btn btn-soft" disabled={!!busy} onClick={() => void save('export/customers.csv', `customers-${date}.csv`)}>
          <FileSpreadsheet size={17} /> {busy === 'export/customers.csv' ? t('Preparing…') : t('Customers')}
        </button>
        <button className="btn btn-soft" disabled={!!busy} onClick={() => void save('export/transactions.csv', `visit-history-${date}.csv`)}>
          <FileSpreadsheet size={17} /> {busy === 'export/transactions.csv' ? t('Preparing…') : t('Visit history')}
        </button>
      </div>
    </section>
  );
}

const VISITS = [3, 4, 5, 6, 8, 10];

export function Settings({ merchant, onSaved, onLogout }: { merchant: Merchant; onSaved: (m: Merchant) => void; onLogout: () => void }) {
  useLang();
  const theme = useTheme();
  const [form, setForm] = useState({
    name: merchant.name,
    phone: merchant.phone,
    visitsNeeded: merchant.visitsNeeded,
    rewardName: merchant.rewardName,
    inactiveDays: String(merchant.inactiveDays),
  });
  const [lang, setLang] = useState(messageLang);
  const { busy, error, run } = useAction();

  const set = (key: 'name' | 'phone' | 'rewardName' | 'inactiveDays') => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  const chooseLang = (l: 'hi' | 'en') => {
    setLang(l);
    try {
      localStorage.setItem('lp_msg_lang', l);
    } catch {
      // Just not remembered.
    }
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      onSaved(await api<Merchant>('me', 'PATCH', { ...form, inactiveDays: Number(form.inactiveDays) }));
      toast(t('Settings saved'));
    });
  };

  return (
    <>
      <header className="page-head">
        <div>
          <h1>{t('Settings')}</h1>
          <p>{merchant.email || merchant.phone}</p>
        </div>
      </header>
      <div className="grid-2">
        <form className="card" onSubmit={save}>
          <div className="settings-section">
            <h3>
              <Gift size={17} /> {t('Your card')}
            </h3>
            <div className="setup-line" style={{ justifyItems: 'start' }}>
              <span>{t('Every')}</span>
              <div className="seg seg-big" role="group" aria-label="Visits">
                {VISITS.map((n) => (
                  <button type="button" key={n} className={form.visitsNeeded === n ? 'active' : ''} onClick={() => setForm({ ...form, visitsNeeded: n })}>
                    {n}
                  </button>
                ))}
              </div>
              <span>{t('visits, the customer gets')}</span>
            </div>
            <input className="setup-reward" style={{ textAlign: 'left' }} value={form.rewardName} onChange={set('rewardName')} placeholder={t('Free chai')} maxLength={60} required aria-label="Reward" />
            <Stamps stamps={form.visitsNeeded - 1} needed={form.visitsNeeded} />
            <span className="hint">{t("Changing the number keeps everyone's visits. Customers who already have enough get the reward on their next visit.")}</span>
          </div>

          <div className="settings-section">
            <h3>
              <Store size={17} /> {t('Shop')}
            </h3>
            <label>
              {t('Shop name')}
              <input value={form.name} onChange={set('name')} required />
            </label>
            <label>
              {t('Your WhatsApp number')}
              <input type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} placeholder="98765 43210" />
              <span className="hint">{t("Only for Regularhood support. Customers don't see it.")}</span>
            </label>
          </div>

          <div className="settings-section">
            <h3>
              <MessageCircle size={17} /> {t('WhatsApp message to customers')}
            </h3>
            <div className="seg" role="group" aria-label="Message language">
              <button type="button" className={lang === 'hi' ? 'active' : ''} onClick={() => chooseLang('hi')} lang="hi">
                हिंदी
              </button>
              <button type="button" className={lang === 'en' ? 'active' : ''} onClick={() => chooseLang('en')}>
                English
              </button>
            </div>
            <span className="hint">{t('Saved on this phone right away.')}</span>
          </div>

          <div className="settings-section">
            <h3>
              <Bell size={17} /> {t('Reminders')}
            </h3>
            <label>
              {t('Days without a visit before a customer counts as “not seen”')}
              <input type="number" min="7" max="365" step="1" value={form.inactiveDays} onChange={set('inactiveDays')} required />
            </label>
          </div>

          <ErrorText text={error} />
          <button className="btn btn-primary btn-lg" disabled={busy}>
            {busy ? t('Saving…') : t('Save settings')}
          </button>
        </form>
        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <AutoWhatsApp merchant={merchant} onMerchant={onSaved} />
          <Poster merchant={merchant} />
          <ShareCard merchant={merchant} />
          <ReferralCard merchant={merchant} />
          <YourData />
          <section className="card">
            <div className="card-head">
              <h2>
                <UserCog size={18} /> {t('Account')}
              </h2>
            </div>
            <div className="account-row">
              <span>{t('App language')}</span>
              <LangToggle />
            </div>
            <div className="account-row">
              <span>{t('Dark mode')}</span>
              <button type="button" className="btn btn-soft btn-sm" onClick={theme.toggle}>
                <theme.Icon size={16} /> {theme.theme === 'dark' ? t('Turn off') : t('Turn on')}
              </button>
            </div>
            <button
              type="button"
              className="btn btn-ghost danger"
              onClick={async () => {
                if (await confirmDialog({ title: t('Log out?'), confirm: t('Log out'), cancel: t('Cancel') })) onLogout();
              }}
            >
              <LogOut size={17} /> {t('Log out')}
            </button>
          </section>
        </div>
      </div>
    </>
  );
}
