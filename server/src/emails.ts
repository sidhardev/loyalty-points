import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
  type RawBodyRequest,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { AdminGuard, AdminId } from './admin';
import { Db } from './db';
import { EMAIL_DEFAULTS, emailSettings, Mailer, nudgeEmail, SITE_URL, testEmail, welcomeEmail, winbackEmail, type EmailSettings } from './mail';
import { ResetCodes } from './reset-codes';
import { seal, unseal } from './secret';

// Admin → Emails: every email sent (mail.ts) and what became of it, every "Forgot password" request, and the automatic
// emails: welcome (auth.ts, at sign-up), win-back for shops that stopped adding visits, and a nudge for shops that never
// added one. Resend tells us about deliveries, bounces and opens through a signed webhook (POST /api/resend/webhook).

const IST_MINUTES = 330;

@Injectable()
export class EmailJobs implements OnModuleDestroy {
  private timer: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly db: Db,
    private readonly mailer: Mailer,
  ) {
    // Hourly; emails go out only in Indian daytime (10:00–19:00), a few each hour up to the daily cap.
    this.timer = setInterval(() => void this.round(), 60 * 60_000);
    this.timer.unref();
    setTimeout(() => void this.round(), 2 * 60_000).unref();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  /** Shops due a win-back (visits before, none for `winbackDays`, not emailed since) or a nudge (never a visit). */
  due(s: EmailSettings) {
    const base = `m.email IS NOT NULL AND m.email != '' AND m.email_opt_out = 0 AND m.suspended_at IS NULL`;
    const lastVisit = `(SELECT MAX(t.created_at) FROM transactions t WHERE t.merchant_id = m.id AND t.type = 'earn' AND t.reversed = 0)`;
    const winback = s.winback
      ? (this.db.sql
          .prepare(
            `SELECT m.id, m.name, m.email, ${lastVisit} AS last_visit,
                    (SELECT COUNT(*) FROM customers c WHERE c.merchant_id = m.id) AS customers
               FROM merchants m
              WHERE ${base} AND ${lastVisit} < datetime('now', ?)
                AND NOT EXISTS (SELECT 1 FROM email_log e WHERE e.merchant_id = m.id AND e.kind = 'winback' AND e.status != 'failed'
                                  AND (e.created_at > ${lastVisit} OR e.created_at > datetime('now', '-30 days')))
              ORDER BY last_visit DESC`,
          )
          .all(`-${s.winbackDays} days`) as { id: number; name: string; email: string; last_visit: string; customers: number }[])
      : [];
    const nudge = s.nudge
      ? (this.db.sql
          .prepare(
            `SELECT m.id, m.name, m.email FROM merchants m
              WHERE ${base} AND ${lastVisit} IS NULL AND m.created_at < datetime('now', ?)
                AND NOT EXISTS (SELECT 1 FROM email_log e WHERE e.merchant_id = m.id AND e.kind = 'nudge' AND e.status != 'failed')
              ORDER BY m.created_at DESC`,
          )
          .all(`-${s.nudgeDays} days`) as { id: number; name: string; email: string }[])
      : [];
    return { winback, nudge };
  }

  async round() {
    if (this.running || !this.mailer.ready) return;
    const istHour = new Date(Date.now() + IST_MINUTES * 60_000).getUTCHours();
    if (istHour < 10 || istHour >= 19) return;
    this.running = true;
    try {
      const s = emailSettings(this.db);
      const today = this.db.sql
        .prepare("SELECT COUNT(*) AS n FROM email_log WHERE kind IN ('winback', 'nudge') AND created_at >= datetime('now', '-1 day')")
        .get() as { n: number };
      // Spread over the day: at most a fifth of the cap per hour.
      let left = Math.min(s.dailyCap - today.n, Math.ceil(s.dailyCap / 5));
      const { winback, nudge } = this.due(s);
      for (const m of winback) {
        if (left <= 0) break;
        const days = Math.floor((Date.now() - Date.parse(`${m.last_visit.replace(' ', 'T')}Z`)) / 86_400_000);
        await this.mailer
          .send(m.email, winbackEmail(m.name, m.customers, days), { kind: 'winback', merchantId: m.id, automatic: true })
          .catch((e) => console.error(`Win-back email to shop ${m.id} failed:`, (e as Error).message));
        left--;
      }
      for (const m of nudge) {
        if (left <= 0) break;
        await this.mailer
          .send(m.email, nudgeEmail(m.name), { kind: 'nudge', merchantId: m.id, automatic: true })
          .catch((e) => console.error(`Nudge email to shop ${m.id} failed:`, (e as Error).message));
        left--;
      }
    } finally {
      this.running = false;
    }
  }
}

