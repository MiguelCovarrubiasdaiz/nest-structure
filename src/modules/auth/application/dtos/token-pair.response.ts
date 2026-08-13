import { ApiProperty } from '@nestjs/swagger';
import type { TokenPair } from '../../domain/ports/token.service';

export class TokenPairResponse {
  @ApiProperty() accessToken!: string;

  @ApiProperty() refreshToken!: string;

  @ApiProperty({ example: 'Bearer' }) tokenType!: 'Bearer';

  @ApiProperty({ example: 900, description: 'Access token TTL in seconds' })
  expiresIn!: number;

  static fromDomain(pair: TokenPair): TokenPairResponse {
    return {
      accessToken: pair.accessToken,
      refreshToken: pair.refreshToken,
      tokenType: pair.tokenType,
      expiresIn: pair.expiresIn,
    };
  }
}
