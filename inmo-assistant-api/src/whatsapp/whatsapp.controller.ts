import { Controller, Get, Query, Res, Post, Body } from '@nestjs/common';
import type { Response } from 'express';

@Controller('webhooks/whatsapp')
export class WhatsappController {
  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    if (mode === 'subscribe' && token === process.env.WA_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  }

  @Post()
  inbound(@Body() body: any) {
    // Aquí parsearemos mensajes (texto, botones/lista) y encolaremos respuestas.
    console.log('WA inbound:', JSON.stringify(body));
    return { status: 'ok' };
  }
}
