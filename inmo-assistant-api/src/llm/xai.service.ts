import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

@Injectable()
export class XaiService {
  private readonly client = new OpenAI({
    baseURL: 'https://api.x.ai',
    apiKey: process.env.XAI_API_KEY,
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
