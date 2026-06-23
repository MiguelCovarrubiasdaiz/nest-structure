---
id: no-console-log
severity: warning
---
Do not leave `console.log`, `console.error`, or any `console.*` calls in production code. Suggest using the NestJS `Logger` (`new Logger(ClassName.name)`) instead.

---
id: no-hardcoded-secrets
severity: error
---
Detect secrets hardcoded in source: API keys, tokens, passwords, JWT secrets, or connection strings with embedded credentials. These values MUST come from `ConfigService` / environment variables, never as string literals in code.

---
id: handle-async-errors
severity: warning
---
Every `await` call against an operation that can fail (HTTP, DB, FS, third-party SDK) inside an `async` function must be wrapped in `try/catch` or have explicit error handling. If it is not, flag the risk.

---
id: missing-input-validation
severity: warning
---
HTTP endpoints that accept `@Body()`, `@Query()`, or `@Param()` must validate the input with a DTO using `class-validator` decorators. If you see raw `any` / primitive types without a validated DTO, flag it.

---
id: no-magic-numbers
severity: info
---
Avoid magic numbers (numeric literals without a name, except `0`, `1`, `-1`). Suggest extracting them into named constants with semantic names.

---
id: hexagonal-boundaries
severity: warning
---
This project follows hexagonal architecture. Enforce:
- Controllers (in `infrastructure/http`) MUST NOT import concrete repositories (classes prefixed with `Drizzle*`).
- Use-cases (in `application/use-cases`) MUST NOT import from `infrastructure/http`.
- Entities and ports (in `domain/`) MUST NOT import anything from `application/` or `infrastructure/`.
If you spot a violation, report the file, the line of the offending import, and suggest a refactor.
