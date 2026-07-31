# AGENTS.md

Guide for AI agents (and humans) working in this repository. For user-facing documentation see [README.md](./README.md), which remains the high-level source of truth.

## What this project is

`nest-hexagonal-boilerplate`: REST API built with **NestJS 10 + strict TypeScript**, **Drizzle ORM** over PostgreSQL (`postgres-js` driver), **JWT auth** (access + refresh) with bcrypt, swappable storage (local/S3), and mail via React Email. Everything follows a **hexagonal architecture** (ports & adapters).

- Package manager: **pnpm 9** (do not use npm or yarn).
- Node: **20** (`.nvmrc`).

## Setup and commands

```bash
cp .env.example .env
pnpm install            # installs husky via `prepare`
docker compose up -d    # PostgreSQL 16 on :5432 (db nest_db)
pnpm db:push            # sync schema (dev)
pnpm start:dev          # API at http://localhost:3000/api, Swagger at /api/docs
```

| Command | Purpose |
|---|---|
| `pnpm build` | Compiles to `dist/` — use it to verify code compiles |
| `pnpm lint` | ESLint with `--fix` |
| `pnpm format` | Prettier over `src/` and `test/` |
| `pnpm test` | Jest (unit tests, `*.spec.ts` under `src/`) |
| `pnpm db:generate` | Generates SQL migration in `drizzle/` from schemas |
| `pnpm db:migrate` / `pnpm db:migrate:run` | Applies migrations (drizzle-kit dev / programmatic CI) |
| `pnpm db:push` | Direct schema sync without files (dev only) |
| `pnpm new:module <singular> [plural]` | Scaffolds a hexagonal module with full CRUD |
| `pnpm email:dev` | Mail template preview on :3001 |

**Verification after a change**: at minimum `pnpm build` and `pnpm lint`. There are no tests written yet (Jest is configured but there are no `*.spec.ts` files nor a `test/` dir); if you add new business logic, write the `*.spec.ts` next to the file.

## Architecture: the 3 hexagonal rules

These rules are **inviolable**. Check them before every edit:

1. **`domain/`** does not import from `application/`, `infrastructure/`, or `@nestjs/*`. Pure TypeScript. (Single deliberate exception: domain exceptions import `HttpStatus` from `@nestjs/common`.)
2. **`application/`** only imports from `domain/` and from `shared/` **ports**. Use cases depend on interfaces, never on implementations.
3. **`infrastructure/`** implements the ports and exposes the use cases (HTTP controllers, Drizzle repositories, service adapters).

The Nest module (`<x>.module.ts`) does the port-to-adapter binding. Swapping DB, storage, or mail = writing another adapter; domain and use cases stay untouched.

## Module anatomy

Every module under `src/modules/<plural>/` follows this shape (see `users/` as the canonical reference):

```
<module>/
├── domain/
│   ├── entities/<x>.entity.ts         # class with invariants, static factory
│   ├── ports/<x>.repository.ts        # interface + Symbol token, same file
│   └── exceptions/<x>.exceptions.ts   # extend DomainException
├── application/
│   ├── dtos/                          # class-validator + @ApiProperty
│   └── use-cases/<verb>-<x>.use-case.ts  # one class, one execute() method
├── infrastructure/
│   ├── http/<x>.controller.ts         # thin controller + Swagger decorators
│   └── persistence/                   # <x>.schema.ts, <x>.mapper.ts, drizzle-<x>.repository.ts
└── <plural>.module.ts                 # bindings { provide: TOKEN, useClass: Adapter }
```

Current modules: `users` (CRUD + DB), `auth` (JWT, no persistence of its own — consumes `USER_REPOSITORY` from `users`), `files` (storage example, no domain layer).

## Code conventions (mandatory)

