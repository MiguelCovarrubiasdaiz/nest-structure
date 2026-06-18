import { Inject, Injectable } from '@nestjs/common';
import { PASSWORD_HASHER } from '@shared/security/security.tokens';
import type { PasswordHasher } from '@shared/security/ports/password-hasher.service';
import { USER_REPOSITORY, type UserRepository } from '@modules/users/domain/ports/user.repository';
import { InvalidCredentialsException } from '../../domain/exceptions/auth.exceptions';
import {
  TOKEN_SERVICE,
  type TokenPair,
  type TokenService,
} from '../../domain/ports/token.service';
import { LoginDto } from '../dtos/login.dto';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
  ) {}

  async execute(dto: LoginDto): Promise<TokenPair> {
    const user = await this.users.findByEmail(dto.email);
    if (!user) {
      throw new InvalidCredentialsException();
    }
    const ok = await this.hasher.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new InvalidCredentialsException();
    }
    return this.tokens.signPair({ sub: user.id, email: user.email });
  }
}
