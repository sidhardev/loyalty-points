import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * At most `max` hits per key in a rolling `windowMs`, kept in memory (one server process). Keys whose hits have all
 * aged out are dropped every few minutes, so many different IPs can't make the map grow for ever.
 */
export class Limiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {
    setInterval(() => this.prune(), 5 * 60_000).unref();
  }

  /** Throws 429 if this key is over its limit; otherwise counts one hit. */
  take(key: string, message = 'Too many attempts. Please wait a few minutes and try again.') {
    if (!this.allow(key)) throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
  }

  /** Counts one hit and says whether it was within the limit (a refused hit isn't counted). */
  allow(key: string) {
    const since = Date.now() - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > since);
    if (recent.length >= this.max) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(Date.now());
    this.hits.set(key, recent);
    return true;
  }

  /** Whether this key is already at its limit, without counting a hit. */
  full(key: string) {
    const since = Date.now() - this.windowMs;
    return (this.hits.get(key) ?? []).filter((t) => t > since).length >= this.max;
  }

  clear(key: string) {
    this.hits.delete(key);
  }

  private prune() {
    const since = Date.now() - this.windowMs;
    for (const [key, times] of this.hits) if (!times.some((t) => t > since)) this.hits.delete(key);
  }
}
