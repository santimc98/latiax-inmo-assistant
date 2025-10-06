import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappController } from './whatsapp.controller';

describe('WhatsappController', () => {
  let controller: WhatsappController;

  beforeAll(() => {
    process.env.WHATSAPP_VERIFY_TOKEN ??= 'test-verify';
    process.env.WHATSAPP_TOKEN ??= 'test-token';
    process.env.WHATSAPP_PHONE_NUMBER_ID ??= '0000000000';
    process.env.APP_SECRET ??= 'test-secret';
    process.env.XAI_API_KEY ??= 'test-xai';
    process.env.REDIS_URL ??= 'redis://localhost:6379';
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsappController],
    }).compile();

    controller = module.get<WhatsappController>(WhatsappController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
