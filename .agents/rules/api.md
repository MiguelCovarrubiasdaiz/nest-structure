---
paths:
  - 'src/modules/**/infrastructure/http/**'
  - 'src/modules/**/application/dtos/**'
  - 'src/main.ts'
---

# HTTP API

Reference: `src/modules/users/infrastructure/http/user.controller.ts`.

## Routes

- Global prefix `API_PREFIX` (default `api`) is set in `main.ts` — never write
  it in a controller. `@Controller('<plural-kebab>')`: `users`, `order-items`.
- `GET` list/detail, `POST` create (201 default), `PATCH` partial update,
  `DELETE` with `@HttpCode(HttpStatus.NO_CONTENT)`. Actions that are not CRUD
  are `POST /<resource>/<verb>` with `@HttpCode(HttpStatus.OK)` (see `auth/login`).
- IDs are UUIDs: `@Param('id', new ParseUUIDPipe()) id: string`.

## Controllers are thin

One controller per module; each handler only:

1. receives validated input (DTOs, pipes, `@CurrentUser()`),
2. calls `useCase.execute(...)`,
3. maps the result with `XResponse.fromDomain(entity)` (lists: `.map(XResponse.fromDomain)`).

No business logic, no try/catch, no DB access, no `HttpException` for business
failures (`errors.md`).

## Swagger (every endpoint)

```ts
@ApiTags('orders')
@ApiBearerAuth()            // on the class when the routes are protected
@Controller('orders')
export class OrderController {
  @Get(':id')
  @ApiOperation({ summary: 'Get an order by id' })
  async getOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<OrderResponse> { … }
}
```

Every route is protected by the global JWT guard; public ones add `@Public()`
(`auth.md`).

## DTOs (`application/dtos/`)

- Request DTOs: `class-validator` on every field + `@ApiProperty` /
  `@ApiPropertyOptional` with an `example`. Use `!` for required props.
- The global `ValidationPipe` has `whitelist`, `forbidNonWhitelisted` and
  `transform`: unknown fields are rejected — do not validate or strip manually.
- Query params: `@Type(() => Number)` for numbers, defaults as initializers
  (see `list-users.query.ts`).
- Response DTOs: `@ApiProperty` only + `static fromDomain(entity)`. Never expose
  secrets (`passwordHash`, token hashes).

## Lists and pagination

Offset pagination: `limit` (default 20, min 1, max 100) + `offset` (default
0), validated in a `List<X>QueryDto`, passed to the repository as
`PaginationOptions`. The response is a plain array. Order deterministically
(`createdAt`, then `id`). Changing this contract needs approval (`project.md`).

## JSON

camelCase both ways, UUID strings, dates as ISO strings.

## File uploads

See `files/infrastructure/http/file.controller.ts`: `FileInterceptor('file')`
with `limits.fileSize` and a MIME allowlist in `fileFilter`,
`@ApiConsumes('multipart/form-data')` + `@ApiBody` binary schema. Pass only
`buffer`, `originalName`, `mimeType` to the use-case — `Express.Multer.File`
never leaves the HTTP layer.
