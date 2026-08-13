import { Inject, Injectable } from '@nestjs/common';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/ports/refresh-token.repository';
import {
  TOKEN_SERVICE,
  type TokenService,
} from '../../domain/ports/token.service';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  /**
   * Revokes the whole token family for the given refresh token. Idempotent:
   * an invalid or already-expired token is treated as a successful logout.
   */
  async execute(dto: RefreshTokenDto): Promise<void> {
    try {
      const payload = await this.tokens.verifyRefresh(dto.refreshToken);
      await this.refreshTokens.revokeFamily(payload.family);
    } catch {
      // No-op: nothing to revoke for an unverifiable token.
    }
  }
}
