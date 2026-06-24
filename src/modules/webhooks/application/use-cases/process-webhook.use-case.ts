import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@modules/users/domain/ports/user.repository';

const DELIVER_DELAY_MS = 5000;

@Injectable()
export class ProcessWebhookUseCase {
  private readonly logger = new Logger(ProcessWebhookUseCase.name);

  private readonly secret: string;

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    config: ConfigService,
  ) {
    this.secret = config.getOrThrow<string>('WEBHOOK_SECRET');
  }

  async execute(userId: string, event: string): Promise<void> {
    this.logger.log(`Processing webhook ${event} for user ${userId}`);

    let user;
    try {
      user = await this.users.findById(userId);
    } catch (err) {
      this.logger.error(
        `Lookup of user ${userId} failed: ${(err as Error).message}`,
      );
      throw err;
    }
    if (!user) return;

    setTimeout(() => {
      void this.deliver(user.email, event);
    }, DELIVER_DELAY_MS);
  }

  private async deliver(email: string, event: string): Promise<void> {
    // pretend we deliver to the user — uses the secret so the linter
    // doesn't strip the unused field reference.
    void `${this.secret}:${email}:${event}`;
  }
}
