// Talks to the NestJS API. The login token is kept in localStorage and sent with every request.

export type Merchant = {
  id: number;
  name: string;
  email: string;
  joinCode: string; // public: the shop's share link /r/<code> and old counter-poster QRs /join/<code>
  inactiveDays: number; // "not seen" after this many days
  phone: string; // owner's WhatsApp number, '' = not given
  visitsNeeded: number; // every this many visits…
  rewardName: string; // …the customer gets this ('' until the shop sets it up)
};

/** A customer is just a phone number with stamps: one per visit, the reward at `merchant.visitsNeeded`. */
export type Customer = {
  id: number;
  name: string; // '' unless they had one from before the stamp card
  phone: string;
  stamps: number;
  rewardDue: boolean;
  lastVisit: string | null;
  walletToken: string;
  createdAt: string;
};

/** What adding a visit at the counter did. `already`: this number was counted today, so nothing was added. */
export type VisitResult = { already: boolean; isNew: boolean; visitId: number | null; customer: Customer };

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

export const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const num = (n: number) => n.toLocaleString('en-IN');

/** SQLite stores UTC as "YYYY-MM-DD HH:MM:SS". */
export const parseTime = (sqlTime: string) => new Date(`${sqlTime.replace(' ', 'T')}Z`);
export const when = (sqlTime: string) =>
  parseTime(sqlTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
export const daysAgo = (sqlTime: string) => Math.floor((Date.now() - parseTime(sqlTime).getTime()) / 86_400_000);


// ---- links customers open ----

export const walletUrl = (token: string) => `${location.origin}/w/${token}`;
export const joinUrl = (code: string) => `${location.origin}/join/${code}`;

/** "98765 43210" for a 10-digit number; anything else as stored. */
export const phoneLabel = (phone: string) => (/^\d{10}$/.test(phone) ? `${phone.slice(0, 5)} ${phone.slice(5)}` : phone);

/** The customer's card message the shop sends on WhatsApp after a visit (`given`: right after handing over the reward). */
export function cardMessage(m: Merchant, c: Customer, lang: 'en' | 'hi' = 'hi', given = false) {
  const left = Math.max(0, m.visitsNeeded - c.stamps);
  const url = walletUrl(c.walletToken);
  if (lang === 'hi') {
    if (given) return `${m.name}: आपका ${m.rewardName} 🎉 धन्यवाद! नया कार्ड शुरू — ${m.visitsNeeded} विज़िट पर फिर से।
आपका कार्ड: ${url}`;
    if (c.rewardDue) return `${m.name}: आपका इनाम तैयार है — ${m.rewardName} 🎁
आपका कार्ड: ${url}`;
    return `${m.name}: विज़िट ${c.stamps}/${m.visitsNeeded} ✓ बस ${left} और विज़िट, फिर ${m.rewardName}! 🎁
आपका कार्ड: ${url}`;
  }
  if (given) return `${m.name}: enjoy your ${m.rewardName} 🎉 Thank you! A new card starts — again after ${m.visitsNeeded} visits.
Your card: ${url}`;
  if (c.rewardDue) return `${m.name}: your reward is ready — ${m.rewardName} 🎁
Your card: ${url}`;
  return `${m.name}: visit ${c.stamps} of ${m.visitsNeeded} ✓ ${left} more for ${m.rewardName}! 🎁
Your card: ${url}`;
}

/** wa.me link with the message filled in; 10-digit numbers are treated as Indian (+91). */
export function whatsapp(phone: string, text: string) {
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
