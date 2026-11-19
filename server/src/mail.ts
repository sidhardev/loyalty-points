import { Injectable } from '@nestjs/common';
import { Db } from './db';
import { seal, unseal } from './secret';

// Email through Resend (resend.com). The API key is set in Admin → Settings → Email (kept encrypted, see secret.ts), or
// as RESEND_API_KEY in deploy/.env; one set in the panel wins. MAIL_FROM picks the sender once the domain is verified in
// Resend (DEPLOY.md). Without a key, email features say they're off instead of failing.

const FROM = () => process.env.MAIL_FROM?.trim() || 'Regularhood <no-reply@regularhood.in>';
const API = 'https://api.resend.com';

@Injectable()
export class Mailer {
  constructor(private readonly db: Db) {}

  private panelKey() {
    const row = this.db.sql.prepare("SELECT value FROM app_settings WHERE key = 'resend_key'").get() as { value: string } | undefined;
    return row ? unseal(row.value) : null;
  }

  private key() {
    return this.panelKey() || process.env.RESEND_API_KEY?.trim() || '';
  }

  get ready() {
    return Boolean(this.key());
  }

  keyInfo() {
    const panel = this.panelKey();
    const env = process.env.RESEND_API_KEY?.trim();
    const key = panel || env;
    return { source: panel ? ('panel' as const) : env ? ('env' as const) : null, last4: key ? key.slice(-4) : '', from: FROM() };
  }

  setKey(key: string | null) {
    if (key) this.db.sql.prepare("INSERT INTO app_settings (key, value) VALUES ('resend_key', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(seal(key));
    else this.db.sql.prepare("DELETE FROM app_settings WHERE key = 'resend_key'").run();
  }

  /**
   * Checks a key with Resend without sending anything. A full-access key can list domains; a "Sending access" key is
   * refused there with restricted_api_key, which still proves it's a real key. Returns an error message, or ''.
   */
  async check(key: string) {
    try {
      const res = await fetch(`${API}/domains`, { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15_000) });
      if (res.ok) return '';
      const body = (await res.json().catch(() => ({}))) as { name?: string; message?: string };
      if (body.name === 'restricted_api_key') return '';
      return body.message || `Resend answered ${res.status}`;
    } catch (e) {
      return `Could not reach Resend: ${(e as Error).message}`;
    }
  }

  async send(to: string, subject: string, text: string, html: string) {
    const res = await fetch(`${API}/emails`, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.key()}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: FROM(), to: [to], subject, text, html }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(`Resend ${res.status}: ${body.message ?? 'send failed'}`);
    }
  }
}

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

/** The "Forgot password" email: just the code, plain enough to land in the inbox. */
export function resetEmail(shop: string, code: string) {
  const text = `Your Regularhood password reset code for ${shop} is ${code}.\n\nIt works for 15 minutes. If you didn't ask for it, ignore this email: your password stays the same.`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1a1a1a;max-width:460px">
<p>Your Regularhood password reset code for <strong>${escape(shop)}</strong>:</p>
<p style="font-size:30px;font-weight:bold;letter-spacing:6px;margin:18px 0">${code}</p>
<p>It works for 15 minutes. If you didn't ask for it, ignore this email: your password stays the same.</p>
</div>`;
  return { subject: `${code} is your Regularhood reset code`, text, html };
}
