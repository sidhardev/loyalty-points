// Talks to the NestJS API. The login token is kept in localStorage and sent with every request.

export type Merchant = {
  id: number;
  name: string;
  email: string;
  pointsPer100: number;
  joinCode: string;
  welcomeBonus: number;
  birthdayBonus: number;
  goldThreshold: number;
  goldMultiplier: number;
  inactiveDays: number;
  maxVisitsPerDay: number; // per customer in 24 hours, 0 = no limit
  largeBill: number; // bills above this ask to confirm, 0 = off
  phone: string; // owner's WhatsApp number, '' = not given
};

export type Tier = { name: 'Gold' | 'Member'; multiplier: number; toGold: number };

export type Customer = {
  id: number;
  name: string;
  phone: string;
  points: number;
  lifetimePoints: number;
  birthday: string | null; // MM-DD
  lastVisit: string | null;
  walletToken: string;
  hasPin: boolean;
  createdAt: string;
  tier: Tier;
};

export type Reward = { id: number; name: string; points_cost: number };

export type Transaction = {
  id: number;
  type: 'earn' | 'redeem' | 'bonus' | 'adjust';
  points: number; // signed
  amount: number | null;
  note: string | null;
  reversed?: number;
  reversal_of?: number | null;
  created_at: string;
  customer_id?: number;
  customer_name?: string;
};

export type Bonus = { label: string; points: number };

const TOKEN = 'lp_token';

export const getToken = () => localStorage.getItem(TOKEN);
export const setToken = (token: string | null) =>
  token ? localStorage.setItem(TOKEN, token) : localStorage.removeItem(TOKEN);

/** Fired when the token is missing or expired, so the app can show the login screen. */
export const LOGGED_OUT = 'lp-logged-out';

export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api/${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token && !path.startsWith('public/')) {
    setToken(null);
    dispatchEvent(new Event(LOGGED_OUT));
  }
  if (!res.ok) {
    const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    throw new Error(message || `Something went wrong (${res.status})`);
  }
  return data as T;
}

/** Saves a file the API makes (CSV exports), sending the login token with the request. */
export async function download(path: string, filename: string) {
  const res = await fetch(`/api/${path}`, { headers: { authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** About how much more someone has to spend to earn `points`, rounded up to ₹10. */
export const spendFor = (points: number, pointsPer100: number, multiplier = 1) =>
  points <= 0 ? 0 : Math.ceil((points * 100) / (pointsPer100 * multiplier) / 10) * 10;

export const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const num = (n: number) => n.toLocaleString('en-IN');

/** SQLite stores UTC as "YYYY-MM-DD HH:MM:SS". */
export const parseTime = (sqlTime: string) => new Date(`${sqlTime.replace(' ', 'T')}Z`);
export const when = (sqlTime: string) =>
  parseTime(sqlTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
export const daysAgo = (sqlTime: string) => Math.floor((Date.now() - parseTime(sqlTime).getTime()) / 86_400_000);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const birthdayLabel = (mmdd: string) => `${Number(mmdd.slice(3))} ${MONTHS[Number(mmdd.slice(0, 2)) - 1]}`;

// ---- links customers open ----

export const walletUrl = (token: string) => `${location.origin}/w/${token}`;
export const joinUrl = (code: string) => `${location.origin}/join/${code}`;
export const claimUrl = (code: string) => `${location.origin}/c/${code}`;

// Wallets opened on this phone, so a bill QR can be claimed with one tap.
export type SavedWallet = { token: string; shopId: number; shop: string; name: string };
const WALLETS = 'lp_wallets';

export function savedWallets(): SavedWallet[] {
  try {
    return JSON.parse(localStorage.getItem(WALLETS) || '[]') as SavedWallet[];
  } catch {
    return [];
  }
}

export function rememberWallet(w: SavedWallet) {
  try {
    localStorage.setItem(WALLETS, JSON.stringify([w, ...savedWallets().filter((x) => x.token !== w.token)].slice(0, 20)));
  } catch {
    // Without storage the customer just types their number next time.
  }
}

export function forgetWallet(token: string) {
  try {
    localStorage.setItem(WALLETS, JSON.stringify(savedWallets().filter((x) => x.token !== token)));
  } catch {
    // Nothing saved to forget.
  }
}

/** wa.me link with the message filled in; 10-digit numbers are treated as Indian (+91). */
export function whatsapp(phone: string, text: string) {
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
