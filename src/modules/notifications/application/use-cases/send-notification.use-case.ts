import { Inject, Injectable, Logger } from '@nestjs/common';
import { NOTIFIER, type Notifier } from '../../domain/ports/notifier';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@modules/users/domain/ports/user.repository';

@Injectable()
export class SendNotificationUseCase {
  private readonly logger = new Logger(SendNotificationUseCase.name);

  constructor(
    @Inject(NOTIFIER) private readonly notifier: Notifier,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(userId: string, message: string): Promise<void> {
    let user;
    try {
      user = await this.users.findById(userId);
    } catch (err) {
      this.logger.warn(
        `Lookup of user ${userId} failed; skipping notification: ${(err as Error).message}`,
      );
      return;
    }
    if (!user) return;

    try {
      await this.notifier.send(`@${user.email}`, message);
    } catch (err) {
      // Notifications are best-effort — never block the caller on a Slack
      // hiccup. We log and move on.
      this.logger.warn(
        `Notification to ${user.email} failed: ${(err as Error).message}`,
      );
    }
  }
}
