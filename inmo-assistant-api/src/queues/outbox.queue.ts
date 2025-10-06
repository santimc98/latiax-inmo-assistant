import { createHash } from 'node:crypto';
import { Queue } from 'bullmq';
import { loadEnv } from '../config/env';

const env = loadEnv();

export const OutboxQueue = new Queue('outbox', {
  connection: { url: env.REDIS_URL },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 500,
    },
  },
});

type OutboxTextPayload = {
  to: string;
  body: string;
};

export function enqueueOutboxText(payload: OutboxTextPayload) {
  const hash = createHash('sha256').update(`${payload.to}:${payload.body}`).digest('hex');

  return OutboxQueue.add('send-text', payload, {
    jobId: `send-text:${hash}`,
  });
}
