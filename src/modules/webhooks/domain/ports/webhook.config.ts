export const WEBHOOK_CONFIG = Symbol('WEBHOOK_CONFIG');

export interface WebhookConfig {
  readonly secret: string;
  readonly deliverDelayMs: number;
}
