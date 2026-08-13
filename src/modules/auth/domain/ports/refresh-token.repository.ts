export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');

export interface RefreshTokenRecord {
  /** JWT id — primary key, unique per issued refresh token. */
  jti: string;
  userId: string;
  /** All refresh tokens derived from a single login share a family id. */
  familyId: string;
  /** SHA-256 hex of the raw refresh token (never store the token itself). */
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface RefreshTokenRepository {
  save(record: RefreshTokenRecord): Promise<void>;
  findByJti(jti: string): Promise<RefreshTokenRecord | null>;
  /** Revoke a single token by its jti. */
  revoke(jti: string): Promise<void>;
  /** Revoke every non-revoked token in a family (used on reuse / logout). */
  revokeFamily(familyId: string): Promise<void>;
}
