import { createPublicKey, createVerify, type JsonWebKey } from 'node:crypto';

// "Sign in with Google": the website gets an ID token from Google's button and sends it here. We check Google signed it
// for our client id, using Google's published keys (no extra package needed).

// Regularhood's own client (Google Cloud → Google Auth Platform → Clients). Not a secret: every visitor's browser gets it.
// GOOGLE_CLIENT_ID overrides it; set it to "off" to hide the button.
const DEFAULT_CLIENT_ID = '1096042777020-dpd6dae8751ha3sg7sqss6dr5plc119u.apps.googleusercontent.com';

export const googleClientId = () => {
  const id = process.env.GOOGLE_CLIENT_ID?.trim() || DEFAULT_CLIENT_ID;
  return id === 'off' ? '' : id;
};

const CERTS = process.env.GOOGLE_CERTS_URL || 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

let keys: { jwks: (JsonWebKey & { kid: string })[]; until: number } | null = null;

async function googleKeys(force = false) {
  if (!force && keys && keys.until > Date.now()) return keys.jwks;
  const res = await fetch(CERTS);
  if (!res.ok) throw new Error(`Google keys: ${res.status}`);
  const maxAge = Number(res.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1]) || 3600;
  const { keys: jwks } = (await res.json()) as { keys: (JsonWebKey & { kid: string })[] };
  keys = { jwks, until: Date.now() + maxAge * 1000 };
  return jwks;
}

export type GoogleUser = { sub: string; email: string; name: string };

const part = (s: string) => JSON.parse(Buffer.from(s, 'base64url').toString('utf8')) as Record<string, unknown>;

/** The Google account an ID token is for, or null if it isn't a valid, current token for our app with a verified email. */
export async function verifyGoogleToken(token: string): Promise<GoogleUser | null> {
  const clientId = googleClientId();
  const pieces = String(token ?? '').split('.');
  if (!clientId || pieces.length !== 3) return null;
  try {
    const [head, body, signature] = pieces;
    const header = part(head);
    if (header.alg !== 'RS256') return null;
    // A key Google started using since our copy was fetched means fetching again.
    let jwk = (await googleKeys()).find((k) => k.kid === header.kid);
    if (!jwk) jwk = (await googleKeys(true)).find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const ok = createVerify('RSA-SHA256').update(`${head}.${body}`).verify(createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(signature, 'base64url'));
    if (!ok) return null;
    const claims = part(body);
    const now = Date.now() / 1000;
    if (claims.aud !== clientId || !ISSUERS.includes(String(claims.iss))) return null;
    if (typeof claims.exp !== 'number' || claims.exp < now - 60) return null;
    if (claims.email_verified !== true || typeof claims.email !== 'string' || typeof claims.sub !== 'string') return null;
    return { sub: claims.sub, email: claims.email.toLowerCase(), name: typeof claims.name === 'string' ? claims.name : '' };
  } catch {
    return null;
  }
}
