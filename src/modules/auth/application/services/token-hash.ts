import { createHash } from 'node:crypto';

/** SHA-256 hex digest of a raw refresh token — what we persist instead of the
 * token itself, so a DB leak does not expose usable tokens. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
