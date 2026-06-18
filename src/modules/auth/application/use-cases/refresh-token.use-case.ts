import { Inject, Injectable } from '@nestjs/common';
import {
  TOKEN_SERVICE,
  type TokenPair,
  type TokenService,
} from '../../domain/ports/token.service';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';

@Injectable()
export class RefreshTokenUseCase {
  constructor(@Inject(TOKEN_SERVICE) private readonly tokens: TokenService) {}

  async execute(dto: RefreshTokenDto): Promise<TokenPair> {
    const payload = await this.tokens.verifyRefresh(dto.refreshToken);
    return this.tokens.signPair({ sub: payload.sub, email: payload.email });
  }
}
