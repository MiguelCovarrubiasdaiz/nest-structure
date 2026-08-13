import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@shared/domain/domain.exception';

export class InvalidStorageKeyException extends DomainException {
  readonly code = 'INVALID_STORAGE_KEY';

  readonly httpStatus = HttpStatus.BAD_REQUEST;

  constructor(key: string) {
    super(`Invalid storage key: ${key}`, { key });
  }
}
