// Privacy-friendly page-view tracking for the site (no cookies, no IP addresses, nothing personal).
// Sends one "view" when a page opens and a "leave" with the time the page was actually visible and
// how far it was scrolled. The visitor id is random and changes every day; the session id lives
// only as long as the browser tab. Visits from a browser that has opened /admin are not counted.
// The superadmin sees the numbers under Admin → Visits.

const IGNORE_KEY = 'lp_sa_ignore';

type Store = Pick<Storage, 'getItem' | 'setItem'>;

function safe(get: () => Store): Store | undefined {
  try {
    return get();
  } catch {
    return undefined;
  }
}

const randomId = () =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

/** Wallet, bill and reset links carry secrets, so only their kind is sent (the server masks them too). */
const maskPath = (path: string) => path.replace(/^\/(w|c|reset)\/[^/]+/, '/$1/…');

function send(body: object) {
  const data = JSON.stringify(body);
  const blob = new Blob([data], { type: 'application/json' });
  if (!navigator.sendBeacon?.('/api/collect', blob)) {
    void fetch('/api/collect', { method: 'POST', body: data, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => {});
  }
}

/** Marks this browser as the site owner's, so its visits are left out of the numbers. */
export function ignoreThisBrowser() {
  safe(() => localStorage)?.setItem(IGNORE_KEY, '1');
}

export function trackPageView() {
  const local = safe(() => localStorage);
  const session = safe(() => sessionStorage);
  if (local?.getItem(IGNORE_KEY) === '1' || navigator.webdriver) return;

  const today = new Date().toISOString().slice(0, 10);
  let visitor = local?.getItem('lp_sa_vid')?.split('|');
  const returning = Boolean(local?.getItem('lp_sa_seen'));
  if (!visitor || visitor[0] !== today) {
    visitor = [today, randomId()];
    local?.setItem('lp_sa_vid', visitor.join('|'));
  }
  local?.setItem('lp_sa_seen', '1');
  let sid = session?.getItem('lp_sa_sid');
  if (!sid) {
    sid = randomId();
    session?.setItem('lp_sa_sid', sid);
  }

  const id = randomId();
  const params = new URLSearchParams(location.search);
  const path = maskPath(location.pathname);
  send({
    t: 'view',
    id,
    ts: new Date().toISOString(),
    path,
    title: path === location.pathname ? document.title : '',
    host: location.hostname,
    ref: document.referrer,
    utmSource: params.get('utm_source') ?? params.get('ref') ?? '',
    utmMedium: params.get('utm_medium') ?? '',
    utmCampaign: params.get('utm_campaign') ?? '',
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
    lang: navigator.language,
    w: screen.width,
    vid: visitor[1],
    sid,
    ret: returning,
  });

  // Count only time the page is in front of the reader.
  let visibleSince = document.visibilityState === 'visible' ? performance.now() : 0;
  let visible = 0;
  let maxScroll = 0;

  const measureScroll = () => {
    const doc = document.documentElement;
    const total = doc.scrollHeight - innerHeight;
    const pct = total > 0 ? (scrollY / total) * 100 : 100;
    maxScroll = Math.max(maxScroll, Math.min(100, Math.round(pct)));
  };
  addEventListener('scroll', measureScroll, { passive: true });
  // The page renders after this runs, so measure once it has content.
  addEventListener('load', measureScroll);

  const leave = () => {
    if (visibleSince) {
      visible += performance.now() - visibleSince;
      visibleSince = 0;
    }
    send({ t: 'leave', id, dur: Math.round(visible), scroll: maxScroll });
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') leave();
    else visibleSince = performance.now();
  });
  addEventListener('pagehide', leave);
}
