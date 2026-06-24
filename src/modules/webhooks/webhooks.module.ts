import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersModule } from '@modules/users/users.module';
import {
  DEFAULT_DELIVER_DELAY_MS,
  WEBHOOK_CONFIG,
  type WebhookConfig,
} from './domain/ports/webhook.config';
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
        secret: config.getOrThrow<string>('WEBHOOK_SECRET'),
        deliverDelayMs:
          config.get<number>('WEBHOOK_DELIVER_DELAY_MS') ??
          DEFAULT_DELIVER_DELAY_MS,
      }),
    },
    ProcessWebhookUseCase,
  ],
})
export class WebhooksModule {}
