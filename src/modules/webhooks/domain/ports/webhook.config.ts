export const WEBHOOK_CONFIG = Symbol('WEBHOOK_CONFIG');

// 5 seconds, expressed in milliseconds
export const DEFAULT_DELIVER_DELAY_MS = 5_000;

export interface WebhookConfig {
  readonly secret: string;
  readonly deliverDelayMs: number;
}
