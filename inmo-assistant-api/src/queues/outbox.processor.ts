import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import fetch from 'node-fetch';
import { loadEnv } from '../config/env';

type OutboxPayload = {
  to: string;
  body: string;
};

@Processor('outbox')
export class OutboxProcessor extends WorkerHost {
  private readonly logger = new Logger(OutboxProcessor.name);
  private readonly env = loadEnv();

  async process(job: Job<OutboxPayload>) {
    const phoneNumberId = this.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = this.env.WHATSAPP_TOKEN;

    if (!phoneNumberId || !token) {
      throw new Error('WhatsApp credentials are not configured');
    }

    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: job.data.to,
        type: 'text',
        text: { preview_url: false, body: job.data.body },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`WA send failed: ${response.status} ${text}`);
      throw new Error(`WA send failed: ${response.status} ${text}`);
    }

    this.logger.debug(`WhatsApp message sent to ${job.data.to} (${response.status})`);

    return true;
  }
}
