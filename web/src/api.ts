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

/** wa.me link with the message filled in; 10-digit numbers are treated as Indian (+91). */
export function whatsapp(phone: string, text: string) {
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
