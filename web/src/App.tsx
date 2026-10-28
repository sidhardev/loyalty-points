import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Download, LogOut, Settings as SettingsIcon, Stamp, Users } from 'lucide-react';
import { api, getToken, LOGGED_OUT, setToken, type Merchant } from './api';
import { enableTranslation, LangToggle, t, useLang } from './i18n';
import { clearBilling, LimitCard, LimitPill, PlanHost, refreshBilling } from './billing';
import { AdminApp } from './pages/Admin';
import { AuthPage, ResetPassword } from './pages/Auth';
import { CustomerPage } from './pages/CustomerPage';
import { Customers } from './pages/Customers';
import { Counter } from './pages/Counter';
import { ActivityLog } from './pages/ActivityLog';
import { Join, OldLink, Wallet } from './pages/Public';
import { Plan } from './pages/Plan';
import { Referral } from './pages/Referral';
import { Settings } from './pages/Settings';
import { ConfirmHost, confirmDialog, Logo, Toaster, InstallButton } from './ui';

// The homepage and its animation library load on their own, so the shop app doesn't download them.
const Landing = lazy(() => import('./pages/Landing').then((m) => ({ default: m.Landing })));

// Real paths: / (homepage), /app (the shop app), /admin, and customer pages (/w/<token>, /join/<code>) so their links
// are clean to share.
// The shop's own screens are picked from the URL hash (#/customers/3), so no router library is needed.

function useHash() {
  const [hash, setHash] = useState(location.hash.slice(1) || '/');
  useEffect(() => {
    const onChange = () => {
      setHash(location.hash.slice(1) || '/');
      scrollTo({ top: 0 });
    };
    addEventListener('hashchange', onChange);
    return () => removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

// Three places: the counter (add a visit), customers, settings.
const NAV = [
  { path: '/', label: 'Add visit', icon: Stamp },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/settings', label: 'Settings', icon: SettingsIcon },
];

function Shell({ merchant, onMerchant, onLogout, children }: { merchant: Merchant; onMerchant: (m: Merchant) => void; onLogout: () => void; children: ReactNode }) {
  useLang(); // the nav follows the chosen language
  const hash = useHash();
  useEffect(() => void refreshBilling().catch(() => {}), [merchant.id]); // the plan and customer limit, shown on every screen
  const active = (path: string) => (path === '/' ? hash === '/' : hash.startsWith(path));

  return (
    <div className="app">
      <aside className="sidebar">
        <a href="#/" className="brand">
          <Logo /> <span>{merchant.name}</span>
        </a>
        {NAV.map(({ path, label, icon: Icon }) => (
          <a key={path} href={`#${path}`} className={`side-link ${active(path) ? 'active' : ''}`}>
            <Icon size={19} /> {t(label)}
          </a>
        ))}
        <LimitCard />
        <div className="side-foot">
          <LangToggle />
          <InstallButton className="side-link">
            <Download size={19} /> {t('Install app')}
          </InstallButton>
          <button
            type="button"
            className="side-link"
            onClick={async () => {
              if (await confirmDialog({ title: t('Log out?'), confirm: t('Log out'), cancel: t('Cancel') })) onLogout();
            }}
          >
            <LogOut size={19} /> {t('Log out')}
          </button>
        </div>
      </aside>

      <header className="topbar">
        <a href="#/" className="brand">
          <Logo /> <span>{merchant.name}</span>
        </a>
        <LimitPill />
        <InstallButton className="btn btn-soft btn-sm topbar-install">
          <Download size={16} /> <span>{t('Install')}</span>
        </InstallButton>
        <LangToggle />
      </header>

      <main className="page" key={hash.split('?')[0]}>
        {children}
      </main>

      <nav className="bottom-nav nav-3" aria-label="Main">
        {NAV.map(({ path, label, icon: Icon }) => (
          <a key={path} href={`#${path}`} className={active(path) ? 'active' : ''}>
            <Icon size={21} /> {t(label)}
          </a>
        ))}
      </nav>
      <PlanHost onMerchant={onMerchant} />
    </div>
  );
}

function ShopApp() {
  const [merchant, setMerchant] = useState<Merchant | null | undefined>(getToken() ? undefined : null);
  const hash = useHash();

  useEffect(() => {
    if (getToken()) api<Merchant>('me').then(setMerchant).catch(() => setMerchant(null));
    const onLogout = () => setMerchant(null);
    addEventListener(LOGGED_OUT, onLogout);
    return () => removeEventListener(LOGGED_OUT, onLogout);
  }, []);

  if (merchant === undefined) return null;
  if (!merchant) return <AuthPage onAuthed={setMerchant} />;
  enableTranslation(); // the shop's screens can switch to Hindi too

  const logout = () => {
    setToken(null);
    setMerchant(null);
    clearBilling();
    location.hash = '/';
  };

  const customerId = hash.match(/^\/customers\/(\d+)$/)?.[1];
  let page: ReactNode;
  if (customerId) page = <CustomerPage key={customerId} id={Number(customerId)} merchant={merchant} />;
  else if (hash.startsWith('/customers')) page = <Customers merchant={merchant} hash={hash} />;
  else if (hash.startsWith('/activity')) page = <ActivityLog />;
  else if (hash.startsWith('/plan')) page = <Plan merchant={merchant} onMerchant={setMerchant} />;
  else if (hash.startsWith('/settings')) page = <Settings merchant={merchant} onSaved={setMerchant} onLogout={logout} />;
  else page = <Counter merchant={merchant} onSaved={setMerchant} />;

  return (
    <Shell merchant={merchant} onMerchant={setMerchant} onLogout={logout}>
      {page}
    </Shell>
  );
}

function Route() {
  if (location.pathname === '/admin') return <AdminApp />;
  const reset = location.pathname.match(/^\/reset\/([^/]+)/)?.[1];
  if (reset) return <ResetPassword token={decodeURIComponent(reset)} />;
  const [, kind, id] = location.pathname.match(/^\/(w|join|c|r)\/([^/]+)/) ?? [];
  if (kind || location.pathname === '/login') enableTranslation(); // customer pages can switch to Hindi
  if (kind === 'w') return <Wallet token={decodeURIComponent(id)} />;
  // Bill QRs and PIN logins are gone: nothing to scan or remember, the shop types the number.
  if (kind === 'c' || location.pathname === '/login') return <OldLink />;
  if (kind === 'join') return <Join code={decodeURIComponent(id)} />;
  if (kind === 'r') return <Referral code={decodeURIComponent(id)} />;
  if (location.pathname === '/app' || location.pathname.startsWith('/app/')) return <ShopApp />;
  // The shop app used to live at "/": send old bookmarks like /#/customers to /app.
  if (location.hash.startsWith('#/')) {
    location.replace(`/app${location.hash}`);
    return null;
  }
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#eef2ec' }} />}>
      <Landing />
    </Suspense>
  );
}

export function App() {
  return (
    <>
      <Route />
      <Toaster />
      <ConfirmHost />
    </>
  );
}
