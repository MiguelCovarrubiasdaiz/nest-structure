import { createHash, createHmac } from 'node:crypto';
import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
} from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@modules/users/domain/ports/user.repository';
import {
  WEBHOOK_CONFIG,
  type WebhookConfig,
} from '../../domain/ports/webhook.config';
import { ProcessWebhookCommand } from '../commands/process-webhook.command';

const USER_ID_HASH_LENGTH = 12;

const obfuscateUserId = (userId: string): string =>
  createHash('sha256')
    .update(userId)
    .digest('hex')
    .slice(0, USER_ID_HASH_LENGTH);

@Injectable()
export class ProcessWebhookUseCase implements OnModuleDestroy {
  private readonly logger = new Logger(ProcessWebhookUseCase.name);

  private readonly pending = new Set<NodeJS.Timeout>();

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(WEBHOOK_CONFIG) private readonly config: WebhookConfig,
  ) {}

  async execute(command: ProcessWebhookCommand): Promise<void> {
    const { userId, event } = command;
    const userRef = obfuscateUserId(userId);
    this.logger.log(`Processing webhook ${event} for user ${userRef}`);

    let user;
    try {
      user = await this.users.findById(userId);
    } catch (err) {
      this.logger.error(
        `Lookup of user ${userRef} failed: ${(err as Error).message}`,
      );
      throw err;
    }
    if (!user) return;

    const { email } = user;
    const timer = setTimeout(() => {
      this.pending.delete(timer);
      Promise.resolve()
        .then(() => this.deliver(email, event))
        .catch((err: unknown) => {
          this.logger.error(
            `Delivery of webhook ${event} to user ${userRef} failed: ${(err as Error).message}`,
          );
        });
    }, this.config.deliverDelayMs);
    this.pending.add(timer);
  }

  onModuleDestroy(): void {
    for (const timer of this.pending) clearTimeout(timer);
    this.pending.clear();
  }

  private async deliver(email: string, event: string): Promise<void> {
    try {
      const signature = createHmac('sha256', this.config.secret)
        .update(`${email}:${event}`)
        .digest('hex');
      void signature;
    } catch (err) {
      this.logger.error(`deliver failed: ${(err as Error).message}`);
      throw err;
    }
  }
}
