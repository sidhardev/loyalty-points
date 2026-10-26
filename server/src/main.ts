import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AdminController, AdminGuard } from './admin';
import { AnalyticsController, AnalyticsStore } from './analytics';
import { AuthController, AuthGuard } from './auth';
import { AutoMessages, AutoMessagesController } from './automessages';
import { Billing, BillingAdminController, BillingController } from './billing';
import { Db } from './db';
import { Gemini } from './gemini';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';
import { PublicController } from './public.controller';
import { jwtSecret } from './secret';
import { SeoAdminController, SeoPublicController, SeoService } from './seo';
import { StatusAdminController } from './status';
import { LeadsAdminController, LeadsService } from './leads';
import { PlaybookAdminController, PlaybookService } from './playbook';
import { WhatsApp, WhatsAppAdminController, WhatsAppWebhookController } from './whatsapp';

// Local settings and secrets (e.g. GEMINI_API_KEY) from server/.env, if there is one. Git and Docker ignore the file;
// on the server the same values come from deploy/.env. Variables already set in the environment win.
if (existsSync('.env')) process.loadEnvFile('.env');

@Module({
  imports: [JwtModule.register({ global: true, secret: jwtSecret(), signOptions: { expiresIn: '7d' } })],
  controllers: [AuthController, BillingController, BillingAdminController, AutoMessagesController, LoyaltyController, PublicController, AdminController, AnalyticsController, SeoAdminController, SeoPublicController, StatusAdminController, LeadsAdminController, PlaybookAdminController, WhatsAppAdminController, WhatsAppWebhookController],
  providers: [Db, AuthGuard, AdminGuard, LoyaltyService, Billing, AutoMessages, AnalyticsStore, Gemini, SeoService, LeadsService, PlaybookService, WhatsApp],
})
class AppModule {}

async function bootstrap() {
  // rawBody: the WhatsApp and Razorpay webhooks check the sender's signature over the exact bytes received.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  // Behind a local tunnel or proxy (ngrok, nginx, Caddy), take the visitor's IP from X-Forwarded-For,
  // so per-IP limits apply to each visitor rather than to the proxy. TRUST_PROXY sets which proxies to
  // believe: a hop count ("1" behind one proxy, e.g. Caddy in Docker or Railway) or Express names like "loopback".
  const trust = process.env.TRUST_PROXY ?? 'loopback';
  app.set('trust proxy', /^\d+$/.test(trust) ? Number(trust) : trust);

  // In production the API also serves the built website (web/dist), so one process runs everything.
  const web = join(__dirname, '..', '..', 'web', 'dist');
  if (existsSync(web)) {
    app.useStaticAssets(web, { index: false });
    // The homepage is prerendered (index.html); every other page starts from the empty app page (shell.html).
    const home = readFileSync(join(web, 'index.html'), 'utf8');
    const page = existsSync(join(web, 'shell.html')) ? readFileSync(join(web, 'shell.html'), 'utf8') : home;
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
      // Server-rendered SEO pages, guides, privacy/terms/refunds and the live sitemap (seo.ts).
      if (/^\/(hi\/)?(for|guide)(\/|$)/.test(req.path) || ['/sitemap.xml', '/privacy', '/terms', '/refunds'].includes(req.path)) return next();
      // Well-known files we don't publish (ard.json, ai-catalog.json…) are a 404, not the app page, so crawlers and
      // AI agents don't read HTML as a manifest.
      if (req.path.startsWith('/.well-known/')) return next();
      if (req.path === '/') return res.type('html').send(home);
      // A wallet's "Add to Home Screen" should open that wallet, so it gets its own manifest.
      const wallet = req.path.match(/^\/w\/([\w-]+)/)?.[1];
      res.type('html').send(wallet ? page.replace('/manifest.webmanifest', `/api/public/wallet/${wallet}/manifest`) : page);
    });
  }

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);
  console.log(`Regularhood running on http://localhost:${port}`);
}

void bootstrap();
