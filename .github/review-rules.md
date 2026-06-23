---
id: no-console-log
severity: warning
---

No dejes `console.log`, `console.error` o cualquier `console.*` en código de producción. Sugiere usar el `Logger` de NestJS (`new Logger(ClassName.name)`).

---

id: no-hardcoded-secrets
severity: error

---

Detecta secretos hardcodeados en el código: API keys, tokens, contraseñas, JWT secrets, connection strings con credenciales. Estos valores deben venir de `ConfigService` / variables de entorno, nunca como string literal en el código.

---

id: handle-async-errors
severity: warning

---

Toda llamada `await` a una operación que puede fallar (HTTP, DB, FS, terceros) dentro de un `async` debe estar envuelta en `try/catch` o tener manejo explícito de error. Si no, marca el riesgo.

---

id: missing-input-validation
severity: warning

---

Endpoints HTTP que reciben `@Body()`, `@Query()` o `@Param()` deben validar con DTOs (`class-validator`). Si ves uso de `any` o un tipo sin validadores, repórtalo.

---

id: no-magic-numbers
severity: info

---

Evita números mágicos (literales numéricos sin nombre, salvo 0/1/-1). Sugiere extraerlos a constantes con nombres semánticos.

---

id: hexagonal-boundaries
severity: warning

---

Este proyecto usa arquitectura hexagonal. Reglas:

- Los `controllers` (en `infrastructure/http`) NO deben importar repositorios concretos (clases con prefijo `Drizzle*`).
- Los `use-cases` (en `application/use-cases`) NO deben importar de `infrastructure/http`.
- Las `entities` y `ports` (en `domain/`) NO deben importar nada de `application/` o `infrastructure/`.
  Si ves una violación, reporta el archivo, la línea del import problemático y sugiere refactor.
