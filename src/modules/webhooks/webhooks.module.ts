import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersModule } from '@modules/users/users.module';
import {
  DEFAULT_DELIVER_DELAY_MS,
  WEBHOOK_CONFIG,
  type WebhookConfig,
} from './domain/ports/webhook.config';
import { WEBHOOK_SIGNER } from './domain/ports/webhook-signer';
import { HmacWebhookSigner } from './infrastructure/adapters/hmac-webhook-signer';
import { ProcessWebhookUseCase } from './application/use-cases/process-webhook.use-case';
import { WebhookReceiverController } from './infrastructure/http/webhook-receiver.controller';

@Module({
  imports: [UsersModule],
  controllers: [WebhookReceiverController],
  providers: [
    {
      provide: WEBHOOK_CONFIG,
      inject: [ConfigService],
      useFactory: (config: ConfigService): WebhookConfig => ({
        deliverDelayMs:
          config.get<number>('WEBHOOK_DELIVER_DELAY_MS') ??
          DEFAULT_DELIVER_DELAY_MS,
      }),
    },
    { provide: WEBHOOK_SIGNER, useClass: HmacWebhookSigner },
    ProcessWebhookUseCase,
  ],
})
export class WebhooksModule {}
