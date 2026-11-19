import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Db } from './db';
import { seal, unseal } from './secret';

// Email through Resend (resend.com). The API key is set in Admin → Settings → Email key (kept encrypted, see secret.ts),
// or as RESEND_API_KEY in deploy/.env; one set in the panel wins. MAIL_FROM picks the sender once the domain is verified
// in Resend (DEPLOY.md). Without a key, email features say they're off instead of failing.
//
// Every email is written to email_log, and Resend's webhook (emails.ts) later marks it delivered, bounced, opened…;
// Admin → Emails shows it all. Automatic emails (welcome, win-back) carry an unsubscribe link and header; reset codes
// are always sent, since the owner asked for them.

const FROM = () => process.env.MAIL_FROM?.trim() || 'Regularhood <no-reply@regularhood.in>';
const API = 'https://api.resend.com';
// Not imported from seo.ts: that would make an import cycle (auth.ts → mail.ts → … → auth.ts).
export const SITE_URL = (process.env.SITE_URL || 'https://www.regularhood.in').replace(/\/$/, '');

export type EmailKind = 'reset' | 'welcome' | 'winback' | 'nudge' | 'test';

/**
 * What the automatic emails do (Admin → Emails → Automatic). Resend's free plan allows 100 emails a day and 3,000 a
 * month; `dailyCap` keeps win-back and nudge emails under that, leaving room for reset codes and welcomes.
 */
export type EmailSettings = { welcome: boolean; winback: boolean; winbackDays: number; nudge: boolean; nudgeDays: number; dailyCap: number };
// Win-back and nudge start off: they go to every matching shop, so the admin reads the preview and turns them on.
export const EMAIL_DEFAULTS: EmailSettings = { welcome: true, winback: false, winbackDays: 14, nudge: false, nudgeDays: 3, dailyCap: 60 };

