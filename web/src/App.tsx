import { useEffect, useState, type ReactNode } from 'react';
import { api, getToken, LOGGED_OUT, setToken, type Merchant } from './api';
import { AuthPage } from './pages/Auth';
import { CustomerPage } from './pages/CustomerPage';
import { Customers } from './pages/Customers';
import { Dashboard } from './pages/Dashboard';
import { Insights } from './pages/Insights';
import { Join, Wallet } from './pages/Public';
import { Rewards } from './pages/Rewards';
import { Settings } from './pages/Settings';

// Customer pages use real paths (/w/<token>, /join/<code>) so their links are clean to share.
// The shop's own screens are picked from the URL hash (#/customers/3), so no router library is needed.

function useHash() {
  const [hash, setHash] = useState(location.hash.slice(1) || '/');
  useEffect(() => {
    const onChange = () => setHash(location.hash.slice(1) || '/');
    addEventListener('hashchange', onChange);
    return () => removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

function Shell({ merchant, children, onLogout }: { merchant: Merchant; children: ReactNode; onLogout: () => void }) {
  const hash = useHash();
  const links = [
    ['/', 'Dashboard'],
    ['/customers', 'Customers'],
    ['/rewards', 'Rewards'],
    ['/insights', 'Insights'],
    ['/settings', 'Settings'],
  ];
  const active = (path: string) => (path === '/' ? hash === '/' : hash.startsWith(path));
  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <a href="#/" className="brand">
            ⭐ <span>{merchant.name}</span>
          </a>
          <div className="nav-links">
            {links.map(([path, label]) => (
              <a key={path} href={`#${path}`} className={active(path) ? 'active' : ''}>
                {label}
              </a>
            ))}
          </div>
          <button className="link" onClick={onLogout}>
            Log out
          </button>
        </div>
      </nav>
      <main className="page">{children}</main>
    </>
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
  else if (hash.startsWith('/customers')) page = <Customers merchant={merchant} inactiveView={hash.includes('filter=inactive')} />;
  else if (hash.startsWith('/rewards')) page = <Rewards />;
  else if (hash.startsWith('/insights')) page = <Insights />;
  else if (hash.startsWith('/settings')) page = <Settings merchant={merchant} onSaved={setMerchant} />;
  else page = <Dashboard merchant={merchant} />;

  return (
    <Shell merchant={merchant} onLogout={logout}>
      {page}
    </Shell>
  );
}

export function App() {
  const [, kind, id] = location.pathname.match(/^\/(w|join)\/([^/]+)/) ?? [];
  if (kind === 'w') return <Wallet token={decodeURIComponent(id)} />;
  if (kind === 'join') return <Join code={decodeURIComponent(id)} />;
  return <ShopApp />;
}
