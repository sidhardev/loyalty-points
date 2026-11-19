import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { country, COUNTRIES, example } from '../country';
import { ArrowLeft, ChevronRight, Crown, Database, Download, FileSpreadsheet, Gift, ImageIcon, LogOut, MessageCircle, Printer, ScrollText, Share2, Store, type LucideIcon } from 'lucide-react';
import { api, download, phoneLabel, type Merchant, type MsgLang } from '../api';
import '../counter.css';
import { downloadPoster, PosterPrint, PosterSvg, type PosterTheme } from '../poster';
import '../poster.css';
import { ShareSheet } from '../share';
import { LangToggle, t, useLang } from '../i18n';
import { ErrorText, InstallButton, confirmDialog, toast, useAction, useTheme } from '../ui';
import { openPlan } from '../billing';
import { ProSettings } from './ProSettings';
import { Stamps, markPosterDone, messageLang } from './Counter';

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
        <button
          className="btn btn-primary"
          onClick={() => {
            markPosterDone();
            print();
          }}
        >
          <Printer size={17} /> {t('Print (A4)')}
        </button>
        <button
          className="btn btn-soft"
          onClick={() => {
            markPosterDone();
            void save();
          }}
          disabled={saving}
        >
          <Download size={17} /> {saving ? t('Saving…') : t('Download PNG')}
        </button>
      </div>
    </section>
  );
}

/** Spreadsheet downloads (Pro). */
function YourData({ merchant }: { merchant: Merchant }) {
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
      <p className="muted small" style={{ margin: 0 }}>
        {merchant.pro
          ? t('Download a spreadsheet (opens in Excel or Google Sheets). Keep a copy as a backup.')
          : t('Downloading in Excel is part of Pro. On Free, write to us and we’ll send your customer list.')}
      </p>
      {!merchant.pro ? (
        <button className="btn btn-soft" onClick={openPlan}>
          <Crown size={17} /> {t('Get Pro to download')}
        </button>
      ) : (
      <div className="actions">
        <button className="btn btn-soft" disabled={!!busy} onClick={() => void save('export/customers.csv', `customers-${date}.csv`)}>
          <FileSpreadsheet size={17} /> {busy === 'export/customers.csv' ? t('Preparing…') : t('Customers')}
        </button>
        <button className="btn btn-soft" disabled={!!busy} onClick={() => void save('export/transactions.csv', `visit-history-${date}.csv`)}>
          <FileSpreadsheet size={17} /> {busy === 'export/transactions.csv' ? t('Preparing…') : t('Visit history')}
        </button>
      </div>
      )}
    </section>
  );
}

const VISITS = [3, 4, 5, 6, 8, 10];

// Settings is a short menu; each thing a shop changes has its own small page (#/settings/card, …),
// so nobody scrolls past a poster and a Pro ad to find the reward, and every page saves on its own.

/** A sub-page: back to the menu, a title, and its content. */
function SubPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <a href="#/settings" className="back">
        <ArrowLeft size={16} /> {t('Settings')}
      </a>
      <header className="page-head">
        <div>
          <h1>{title}</h1>
        </div>
      </header>
      <div className="settings-sub">{children}</div>
    </>
  );
}

/** Saves part of the shop's details, then goes back to the menu. */
function useSave(onSaved: (m: Merchant) => void) {
  const action = useAction();
  const save = (body: Record<string, unknown>) => (e: FormEvent) => {
    e.preventDefault();
    void action.run(async () => {
      onSaved(await api<Merchant>('me', 'PATCH', body));
      toast(t('Saved'));
      location.hash = '/settings';
    });
  };
  return { ...action, save };
}

function SaveButton({ busy }: { busy: boolean }) {
  return (
    <button className="btn btn-primary btn-lg" disabled={busy}>
      {busy ? t('Saving…') : t('Save')}
    </button>
  );
}

