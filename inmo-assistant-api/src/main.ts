import { json, urlencoded } from 'body-parser';
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { NestFactory } from '@nestjs/core';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { loadEnv } from './config/env';

const env = loadEnv();

Sentry.init({
  dsn: env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 1.0,
});

const webhookPath = '/whatsapp/webhook';
const webhookRateLimiter = new RateLimiterMemory({
  points: 20,
  duration: 1,
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.use(webhookPath, helmet());

  app.use(webhookPath, async (req: Request, res: Response, next: NextFunction) => {
    try {
      await webhookRateLimiter.consume(req.ip ?? 'unknown');
      next();
    } catch (_error) {
      res.status(429).send('Too Many Requests');
    }
  });

  app.use(
    webhookPath,
    json({
      verify: (req: Request, _res, buffer) => {
        req.rawBody = Buffer.from(buffer);
      },
    }),
  );

  app.use(
    webhookPath,
    urlencoded({
      extended: true,
      verify: (req: Request, _res, buffer) => {
        req.rawBody = Buffer.from(buffer);
      },
    }),
  );

  app.use(json());
  app.use(
    urlencoded({
      extended: true,
    }),
  );

  app.enableShutdownHooks();
  await app.listen(env.PORT);
}

void bootstrap();
