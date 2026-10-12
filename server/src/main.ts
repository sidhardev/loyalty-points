import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { AdminController, AdminGuard } from './admin';
import { AuthController, AuthGuard } from './auth';
import { Db } from './db';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';
import { PublicController } from './public.controller';

/** JWT_SECRET from the environment, or one generated on first run and kept in data/. */
function jwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const file = 'data/jwt-secret';
  if (!existsSync(file)) {
    mkdirSync('data', { recursive: true });
    writeFileSync(file, randomBytes(32).toString('hex'));
  }
  return readFileSync(file, 'utf8');
}

@Module({
  imports: [JwtModule.register({ global: true, secret: jwtSecret(), signOptions: { expiresIn: '7d' } })],
  controllers: [AuthController, LoyaltyController, PublicController, AdminController],
  providers: [Db, AuthGuard, AdminGuard, LoyaltyService],
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Behind a local tunnel or proxy (ngrok, nginx, Caddy), take the visitor's IP from X-Forwarded-For,
  // so per-IP limits apply to each visitor rather than to the proxy. TRUST_PROXY sets which proxies to
  // believe: a hop count ("1" behind one proxy, e.g. Caddy in Docker or Railway) or Express names like "loopback".
  const trust = process.env.TRUST_PROXY ?? 'loopback';
  app.set('trust proxy', /^\d+$/.test(trust) ? Number(trust) : trust);

  // In production the API also serves the built website (web/dist), so one process runs everything.
  const web = join(__dirname, '..', '..', 'web', 'dist');
  if (existsSync(web)) {
    app.useStaticAssets(web, { index: false });
    const page = readFileSync(join(web, 'index.html'), 'utf8');
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
      // A wallet's "Add to Home Screen" should open that wallet, so it gets its own manifest.
      const wallet = req.path.match(/^\/w\/([\w-]+)/)?.[1];
      res.type('html').send(wallet ? page.replace('/manifest.webmanifest', `/api/public/wallet/${wallet}/manifest`) : page);
    });
  }

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);
  console.log(`Habiturn running on http://localhost:${port}`);
}

void bootstrap();
