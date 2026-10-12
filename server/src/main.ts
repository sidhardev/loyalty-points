import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
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
  controllers: [AuthController, LoyaltyController, PublicController],
  providers: [Db, AuthGuard, LoyaltyService],
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Behind a local tunnel or proxy (ngrok, nginx), take the visitor's IP from X-Forwarded-For,
  // so per-IP limits apply to each visitor rather than to the proxy.
  app.set('trust proxy', 'loopback');

  // In production the API also serves the built website (web/dist), so one process runs everything.
  const web = join(__dirname, '..', '..', 'web', 'dist');
  if (existsSync(web)) {
    app.useStaticAssets(web);
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) return res.sendFile(join(web, 'index.html'));
      next();
    });
  }

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  console.log(`Loyalty Points running on http://localhost:${port}`);
}

void bootstrap();
