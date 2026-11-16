import { BadRequestException, Body, Controller, Delete, Get, Put, UseGuards } from '@nestjs/common';
import { AdminGuard, AdminId } from './admin';
import { Db } from './db';
import { PlaybookService } from './playbook';

// Admin → Settings: the Anthropic API key every Claude feature uses (shop message drafts, playbooks, Phusro), and what
// those features have cost. The key is the same one Playbooks → API key sets; it's kept encrypted (secret.ts) and only
// its last 4 characters ever come back.

const PURPOSES: Record<string, string> = { 'shop-draft': 'Shop message drafts', playbook: 'Playbooks' };

@Controller('api/admin/settings')
@UseGuards(AdminGuard)
export class SettingsAdminController {
  constructor(
    private readonly playbooks: PlaybookService,
    private readonly db: Db,
  ) {}

  @Get()
  overview() {
    const usage = (
      this.db.sql
        .prepare(
          `SELECT purpose, COUNT(*) AS calls, COALESCE(SUM(cost_usd), 0) AS usd,
             COALESCE(SUM(CASE WHEN ts >= datetime('now', '-30 days') THEN cost_usd END), 0) AS usd30
           FROM ai_usage WHERE model LIKE 'claude-%' GROUP BY purpose ORDER BY usd DESC`,
        )
        .all() as { purpose: string; calls: number; usd: number; usd30: number }[]
    ).map((u) => ({ ...u, label: PURPOSES[u.purpose] ?? (u.purpose.startsWith('phusro') ? `Phusro (${u.purpose.slice(7) || 'studio'})` : u.purpose) }));
    return { key: this.playbooks.keyInfo(), usage };
  }

  @Put('key')
  async setKey(@AdminId() adminId: number, @Body() body: { key?: string }) {
    const key = String(body?.key ?? '').trim();
    if (!/^sk-ant-[\w-]{20,300}$/.test(key)) throw new BadRequestException('That doesn’t look like an Anthropic API key (it starts with sk-ant-)');
    const problem = await this.playbooks.check(key);
    if (problem) throw new BadRequestException(`Key not saved. ${problem}`);
    this.playbooks.setKey(key);
    this.audit(adminId, `Set a new Anthropic API key (…${key.slice(-4)})`);
    return this.playbooks.keyInfo();
  }

  @Delete('key')
  removeKey(@AdminId() adminId: number) {
    this.playbooks.setKey(null);
    this.audit(adminId, 'Removed the Anthropic API key set in the admin panel');
    return this.playbooks.keyInfo();
  }

  private audit(adminId: number, detail: string) {
    this.db.sql.prepare('INSERT INTO admin_log (admin_id, merchant_id, action, detail) VALUES (?, NULL, ?, ?)').run(adminId, 'anthropic_key', detail);
  }
}
