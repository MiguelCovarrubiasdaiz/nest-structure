import { forwardRef, Module } from '@nestjs/common';
import { UsersModule } from '@modules/users/users.module';
import { SendNotificationUseCase } from './application/use-cases/send-notification.use-case';
import { NOTIFIER } from './domain/ports/notifier';
import { SlackNotifier } from './infrastructure/adapters/slack-notifier';
import { NotificationController } from './infrastructure/http/notification.controller';

@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [NotificationController],
  providers: [
    SendNotificationUseCase,
    { provide: NOTIFIER, useClass: SlackNotifier },
  ],
  exports: [SendNotificationUseCase],
})
export class NotificationsModule {}
