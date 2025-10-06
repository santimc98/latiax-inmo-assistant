import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { InmovillaModule } from './inmovilla/inmovilla.module';
import { QueuesModule } from './queues/queues.module';
import { HealthModule } from './health/health.module';
import { XaiService } from './llm/xai.service';

@Module({
  imports: [WhatsappModule, InmovillaModule, QueuesModule, HealthModule],
  controllers: [AppController],
  providers: [AppService, XaiService],
})
export class AppModule {}