function CardForm({ merchant, onSaved }: { merchant: Merchant; onSaved: (m: Merchant) => void }) {
  const [visitsNeeded, setVisits] = useState(merchant.visitsNeeded);
  const [rewardName, setReward] = useState(merchant.rewardName);
  const [welcomeStamps, setWelcome] = useState(merchant.welcomeStamps ?? 0);
  const { busy, error, setError, save } = useSave(onSaved);
  const submit = save({ visitsNeeded, rewardName, welcomeStamps });
  return (
    <form
      className="card settings-form"
      onSubmit={(e) => {
        if (!rewardName.trim()) {
          e.preventDefault();
          return setError(t('Write the reward first, for example: Free coffee'));
        }
        submit(e);
      }}
    >
      <div className="setup-line" style={{ justifyItems: 'start' }}>
        <span>{t('Every')}</span>
        <div className="seg seg-big" role="group" aria-label="Visits">
          {VISITS.map((n) => (
            <button type="button" key={n} className={visitsNeeded === n ? 'active' : ''} onClick={() => setVisits(n)}>
              {n}
            </button>
          ))}
        </div>
        <span>{t('visits, the customer gets')}</span>
      </div>
      <input
        className="setup-reward"
        style={{ textAlign: 'left' }}
        value={rewardName}
        onChange={(e) => {
          setReward(e.target.value);
          setError('');
        }}
        placeholder={t('e.g. Free coffee')}
        maxLength={60}
        aria-label="Reward"
      />
      <Stamps stamps={visitsNeeded - 1} needed={visitsNeeded} />
      <span className="hint">{t("Changing the number keeps everyone's visits. Customers who already have enough get the reward on their next visit.")}</span>
      <div className="welcome-stamps">
        <span className="welcome-label">{t('Welcome stamp on the first visit')}</span>
        <div className="seg" role="group" aria-label="Welcome stamps">
          {[0, 1, 2].map((n) => (
            <button type="button" key={n} className={welcomeStamps === n ? 'active' : ''} disabled={n > 0 && n > visitsNeeded - 2} onClick={() => setWelcome(n)}>
              {n === 0 ? t('Off') : `+${n}`}
            </button>
          ))}
        </div>
        <span className="hint">
          {t('New customers start with a card that is already begun, so more of them finish it.')}{' '}
          {welcomeStamps > 0 && t('Tip: add {n} to the visits so the reward costs you the same.', { n: welcomeStamps })}
        </span>
      </div>
      <ErrorText text={error} />
      <SaveButton busy={busy} />
    </form>
  );
}

function ShopForm({ merchant, onSaved }: { merchant: Merchant; onSaved: (m: Merchant) => void }) {
  const [form, setForm] = useState({ name: merchant.name, country: merchant.country || 'IN', phone: merchant.phone });
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });
  const { busy, error, save } = useSave(onSaved);
  return (
    <form className="card settings-form" onSubmit={save(form)}>
      <label>
        {t('Shop name')}
        <input value={form.name} onChange={set('name')} required />
      </label>
      <label>
        {t('Country')}
        <select value={form.country} onChange={set('country')}>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} (+{c.dial})
            </option>
          ))}
        </select>
        <span className="hint">{t('How customers’ numbers are typed at the counter and sent on WhatsApp.')}</span>
      </label>
      <label>
        {t('Your WhatsApp number')}
        <input type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} placeholder={example(country(form.country))} />
        <span className="hint">{t("Only for Regularhood support. Customers don't see it.")}</span>
      </label>
      <ErrorText text={error} />
      <SaveButton busy={busy} />
    </form>
  );
}

const LANG_NAME: Record<MsgLang, string> = { hi: 'हिंदी', en: 'English', ml: 'മലയാളം' };

function MessagesForm({ merchant, onSaved }: { merchant: Merchant; onSaved: (m: Merchant) => void }) {
  const [lang, setLang] = useState(messageLang);
  const [inactiveDays, setDays] = useState(String(merchant.inactiveDays));
  const [avgBill, setBill] = useState(merchant.avgBill ? String(merchant.avgBill) : '');
  const { busy, error, save } = useSave(onSaved);
  const submit = save({ inactiveDays: Number(inactiveDays), avgBill: Math.round(Number(avgBill) || 0) });
  return (
    <form
      className="card settings-form"
      onSubmit={(e) => {
        try {
          localStorage.setItem('lp_msg_lang', lang); // kept on this phone
        } catch {
          // Just not remembered.
        }
        submit(e);
      }}
    >
      <div className="settings-field">
        <span className="welcome-label">{t('WhatsApp message to customers')}</span>
        <div className="seg" role="group" aria-label="Message language">
          {(['hi', 'en', 'ml'] as MsgLang[]).map((l) => (
            <button type="button" key={l} className={lang === l ? 'active' : ''} onClick={() => setLang(l)} lang={l}>
              {LANG_NAME[l]}
            </button>
          ))}
        </div>
      </div>
      <label>
        {t('Days without a visit before a customer counts as “not seen”')}
        <input type="number" min="7" max="365" step="1" value={inactiveDays} onChange={(e) => setDays(e.target.value)} required />
      </label>
      <label>
        {t('What a customer spends on one visit, about')}
        <input type="number" inputMode="numeric" min="0" max="1000000" step="1" value={avgBill} onChange={(e) => setBill(e.target.value)} />
        <span className="hint">{t('Your monthly report on the Customers page shows return visits in money with this.')}</span>
      </label>
      <ErrorText text={error} />
      <SaveButton busy={busy} />
    </form>
  );
}

