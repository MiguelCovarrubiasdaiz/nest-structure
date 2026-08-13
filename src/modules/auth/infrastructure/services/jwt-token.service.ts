import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InvalidTokenException } from '../../domain/exceptions/auth.exceptions';
import type {
  RefreshTokenPayload,
  TokenPayload,
  TokenService,
} from '../../domain/ports/token.service';

@Injectable()
export class JwtTokenService implements TokenService {
  private readonly logger = new Logger(JwtTokenService.name);

  private readonly accessSecret: string;

  private readonly refreshSecret: string;

  readonly accessTtlSeconds: number;

  readonly refreshTtlSeconds: number;

  constructor(
    config: ConfigService,
    private readonly jwt: JwtService,
  ) {
    this.accessSecret = config.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.accessTtlSeconds = parseDurationSeconds(
      config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    );
    this.refreshSecret = config.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.refreshTtlSeconds = parseDurationSeconds(
      config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    );
  }

  signAccessToken(payload: TokenPayload): Promise<string> {
    return this.jwt.signAsync(
      { sub: payload.sub, email: payload.email },
      { secret: this.accessSecret, expiresIn: this.accessTtlSeconds },
    );
  }

  signRefreshToken(payload: RefreshTokenPayload): Promise<string> {
    return this.jwt.signAsync(
      {
        sub: payload.sub,
        email: payload.email,
        jti: payload.jti,
        family: payload.family,
      },
      { secret: this.refreshSecret, expiresIn: this.refreshTtlSeconds },
    );
  }

  async verifyAccess(token: string): Promise<TokenPayload> {
    try {
      const decoded = await this.jwt.verifyAsync<TokenPayload>(token, {
        secret: this.accessSecret,
      });
      return { sub: decoded.sub, email: decoded.email };
    } catch (err) {
      this.logger.debug(
        `Access token verify failed: ${(err as Error).message}`,
      );
      throw new InvalidTokenException();
    }
  }

  async verifyRefresh(token: string): Promise<RefreshTokenPayload> {
    try {
      const decoded = await this.jwt.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.refreshSecret,
      });
      if (!decoded.jti || !decoded.family) {
        throw new InvalidTokenException();
      }
      return {
        sub: decoded.sub,
        email: decoded.email,
        jti: decoded.jti,
        family: decoded.family,
      };
    } catch (err) {
      this.logger.debug(
        `Refresh token verify failed: ${(err as Error).message}`,
      );
      throw new InvalidTokenException();
    }
  }
}

// "15m" → 900, "7d" → 604800, "3600" → 3600
function parseDurationSeconds(value: string): number {
  const match = /^(\d+)([smhd])?$/.exec(value.trim());
  if (!match) throw new Error(`Invalid JWT duration: ${value}`);
  const n = Number(match[1]);
  const unit = match[2] ?? 's';
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };
  return n * multipliers[unit];
}
