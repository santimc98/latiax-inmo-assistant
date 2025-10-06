import { Module } from '@nestjs/common';
import { InmovillaService } from './inmovilla.service';

@Module({
  providers: [InmovillaService],
})
export class InmovillaModule {}
