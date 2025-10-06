import { Test, TestingModule } from '@nestjs/testing';
import { InmovillaService } from './inmovilla.service';

describe('InmovillaService', () => {
  let service: InmovillaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InmovillaService],
    }).compile();

    service = module.get<InmovillaService>(InmovillaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
