import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OutboxProcessor } from './outbox.processor';
import { loadEnv } from '../config/env';

const env = loadEnv();

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        url: env.REDIS_URL,
      },
    }),
    BullModule.registerQueue({
      name: 'outbox',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 500,
        },
      },
    }),
  ],
  providers: [OutboxProcessor],
})
export class OutboxWorkerModule {}
