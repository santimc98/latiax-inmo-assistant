import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { loadEnv } from '../config/env';

@Injectable()
export class XaiService {
  private readonly env = loadEnv();

  private readonly client = new OpenAI({
    baseURL: 'https://api.x.ai',
    apiKey: this.env.XAI_API_KEY,
  });

  async reply(messages: ChatCompletionMessageParam[]) {
    const response = await this.client.chat.completions.create({
      model: 'grok-4-fast',
      messages,
      temperature: 0.2,
    });

    return response.choices[0]?.message?.content ?? '';
  }
}
