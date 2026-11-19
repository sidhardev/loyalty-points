import { Injectable } from '@nestjs/common';

// Email through Resend (resend.com). Set RESEND_API_KEY in deploy/.env, and MAIL_FROM once the domain is verified in
// Resend (DEPLOY.md). Without a key, email features say they're off instead of failing.

const FROM = () => process.env.MAIL_FROM?.trim() || 'Regularhood <no-reply@regularhood.in>';

@Injectable()
export class Mailer {
  get ready() {
    return Boolean(process.env.RESEND_API_KEY?.trim());
  }

  async send(to: string, subject: string, text: string, html: string) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY?.trim()}`, 'content-type': 'application/json' },
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
