import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@shared/domain/domain.exception';

export class UserNotFoundException extends DomainException {
  readonly code = 'USER_NOT_FOUND';
  readonly httpStatus = HttpStatus.NOT_FOUND;

  constructor(id: string) {
    super(`User with id ${id} not found`, { id });
  }
}

export class UserAlreadyExistsException extends DomainException {
  readonly code = 'USER_ALREADY_EXISTS';
  readonly httpStatus = HttpStatus.CONFLICT;

  constructor(email: string) {
    super(`User with email ${email} already exists`, { email });
  }
}