import { Injectable } from '@nestjs/common';
import { createHash, randomInt } from 'node:crypto';
import { Db } from './db';

// "Forgot password" codes. The website asks for one by email (auth.ts → mail.ts); on WhatsApp the owner writes RESET
// to our number and the reply carries it (whatsapp.ts), which is free because they wrote first. Either way the owner
// types the code on the website with a new password.

const MINUTES = 15;
const TRIES = 5;

const hash = (merchantId: number, code: string) => createHash('sha256').update(`${merchantId}:${code}`).digest('hex');

@Injectable()
export class ResetCodes {
  constructor(private readonly db: Db) {}

  /** Our WhatsApp number as digits, for the wa.me link; whatsapp.ts sets it (importing it here would make a cycle). */
  whatsappNumber?: () => Promise<string>;

  /** Reset by WhatsApp (RESET to our number). Off until switched on in Admin → Emails → Password resets. */
  get whatsappOn() {
    const row = this.db.sql.prepare("SELECT value FROM app_settings WHERE key = 'reset_whatsapp'").get() as { value: string } | undefined;
    return row?.value === '1';
  }

  setWhatsapp(on: boolean) {
    this.db.sql
      .prepare("INSERT INTO app_settings (key, value) VALUES ('reset_whatsapp', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(on ? '1' : '0');
  }

  /** A new code for this shop, or null when it asked too often (once a minute, 5 an hour). Older codes stop working. */
  create(merchantId: number, channel: 'email' | 'whatsapp') {
    const recent = this.db.sql
      .prepare(
        `SELECT sum(created_at > datetime('now', '-1 minute')) AS minute, count(*) AS hour
           FROM reset_codes WHERE merchant_id = ? AND created_at > datetime('now', '-1 hour')`,
      )
      .get(merchantId) as { minute: number | null; hour: number };
    if ((recent.minute ?? 0) > 0 || recent.hour >= 5) return null;
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    this.db.sql.prepare("UPDATE reset_codes SET used_at = datetime('now'), result = 'replaced' WHERE merchant_id = ? AND used_at IS NULL").run(merchantId);
    this.db.sql
      .prepare('INSERT INTO reset_codes (merchant_id, channel, code_hash, expires_at) VALUES (?, ?, ?, ?)')
      .run(merchantId, channel, hash(merchantId, code), new Date(Date.now() + MINUTES * 60_000).toISOString());
    return code;
  }

  /**
   * Checks a code against the newest live one of these shops (a number can belong to more than one). Returns the shop
   * it was for, 'wrong' (a try is used up), or 'none' (no live code: never asked, expired, used or out of tries).
   */
  use(merchantIds: number[], code: string): number | 'wrong' | 'none' {
    if (!merchantIds.length) return 'none';
    const row = this.db.sql
      .prepare(
        `SELECT id, merchant_id, code_hash FROM reset_codes
          WHERE merchant_id IN (${merchantIds.map(() => '?').join(',')}) AND used_at IS NULL AND expires_at > ? AND attempts < ?
          ORDER BY id DESC LIMIT 1`,
      )
      .get(...merchantIds, new Date().toISOString(), TRIES) as { id: number; merchant_id: number; code_hash: string } | undefined;
    if (!row) return 'none';
    if (hash(row.merchant_id, code) !== row.code_hash) {
      this.db.sql.prepare('UPDATE reset_codes SET attempts = attempts + 1 WHERE id = ?').run(row.id);
      return 'wrong';
    }
    this.db.sql.prepare("UPDATE reset_codes SET used_at = datetime('now'), result = 'used' WHERE id = ?").run(row.id);
    return row.merchant_id;
  }

  /** Links the shop's newest code to the email that carried it, so Admin → Emails can show whether it arrived. */
  attachEmail(merchantId: number, emailId: number) {
    this.db.sql
      .prepare('UPDATE reset_codes SET email_id = ? WHERE id = (SELECT MAX(id) FROM reset_codes WHERE merchant_id = ?)')
      .run(emailId, merchantId);
  }
}
