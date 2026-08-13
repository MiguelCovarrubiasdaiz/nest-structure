import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@modules/users/domain/ports/user.repository';
import { InvalidTokenException } from '../../domain/exceptions/auth.exceptions';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/ports/refresh-token.repository';
import {
  TOKEN_SERVICE,
  type TokenPair,
  type TokenService,
} from '../../domain/ports/token.service';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';
import { TokenIssuer } from '../services/token-issuer.service';
import { hashToken } from '../services/token-hash';

@Injectable()
export class RefreshTokenUseCase {
  private readonly logger = new Logger(RefreshTokenUseCase.name);

  constructor(
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly issuer: TokenIssuer,
  ) {}

  async execute(dto: RefreshTokenDto): Promise<TokenPair> {
    const payload = await this.tokens.verifyRefresh(dto.refreshToken);
    const record = await this.refreshTokens.findByJti(payload.jti);

    // Unknown jti — token was never issued (or the row was purged).
    if (!record) {
      throw new InvalidTokenException();
    }

    // Already-revoked token presented again → reuse. Burn the whole family so
    // the attacker and the legitimate holder both lose access.
    if (record.revokedAt) {
      this.logger.warn(
        `Refresh token reuse detected for family ${record.familyId}; revoking family`,
      );
      await this.refreshTokens.revokeFamily(record.familyId);
      throw new InvalidTokenException('Refresh token reuse detected');
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      throw new InvalidTokenException();
    }

    // Defence in depth: the presented token must hash to the stored value.
    if (record.tokenHash !== hashToken(dto.refreshToken)) {
      await this.refreshTokens.revokeFamily(record.familyId);
      throw new InvalidTokenException();
    }

    // The subject must still exist (deleted user can no longer refresh).
    const user = await this.users.findById(payload.sub);
    if (!user) {
      await this.refreshTokens.revokeFamily(record.familyId);
      throw new InvalidTokenException();
    }

    // Rotate: revoke the used token and issue a new one within the same family.
    await this.refreshTokens.revoke(record.jti);
    return this.issuer.issue(
      { sub: user.id, email: user.email },
      record.familyId,
    );
  }
}
