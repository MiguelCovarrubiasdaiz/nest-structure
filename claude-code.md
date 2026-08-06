# Análisis del proyecto — nest-hexagonal-boilerplate

> Revisión de código realizada el 2026-08-06 sobre la rama `main`.
> Objetivo: detectar bugs y mejoras para un boilerplate destinado a **inicializar proyectos de backend**.

El proyecto está **muy bien estructurado**: arquitectura hexagonal limpia y consistente, puertos con `Symbol`, adaptadores intercambiables por `ConfigService`, validación de entorno en el arranque, filtro de errores centralizado, `AGENTS.md` excelente. Lo que sigue son puntos concretos a corregir/mejorar, priorizados. Como es un boilerplate que se clonará muchas veces, cada defecto se multiplica en cada proyecto derivado.

---

## 🔴 Bugs y problemas de correctitud

### 1. Los hooks de apagado (`onModuleDestroy`) nunca se ejecutan → conexiones no se cierran
`src/main.ts` no llama a `app.enableShutdownHooks()`. En NestJS, `onModuleDestroy`/`onApplicationShutdown` **solo se disparan si los shutdown hooks están habilitados**. Consecuencias:

- `SmtpMailAdapter.onModuleDestroy()` (`src/shared/mail/adapters/smtp-mail.adapter.ts:47`) nunca cierra el transporter al recibir `SIGTERM`/`SIGINT` (típico en Docker/K8s).
- La conexión de PostgreSQL de `DatabaseModule` (`src/shared/database/database.module.ts:21`) **nunca se cierra**: el cliente `postgres(url, { max: 10 })` no tiene `onModuleDestroy` que llame a `client.end()`. Fuga de conexiones y apagado no-graceful.

**Fix:**
```ts
// main.ts
app.enableShutdownHooks();
```
Y convertir el provider de la DB en algo con ciclo de vida (o proveer el `client` aparte) para poder cerrarlo:
```ts
// database.module.ts — proveer también el cliente y cerrarlo
providers: [
  { provide: 'PG_CLIENT', inject: [ConfigService], useFactory: ... },
  { provide: DATABASE_CONNECTION, inject: ['PG_CLIENT'], useFactory: (c) => drizzle(c, { schema }) },
],
// y un provider con OnModuleDestroy que haga await client.end()
```

### 2. Enumeración de usuarios por *timing* en el login
`src/modules/auth/application/use-cases/login.use-case.ts:22-29`: si el usuario no existe se lanza `InvalidCredentialsException` **sin** ejecutar `bcrypt.compare`. Cuando sí existe, se paga el coste de bcrypt. La diferencia de tiempo de respuesta permite enumerar qué emails están registrados. Recomendado: comparar siempre contra un hash *dummy* precomputado cuando el usuario no exista.

### 3. Migración `NOT NULL` sin default puede romper el arranque
`drizzle/0001_add_password_hash.sql`: `ADD COLUMN "password_hash" varchar(255) NOT NULL` sin `DEFAULT`. Si la tabla `users` ya tiene filas (cualquiera que actualice un proyecto derivado), la migración **falla**. En un boilerplate limpio no se nota, pero conviene documentarlo o backfillear.

### 4. `expiresIn` de la signed URL no se valida
`src/modules/files/infrastructure/http/file.controller.ts:49`: `Number(expiresIn)` produce `NaN` si el query param es basura, y no hay tope máximo. `NaN` se propaga a `getSignedUrl` del adaptador S3. Validar con un pipe entero + acotar (p.ej. `1..604800`).

---

## 🟠 Seguridad

### 5. Sin autorización (RBAC / ownership) — IDOR en usuarios
`src/modules/users/infrastructure/http/user.controller.ts`: **cualquier usuario autenticado** puede:
- `GET /users` → listar **todos** los usuarios,
- `GET /users/:id`, `PATCH /users/:id`, `DELETE /users/:id` → leer, modificar y **borrar a cualquier otro usuario**.

No hay roles ni comprobación de propiedad. Para un boilerplate conviene, como mínimo, dejar el patrón montado: un `@Roles()` decorator + guard, o comprobar `current.id === id`. Hoy es un agujero de autorización total.

### 6. IDOR en archivos: signed URL para cualquier `key`
`file.controller.ts:43` (`GET /files/:key/signed-url`): cualquier usuario autenticado obtiene una URL firmada para **cualquier** objeto del bucket. Los archivos no se registran en BD ni tienen dueño. Falta un modelo de propiedad de archivos.

