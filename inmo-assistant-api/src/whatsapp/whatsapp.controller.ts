import { Controller, Get, Logger, Post, Query, Req, Res } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { loadEnv } from '../config/env';

@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);
  private readonly env = loadEnv();

  @Get('webhook')
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    if (mode === 'subscribe' && token === this.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  }

  @Post('webhook')
  handle(@Req() req: Request, @Res() res: Response) {
    const signatureHeader = req.header('x-hub-signature-256');
    const rawBody = req.rawBody;

    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
      this.logger.warn('Missing or invalid X-Hub-Signature-256 header');
      return res.sendStatus(403);
    }

    if (!rawBody) {
      this.logger.warn('Raw body unavailable for signature verification');
      return res.sendStatus(403);
    }

    const signatureHex = signatureHeader.replace('sha256=', '');
    const expectedBuffer = createHmac('sha256', this.env.APP_SECRET).update(rawBody).digest();
    const providedBuffer = Buffer.from(signatureHex, 'hex');

    if (
      providedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      this.logger.warn('Webhook signature mismatch');
      return res.sendStatus(403);
    }

    // TODO: parsear cambios y encolar respuestas
    this.logger.log('[WA inbound] ' + JSON.stringify(req.body));
    return res.sendStatus(200);
  }
}
