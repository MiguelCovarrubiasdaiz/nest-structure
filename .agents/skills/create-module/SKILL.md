---
name: create-module
description: >-
  Scaffold or extend a hexagonal feature module in nest-hexagonal-boilerplate
  (NestJS + Drizzle): entity, repository port, domain exceptions, one use-case
  per action, controller, DTOs, Drizzle schema + mapper + repository, module
  wiring and migration. Use it WHENEVER the user asks to add a resource,
  entity, CRUD, table or "module" to the API — even phrased loosely ("add
  orders", "I need an endpoint to list products", "crea el módulo de
  categorías"). The `users` module is the reference implementation.
---

# Create a backend module

Every module has the same shape so anyone (or any agent) can navigate it
blindly. **Do not improvise structure — copy `src/modules/users/`.**

## 0. Before writing code

1. Read `.agents/rules/architecture.md`, `api.md`, `database.md`, `errors.md`
   and `auth.md`.
2. Fix the names: singular (`order`), plural (`orders`), class (`Order`),
   token (`ORDER_REPOSITORY`), table (`orders`), route (`orders`).
3. List the real fields with types and limits, the actions needed, and which
   routes are public or owner-only. Ask if any of it is unclear.

## 1. Scaffold

```bash
pnpm new:module order orders     # singular [plural], default plural = <singular>s
pnpm new:module order-item       # multi-word: lowercase kebab-case only
```

It creates the full CRUD (entity, port with `PaginationOptions`, exceptions,
5 use-cases, DTOs incl. `List<X>QueryDto`, controller, schema, mapper, Drizzle
repository, module), appends the schema to `src/shared/database/schema.ts`,
imports the module in `src/app.module.ts` (via `awk`) and formats everything
with Prettier. Names map as: `order-item` → folder/route `order-items`, class
`OrderItem`, token `ORDER_ITEM_REPOSITORY`, TS table const `orderItems`, SQL
table `order_items`. Invalid names (uppercase, spaces, `_`) are rejected.

## 2. Review what the script touched

- `src/app.module.ts` — exactly one new import and one entry in `imports`.
- `src/shared/database/schema.ts` — one new `export *` line.

## 3. Adapt the generated code to the real model

The scaffold only has a `name` field. Replace it with the real model:

| Layer          | Do                                                                                         | Reference file                         |
| -------------- | ------------------------------------------------------------------------------------------ | -------------------------------------- |
| Entity         | Real fields, invariants in `create()`, immutable business methods                          | `users/domain/entities/user.entity.ts` |
| Port           | Add the finders the feature needs (`findByEmail`…)                                         | `users/domain/ports/user.repository.ts`|
| Exceptions     | Add `AlreadyExists` (409) / `ActionForbidden` (403) when they apply                        | `users/domain/exceptions/user.exceptions.ts` |
| DTOs           | Validators mirroring DB limits, `@ApiProperty` with examples, `List<X>QueryDto`            | `users/application/dtos/`              |
| Use-cases      | Business rules, ownership via `currentUserId`, generate `randomUUID()` + timestamps        | `users/application/use-cases/`         |
| Schema         | Real columns, lengths, uniques, FKs with explicit `onDelete`                               | `users/infrastructure/persistence/user.schema.ts` |
| Mapper         | Every field both ways, `toDomain` through `X.create`                                       | `user.mapper.ts`                       |
| Repository     | `23505` → `AlreadyExists` when the schema has unique columns                               | `drizzle-user.repository.ts`           |
| Controller     | `@CurrentUser()` + ownership where needed, `@Public()` only if asked                       | `users/infrastructure/http/user.controller.ts` |
| Module         | `exports` the port only if another module needs it                                         | `users/users.module.ts`                |

Remove anything the feature does not need (e.g. a delete endpoint nobody asked for).

## 4. Database

```bash
pnpm db:push        # local prototyping
pnpm db:generate    # when the change will ship — review the SQL in drizzle/
```

Never hand-edit `drizzle/`.

## 5. Tests

Specs for the entity and every use-case with real logic — follow the
`write-tests` skill.

## 6. Done

```bash
pnpm build && pnpm lint && pnpm test
```

Then `pnpm start:dev` and check `/api/docs`: the new tag, summaries and
bearer auth on protected routes. Report what you verified and suggest a commit
message (`feat(<plural>): add <plural> module`) — do not commit.