### 7. Upload sin límite de tamaño ni de tipo (DoS)
`file.controller.ts:33` usa `FileInterceptor('file')` sin `limits` ni filtro de MIME. Se aceptan archivos de tamaño arbitrario **en memoria** (`file.buffer`), y de cualquier tipo. Añadir:
```ts
@UseInterceptors(FileInterceptor('file', {
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => { /* whitelist de mimetypes */ },
}))
```

### 8. El filtro global filtra mensajes de error internos al cliente
`src/shared/filters/domain-exception.filter.ts:73-79`: para errores desconocidos (500) devuelve `err.message` al cliente. Un error de Postgres/driver puede exponer detalles de esquema o infraestructura. En producción devolver un mensaje genérico ("Internal server error") y dejar el detalle solo en el log.

### 9. Secretos JWT sin validación de fortaleza + ejemplos débiles
`src/shared/config/env.validation.ts:124-131`: `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` solo tienen `@IsString()`, así que un `""` o `"x"` pasa la validación. `.env.example` usa `change-me-access` / `change-me-refresh`. Añadir `@MinLength(32)` y, opcionalmente, validar que access ≠ refresh.

### 10. Falta hardening HTTP típico de producción
- **CORS abierto**: `app.enableCors()` en `main.ts:22` permite **cualquier** origen. Configurar `origin` desde env.
- **Sin Helmet** (cabeceras de seguridad).
- **Sin rate limiting** (`@nestjs/throttler`) → el login (`POST /auth/login`) es vulnerable a fuerza bruta.
- **Swagger expuesto siempre**, incluso en producción (`main.ts:30-31`). Condicionar a `NODE_ENV !== 'production'` o protegerlo.

### 11. `POST /users` es `@Public()`
`user.controller.ts:37`: registro abierto sin rate limit ni captcha. Puede ser intencional en un boilerplate, pero conviene que quede explícito y con throttling.

### 12. Path traversal latente en `LocalStorageAdapter`
`src/shared/storage/adapters/local-storage.adapter.ts:23` (`join(this.root, key)`) no sanea `key`. Hoy no es explotable vía HTTP (los `key` de subida se generan en el servidor y `get`/`delete` no están expuestos), pero es un adaptador reutilizable inseguro. Validar que `resolve(root, key)` siga dentro de `root`.

---

## 🟡 Mejoras / preparación para producción

### 13. Refresh token sin rotación, revocación ni logout
`src/modules/auth/application/use-cases/refresh-token.use-case.ts`: `verifyRefresh` → `signPair` directo. Problemas:
- No comprueba que el **usuario siga existiendo** (un usuario borrado sigue renovando tokens hasta que expire el refresh).
- No hay **rotación** ni **lista de revocación**, así que no existe forma de hacer *logout* ni de invalidar un refresh robado.
- El `email` del payload puede quedar obsoleto si el usuario lo cambia.

Para un boilerplate, al menos revalidar el usuario contra el `USER_REPOSITORY` en el refresh.

### 14. `GET /users` sin paginación
`src/modules/users/application/use-cases/list-users.use-case.ts` + `drizzle-user.repository.ts:14` hacen `SELECT *` sin `LIMIT`. No escala. Añadir paginación (`limit`/`offset` o cursor) al puerto `findAll`.

### 15. Falta endpoint de health check
`docker-compose.yml` tiene healthcheck para Postgres, pero la app no expone `/health`. Recomendado `@nestjs/terminus` con readiness/liveness (útil para Docker/K8s).

### 16. Falta `Dockerfile` de la aplicación
`docker-compose.yml` solo levanta Postgres. Para un boilerplate de backend, incluir un `Dockerfile` multi-stage y el servicio `app` en compose ahorraría mucho a cada proyecto derivado.

### 17. Sin tests de ejemplo
Jest está configurado (`package.json:97`) pero no hay ni un `*.spec.ts` (confirmado en `AGENTS.md`). En un boilerplate, un test de ejemplo de un use-case (mockeando el puerto) marca el patrón a seguir y evita que los proyectos derivados nazcan sin tests.

### 18. Valores hardcodeados que deberían ser config
- `create-user.use-case.ts:48`: `ctaUrl: 'https://example.com/app'` fijo en el email de bienvenida → mover a env (`APP_URL`).
- No hay forma de cambiar email/contraseña vía API: `UpdateUserDto` solo permite `name`, pero la entidad `User` tiene `changePassword`/`rename`. Falta el endpoint/caso de uso.

