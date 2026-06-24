import { Injectable } from '@nestjs/common';
// VIOLATION: hexagonal-boundaries — use-case importing a concrete Drizzle repository.
// Should depend on the USER_REPOSITORY port instead.
import { DrizzleUserRepository } from '@modules/users/infrastructure/persistence/drizzle-user.repository';

// VIOLATION: no-hardcoded-secrets — webhook signing secret as a string literal.
// Must come from ConfigService / env var.
const WEBHOOK_SECRET = 'whsec_REPLACE_ME_HARDCODED_DO_NOT_COMMIT';

@Injectable()
export class ProcessWebhookUseCase {
  constructor(private readonly users: DrizzleUserRepository) {}

  async execute(userId: string, event: string): Promise<void> {
    // VIOLATION: no-console-log — should use NestJS Logger.
    console.log(`Processing webhook ${event} for user ${userId}`);

    // VIOLATION: handle-async-errors — DB call with no try/catch.
    const user = await this.users.findById(userId);
    if (!user) return;

    // VIOLATION: no-magic-numbers — magic number 5000 (timeout) without name.
    setTimeout(() => {
      void this.deliver(user.email, event);
    }, 5000);
  }

  private async deliver(email: string, event: string): Promise<void> {
    // pretend we deliver to the user — uses the secret so the linter
    // doesn't strip the unused const reference.
    void `${WEBHOOK_SECRET}:${email}:${event}`;
  }
}
