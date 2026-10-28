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
  founding: boolean; // Founding Shop (paid): automatic WhatsApp and Google review requests
  review: boolean; // the shop saved its Google review link
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
export type VisitResult = { already: boolean; isNew: boolean; visitId: number | null; customer: Customer; auto: AutoKind | null };

/** Automatic WhatsApp messages Regularhood sends a Founding Shop's customers. */
export type AutoKind = 'card' | 'reward' | 'missyou' | 'review';
export type AutoStatus = {
  founding: boolean;
  live: boolean; // Regularhood's WhatsApp number is set up to send
  quota: number; // a month
  used: number;
  settings: { card: boolean; reward: boolean; missyou: boolean; review: boolean; lang: 'hi' | 'en'; reviewUrl: string };
  recent: { kind: AutoKind; status: string; created_at: string; phone: string | null; name: string | null }[];
};

/** The shop's plan (Plan page). `limit`: most customers allowed, null = no limit. Prices in paise. */
export type Billing = {
  plan: 'free' | 'grandfathered' | 'lifetime' | 'yearly';
  paidPlan: string;
  expiresAt: string | null;
  foundingNo: number | null;
  customers: number;
  limit: number | null;
  seats: { total: number; left: number };
  prices: { lifetime: number; yearly: number };
  open: boolean; // false: Founding Shop isn't on sale (renewals still are)
  keyId: string;
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
  if (res.status === 401 && token && !path.startsWith('public/')) {
    setToken(null);
    dispatchEvent(new Event(LOGGED_OUT));
  }
  if (!res.ok) {
    const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    throw Object.assign(new Error(message || `Something went wrong (${res.status})`), { code: data.code as string | undefined });
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

/** Language of the WhatsApp messages the shop sends its customers (chosen in Settings, kept on the shop's phone). */
export type MsgLang = 'hi' | 'en' | 'ml';

/** The customer's card. A Malayalam message opens it in Malayalam; otherwise the phone's language decides. */
export const walletUrl = (token: string, lang?: MsgLang) => `${location.origin}/w/${token}${lang === 'ml' ? '?lang=ml' : ''}`;
export const joinUrl = (code: string) => `${location.origin}/join/${code}`;
/** Opens the shop's Google review page (our redirect, so the link stays short and the same). */
export const reviewUrl = (code: string) => `${location.origin}/api/public/review/${code}`;

/** The WhatsApp message asking a customer for a Google review. */
export function reviewMessage(m: Merchant, lang: MsgLang = 'hi') {
  const url = reviewUrl(m.joinCode);
  if (lang === 'hi') return `${m.name} पर आने के लिए धन्यवाद! 🙏 आपका Google रिव्यू हमारी बहुत मदद करेगा, सिर्फ़ 30 सेकंड लगेंगे: ${url}`;
  if (lang === 'ml') return `${m.name} സന്ദർശിച്ചതിന് നന്ദി! 🙏 നിങ്ങളുടെ ഒരു Google റിവ്യൂ ഞങ്ങൾക്ക് വലിയ സഹായമാണ്, 30 സെക്കൻഡ് മതി: ${url}`;
  return `Thank you for visiting ${m.name}! 🙏 A Google review helps us a lot and takes 30 seconds: ${url}`;
}

/** "We miss you" WhatsApp message with how close they are to the reward. */
export function reminderMessage(m: Merchant, c: Customer, lang: MsgLang = 'hi') {
  const left = Math.max(0, m.visitsNeeded - c.stamps);
  const url = walletUrl(c.walletToken, lang);
  if (lang === 'hi') {
    const hook = left ? `बस ${left} और विज़िट, फिर ${m.rewardName}!` : `आपका ${m.rewardName} इंतज़ार कर रहा है!`;
    return `${m.name} पर आपकी कमी महसूस हो रही है! 👋 ${hook}\nआपका कार्ड: ${url}`;
  }
  if (lang === 'ml') {
    const hook = left ? `${m.rewardName} കിട്ടാൻ ഇനി ${left} സന്ദർശനം മാത്രം!` : `നിങ്ങളുടെ ${m.rewardName} കാത്തിരിക്കുന്നു!`;
    return `${m.name}-ൽ ഞങ്ങൾ നിങ്ങളെ മിസ്സ് ചെയ്യുന്നു! 👋 ${hook}\nനിങ്ങളുടെ കാർഡ്: ${url}`;
  }
  const hook = left ? `Only ${left} more visit${left === 1 ? '' : 's'} for ${m.rewardName}!` : `Your ${m.rewardName} is waiting!`;
  return `We miss you at ${m.name}! 👋 ${hook}\nYour card: ${url}`;
}

/** "98765 43210" for a 10-digit number; anything else as stored. */
export const phoneLabel = (phone: string) => (/^\d{10}$/.test(phone) ? `${phone.slice(0, 5)} ${phone.slice(5)}` : phone);

/** The customer's card message the shop sends on WhatsApp after a visit (`given`: right after handing over the reward). */
export function cardMessage(m: Merchant, c: Customer, lang: MsgLang = 'hi', given = false) {
  const left = Math.max(0, m.visitsNeeded - c.stamps);
  const url = walletUrl(c.walletToken, lang);
  if (lang === 'hi') {
    if (given) return `${m.name}: आपका ${m.rewardName} 🎉 धन्यवाद! नया कार्ड शुरू — ${m.visitsNeeded} विज़िट पर फिर से।
आपका कार्ड: ${url}`;
    if (c.rewardDue) return `${m.name}: आपका इनाम तैयार है — ${m.rewardName} 🎁
आपका कार्ड: ${url}`;
    return `${m.name}: विज़िट ${c.stamps}/${m.visitsNeeded} ✓ बस ${left} और विज़िट, फिर ${m.rewardName}! 🎁
आपका कार्ड: ${url}`;
  }
  if (lang === 'ml') {
    if (given) return `${m.name}: നിങ്ങളുടെ ${m.rewardName} ആസ്വദിക്കൂ 🎉 നന്ദി! പുതിയ കാർഡ് തുടങ്ങി — ${m.visitsNeeded} സന്ദർശനം കഴിഞ്ഞാൽ വീണ്ടും.
നിങ്ങളുടെ കാർഡ്: ${url}`;
    if (c.rewardDue) return `${m.name}: നിങ്ങളുടെ സമ്മാനം തയ്യാർ — ${m.rewardName} 🎁
നിങ്ങളുടെ കാർഡ്: ${url}`;
    return `${m.name}: സന്ദർശനം ${c.stamps}/${m.visitsNeeded} ✓ ${m.rewardName} കിട്ടാൻ ഇനി ${left} സന്ദർശനം മാത്രം! 🎁
നിങ്ങളുടെ കാർഡ്: ${url}`;
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
