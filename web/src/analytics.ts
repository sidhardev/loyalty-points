// Privacy-friendly page-view tracking for the site (no cookies, no IP addresses, nothing personal).
// Sends one "view" when a page opens and a "leave" with the time the page was actually visible and
// how far it was scrolled. The visitor id is random and changes every day; the session id lives
// only as long as the browser tab. Visits from a browser that has opened /admin are not counted.
// Also records what visitors do: clicks (elements marked data-track="<name>", and on public pages any link or button by
// its text), homepage sections (data-section) they scroll to and how long each stayed on screen, the section they left
// from, how far down other pages they scrolled, which form fields they started on, what they typed into them before
// signing up (saved a second after they stop typing; never passwords or codes, nothing while logged in), and sign-ups. The superadmin sees the numbers and each visit's journey under Admin → Visits.
// When a shop owner is logged in on this browser, their login token goes along so Admin → Visits can name the shop.

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
const maskPath = (path: string) => path.replace(/^\/(w|c|reset|partner)\/[^/]+/, '/$1/…');

/** Pages whose buttons can carry a customer's or shop's details: only data-track clicks are recorded there. */
const PRIVATE = /^\/(app|w|c|reset|partner)(\/|$)/;

function send(body: object) {
  const data = JSON.stringify(body);
  const blob = new Blob([data], { type: 'application/json' });
  if (!navigator.sendBeacon?.('/api/collect', blob)) {
    void fetch('/api/collect', { method: 'POST', body: data, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => {});
  }
}

/** Homepage sections in page order, as marked with data-section in Landing.tsx; Admin → Visits shows how far people read. */
export const LANDING_SECTIONS: [string, string][] = [
  ['hero', 'Top of the page'],
  ['film', 'The film'],
  ['how', 'How it works'],
  ['why-card', 'Card that fills as you scroll'],
  ['every', 'Every kind of shop'],
  ['customers', 'Customer card'],
  ['why', 'Why shops pick it'],
  ['pricing', 'Pricing'],
  ['faq', 'FAQ'],
  ['final', 'Last call to sign up'],
  ['footer', 'Footer'],
];

/** The page view being recorded in this tab, if any (none when this browser is excluded). */
let viewId: string | null = null;

/** The shop owner's login token on this browser (see api.ts), if any. */
const shopToken = () => safe(() => localStorage)?.getItem('lp_token') || undefined;

/** A shop owner just logged in or signed up: this page view, and the ones after it, are that shop's. */
export function identifyShop() {
  const auth = shopToken();
  if (viewId && auth) send({ t: 'shop', id: viewId, auth });
}

type EventKind = 'click' | 'section' | 'signup' | 'scroll' | 'form' | 'dwell';

/** Records something the visitor did during this page view. Each name counts once per view. */
export function trackEvent(kind: EventKind, name: string, value?: number) {
  if (viewId) send({ t: 'event', id: viewId, kind, name: name.slice(0, 100), ...(value !== undefined ? { value: Math.round(value) } : {}) });
}

/** Time each homepage section has been the one in the middle of the screen (ms), and the one there now. */
const dwell = new Map<string, number>();
let currentSection = '';

const squash = (text: string | null | undefined, max = 60) => (text ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/** A readable name for a link or button nobody marked with data-track: its text, and where a link goes. */
function clickName(el: Element) {
  const label = squash(el.getAttribute('aria-label') || (el as HTMLElement).innerText || el.getAttribute('title'));
  if (!label) return '';
  const href = el.tagName === 'A' ? el.getAttribute('href') : null;
  if (!href) return `button: ${label}`;
  try {
    const url = new URL(href, location.href);
    const to = url.host === location.host ? `${maskPath(url.pathname)}${url.hash}` : url.protocol.startsWith('http') ? url.host : url.protocol.replace(':', '');
    return `link: ${label} → ${to}`;
  } catch {
    return `link: ${label}`;
  }
}

/** The name of a form field, never its value: its label, else its placeholder or name. */
function fieldName(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  // A label's first line is its name; hints under it ("We never share it") are left out.
  const label = el.labels?.[0]?.innerText.split('\n')[0] || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.name || el.type;
  return squash(label, 50);
}

/** Records each [data-section] element once the visitor scrolls to it. Returns a cleanup function. */
export function watchSections(root: ParentNode = document) {
  if (!viewId || !('IntersectionObserver' in window)) return () => {};
  const seen = new Set<string>();
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const name = (e.target as HTMLElement).dataset.section;
        // Seen: most of it is on screen, or it fills a good part of the screen (tall sections never fit whole).
        if (!name || seen.has(name) || !(e.intersectionRatio >= 0.6 || e.intersectionRect.height >= innerHeight * 0.4)) continue;
        seen.add(name);
        io.unobserve(e.target);
        trackEvent('section', name);
      }
    },
    { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] },
  );
  // Start a moment after load, so the page view reaches the server before its first section does.
  const start = setTimeout(() => root.querySelectorAll('[data-section]').forEach((el) => io.observe(el)), 1500);
  // Each second the page is in front, the section across the middle of the screen gets the time.
  const tick = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    const el = document.elementFromPoint(innerWidth / 2, innerHeight * 0.45)?.closest<HTMLElement>('[data-section]');
    currentSection = el?.dataset.section ?? currentSection;
    if (el?.dataset.section) dwell.set(el.dataset.section, (dwell.get(el.dataset.section) ?? 0) + 1000);
  }, 1000);
  return () => {
    clearTimeout(start);
    clearInterval(tick);
    io.disconnect();
  };
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
  viewId = id;
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
    auth: shopToken(),
  });

  // Clicks on anything marked data-track (buttons, links), and on public pages any other link or button;
  // captured before a link navigates away.
  const open = !PRIVATE.test(location.pathname);
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target as Element | null;
      const name = target?.closest?.('[data-track]')?.getAttribute('data-track');
      if (name) return trackEvent('click', name);
      const el = open ? target?.closest?.('a[href], button, summary, [role="button"], [role="tab"]') : null;
      const generic = el && clickName(el);
      if (generic) trackEvent('click', generic);
    },
    { capture: true },
  );

  // The first time each form field is used: shows who started signing up and where they gave up. Never the value.
  if (!/^\/(w|c|reset|partner)\//.test(location.pathname)) {
    document.addEventListener('focusin', (e) => {
      const el = e.target as HTMLElement;
      if (el instanceof HTMLInputElement && ['hidden', 'checkbox', 'radio', 'submit', 'button'].includes(el.type)) return;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        const field = fieldName(el);
        if (field) trackEvent('form', field);
      }
    });
  }

  // What they type into a form before signing up, saved a second after they stop typing, so half-filled sign-ups show in
  // Admin → Visits. Never passwords, one-time codes or card numbers, and nothing once a shop is logged in (the shop's
  // own customers' details are typed in the app).
  const pending = new Map<string, string>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const flushDraft = (field: string) => {
    clearTimeout(timers.get(field));
    timers.delete(field);
    const value = pending.get(field);
    if (value === undefined) return;
    pending.delete(field);
    send({ t: 'draft', id, field, value });
  };
  const flushDrafts = () => [...pending.keys()].forEach(flushDraft);
  if (!/^\/(w|c|reset|partner)\//.test(location.pathname)) {
    document.addEventListener('input', (e) => {
      const el = e.target;
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) return;
      if (el instanceof HTMLInputElement && ['hidden', 'password', 'checkbox', 'radio', 'submit', 'button', 'file'].includes(el.type)) return;
      if (/one-time-code|cc-|new-password|current-password/.test(el.getAttribute('autocomplete') ?? '') || shopToken()) return;
      const field = fieldName(el);
      if (!field) return;
      pending.set(field, el.value.slice(0, 500));
      clearTimeout(timers.get(field));
      timers.set(field, setTimeout(() => flushDraft(field), 1000));
    });
    // Moving to the next field saves the one just left at once.
    document.addEventListener('focusout', (e) => {
      const el = e.target;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        const field = fieldName(el);
        if (field) flushDraft(field);
      }
    });
  }

  // Count only time the page is in front of the reader.
  let visibleSince = document.visibilityState === 'visible' ? performance.now() : 0;
  let visible = 0;
  let maxScroll = 0;
  const marks = new Set<number>();

  const measureScroll = () => {
    const doc = document.documentElement;
    const total = doc.scrollHeight - innerHeight;
    const pct = total > 0 ? (scrollY / total) * 100 : 100;
    maxScroll = Math.max(maxScroll, Math.min(100, Math.round(pct)));
    // Milestones on the way down, each once, so the journey shows when they got how far.
    for (const mark of [25, 50, 75, 100]) {
      if (maxScroll >= mark && !marks.has(mark) && scrollY > 0) {
        marks.add(mark);
        trackEvent('scroll', `${mark}%`);
      }
    }
  };
  addEventListener('scroll', measureScroll, { passive: true });
  // The page renders after this runs, so measure once it has content.
  addEventListener('load', measureScroll);

  const leave = () => {
    if (visibleSince) {
      visible += performance.now() - visibleSince;
      visibleSince = 0;
    }
    flushDrafts();
    send({ t: 'leave', id, dur: Math.round(visible), scroll: maxScroll, at: currentSection });
    for (const [section, ms] of dwell) trackEvent('dwell', section, ms);
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') leave();
    else visibleSince = performance.now();
  });
  addEventListener('pagehide', leave);
}
