import { Queue } from 'bullmq';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

export const OutboxQueue = new Queue('outbox', {
  connection: { url: redisUrl },
});
