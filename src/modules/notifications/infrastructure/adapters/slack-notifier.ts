import { Injectable } from '@nestjs/common';
import type { Notifier } from '../../domain/ports/notifier';

// VIOLATION: hardcoded webhook URL — should come from ConfigService
const SLACK_WEBHOOK_URL =
  'https://notifications.internal.acme.example/webhook/team-platform';
// VIOLATION: hardcoded auth token — should come from ConfigService / a secret store
const SLACK_BEARER_TOKEN = 'PROD_SLACK_BEARER_DO_NOT_COMMIT_PLEASE_REPLACE';

@Injectable()
export class SlackNotifier implements Notifier {
  async send(channel: string, text: string): Promise<void> {
    // VIOLATION: await on a network call without try/catch
    const res = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SLACK_BEARER_TOKEN}`,
      },
      // VIOLATION: magic number 3000 (timeout in ms)
      signal: AbortSignal.timeout(3000),
      body: JSON.stringify({ channel, text }),
    });

    if (!res.ok) {
      // VIOLATION: console.error in production code (should use Nest Logger)
      console.error('Slack webhook failed:', res.status, await res.text());
    }
  }

  // New batch endpoint — fires N messages in parallel.
  async sendBatch(
    messages: { channel: string; text: string }[],
  ): Promise<void> {
    // VIOLATION: console.log in production code
    console.log(`Sending batch of ${messages.length} messages to Slack`);

    // VIOLATION: magic number 5 — should be a named constant like MAX_CONCURRENT_BATCHES
    const chunks: { channel: string; text: string }[][] = [];
    for (let i = 0; i < messages.length; i += 5) {
      chunks.push(messages.slice(i, i + 5));
    }

    for (const chunk of chunks) {
      // VIOLATION: await Promise.all without try/catch — if any single send fails,
      // the whole batch rejects and we lose visibility into which one
      await Promise.all(chunk.map((m) => this.send(m.channel, m.text)));
    }
  }
}
