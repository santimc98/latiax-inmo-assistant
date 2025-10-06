import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { InmovillaModule } from './inmovilla/inmovilla.module';

@Module({
  imports: [WhatsappModule, InmovillaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
