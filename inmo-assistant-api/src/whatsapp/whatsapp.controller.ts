import { Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

@Controller('whatsapp')
export class WhatsappController {
  @Get('webhook')
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  }

  @Post('webhook')
  handle(@Req() req: Request, @Res() res: Response) {
    // TODO: parsear cambios y encolar respuestas
    console.log('[WA inbound]', JSON.stringify(req.body));
    return res.sendStatus(200);
  }
}
