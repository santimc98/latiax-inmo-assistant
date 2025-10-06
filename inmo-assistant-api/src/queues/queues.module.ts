import { Module } from '@nestjs/common';
import type { Job } from 'bullmq';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL!);

export const OutboxQueue = new Queue('outbox', { connection });

const processOutboxJob = (job: Job) => {
  // Aqui enviaremos mensajes a WhatsApp (pendiente integrar)
  console.log('Processing job', job.name, job.data);
  return Promise.resolve();
};

@Module({
  providers: [
    {
      provide: 'OUTBOX_WORKER',
      useFactory: () => new Worker('outbox', processOutboxJob, { connection }),
    },
  ],
  exports: [],
})
export class QueuesModule {}