/** One line of the menu: an icon, what it is, what's set now, and an arrow. */
function MenuRow({ href, onClick, icon: Icon, title, sub, badge }: { href?: string; onClick?: () => void; icon: LucideIcon; title: string; sub?: string; badge?: ReactNode }) {
  const inner = (
    <>
      <span className="menu-icon">
        <Icon size={19} />
      </span>
      <span className="row-main">
        <strong>
          {title} {badge}
        </strong>
        {sub && <span>{sub}</span>}
      </span>
      <ChevronRight size={18} className="menu-arrow" />
    </>
  );
  return href ? (
    <a className="row-item menu-row" href={href}>
      {inner}
    </a>
  ) : (
    <button type="button" className="row-item menu-row" onClick={onClick}>
      {inner}
    </button>
  );
}

function MenuGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card menu-group">
      <h2 className="menu-title">{title}</h2>
      <div className="rows">{children}</div>
    </section>
  );
}

export function Settings({ merchant, hash, onSaved, onLogout }: { merchant: Merchant; hash: string; onSaved: (m: Merchant) => void; onLogout: () => void }) {
  useLang();
  const theme = useTheme();
  const [sharing, setSharing] = useState(false);
  const part = hash.split('?')[0].split('/')[2] ?? '';

  const sub = (title: string, content: ReactNode) => <SubPage title={title}>{content}</SubPage>;
  if (part === 'card') return sub(t('Your card'), <CardForm merchant={merchant} onSaved={onSaved} />);
  if (part === 'shop') return sub(t('Shop details'), <ShopForm merchant={merchant} onSaved={onSaved} />);
  if (part === 'messages') return sub(t('WhatsApp & reminders'), <MessagesForm merchant={merchant} onSaved={onSaved} />);
  if (part === 'poster') return sub(t('Counter poster'), <Poster merchant={merchant} />);
  if (part === 'pro') return sub(t('Logo & Google review'), <ProSettings merchant={merchant} onMerchant={onSaved} />);
  if (part === 'data') return sub(t('Download your data'), <YourData merchant={merchant} />);

  const pro = !merchant.pro && (
    <span className="pro-tag">
      <Crown size={11} /> {t('Pro')}
    </span>
  );

  return (
    <>
      <header className="page-head">
        <div>
          <h1>{t('Settings')}</h1>
          <p>{merchant.email || phoneLabel(merchant.phone, merchant.country)}</p>
        </div>
      </header>
      <div className="settings-menu">
        <MenuGroup title={t('Your shop')}>
          <MenuRow href="#/settings/card" icon={Gift} title={t('Your card')} sub={`${t('Every {n} visits →', { n: merchant.visitsNeeded })} ${merchant.rewardName}`} />
          <MenuRow href="#/settings/shop" icon={Store} title={t('Shop details')} sub={merchant.name} />
          <MenuRow
            href="#/settings/messages"
            icon={MessageCircle}
            title={t('WhatsApp & reminders')}
            sub={`${LANG_NAME[messageLang()]} · ${t('Not seen {n} days', { n: merchant.inactiveDays })}`}
          />
        </MenuGroup>

        <MenuGroup title={t('Get more customers')}>
          <MenuRow href="#/settings/poster" icon={Printer} title={t('Counter poster')} sub={t('Print it or save it as a picture')} />
          <MenuRow
            onClick={() => {
              markPosterDone();
              setSharing(true);
            }}
            icon={Share2} title={t('Share on WhatsApp status')} sub={t('A ready image, in Hindi or English')} />
          <MenuRow href="#/settings/pro" icon={ImageIcon} title={t('Logo & Google review')} sub={t('Your logo and a review button on every card')} badge={pro} />
        </MenuGroup>

        <MenuGroup title={t('Plan & data')}>
          <MenuRow href="#/plan" icon={Crown} title={t('Your plan')} sub={t('Free or Pro, and your customer limit')} />
          <MenuRow href="#/activity" icon={ScrollText} title={t('Activity log')} sub={t('Rewards given, undos, deleted customers and changes')} />
          <MenuRow href="#/settings/data" icon={Database} title={t('Download your data')} sub={t('Customers and visits in Excel')} badge={pro} />
        </MenuGroup>

        <section className="card menu-group">
          <h2 className="menu-title">{t('Account')}</h2>
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
          <InstallButton className="btn btn-soft">
            <Download size={17} /> {t('Install app')}
          </InstallButton>
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
      {sharing && <ShareSheet merchant={merchant} onClose={() => setSharing(false)} />}
    </>
  );
}
