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
}
