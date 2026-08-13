import { Inject, Injectable } from '@nestjs/common';
import { PASSWORD_HASHER } from '@shared/security/security.tokens';
import type { PasswordHasher } from '@shared/security/ports/password-hasher.service';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@modules/users/domain/ports/user.repository';
import { InvalidCredentialsException } from '../../domain/exceptions/auth.exceptions';
import { type TokenPair } from '../../domain/ports/token.service';
import { TokenIssuer } from '../services/token-issuer.service';
import { LoginDto } from '../dtos/login.dto';

// A valid bcrypt hash used to run a comparison even when the email does not
// exist, so login timing does not reveal whether an account is registered.
const DUMMY_PASSWORD_HASH =
  '$2b$10$bRFD7cFrmbNh//NyN4QhN.g8T4MTXstlwQxyAmfqrPLLw3qMa7TQW';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    private readonly issuer: TokenIssuer,
  ) {}

  async execute(dto: LoginDto): Promise<TokenPair> {
    const user = await this.users.findByEmail(dto.email);
    // Always run a bcrypt comparison to keep the response time constant
    // regardless of whether the user exists (mitigates user enumeration).
    const ok = await this.hasher.compare(
      dto.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || !ok) {
      throw new InvalidCredentialsException();
    }
    return this.issuer.issue({ sub: user.id, email: user.email });
  }
}
