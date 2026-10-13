import { Injectable } from '@nestjs/common';
import { Db } from './db';
import { seal, unseal } from './secret';

// Google Gemini, called over its REST API. The key is the one set in Admin → SEO pages (kept encrypted in the database,
// see secret.ts) or else GEMINI_API_KEY from the server's environment; it is never sent to the browser. Every call is written to ai_usage with its tokens and cost, priced from the admin settings, and calls stop
// once the month's spend reaches the budget set there.

export type AiSettings = {
  model: string;
  priceInUsd: number; // per 1M input tokens
  priceOutUsd: number; // per 1M output tokens (thinking included)
  monthlyBudgetUsd: number; // 0 = no AI calls
};

export class AiBudgetError extends Error {}

/** Overridable only for local testing against a stand-in server. */
const API_BASE = (process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
  error?: { message?: string };
  promptFeedback?: { blockReason?: string };
};

@Injectable()
export class Gemini {
  constructor(private readonly db: Db) {}

  /** The key from the admin panel, if one was set and can be read. */
  private panelKey() {
    const row = this.db.sql.prepare("SELECT value FROM app_settings WHERE key = 'gemini_key'").get() as { value: string } | undefined;
    return row ? unseal(row.value) : null;
  }

  private key() {
    return this.panelKey() || process.env.GEMINI_API_KEY?.trim() || '';
  }

  get configured() {
    return Boolean(this.key());
  }

  /** Which key is in use, for the admin panel: never the key itself, only its last 4 characters. */
  keyInfo() {
    const panel = this.panelKey();
    const env = process.env.GEMINI_API_KEY?.trim();
    const key = panel || env;
    return {
      source: panel ? ('panel' as const) : env ? ('env' as const) : null,
      last4: key ? key.slice(-4) : '',
      envAlsoSet: Boolean(panel && env),
    };
  }

  setKey(key: string | null) {
    if (key) this.db.sql.prepare("INSERT INTO app_settings (key, value) VALUES ('gemini_key', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(seal(key));
    else this.db.sql.prepare("DELETE FROM app_settings WHERE key = 'gemini_key'").run();
  }

  /** Checks a key (or the one in use) by looking up the model: free, no tokens used. Returns an error message, or ''. */
  async check(model: string, key = this.key()) {
    if (!key) return 'No key';
    try {
      const res = await fetch(`${API_BASE}/v1beta/models/${encodeURIComponent(model)}`, { headers: { 'x-goog-api-key': key }, signal: AbortSignal.timeout(15_000) });
      if (res.ok) return '';
      const body = (await res.json().catch(() => ({}))) as GeminiResponse;
      return `Gemini ${res.status}: ${body.error?.message ?? 'the key was not accepted'}`;
    } catch (error) {
      return `Could not reach Gemini: ${(error as Error).message}`;
    }
  }

  /** Spend since the 1st of this month (UTC). */
  monthSpend() {
    return (this.db.sql.prepare("SELECT COALESCE(SUM(cost_usd), 0) AS c FROM ai_usage WHERE ts >= date('now', 'start of month')").get() as { c: number }).c;
  }

  /** Asks for JSON matching `schema` and returns it parsed. Throws on any failure (after logging it). */
  async json<T>(prompt: string, schema: object, ai: AiSettings, log: { purpose: string; refId?: number }): Promise<{ data: T; costUsd: number }> {
    const key = this.key();
    if (!key) throw new Error('No Gemini API key: set one in Admin → SEO pages, or GEMINI_API_KEY on the server');
    if (this.monthSpend() >= ai.monthlyBudgetUsd) throw new AiBudgetError(`This month's AI budget ($${ai.monthlyBudgetUsd}) is used up`);

    let input = 0;
    let output = 0;
    const record = (ok: boolean, error?: string) => {
      const cost = (input / 1e6) * ai.priceInUsd + (output / 1e6) * ai.priceOutUsd;
      this.db.sql
        .prepare('INSERT INTO ai_usage (purpose, ref_id, model, input_tokens, output_tokens, cost_usd, ok, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(log.purpose, log.refId ?? null, ai.model, input, output, cost, ok ? 1 : 0, error?.slice(0, 500) ?? null);
      return cost;
    };

    let body: GeminiResponse = {};
    try {
      // Busy or rate-limited (429, 500, 503) is usually temporary: two more tries, after 5 and 20 seconds.
      for (let attempt = 0; ; attempt++) {
        const res = await fetch(`${API_BASE}/v1beta/models/${encodeURIComponent(ai.model)}:generateContent`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.8 },
          }),
          signal: AbortSignal.timeout(120_000),
        });
        body = (await res.json().catch(() => ({}))) as GeminiResponse;
        input = body.usageMetadata?.promptTokenCount ?? 0;
        output = (body.usageMetadata?.candidatesTokenCount ?? 0) + (body.usageMetadata?.thoughtsTokenCount ?? 0);
        if (res.ok) break;
        const message = `Gemini ${res.status}: ${body.error?.message ?? 'request failed'}`;
        if (attempt >= 2 || ![429, 500, 503].includes(res.status)) throw new Error(message);
        record(false, `${message} (trying again)`);
        await new Promise((r) => setTimeout(r, attempt ? 20_000 : 5_000));
      }
    } catch (error) {
      record(false, (error as Error).message);
      throw error;
    }

    const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    try {
      if (!text) throw new Error(`Gemini returned no text (${body.promptFeedback?.blockReason ?? body.candidates?.[0]?.finishReason ?? 'empty'})`);
      const data = JSON.parse(text) as T;
      return { data, costUsd: record(true) };
    } catch (error) {
      record(false, (error as Error).message);
      throw error;
    }
  }
}
