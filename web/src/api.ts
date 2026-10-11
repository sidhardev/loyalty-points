// Talks to the NestJS API. The login token is kept in localStorage and sent with every request.

export type Merchant = { id: number; name: string; email: string; pointsPer100: number };
export type Customer = { id: number; name: string; phone: string; points: number; created_at: string };
export type Reward = { id: number; name: string; points_cost: number };
export type Transaction = {
  id: number;
  type: 'earn' | 'redeem';
  points: number;
  amount: number | null;
  note: string | null;
  created_at: string;
  customer_id: number;
  customer_name: string;
};

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
  if (res.status === 401 && token) {
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
export const when = (sqlTime: string) =>
  new Date(`${sqlTime.replace(' ', 'T')}Z`).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
