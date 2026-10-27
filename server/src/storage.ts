import { BadRequestException, Injectable } from '@nestjs/common';

// Files we keep in Supabase Storage: photos, videos, voice notes and documents from WhatsApp chats (whatsapp.ts).
// One private bucket; the admin panel gets short-lived signed links to show them. Talks to Supabase's REST API directly.
// Set in server/.env (deploy/.env on the server): SUPABASE_URL and SUPABASE_SECRET_KEY (the secret or service_role key,
// never the anon/publishable one). SUPABASE_BUCKET is optional. The bucket is made on the first upload.

const BUCKET = process.env.SUPABASE_BUCKET?.trim() || 'whatsapp-media';
/** Supabase's free plan takes files up to 50 MB. */
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

@Injectable()
export class Storage {
  private bucketReady = false;

  private get base() {
    return (process.env.SUPABASE_URL?.trim() ?? '').replace(/\/$/, '');
  }

  private get key() {
    return (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  }

  get ready() {
    return Boolean(this.base && this.key);
  }

  private async call<T>(path: string, init: { method?: string; body?: object | Buffer; type?: string; upsert?: boolean } = {}): Promise<T> {
    if (!this.ready) throw new BadRequestException('Add SUPABASE_URL and SUPABASE_SECRET_KEY to the server’s .env first');
    const raw = Buffer.isBuffer(init.body);
    let res: globalThis.Response;
    try {
      res = await fetch(`${this.base}/storage/v1/${path}`, {
        method: init.method ?? 'GET',
        headers: {
          apikey: this.key,
          // Legacy service_role keys are JWTs and go in Authorization too; the newer sb_secret_ keys only work as apikey.
          ...(this.key.startsWith('eyJ') ? { authorization: `Bearer ${this.key}` } : {}),
          ...(init.body ? { 'content-type': raw ? (init.type ?? 'application/octet-stream') : 'application/json' } : {}),
          ...(init.upsert ? { 'x-upsert': 'true' } : {}),
        },
        body: init.body ? (raw ? new Uint8Array(init.body as Buffer) : JSON.stringify(init.body)) : undefined,
        signal: AbortSignal.timeout(120_000),
      });
    } catch (error) {
      throw new BadRequestException(`Could not reach Supabase: ${(error as Error).message}`);
    }
    const body = (await res.json().catch(() => ({}))) as T & { message?: string; error?: string; statusCode?: string };
    if (!res.ok) throw Object.assign(new BadRequestException(`Supabase ${res.status}: ${body.message || body.error || 'request failed'}`), { supabase: body });
    return body;
  }

  /** Makes the private bucket once; "already exists" is fine. */
  private async bucket() {
    if (this.bucketReady) return;
    try {
      await this.call('bucket', { method: 'POST', body: { id: BUCKET, name: BUCKET, public: false, file_size_limit: MAX_FILE_BYTES } });
    } catch (error) {
      if (!/already exists|Duplicate|409/i.test((error as Error).message)) throw error;
    }
    this.bucketReady = true;
  }

  async upload(path: string, file: Buffer, type: string) {
    if (file.length > MAX_FILE_BYTES) throw new BadRequestException(`Files up to ${MAX_FILE_BYTES / 1024 / 1024} MB can be kept`);
    await this.bucket();
    await this.call(`object/${BUCKET}/${path}`, { method: 'POST', body: file, type, upsert: true });
    return path;
  }

  private signed = new Map<string, { url: string; until: number }>();

  /**
   * Links that open each file for an hour, in one call. A link is reused while it has 15 minutes left, so the chat
   * (which reloads every few seconds) doesn't fetch the same photo again. Paths Supabase can't find are left out.
   */
  async signedUrls(paths: string[]): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    if (!paths.length || !this.ready) return out;
    const now = Date.now();
    const fresh = (p: string) => (this.signed.get(p)?.until ?? 0) - now > 15 * 60_000;
    const missing = [...new Set(paths.filter((p) => !fresh(p)))];
    if (missing.length) {
      const r = await this.call<{ path: string | null; signedURL: string | null; error: string | null }[]>(`object/sign/${BUCKET}`, {
        method: 'POST',
        body: { expiresIn: 3600, paths: missing },
      });
      for (const s of r) if (s.path && s.signedURL) this.signed.set(s.path, { url: `${this.base}/storage/v1${s.signedURL}`, until: now + 3600_000 });
      for (const [p, s] of this.signed) if (s.until < now) this.signed.delete(p);
    }
    for (const p of paths) {
      const s = this.signed.get(p);
      if (s) out.set(p, s.url);
    }
    return out;
  }
}
