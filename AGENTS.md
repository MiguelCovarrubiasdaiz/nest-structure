# AGENTS.md — nest-hexagonal-boilerplate

Entry point for every coding agent (Claude Code, Codex, Cursor, Copilot,
Gemini CLI, OpenCode, Windsurf…) and every developer. Everything for AI lives
in **`.agents/`**, the tool-neutral folder:

```
.agents/rules/    the rules, one file per topic (single source of truth)
.agents/skills/   step-by-step playbooks (SKILL.md)
```

There are no per-tool instruction files (`CLAUDE.md`, `.cursorrules`,
`copilot-instructions.md`…) on purpose: this file and `.agents/` are the only
source. Never create tool-specific copies of the rules.

User-facing docs: [README.md](./README.md) (Spanish).

## Before writing any code (mandatory)

1. Read `.agents/rules/project.md` and `.agents/rules/architecture.md` — always.
2. Find your task in the **Task router** below and read **every** rule file it
   lists, and the skill's `SKILL.md` when it names one, **before** creating or
   editing any file.
3. If you touch an area not covered by the router, read the rule whose topic
   matches (see the index at the bottom).
4. In your first reply, list the rule files you read.

## Git: hands off

AI agents **never** run state-changing git commands: no `git add`, `commit`,
`push`, `merge`, `rebase`, `reset`, `stash`, `checkout`/`switch` of branches,
no tags, and no PRs or issues through `gh`. Read-only commands (`git status`,
`git diff`, `git log`) are fine. Committing is always done by the developer —
leave the changes in the working tree and suggest a Conventional Commit message
(`feat(<module>): <summary>`) in your final report.

## Task router

| The developer asks…                          | The agent does                                                     | Rules / playbook                                                      |
| -------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------- |
| "Crea el módulo / CRUD / API de X"           | Scaffolds with `pnpm new:module`, then adapts it to the real model | `architecture.md`, `api.md`, `database.md` + skill `create-module`    |
| "Agrega un endpoint a X"                     | New use-case + DTOs + handler in the module's existing controller  | `architecture.md`, `api.md`, `auth.md`                                |
| "Agrega/cambia una columna o tabla"          | Schema + entity + mapper + DTOs, then generates the migration      | `database.md`, `architecture.md`                                      |
| "Toca login, tokens, guard o usuarios"       | Works inside access JWT + rotated/persisted refresh tokens         | `auth.md`                                                             |
| "Protege / abre / limita un endpoint"        | `@Public()`, `@CurrentUser()`, ownership check, `@Throttle`        | `auth.md`, `api.md`                                                   |
| "Sube archivos / manda un correo"            | Injects `STORAGE_SERVICE` / `MAIL_SERVICE`, never SDKs directly    | `storage.md`, `email.md`                                              |
| "Cambia de proveedor (S3, SES, argon2, DB…)" | Writes a new adapter for the existing port + one `case` in the factory | `architecture.md` + the subsystem rule (`storage.md`, `email.md`, …) |
| "Agrega una variable de entorno"             | Adds it to `env.validation.ts` **and** `.env.example`              | `project.md`                                                          |
| "Escribe tests para X"                       | Pure unit tests next to the file, ports mocked as plain objects    | `testing.md` + skill `write-tests`                                    |
| "Arregla este bug"                           | Reproduces it, fixes it in the right layer, verifies the fix       | `architecture.md`, `errors.md`                                        |

Every task ends with the **definition of done** in `project.md`.

## Rules index (`.agents/rules/`)

| File              | Covers                                                                |
| ----------------- | --------------------------------------------------------------------- |
| `project.md`      | What this is, stack, commands, env vars, definition of done, limits   |
| `architecture.md` | Hexagonal layers, module anatomy, naming, DI, cross-module access     |
| `api.md`          | Routes, controllers, DTOs, Swagger, pagination, uploads               |
| `errors.md`       | `DomainException`, error codes, the global filter and error envelope  |
| `database.md`     | Drizzle schemas, mappers, repositories, migrations                    |
| `auth.md`         | JWT access/refresh, rotation + reuse detection, guard, rate limiting  |
| `storage.md`      | `StorageService` port, local/S3 adapters                              |
| `email.md`        | `MailService` port, React Email templates, log/SMTP adapters          |
| `testing.md`      | Jest setup, where specs go, how to mock ports                         |

The reference module is `src/modules/users/`. When in doubt, open the
equivalent file there and copy its shape.

If you change a convention, change the rule file (and the README if it is
user-facing) — never add rules elsewhere.
