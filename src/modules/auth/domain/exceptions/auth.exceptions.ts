import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@shared/domain/domain.exception';

export class InvalidCredentialsException extends DomainException {
  readonly code = 'INVALID_CREDENTIALS';

  readonly httpStatus = HttpStatus.UNAUTHORIZED;

  constructor() {
    super('Invalid email or password');
  }
}

export class InvalidTokenException extends DomainException {
  readonly code = 'INVALID_TOKEN';

  readonly httpStatus = HttpStatus.UNAUTHORIZED;

  constructor(reason = 'Invalid or expired token') {
    super(reason);
  }
}