// ---------------------------------------------------------------- Resend webhook

const RANK: Record<string, number> = { failed: 0, sent: 1, delayed: 2, delivered: 3, opened: 4, clicked: 5, bounced: 6, complained: 7 };
const EVENT: Record<string, string> = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'delayed',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
};

function webhookSecret(db: Db) {
  const row = db.sql.prepare("SELECT value FROM app_settings WHERE key = 'resend_webhook_secret'").get() as { value: string } | undefined;
  const panel = row ? unseal(row.value) : null;
  const env = process.env.RESEND_WEBHOOK_SECRET?.trim();
  return { value: panel || env || '', source: panel ? ('panel' as const) : env ? ('env' as const) : null };
}

/** Resend signs webhooks the Svix way: HMAC-SHA256 over "id.timestamp.body" with the whsec_ secret. */
function verifySvix(secret: string, raw: Buffer | undefined, headers: Request['headers']) {
  const id = String(headers['svix-id'] ?? '');
  const ts = String(headers['svix-timestamp'] ?? '');
  const sigs = String(headers['svix-signature'] ?? '');
  if (!secret || !raw || !id || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 5 * 60) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = Buffer.from(createHmac('sha256', key).update(`${id}.${ts}.${raw.toString('utf8')}`).digest('base64'));
  return sigs.split(' ').some((s) => {
    const given = Buffer.from(s.split(',')[1] ?? '');
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

@Controller('api/resend/webhook')
export class ResendWebhookController {
  constructor(private readonly db: Db) {}

  @Post()
  @HttpCode(200)
  receive(@Req() req: RawBodyRequest<Request>) {
    if (!verifySvix(webhookSecret(this.db).value, req.rawBody, req.headers)) {
      console.error('Resend webhook refused: bad or missing signature (check the signing secret in Admin → Emails)');
      return 'ignored';
    }
    const body = (req.body ?? {}) as { type?: string; data?: { email_id?: string; bounce?: { message?: string } } };
    const status = EVENT[body.type ?? ''];
    const resendId = body.data?.email_id;
    if (!status || !resendId) return 'ok';
    const row = this.db.sql.prepare('SELECT id, status, merchant_id FROM email_log WHERE resend_id = ?').get(resendId) as
      | { id: number; status: string; merchant_id: number | null }
      | undefined;
    if (!row) return 'ok';
    if ((RANK[status] ?? 0) > (RANK[row.status] ?? 0))
      this.db.sql
        .prepare("UPDATE email_log SET status = ?, error = COALESCE(?, error), updated_at = datetime('now') WHERE id = ?")
        .run(status, status === 'bounced' ? (body.data?.bounce?.message ?? 'Bounced').slice(0, 300) : status === 'complained' ? 'Marked as spam' : null, row.id);
    if (status === 'opened') this.db.sql.prepare("UPDATE email_log SET opened_at = COALESCE(opened_at, datetime('now')) WHERE id = ?").run(row.id);
    if (status === 'clicked') this.db.sql.prepare("UPDATE email_log SET clicked_at = COALESCE(clicked_at, datetime('now')) WHERE id = ?").run(row.id);
    // A bad address or a spam report: no more automatic emails to that shop.
    if ((status === 'bounced' || status === 'complained') && row.merchant_id)
      this.db.sql.prepare('UPDATE merchants SET email_opt_out = 1 WHERE id = ?').run(row.merchant_id);
    return 'ok';
  }
}

// ---------------------------------------------------------------- unsubscribe

const page = (text: string) =>
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Regularhood emails</title>
<body style="font-family:Arial,sans-serif;max-width:480px;margin:60px auto;padding:0 16px;color:#1a1a1a"><h2>Regularhood</h2><p>${text}</p></body>`;

@Controller('api/public/email/unsubscribe')
export class UnsubscribeController {
  constructor(private readonly db: Db) {}

  private stop(token: string) {
    const r = this.db.sql.prepare('UPDATE merchants SET email_opt_out = 1 WHERE email_token = ?').run(String(token ?? ''));
    if (!r.changes) throw new NotFoundException('This link is not valid');
  }

  @Get(':token')
  show(@Param('token') token: string, @Res() res: Response) {
    try {
      this.stop(token);
      res.type('html').send(page("Done. You won't get tips or reminder emails from Regularhood any more. Password reset codes still come when you ask for one."));
    } catch {
      res.status(404).type('html').send(page('This link is not valid.'));
    }
  }

  /** Mail apps' one-click unsubscribe (List-Unsubscribe-Post). */
  @Post(':token')
  @HttpCode(200)
  oneClick(@Param('token') token: string) {
    this.stop(token);
    return 'ok';
  }
}

// ---------------------------------------------------------------- admin

@Controller('api/admin/emails')
@UseGuards(AdminGuard)
export class EmailsAdminController {
  constructor(
    private readonly db: Db,
    private readonly mailer: Mailer,
    private readonly jobs: EmailJobs,
    private readonly codes: ResetCodes,
  ) {}

  @Get()
  overview(@Query('kind') kind?: string, @Query('status') status?: string, @Query('q') q?: string) {
    const sql = this.db.sql;
    const usage = sql
      .prepare(
        `SELECT COUNT(CASE WHEN created_at >= datetime('now', 'start of day') THEN 1 END) AS today,
                COUNT(CASE WHEN created_at >= datetime('now', 'start of month') THEN 1 END) AS month
           FROM email_log WHERE status != 'failed'`,
      )
      .get() as { today: number; month: number };
    const kinds = sql
      .prepare(
        `SELECT kind, COUNT(*) AS total,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed,
                COUNT(CASE WHEN status IN ('delivered', 'opened', 'clicked') THEN 1 END) AS delivered,
                COUNT(CASE WHEN status IN ('opened', 'clicked') OR opened_at IS NOT NULL THEN 1 END) AS opened,
                COUNT(CASE WHEN status IN ('bounced', 'complained') THEN 1 END) AS bounced
           FROM email_log WHERE created_at >= datetime('now', '-30 days') GROUP BY kind ORDER BY total DESC`,
      )
      .all();
    const where: string[] = [];
    const args: string[] = [];
    if (kind) (where.push('e.kind = ?'), args.push(kind));
    if (status) (where.push(status === 'delivered' ? "e.status IN ('delivered', 'opened', 'clicked')" : 'e.status = ?'), status !== 'delivered' && args.push(status));
    if (q?.trim()) (where.push('(e.to_email LIKE ? OR m.name LIKE ?)'), args.push(`%${q.trim()}%`, `%${q.trim()}%`));
    const log = sql
      .prepare(
        `SELECT e.id, e.merchant_id, m.name AS shop, e.to_email, e.kind, e.subject, e.status, e.error, e.opened_at, e.clicked_at,
                e.created_at, e.updated_at
           FROM email_log e LEFT JOIN merchants m ON m.id = e.merchant_id
          ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
          ORDER BY e.id DESC LIMIT 300`,
      )
      .all(...args);
    const resets = sql
      .prepare(
        `SELECT r.id, r.merchant_id, m.name AS shop, m.email, m.phone, r.channel, r.attempts, r.result, r.created_at, r.used_at,
                (r.result IS NULL AND r.expires_at < ?) AS expired, e.status AS email_status, e.error AS email_error
           FROM reset_codes r JOIN merchants m ON m.id = r.merchant_id LEFT JOIN email_log e ON e.id = r.email_id
          ORDER BY r.id DESC LIMIT 200`,
      )
      .all(new Date().toISOString());
    // Who would get one, even while switched off, so the admin sees it before turning them on.
    const due = this.jobs.due({ ...emailSettings(this.db), winback: true, nudge: true });
    const optedOut = sql.prepare("SELECT COUNT(*) AS n FROM merchants WHERE email_opt_out = 1 AND email IS NOT NULL AND email != ''").get() as { n: number };
    const w = webhookSecret(this.db);
    return {
      ready: this.mailer.ready,
      from: this.mailer.keyInfo().from,
      usage: { ...usage, dayLimit: 100, monthLimit: 3000 },
      kinds,
      log,
      resets,
      settings: emailSettings(this.db),
      due: { winback: due.winback.map((m) => m.name), nudge: due.nudge.map((m) => m.name) },
      optedOut: optedOut.n,
      resetWhatsApp: this.codes.whatsappOn,
      webhook: { url: `${SITE_URL}/api/resend/webhook`, source: w.source, last4: w.value.slice(-4) },
      // What each automatic email says, for a made-up shop.
      previews: {
        welcome: welcomeEmail('Sharma General Store', 8, 'a free gift'),
        winback: winbackEmail('Sharma General Store', 42, 16),
        nudge: nudgeEmail('Sharma General Store'),
      },
    };
  }

  @Put('settings')
  saveSettings(@AdminId() adminId: number, @Body() body: Partial<EmailSettings>) {
    const s = emailSettings(this.db);
    const days = (v: unknown, label: string) => {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 365) throw new BadRequestException(`${label} must be 1 to 365 days`);
      return n;
    };
    if (body?.welcome !== undefined) s.welcome = Boolean(body.welcome);
    if (body?.winback !== undefined) s.winback = Boolean(body.winback);
    if (body?.nudge !== undefined) s.nudge = Boolean(body.nudge);
    if (body?.winbackDays !== undefined) s.winbackDays = days(body.winbackDays, 'Win-back');
    if (body?.nudgeDays !== undefined) s.nudgeDays = days(body.nudgeDays, 'Nudge');
    if (body?.dailyCap !== undefined) {
      const n = Number(body.dailyCap);
      if (!Number.isInteger(n) || n < 0 || n > 90) throw new BadRequestException('Daily limit must be 0 to 90 (Resend free plan: 100 a day in all)');
      s.dailyCap = n;
    }
    this.db.sql
      .prepare("INSERT INTO app_settings (key, value) VALUES ('email_auto', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(JSON.stringify({ ...EMAIL_DEFAULTS, ...s }));
    this.audit(adminId, 'email_settings', `Automatic emails: welcome ${s.welcome ? 'on' : 'off'}, win-back ${s.winback ? `after ${s.winbackDays} days` : 'off'}, nudge ${s.nudge ? `after ${s.nudgeDays} days` : 'off'}, ${s.dailyCap} a day`);
    return s;
  }

  /** A test email to the signed-in admin's own address. */
  @Post('test')
  @HttpCode(200)
  async test(@AdminId() adminId: number) {
    const admin = this.db.sql.prepare('SELECT email FROM admins WHERE id = ?').get(adminId) as { email: string } | undefined;
    if (!admin) throw new NotFoundException('Admin not found');
    try {
      await this.mailer.send(admin.email, testEmail(), { kind: 'test' });
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    return { to: admin.email };
  }

  /** Reset by WhatsApp on or off. Off, the login page asks for the account's email only. */
  @Put('reset-whatsapp')
  setResetWhatsApp(@AdminId() adminId: number, @Body() body: { on?: boolean }) {
    const on = Boolean(body?.on);
    this.codes.setWhatsapp(on);
    this.audit(adminId, 'reset_whatsapp', `Password reset by WhatsApp turned ${on ? 'on' : 'off'}`);
    return { on };
  }

  @Put('webhook-secret')
  setSecret(@AdminId() adminId: number, @Body() body: { secret?: string }) {
    const secret = String(body?.secret ?? '').trim();
    if (!/^whsec_[A-Za-z0-9+/=]{20,200}$/.test(secret)) throw new BadRequestException('That doesn’t look like a Resend signing secret (it starts with whsec_)');
    this.db.sql
      .prepare("INSERT INTO app_settings (key, value) VALUES ('resend_webhook_secret', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(seal(secret));
    this.audit(adminId, 'resend_webhook', `Set the Resend webhook signing secret (…${secret.slice(-4)})`);
    const w = webhookSecret(this.db);
    return { source: w.source, last4: w.value.slice(-4) };
  }

  @Delete('webhook-secret')
  removeSecret(@AdminId() adminId: number) {
    this.db.sql.prepare("DELETE FROM app_settings WHERE key = 'resend_webhook_secret'").run();
    this.audit(adminId, 'resend_webhook', 'Removed the Resend webhook signing secret');
    const w = webhookSecret(this.db);
    return { source: w.source, last4: w.value.slice(-4) };
  }

  private audit(adminId: number, action: string, detail: string) {
    this.db.sql.prepare('INSERT INTO admin_log (admin_id, merchant_id, action, detail) VALUES (?, NULL, ?, ?)').run(adminId, action, detail);
  }
}
