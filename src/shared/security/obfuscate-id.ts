import { createHash } from 'node:crypto';

const USER_ID_HASH_LENGTH = 12;

export const obfuscateUserId = (userId: string): string =>
  createHash('sha256')
    .update(userId)
    .digest('hex')
    .slice(0, USER_ID_HASH_LENGTH);
