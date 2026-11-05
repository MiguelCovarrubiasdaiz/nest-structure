---
paths:
  - 'src/modules/**'
  - 'src/shared/**'
  - 'src/app.module.ts'
---

# Architecture — hexagonal modules

Always applies. Reference implementation: `src/modules/users/`. **Open the
equivalent file there and copy its shape** before creating any file.

## The 3 layer rules (inviolable)

1. **`domain/`** imports nothing from `application/`, `infrastructure/`,
   `@nestjs/*`, Drizzle or Express. Pure TypeScript. Single exception: domain
   exceptions import `HttpStatus` from `@nestjs/common`.
2. **`application/`** imports only from `domain/` (its own or another
   module's) and from `shared/` **ports and tokens**. Use-cases depend on
   interfaces, never on adapters. Allowed framework pieces: `Injectable`,
   `Inject`, `Logger` from `@nestjs/common`, and `class-validator` /
   `@nestjs/swagger` decorators on DTOs.
3. **`infrastructure/`** implements the ports (Drizzle repositories, JWT,
   SDK adapters) and exposes the use-cases (HTTP controllers, guards,
   decorators).

If a use-case "needs" something from infra (a clock, an SDK, a hash
algorithm…), define a port in `domain/ports/` and an adapter in
`infrastructure/`.

## Module layout (fixed)

```
src/modules/<plural>/
├── domain/
│   ├── entities/<x>.entity.ts          immutable class, private ctor, static create()
│   ├── ports/<x>.repository.ts         interface + Symbol token, same file
│   └── exceptions/<x>.exceptions.ts    all of the module's DomainExceptions
├── application/
│   ├── dtos/                           request DTOs, query DTOs, <x>.response.ts
│   ├── services/                       shared logic between use-cases (optional)
│   └── use-cases/<verb>-<x>.use-case.ts
├── infrastructure/
│   ├── http/<x>.controller.ts          one controller per module
│   ├── persistence/                    <x>.schema.ts, <x>.mapper.ts, drizzle-<x>.repository.ts
│   └── services/                       adapters for non-repository ports (optional)
└── <plural>.module.ts
```

A module with nothing to model (like `files`) may skip `domain/`.

## Entities

Copy `users/domain/entities/user.entity.ts`:

- Public `readonly` fields, `private constructor(props)`, `static create(props)`
  that enforces invariants and throws `Invalid<X>DataException`.
- Business methods return a **new instance** via `X.create({ ...this, …,
  updatedAt: new Date() })` (see `User.rename`). Never mutate.
- The id (`randomUUID()`) and timestamps are produced by the use-case and
  passed in; the mapper rebuilds entities with `X.create` too.

## Ports and dependency injection

- Port = `interface` + `Symbol` token in the same file:
  `export const USER_REPOSITORY = Symbol('USER_REPOSITORY')`. Never abstract
  classes or string tokens.
- Inject with `@Inject(TOKEN)` and import the interface as a type:
  `import { USER_REPOSITORY, type UserRepository } from '…'`.
- Bind in `<plural>.module.ts`: `{ provide: TOKEN, useClass: Adapter }`.
- Port-specific types (e.g. `PaginationOptions`) live in the port file.

## Use-cases

- One `@Injectable()` class per action, a single `execute(...)` method, named
  `<verb>-<x>.use-case.ts` → `<Verb><X>UseCase` (`list-users` → `ListUsersUseCase`).
- They return **domain entities** (or domain types like `TokenPair`); the
  controller maps them to responses.
- Business rules and authorization decisions (ownership, state checks) live in
  the entity or the use-case. Never in controllers, DTOs or repositories.
- Logic shared by several use-cases → an application service in
  `application/services/` (see `auth/application/services/token-issuer.service.ts`).
  Never one use-case calling another.

## Cross-module access

- A module `exports` what others may use (`UsersModule` exports
  `USER_REPOSITORY` and `GetUserUseCase`); the consumer imports that module.
- Depend on the other module's **port**, reuse its domain exceptions, keep the
  import graph acyclic.
- Use aliases across modules/shared (`@modules/users/...`, `@shared/...`);
  relative paths inside a module.

## Shared kernel (`src/shared/`)

`@Global()` modules, each a port + env-selected adapter (`useFactory` +
`switch` on a `ConfigService` driver var). Tokens live in `<x>.tokens.ts`.
Just inject the token:

| Token                 | Port              | Adapters (env)                     | Rule         |
| --------------------- | ----------------- | ---------------------------------- | ------------ |
| `DATABASE_CONNECTION` | `Database` type   | Drizzle `postgres-js`              | `database.md`|
| `STORAGE_SERVICE`     | `StorageService`  | `local` / `s3` (`STORAGE_DRIVER`)  | `storage.md` |
| `MAIL_SERVICE`        | `MailService`     | `log` / `smtp` (`MAIL_DRIVER`)     | `email.md`   |
| `PASSWORD_HASHER`     | `PasswordHasher`  | bcrypt (`BCRYPT_ROUNDS`)           | `auth.md`    |

**Swapping a provider** = a new adapter class implementing the port + one
`case` in the module factory (+ its env vars, `project.md`). Domain and
use-cases stay untouched. A new cross-cutting subsystem follows the same shape
and gets its own rule file here.

## Naming

| Kind               | File                                  | Class / symbol               |
| ------------------ | ------------------------------------- | ---------------------------- |
| Entity             | `order.entity.ts`                     | `Order`                      |
| Repository port    | `order.repository.ts`                 | `OrderRepository`, `ORDER_REPOSITORY` |
| Exceptions         | `order.exceptions.ts`                 | `OrderNotFoundException`     |
| Use-case           | `create-order.use-case.ts`            | `CreateOrderUseCase`         |
| Request DTO        | `create-order.dto.ts`                 | `CreateOrderDto`             |
| Query DTO          | `list-orders.query.ts`                | `ListOrdersQueryDto`         |
| Response DTO       | `order.response.ts`                   | `OrderResponse`              |
| Controller         | `order.controller.ts`                 | `OrderController`            |
| Drizzle schema     | `order.schema.ts`                     | `orders`, `OrderRow`, `NewOrderRow` |
| Mapper             | `order.mapper.ts`                     | `OrderMapper`                |
| Drizzle adapter    | `drizzle-order.repository.ts`         | `DrizzleOrderRepository`     |
| Nest module        | `orders.module.ts`                    | `OrdersModule`               |

Every module is registered in `src/app.module.ts`.
