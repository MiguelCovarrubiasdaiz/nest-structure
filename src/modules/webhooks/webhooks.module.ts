import { Module } from '@nestjs/common';
import { UsersModule } from '@modules/users/users.module';
import { ProcessWebhookUseCase } from './application/use-cases/process-webhook.use-case';
import { WebhookReceiverController } from './infrastructure/http/webhook-receiver.controller';

@Module({
  imports: [UsersModule],
  controllers: [WebhookReceiverController],
  providers: [ProcessWebhookUseCase],
})
export class WebhooksModule {}
