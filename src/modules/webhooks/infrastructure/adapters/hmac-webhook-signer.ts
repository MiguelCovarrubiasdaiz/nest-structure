import { createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { WebhookSigner } from '../../domain/ports/webhook-signer';

@Injectable()
export class HmacWebhookSigner implements WebhookSigner {
  private readonly secret: string;

  constructor(config: ConfigService) {
    this.secret = config.getOrThrow<string>('WEBHOOK_SECRET');
  }

  sign(payload: string): string {
    return createHmac('sha256', this.secret).update(payload).digest('hex');
  }
}
