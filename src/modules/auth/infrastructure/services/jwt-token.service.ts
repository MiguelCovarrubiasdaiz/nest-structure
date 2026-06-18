import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InvalidTokenException } from '../../domain/exceptions/auth.exceptions';
import type {
  TokenPair,
  TokenPayload,
  TokenService,
} from '../../domain/ports/token.service';

@Injectable()
export class JwtTokenService implements TokenService {
  private readonly logger = new Logger(JwtTokenService.name);
  private readonly accessSecret: string;
  private readonly accessExpiresIn: number;
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: number;

  constructor(
    config: ConfigService,
    private readonly jwt: JwtService,
  ) {
    this.accessSecret = config.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.accessExpiresIn = parseDurationSeconds(
      config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    );
    this.refreshSecret = config.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.refreshExpiresIn = parseDurationSeconds(
      config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    );
  }

  async signPair(payload: TokenPayload): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.accessSecret,
        expiresIn: this.accessExpiresIn,
      }),
      this.jwt.signAsync(payload, {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiresIn,
      }),
    ]);
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.accessExpiresIn,
    };
  }

  async verifyAccess(token: string): Promise<TokenPayload> {
    try {
      const decoded = await this.jwt.verifyAsync<TokenPayload>(token, {
        secret: this.accessSecret,
      });
      return { sub: decoded.sub, email: decoded.email };
    } catch (err) {
      this.logger.debug(`Access token verify failed: ${(err as Error).message}`);
      throw new InvalidTokenException();
    }
  }

  async verifyRefresh(token: string): Promise<TokenPayload> {
    try {
      const decoded = await this.jwt.verifyAsync<TokenPayload>(token, {
        secret: this.refreshSecret,
      });
      return { sub: decoded.sub, email: decoded.email };
    } catch (err) {
      this.logger.debug(`Refresh token verify failed: ${(err as Error).message}`);
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
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return n * multipliers[unit];
}
