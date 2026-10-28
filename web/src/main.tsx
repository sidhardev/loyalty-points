/// <reference types="vite/client" />
import { createRoot, hydrateRoot } from 'react-dom/client';
import { ignoreThisBrowser, trackPageView } from './analytics';
import { App } from './App';
import { rememberArrival } from './attribution';
import './styles.css';

// A shop's share link (/r/<join code>) opens the referral page, tagged as that shop's referral so the visit and the
// sign-up count for it.
const shared = location.pathname.match(/^\/r\/([\w-]{1,40})\/?$/)?.[1];
if (shared && !new URLSearchParams(location.search).has('utm_source')) history.replaceState(null, '', `/r/${shared}?utm_source=shop&utm_medium=referral&utm_campaign=${shared}`);
// A partner's link (/?p=<code>, pages/Partner.tsx) is tagged the same way, keeping anything else on it (?lang=ml).
const params = new URLSearchParams(location.search);
const partner = params.get('p')?.match(/^[\w-]{1,20}$/)?.[0];
if (partner && !params.has('utm_source')) {
  params.delete('p');
  for (const [key, value] of Object.entries({ utm_source: 'partner', utm_medium: 'partner', utm_campaign: partner })) params.set(key, value);
  history.replaceState(null, '', `${location.pathname}?${params}${location.hash}`);
}

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
