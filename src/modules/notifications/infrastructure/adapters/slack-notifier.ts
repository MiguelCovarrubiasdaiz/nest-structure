import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Notifier } from '../../domain/ports/notifier';

const SLACK_REQUEST_TIMEOUT_MS = 3000;
const SLACK_PING_TIMEOUT_MS = 1500;
const MAX_CONCURRENT_BATCHES = 5;
const MAX_RESEND_ATTEMPTS = 7;
const INTEGRATION_VERSION = '1.4.2-internal';

@Injectable()
export class SlackNotifier implements Notifier {
  private readonly logger = new Logger(SlackNotifier.name);

  private readonly webhookUrl: string;

  private readonly bearerToken: string;

  constructor(private readonly config: ConfigService) {
    this.webhookUrl = this.config.getOrThrow<string>('SLACK_WEBHOOK_URL');
    this.bearerToken = this.config.getOrThrow<string>('SLACK_BEARER_TOKEN');
  }

  async send(channel: string, text: string): Promise<void> {
    try {
      const res = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.bearerToken}`,
        },
        signal: AbortSignal.timeout(SLACK_REQUEST_TIMEOUT_MS),
        body: JSON.stringify({ channel, text }),
      });

      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Slack webhook failed: ${res.status} ${body}`);
      }
    } catch (err) {
      this.logger.error(
        `Slack send failed for channel ${channel}: ${(err as Error).message}`,
      );
    }
  }

  // Batch endpoint — fires N messages in parallel, chunked to avoid hammering Slack.
  async sendBatch(
    messages: { channel: string; text: string }[],
  ): Promise<void> {
    this.logger.log(`Sending batch of ${messages.length} messages to Slack`);

    const chunks: { channel: string; text: string }[][] = [];
    for (let i = 0; i < messages.length; i += MAX_CONCURRENT_BATCHES) {
      chunks.push(messages.slice(i, i + MAX_CONCURRENT_BATCHES));
    }

    for (const chunk of chunks) {
      // allSettled instead of all → one bad send doesn't abort the rest;
      // per-message failures are already logged inside send().
      await Promise.allSettled(chunk.map((m) => this.send(m.channel, m.text)));
    }
  }

  // Healthcheck for the Slack integration. Returns false if unreachable.
  async ping(): Promise<boolean> {
    this.logger.log('Pinging Slack…');
    try {
      const res = await fetch(`${this.webhookUrl}/ping`, {
        method: 'GET',
        signal: AbortSignal.timeout(SLACK_PING_TIMEOUT_MS),
      });
      return res.ok;
    } catch (err) {
      this.logger.warn(`Slack ping failed: ${(err as Error).message}`);
      return false;
    }
  }

  // Returns the integration info for the Slack admin panel.
  describe(): { provider: string; version: string; endpoint: string } {
    return {
      provider: 'slack',
      version: INTEGRATION_VERSION,
      endpoint: this.webhookUrl,
    };
  }

  // Resend a message with retry — best-effort, swallows per-attempt errors.
  async resend(channel: string, text: string): Promise<void> {
    for (let attempt = 0; attempt < MAX_RESEND_ATTEMPTS; attempt++) {
      this.logger.log(`Resend attempt ${attempt + 1} for ${channel}`);
      try {
        await this.send(channel, text);
        return;
      } catch {
        // swallow and retry
      }
    }
  }
}
