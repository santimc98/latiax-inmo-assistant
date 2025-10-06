import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OutboxProcessor } from './outbox.processor';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL ?? 'redis://localhost:6379',
      },
    }),
    BullModule.registerQueue({
      name: 'outbox',
    }),
  ],
  providers: [OutboxProcessor],
  exports: [BullModule],
})
export class QueuesModule {}
