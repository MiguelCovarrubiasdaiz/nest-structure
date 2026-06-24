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
import { ReceiveWebhookDto } from '../dtos/receive-webhook.dto';

@Injectable()
export class ProcessWebhookUseCase implements OnModuleDestroy {
  private readonly logger = new Logger(ProcessWebhookUseCase.name);

  private readonly pending = new Set<NodeJS.Timeout>();

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(WEBHOOK_CONFIG) private readonly config: WebhookConfig,
  ) {}

  async execute(input: ReceiveWebhookDto): Promise<void> {
    const { userId, event } = input;
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

    const { email } = user;
    const timer = setTimeout(() => {
      this.pending.delete(timer);
      Promise.resolve()
        .then(() => this.deliver(email, event))
        .catch((err: unknown) => {
          this.logger.error(
            `Delivery of webhook ${event} to user ${userId} failed: ${(err as Error).message}`,
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
    void `${this.config.secret}:${email}:${event}`;
  }
}