export function emailSettings(db: Db): EmailSettings {
  const row = db.sql.prepare("SELECT value FROM app_settings WHERE key = 'email_auto'").get() as { value: string } | undefined;
  return { ...EMAIL_DEFAULTS, ...(row ? (JSON.parse(row.value) as Partial<EmailSettings>) : {}) };
}
type Mail = { subject: string; text: string; html: string };

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

  /** The shop's unsubscribe link for automatic emails (made on first use). */
  unsubscribeUrl(merchantId: number) {
    let row = this.db.sql.prepare('SELECT email_token FROM merchants WHERE id = ?').get(merchantId) as { email_token: string | null } | undefined;
    if (!row?.email_token) {
      const token = randomBytes(18).toString('base64url');
      this.db.sql.prepare('UPDATE merchants SET email_token = ? WHERE id = ? AND email_token IS NULL').run(token, merchantId);
      row = this.db.sql.prepare('SELECT email_token FROM merchants WHERE id = ?').get(merchantId) as { email_token: string | null };
    }
    return `${SITE_URL}/api/public/email/unsubscribe/${row.email_token}`;
  }

  /**
   * Sends one email and logs it. Returns the email_log id; throws (after logging the failure) when Resend refuses it.
   * `automatic` adds the unsubscribe link, as one-click List-Unsubscribe headers too.
   */
  async send(to: string, mail: Mail, opts: { kind: EmailKind; merchantId?: number | null; automatic?: boolean }) {
    const merchantId = opts.merchantId ?? null;
    const unsub = opts.automatic && merchantId ? this.unsubscribeUrl(merchantId) : '';
    const text = unsub ? `${mail.text}\n\n—\nDon't want these emails? ${unsub}` : mail.text;
    const html = unsub
      ? `${mail.html}<p style="font-family:Arial,sans-serif;font-size:12px;color:#888;margin-top:28px">Don't want these emails? <a href="${unsub}" style="color:#888">Unsubscribe</a></p>`
      : mail.html;
    const log = (status: string, error: string | null, resendId: string | null) =>
      Number(
        this.db.sql
          .prepare('INSERT INTO email_log (merchant_id, to_email, kind, subject, status, error, resend_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(merchantId, to, opts.kind, mail.subject, status, error, resendId).lastInsertRowid,
      );
    if (!this.ready) throw new MailError('No Resend key set', log('failed', 'No Resend key set', null));
    let res: globalThis.Response;
    try {
      res = await fetch(`${API}/emails`, {
        method: 'POST',
        headers: { authorization: `Bearer ${this.key()}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: FROM(),
          to: [to],
          subject: mail.subject,
          text,
          html,
          ...(unsub ? { headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } } : {}),
        }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (e) {
      const error = `Could not reach Resend: ${(e as Error).message}`;
      throw new MailError(error, log('failed', error, null));
    }
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) {
      const error = `Resend ${res.status}: ${body.message ?? 'send failed'}`;
      throw new MailError(error, log('failed', error, null));
    }
    return log('sent', null, body.id ?? null);
  }
}

/** A send that failed; the failure is already in email_log as `emailId`. */
export class MailError extends Error {
  constructor(
    message: string,
    readonly emailId: number,
  ) {
    super(message);
  }
}

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);
const wrap = (body: string) => `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a;max-width:480px">${body}</div>`;
const button = (href: string, label: string) =>
  `<p style="margin:22px 0"><a href="${href}" style="background:#0f7a55;color:#fff;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:bold">${label}</a></p>`;
const APP = () => `${SITE_URL}/app`;

/** The "Forgot password" email: just the code, plain enough to land in the inbox. */
export function resetEmail(shop: string, code: string): Mail {
  return {
    subject: `${code} is your Regularhood reset code`,
    text: `Your Regularhood password reset code for ${shop} is ${code}.\n\nIt works for 15 minutes. If you didn't ask for it, ignore this email: your password stays the same.`,
    html: wrap(`<p>Your Regularhood password reset code for <strong>${escape(shop)}</strong>:</p>
<p style="font-size:30px;font-weight:bold;letter-spacing:6px;margin:18px 0">${code}</p>
<p>It works for 15 minutes. If you didn't ask for it, ignore this email: your password stays the same.</p>`),
  };
}

/** Right after sign-up: the three things that get a shop going. */
export function welcomeEmail(shop: string, visits: number, reward: string): Mail {
  const card = reward ? `every ${visits} visits, a customer gets ${reward}` : `set your reward in Settings`;
  return {
    subject: `Welcome to Regularhood, ${shop}`,
    text: `Welcome to Regularhood!\n\nYour stamp card is ready: ${card}.\n\nTo get going:\n1. When a customer pays, type their phone number in Regularhood. That's their visit.\n2. Print your poster (Settings → Poster) and put it at the counter, so customers know about the card.\n3. Every week, open Customers → "Not seen" and remind the regulars who stopped coming.\n\nOpen Regularhood: ${APP()}`,
    html: wrap(`<p>Welcome to Regularhood!</p>
<p>Your stamp card for <strong>${escape(shop)}</strong> is ready: ${escape(card)}.</p>
<p><strong>To get going:</strong></p>
<ol style="padding-left:20px">
<li>When a customer pays, type their phone number in Regularhood. That's their visit.</li>
<li>Print your poster (Settings → Poster) and put it at the counter, so customers know about the card.</li>
<li>Every week, open Customers → “Not seen” and remind the regulars who stopped coming.</li>
</ol>
${button(APP(), 'Open Regularhood')}`),
  };
}

/** A shop that recorded visits before but none lately. */
export function winbackEmail(shop: string, customers: number, days: number): Mail {
  const who = customers === 1 ? '1 customer is' : `${customers} customers are`;
  return {
    subject: `${shop}: your regulars are waiting for their stamps`,
    text: `No visits have been added for ${shop} in ${days} days.\n\n${who} on your stamp card. Every visit you skip is a stamp they don't get, and a reason less to come back to you.\n\nIt takes 5 seconds at the counter: type the customer's number, done.\n\nOpen Regularhood: ${APP()}`,
    html: wrap(`<p>No visits have been added for <strong>${escape(shop)}</strong> in ${days} days.</p>
<p>${who} on your stamp card. Every visit you skip is a stamp they don't get, and a reason less to come back to you.</p>
<p>It takes 5 seconds at the counter: type the customer's number, done.</p>
${button(APP(), 'Add a visit')}`),
  };
}

/** A shop that signed up but never added a visit. */
export function nudgeEmail(shop: string): Mail {
  return {
    subject: `${shop}: add your first customer today`,
    text: `Your Regularhood stamp card for ${shop} is set up, but no visit has been added yet.\n\nNext time a customer pays, type their phone number in Regularhood. They get their first stamp, and you start building regulars.\n\nOpen Regularhood: ${APP()}`,
    html: wrap(`<p>Your Regularhood stamp card for <strong>${escape(shop)}</strong> is set up, but no visit has been added yet.</p>
<p>Next time a customer pays, type their phone number in Regularhood. They get their first stamp, and you start building regulars.</p>
${button(APP(), 'Add your first customer')}`),
  };
}

export function testEmail(): Mail {
  return {
    subject: 'Regularhood test email',
    text: 'This is a test from Admin → Emails. If you can read it, email sending works.',
    html: wrap('<p>This is a test from Admin → Emails. If you can read it, email sending works.</p>'),
  };
}
