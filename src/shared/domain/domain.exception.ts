import { HttpStatus } from '@nestjs/common';

/**
 * Base class for all domain exceptions.
 *
 * Carries:
 *   - `code`: machine-readable error code (e.g. 'USER_NOT_FOUND')
 *   - `httpStatus`: HTTP status to expose at the boundary
 *   - `details`: optional context object for clients
 *
 * The infra-layer global filter reads these and serializes a consistent
 * error envelope — no per-module filter needed.
 */
export abstract class DomainException extends Error {
  abstract readonly code: string;

  abstract readonly httpStatus: HttpStatus;

  readonly details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
  }
}
