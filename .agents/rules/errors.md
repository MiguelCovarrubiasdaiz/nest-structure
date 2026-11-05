---
paths:
  - 'src/modules/**/domain/exceptions/**'
  - 'src/shared/domain/**'
  - 'src/shared/filters/**'
---

# Error handling

## Domain exceptions

Each module declares its exceptions in `domain/exceptions/<x>.exceptions.ts`,
extending `DomainException` (`src/shared/domain/domain.exception.ts`). The
exception carries its own machine-readable `code` and `httpStatus`:

```ts
export class OrderNotFoundException extends DomainException {
  readonly code = 'ORDER_NOT_FOUND';

  readonly httpStatus = HttpStatus.NOT_FOUND;

  constructor(id: string) {
    super(`Order with id ${id} not found`, { id });
  }
}
```

- `code`: `UPPER_SNAKE`, stable — clients branch on it.
- `message`: English, for developers. `details`: optional context object.
- Typical set per module: `<X>NotFoundException` (404),
  `<X>AlreadyExistsException` (409), `Invalid<X>DataException` (422, thrown by
  `X.create`), `<X>ActionForbiddenException` (403).
- Never throw plain `Error` or `HttpException` from domain or application.
- Repositories translate known DB errors into domain exceptions (Postgres
  `23505` unique violation → `<X>AlreadyExistsException`, see
  `drizzle-user.repository.ts`); anything else is rethrown.

## The global filter

`DomainExceptionFilter` (registered as `APP_FILTER` in `AppModule`) serializes
**every** error. Do not create per-module filters or return status codes from
use-cases. Envelope:

```json
{
  "statusCode": 404,
  "code": "ORDER_NOT_FOUND",
  "message": "Order with id … not found",
  "details": { "id": "…" },
  "path": "/api/orders/…",
  "timestamp": "2026-06-15T18:30:00.123Z"
}
```

- `DomainException` → its own `code`/`httpStatus`.
- Nest `HttpException` (validation, `ParseUUIDPipe`, multer) → `code` is the
  `HttpStatus` name (`BAD_REQUEST`, `NOT_FOUND`…).
- Anything else → 500 `INTERNAL_ERROR` with the generic message
  `'Internal server error'`; the real error and stack are only logged. Never
  leak internals to the client.

Changing this envelope needs approval (`project.md`).
