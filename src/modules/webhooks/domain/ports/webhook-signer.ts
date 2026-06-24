export const WEBHOOK_SIGNER = Symbol('WEBHOOK_SIGNER');

/**
 * Signs a webhook payload. The implementation owns the signing secret —
 * the use case never sees it. Sourced from environment via the
 * infrastructure adapter; never from a literal in the codebase.
 */
export interface WebhookSigner {
  sign(payload: string): string;
}