- **Ports = interface + Symbol token in the same file**: `export const USER_REPOSITORY = Symbol('USER_REPOSITORY')`. Never abstract classes or string tokens.
- **Injection**: `@Inject(TOKEN)` in the constructor + `{ provide: TOKEN, useClass: Adapter }` in the module. Import interfaces as `import { TOKEN, type MyPort }` to avoid dragging domain runtime code.
- **Entities**: immutable, `private constructor`, `static create(props)` factory, business methods return **new instances** (see `User.rename`).
- **Use cases**: one `@Injectable()` class per action, single `execute(...)` method. Named `<verb>-<x>.use-case.ts`.
- **Persistence**: the Drizzle schema lives in `infrastructure/persistence/<x>.schema.ts` (camelCase in TS → snake_case in DB), with types `XRow = typeof x.$inferSelect` and `NewXRow = $inferInsert`. An `XMapper` (`toDomain`/`toPersistence`) separates row from entity. The connection is injected via `@Inject(DATABASE_CONNECTION) db: Database`.
- **Controllers**: thin — validate (pipes), call `useCase.execute()`, and map output with `XResponse.fromDomain(entity)`. Swagger decorators (`@ApiTags`, `@ApiOperation`, `@ApiBearerAuth`) on every endpoint. IDs via `ParseUUIDPipe`.
- **DTOs**: `class-validator` + `@ApiProperty`/`@ApiPropertyOptional`. There is a global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` — do not repeat manual validation.
- **Path aliases**: `@shared/*`, `@modules/*`, `@/*`. Relative paths inside a module; aliases across modules/shared.
- **Style**: Prettier (`singleQuote`, `trailingComma: 'all'`); ESLint raises **errors** on `no-explicit-any`, `no-unused-vars`, and `lines-between-class-members`. Husky + lint-staged run eslint/prettier on every commit — code you write must pass clean.

## Error handling

- Each module declares its exceptions in `domain/exceptions/` extending `DomainException` (`src/shared/domain/domain.exception.ts`), carrying its own machine-readable `code` and `httpStatus`:

```ts
export class UserNotFoundException extends DomainException {
  readonly code = 'USER_NOT_FOUND';
  readonly httpStatus = HttpStatus.NOT_FOUND;
  constructor(id: string) {
    super(`User with id ${id} not found`, { id });
  }
}
```

- A single global filter (`DomainExceptionFilter`, registered as `APP_FILTER` in `AppModule`) serializes all error responses. Do **not** create per-module filters or return HTTP codes from use cases.
- Never throw plain `Error` or `HttpException` from domain/application: always use a typed `DomainException` from the module.

## Shared (`src/shared/`)

`@Global()` modules following the same port + env-selected adapter pattern (`useFactory` + `switch` on `ConfigService`). Tokens live in `<x>.tokens.ts`. Just inject the token — they are available app-wide:

- `DATABASE_CONNECTION` → Drizzle connection (`database/`).
- `STORAGE_SERVICE` → `local` or `s3` per `STORAGE_DRIVER` (`storage/`).
- `MAIL_SERVICE` → `log` (dev) or `smtp` per `MAIL_DRIVER`; React Email `.tsx` templates in `mail/templates/` (`mail/`).
- `PASSWORD_HASHER` → bcrypt (`security/`).
- `env.validation.ts` validates **all** environment variables at boot with class-validator. If you add a new env var, register it there **and** in `.env.example`.

## Auth: implications when creating endpoints

- `JwtAuthGuard` is registered as a global `APP_GUARD`: **every new route is protected by default**. To open it, use `@Public()` (`@modules/auth/infrastructure/http/public.decorator`).
- To read the authenticated user use `@CurrentUser()` (`current-user.decorator.ts`) → `{ id, email }`.
- Do not instantiate another guard or another `JwtModule` per module.

## Database workflow

1. Edit/create the schema at `src/modules/<m>/infrastructure/persistence/<x>.schema.ts`.
2. Add the re-export to the barrel `src/shared/database/schema.ts` (the single source read by `drizzle.config.ts`).
3. In dev: `pnpm db:push`. For a real migration: `pnpm db:generate`, review the generated SQL in `drizzle/`, then `pnpm db:migrate`.
4. Generate migrations locally, not in CI (drizzle-kit asks interactively about renames).

## Creating a new module

Preferred: `pnpm new:module order orders`. It generates the full CRUD and auto-wires the schema into `shared/database/schema.ts` and the import into `app.module.ts`. **The script edits `app.module.ts` with awk — after running it, review that file manually** and adjust entity/schema/DTOs to the real fields. Then `pnpm db:push`.

## Tests

Jest 29 + ts-jest configured inline in `package.json` (`rootDir: src`, pattern `*.spec.ts`). No tests exist yet. When adding them: place `*.spec.ts` next to the file under test; domain and use cases are pure, so test them without Nest or a DB (mock ports with objects implementing the interface).

## Constraints for agents

- Always use `pnpm`; never hand-edit `pnpm-lock.yaml`.
- Do not hand-edit `drizzle/` (migrations) — they are generated with `db:generate`.
- Do not break the 3 hexagonal rules: if a use case "needs" something from infra, define a port in domain and an adapter in infrastructure.
- Do not add new dependencies unless strictly necessary; if you do, call it out explicitly.
- Do not add new global guards, filters, or pipes: auth, error handling, and validation are already centralized.
- New env vars go in `env.validation.ts` + `.env.example`, never with real values committed.
- Keep changes minimal and aligned with existing patterns; `users/` is the reference to imitate.
- If you change conventions, structure, or commands documented here or in the README, update both files.
