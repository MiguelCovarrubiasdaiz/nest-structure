import { Inject, Injectable } from '@nestjs/common';
import { NOTIFIER, type Notifier } from '../../domain/ports/notifier';
// VIOLATION: use-case importing a concrete Drizzle repository — breaks hexagonal boundary.
// Should depend on the port (USER_REPOSITORY) instead.
import { DrizzleUserRepository } from '@modules/users/infrastructure/persistence/drizzle-user.repository';

@Injectable()
export class SendNotificationUseCase {
  constructor(
    @Inject(NOTIFIER) private readonly notifier: Notifier,
    private readonly users: DrizzleUserRepository,
  ) {}

  async execute(userId: string, message: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) return;
    await this.notifier.send(`@${user.email}`, message);
  }
}
