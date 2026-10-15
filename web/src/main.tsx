/// <reference types="vite/client" />
import { createRoot, hydrateRoot } from 'react-dom/client';
import { ignoreThisBrowser, trackPageView } from './analytics';
import { App } from './App';
import { rememberArrival } from './attribution';
import './styles.css';

// A shop's share link (/r/<join code>). The server redirects it; this covers the dev server.
const shared = location.pathname.match(/^\/r\/([\w-]{1,40})\/?$/)?.[1];
if (shared) history.replaceState(null, '', `/?utm_source=shop&utm_medium=referral&utm_campaign=${shared}`);

// The homepage arrives prerendered (scripts/prerender.mjs), so React takes over that HTML instead of redrawing it.
const root = document.getElementById('root')!;
if (root.hasChildNodes()) hydrateRoot(root, <App />);
else createRoot(root).render(<App />);

// Website visits for the superadmin; opening /admin marks this browser as the owner's so it isn't counted.
if (location.pathname === '/admin') ignoreThisBrowser();
else trackPageView();
// Where a future shop owner came from, sent with their sign-up.
rememberArrival();

// Installable app + offline shell (built app only, so live reload in development isn't cached).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => void navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
