import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

/** JWT_SECRET from the environment, or one generated on first run and kept in data/. */
export function jwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const file = 'data/jwt-secret';
  if (!existsSync(file)) {
    mkdirSync('data', { recursive: true });
    writeFileSync(file, randomBytes(32).toString('hex'));
  }
  return readFileSync(file, 'utf8');
}

// Secrets kept in the database (e.g. an API key set from the admin panel) are encrypted with a key derived from the
// server's JWT secret, so a copy of the database or a backup alone doesn't reveal them. If the JWT secret changes,
// they can no longer be read and have to be entered again.
// The salt keeps the app's old name on purpose: changing it would make secrets already saved unreadable.
const sealKey = () => scryptSync(jwtSecret(), 'habiturn-db-secret', 32);

export function seal(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', sealKey(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64')).join('.');
}

/** The secret, or null if it can't be read (e.g. the JWT secret changed). */
export function unseal(sealed: string) {
  try {
    const [iv, tag, data] = sealed.split('.').map((p) => Buffer.from(p, 'base64'));
    const decipher = createDecipheriv('aes-256-gcm', sealKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}