---

## 🟢 Calidad de código y consistencia

### 19. El auto-wiring de `new:module` con `awk` es frágil
`scripts/new-module.sh:461-482` edita `src/app.module.ts` con `awk` buscando líneas que terminan en `Module,$` con indentación de 4 espacios. Depende del formato exacto del archivo; si alguien reordena o cambia el estilo del array `imports`, la inserción se coloca mal. El propio script y `AGENTS.md` ya avisan de "revisar manualmente", pero un enfoque basado en marcadores/comentarios ancla (`// <-- new modules here`) sería más robusto.

### 20. `CurrentUser` lanza `Error` plano
`src/modules/auth/infrastructure/http/current-user.decorator.ts:14`: si se usa en una ruta sin autenticar, lanza `Error` plano → el filtro lo convierte en **500** en lugar de un 401. Es un guardarraíl defensivo, pero contradice la regla de "nunca lanzar `Error` plano" del propio `AGENTS.md`. Usar una `DomainException`/`UnauthorizedException`.

### 21. `parseDurationSeconds` solo soporta una unidad
`src/modules/auth/infrastructure/services/jwt-token.service.ts:78`: acepta `15m`, `7d`, `3600`, pero no `1h30m` ni semanas (`w`), y un valor mal escrito (`15min`) **tumba el arranque**. Suficiente para el boilerplate, pero conviene documentarlo (o usar la librería `ms`).

### 22. Detalles menores
- `main.ts:11` lee `PORT` como `number` con default `3000`; correcto porque `validateEnv` lo castea, pero depende de ese casteo — está bien, solo dejar constancia.
- `env.validation.ts:47` `@Min(0)` en `PORT` permite el puerto `0`; usar `@Min(1)`.
- El payload del access token lleva `email`; si el email cambia, queda obsoleto hasta expirar (aceptable con TTL de 15m).
- `codeFromStatus` (`domain-exception.filter.ts:83`) usa el reverse-mapping del enum `HttpStatus`; funciona, pero es implícito.

---

## Resumen priorizado

| # | Severidad | Área | Problema | Archivo |
|---|-----------|------|----------|---------|
| 1 | 🔴 Alta | Correctitud | Shutdown hooks off → DB/SMTP no cierran | `main.ts`, `database.module.ts` |
| 5 | 🔴 Alta | Seguridad | Sin RBAC/ownership → IDOR total en usuarios | `user.controller.ts` |
| 6 | 🟠 Alta | Seguridad | IDOR: signed URL de cualquier archivo | `file.controller.ts` |
| 7 | 🟠 Alta | Seguridad | Upload sin límite de tamaño/tipo | `file.controller.ts` |
| 8 | 🟠 Media | Seguridad | 500 filtra `err.message` al cliente | `domain-exception.filter.ts` |
| 10 | 🟠 Media | Seguridad | Sin Helmet / throttler / CORS abierto / Swagger en prod | `main.ts` |
| 9 | 🟠 Media | Seguridad | Secretos JWT sin `@MinLength` | `env.validation.ts` |
| 2 | 🟠 Media | Seguridad | Enumeración de usuarios por timing en login | `login.use-case.ts` |
| 13 | 🟡 Media | Diseño | Refresh sin rotación/revocación/validación de usuario | `refresh-token.use-case.ts` |
| 4 | 🟡 Media | Correctitud | `expiresIn` sin validar (`NaN`) | `file.controller.ts` |
| 14 | 🟡 Baja | Escalabilidad | `GET /users` sin paginación | `list-users.use-case.ts` |
| 15-17 | 🟡 Baja | DX/Prod | Falta health check, Dockerfile y tests de ejemplo | varios |
| 3,12,19-22 | 🟢 Baja | Calidad | Migración NOT NULL, path traversal latente, awk frágil, `Error` plano, etc. | varios |

### Quick wins recomendados (orden sugerido)
1. `app.enableShutdownHooks()` + cierre de la conexión de Postgres (#1).
2. Añadir `helmet`, `@nestjs/throttler` (login/registro) y CORS configurable por env (#10).
3. Sanear mensaje de error 500 en el filtro (#8) y `@MinLength(32)` en secretos JWT (#9).
4. `limits` + `fileFilter` en el upload (#7) y validar `expiresIn` (#4).
5. Montar el esqueleto de autorización (roles/ownership) aunque sea mínimo (#5, #6).
6. Añadir un `*.spec.ts` de ejemplo y un `Dockerfile` (#16, #17).