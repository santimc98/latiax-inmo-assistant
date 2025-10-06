import { NestFactory } from '@nestjs/core';
import { OutboxWorkerModule } from './outbox.worker.module';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(OutboxWorkerModule, {
    logger: ['error', 'warn', 'log'],
  });
  appContext.enableShutdownHooks();
}

void bootstrap();
