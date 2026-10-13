import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { BarChart3, Download, Gift, LayoutDashboard, LogOut, Plus, Settings as SettingsIcon, Users } from 'lucide-react';
import { api, getToken, LOGGED_OUT, setToken, type Merchant } from './api';
import { enableTranslation } from './i18n';
import { AdminApp } from './pages/Admin';
import { AuthPage, ResetPassword } from './pages/Auth';
import { CustomerPage } from './pages/CustomerPage';
import { Customers } from './pages/Customers';
import { Dashboard } from './pages/Dashboard';
import { GivePointsHost } from './pages/GivePoints';
import { ActivityLog } from './pages/ActivityLog';
import { Insights } from './pages/Insights';
import { Claim, CustomerLogin, Join, Wallet } from './pages/Public';
import { Rewards } from './pages/Rewards';
import { Settings } from './pages/Settings';
import { ConfirmHost, Logo, Toaster, confirmDialog, InstallButton, openGivePoints, useTheme } from './ui';

// The homepage and its animation library load on their own, so the shop app doesn't download them.
const Landing = lazy(() => import('./pages/Landing').then((m) => ({ default: m.Landing })));

// Real paths: / (homepage), /app (the shop app), /admin, and customer pages (/w/<token>, /join/<code>, /c/<bill code>,
// /login) so their links are clean to share.
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

const NAV = [
  { path: '/', label: 'Home', icon: LayoutDashboard },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/rewards', label: 'Rewards', icon: Gift },
  { path: '/insights', label: 'Insights', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: SettingsIcon },
];

function Shell({ merchant, children, onLogout }: { merchant: Merchant; children: ReactNode; onLogout: () => void }) {
  const hash = useHash();
  const theme = useTheme();
  const active = (path: string) => (path === '/' ? hash === '/' : hash.startsWith(path));
  const logout = async () => {
    if (await confirmDialog({ title: 'Log out?', confirm: 'Log out' })) onLogout();
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <a href="#/" className="brand">
          <Logo /> <span>{merchant.name}</span>
        </a>
        <button className="btn btn-primary btn-lg" onClick={() => openGivePoints()}>
          <Plus size={20} /> Give points
        </button>
        {NAV.map(({ path, label, icon: Icon }) => (
          <a key={path} href={`#${path}`} className={`side-link ${active(path) ? 'active' : ''}`}>
            <Icon size={19} /> {label === 'Home' ? 'Dashboard' : label}
          </a>
        ))}
        <div className="side-foot">
          <InstallButton className="side-link">
            <Download size={19} /> Install app
          </InstallButton>
          <button className="side-link" onClick={theme.toggle}>
            <theme.Icon size={19} /> {theme.theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button className="side-link" onClick={logout}>
            <LogOut size={19} /> Log out
          </button>
        </div>
      </aside>

      <header className="topbar">
        <a href="#/" className="brand">
          <Logo /> <span>{merchant.name}</span>
        </a>
        <InstallButton className="btn btn-soft btn-sm">
          <Download size={16} /> Install
        </InstallButton>
        <button className="icon-btn" onClick={theme.toggle} aria-label="Toggle dark mode">
          <theme.Icon size={20} />
        </button>
        <a className="icon-btn" href="#/settings" aria-label="Settings">
          <SettingsIcon size={20} />
        </a>
        <button className="icon-btn" onClick={logout} aria-label="Log out">
          <LogOut size={20} />
        </button>
      </header>

      <main className="page" key={hash.split('?')[0]}>
        {children}
      </main>

      <nav className="bottom-nav" aria-label="Main">
        {NAV.slice(0, 2).map(({ path, label, icon: Icon }) => (
          <a key={path} href={`#${path}`} className={active(path) ? 'active' : ''}>
            <Icon size={21} /> {label}
          </a>
        ))}
        <button className="fab" onClick={() => openGivePoints()} aria-label="Give points">
          <Plus size={26} strokeWidth={2.5} />
        </button>
        {NAV.slice(2, 4).map(({ path, label, icon: Icon }) => (
          <a key={path} href={`#${path}`} className={active(path) ? 'active' : ''}>
            <Icon size={21} /> {label}
          </a>
        ))}
      </nav>

      <GivePointsHost merchant={merchant} />
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

  const logout = () => {
    setToken(null);
    setMerchant(null);
    location.hash = '/';
  };

  const customerId = hash.match(/^\/customers\/(\d+)$/)?.[1];
  let page: ReactNode;
  if (customerId) page = <CustomerPage key={customerId} id={Number(customerId)} merchant={merchant} />;
  else if (hash.startsWith('/customers')) page = <Customers merchant={merchant} hash={hash} />;
  else if (hash.startsWith('/rewards')) page = <Rewards />;
  else if (hash.startsWith('/insights')) page = <Insights />;
  else if (hash.startsWith('/activity')) page = <ActivityLog />;
  else if (hash.startsWith('/settings')) page = <Settings merchant={merchant} onSaved={setMerchant} />;
  else page = <Dashboard merchant={merchant} />;

  return (
    <Shell merchant={merchant} onLogout={logout}>
      {page}
    </Shell>
  );
}

function Route() {
  if (location.pathname === '/admin') return <AdminApp />;
  const reset = location.pathname.match(/^\/reset\/([^/]+)/)?.[1];
  if (reset) return <ResetPassword token={decodeURIComponent(reset)} />;
  const [, kind, id] = location.pathname.match(/^\/(w|join|c)\/([^/]+)/) ?? [];
  if (kind || location.pathname === '/login') enableTranslation(); // customer pages can switch to Hindi
  if (location.pathname === '/login') return <CustomerLogin />;
  if (kind === 'w') return <Wallet token={decodeURIComponent(id)} />;
  if (kind === 'c') return <Claim code={decodeURIComponent(id)} />;
  if (kind === 'join') return <Join code={decodeURIComponent(id)} />;
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
