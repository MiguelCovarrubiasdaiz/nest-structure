# Project — nest-hexagonal-boilerplate

Always applies. Read before doing anything in this repository.

## What this is

A REST API boilerplate meant to be copied: NestJS 10 + strict TypeScript,
Drizzle ORM over PostgreSQL (`postgres-js`), JWT auth (access + persisted
refresh tokens) with bcrypt, swappable storage (local/S3) and mail (log/SMTP
with React Email templates). Everything follows ports & adapters
(`architecture.md`).

| Module  | What it shows                                                        |
| ------- | -------------------------------------------------------------------- |
| `users` | Canonical CRUD with DB, domain entity, mapper, welcome email         |
| `auth`  | JWT login/refresh/logout; consumes `USER_REPOSITORY` from `users`    |
| `files` | Storage consumer, no domain layer (nothing to model)                 |

## Stack and tooling

- Node **20** (`.nvmrc`), **pnpm 9** — never npm or yarn.
- Prettier: `singleQuote`, `trailingComma: 'all'`.
- ESLint **errors** on `no-explicit-any`, `no-unused-vars`,
  `lines-between-class-members` (blank line between class members).
- Husky + lint-staged run eslint/prettier on every commit.
- Path aliases: `@shared/*`, `@modules/*`, `@/*` (also mapped in Jest).

## Language

- English: code, identifiers, comments, commit messages, API error `message`s,
  Swagger summaries.
- Spanish: `README.md`.

## Commands

```bash
cp .env.example .env && pnpm install
docker compose up -d     # PostgreSQL 16 on :5432, db nest_db
pnpm db:push             # sync schema (dev)
pnpm start:dev           # http://localhost:3000/api — Swagger /api/docs
```

| Command                | Purpose                                              |
| ---------------------- | ---------------------------------------------------- |
| `pnpm build`           | Compile — the type-check you must pass               |
| `pnpm lint`            | ESLint with `--fix`                                  |
| `pnpm format`          | Prettier over `src/`                                 |
| `pnpm test`            | Jest (`*.spec.ts` under `src/`)                      |
| `pnpm db:generate`     | SQL migration in `drizzle/` from the schemas         |
| `pnpm db:migrate`      | Apply migrations (drizzle-kit)                       |
| `pnpm db:migrate:run`  | Apply migrations programmatically (deploy/CI)        |
| `pnpm db:push`         | Direct schema sync, dev only                         |
| `pnpm new:module <singular> [plural]` | Scaffold a CRUD module (skill `create-module`) |
| `pnpm email:dev`       | Mail template preview on :3001                       |

## Environment variables

`src/shared/config/env.validation.ts` validates **all** env vars at boot with
class-validator. A new variable needs:

1. A property in `EnvironmentVariables` with validators. Driver-specific vars
   use `@ValidateIf` on the driver (see `STORAGE_S3_*`).
2. Integers: add the key to the `coerced` list in `validateEnv`. Booleans:
   `@Transform(toBool)` — never enable implicit conversion
   (`Boolean("false") === true`).
3. An entry in `.env.example` with a placeholder value, never a real secret.
4. Read it with `ConfigService` inside an infrastructure adapter or module
   factory. Never `process.env` in `src/` (only `drizzle.config.ts` does).

## Definition of done (every change)

1. `pnpm build` and `pnpm lint` pass with no errors.
2. `pnpm test` passes if specs exist; new business logic gets a spec
   (`testing.md`).
3. Schema changed → `pnpm db:generate` ran and the generated SQL was reviewed
   (`database.md`).
4. New endpoints appear in Swagger with tag, summary and bearer auth.
5. Convention or command changed → `AGENTS.md`, the rule file and `README.md`
   updated in the same change.
6. You report what you verified and what you could not.

## Boundaries

- **Ask first:** a new dependency (call it out explicitly); changing the error
  envelope, token response shape or pagination params (clients depend on
  them); a new cross-cutting subsystem in `src/shared/`; changing `shared/`
  behavior used by other modules.
- **Never:** state-changing git commands (`AGENTS.md` → "Git: hands off");
  hand-edit `drizzle/` or `pnpm-lock.yaml`; commit `.env` or secrets; add a new
  global guard, filter, pipe or throttler (they are centralized); use `any` to
  silence the compiler; put business logic in controllers or repositories;
  implement out-of-scope extras.
