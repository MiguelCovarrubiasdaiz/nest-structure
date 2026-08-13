import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/ports/refresh-token.repository';
import {
  TOKEN_SERVICE,
  type TokenPair,
  type TokenPayload,
  type TokenService,
} from '../../domain/ports/token.service';
import { hashToken } from './token-hash';

/**
 * Issues an access + refresh token pair and persists the refresh token (hashed)
 * so it can later be rotated and revoked. Shared by login (new family) and
 * refresh (rotation within an existing family).
 */
@Injectable()
export class TokenIssuer {
  constructor(
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  async issue(
    user: TokenPayload,
    familyId: string = randomUUID(),
  ): Promise<TokenPair> {
    const jti = randomUUID();
    const [accessToken, refreshToken] = await Promise.all([
      this.tokens.signAccessToken(user),
      this.tokens.signRefreshToken({ ...user, jti, family: familyId }),
    ]);

    const now = new Date();
    await this.refreshTokens.save({
      jti,
      userId: user.sub,
      familyId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(now.getTime() + this.tokens.refreshTtlSeconds * 1000),
      revokedAt: null,
      createdAt: now,
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.tokens.accessTtlSeconds,
    };
  }
}
