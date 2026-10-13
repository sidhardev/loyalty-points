// Where a would-be shop owner first came from, kept in this browser and sent with the sign-up (server/src/growth.ts),
// so Admin → Growth can count sign-ups per source. First visit wins for 60 days, except that a tracked link
// (utm_source or ?ref=) replaces a plain direct visit. Only the homepage and the shop app count; customer pages don't.

const KEY = 'lp_src';
const KEEP_MS = 60 * 86_400_000;

export type Attribution = { source: string; medium: string; campaign: string; ref: string; landing: string; at: number };

function read(): Attribution | null {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || 'null') as Attribution | null;
    return a && Date.now() - a.at < KEEP_MS ? a : null;
  } catch {
    return null;
  }
}

export function rememberArrival() {
  if (location.pathname !== '/' && !location.pathname.startsWith('/app')) return;
  const params = new URLSearchParams(location.search);
  const source = (params.get('utm_source') ?? params.get('ref') ?? '').slice(0, 60);
  let ref = '';
  try {
    const host = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : '';
    ref = host === location.hostname.replace(/^www\./, '') ? '' : host;
  } catch {
    // No usable referrer.
  }
  const before = read();
  if (before && (before.source || before.ref || !(source || ref))) return;
  const now: Attribution = {
    source,
    medium: (params.get('utm_medium') ?? '').slice(0, 60),
    campaign: (params.get('utm_campaign') ?? '').slice(0, 80),
    ref,
    landing: `${location.pathname}${location.search}`.slice(0, 200),
    at: Date.now(),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(now));
  } catch {
    // Private mode: this visit just isn't attributed.
  }
}

/** Sent with the sign-up. */
export const arrival = () => read();

/** A link to the homepage that Admin → Growth counts under `source` (and `campaign`). */
export function trackedLink(source: string, campaign = '', medium = '') {
  const params = new URLSearchParams({ utm_source: source });
  if (medium) params.set('utm_medium', medium);
  if (campaign) params.set('utm_campaign', campaign);
  return `${location.origin}/?${params}`;
}
