# Análisis del proyecto — bugs y mejoras

Auditoría del boilerplate `nest-hexagonal-boilerplate` (NestJS 10 + Drizzle + PostgreSQL + JWT).
Fecha: 2026-08-06. Todos los hallazgos fueron verificados contra el código real.

> Nota de método: `node_modules` no estaba instalado al momento del análisis, por lo que no se
> pudo ejecutar `pnpm build`/`lint`/`test` en vivo. Los hallazgos sobre fallos de comandos se
> basan en el comportamiento documentado de las herramientas cruzado con las versiones del lockfile.

---

## Severidad ALTA

### 1. `pnpm lint` está roto: regla ESLint inexistente (bloquea todos los commits)
- **Archivo:** `.eslintrc.js:20`
- `'@typescript-eslint/interface-name-prefix': 'off'` es una regla **eliminada en @typescript-eslint v5**; el lockfile instala la v7.18.0. ESLint aborta con `Definition for rule ... was not found`.
- Como `.husky/pre-commit` corre `lint-staged` → `eslint --fix`, **todo commit queda bloqueado**.
- **Fix:** eliminar las líneas 20–22 (`interface-name-prefix` ya no existe; las otras dos están deprecated en v8). Verificar con `pnpm lint` tras el cambio.

### 2. `pnpm format` falla: glob `test/**/*.ts` no matchea nada
- **Archivo:** `package.json:14`
- No existe el directorio `test/`; Prettier 3 termina con exit code 2 (`No files matching the pattern`).
- **Fix:** quitar `"test/**/*.ts"` del script (o crear `test/`).

### 3. Jest no resuelve los path aliases — los tests documentados no pueden funcionar
- **Archivo:** `package.json` (config Jest inline, ~líneas 97–113)
- No hay `moduleNameMapper` para `@/*`, `@shared/*`, `@modules/*` (definidos en `tsconfig.json:23-27`). Cualquier `*.spec.ts` que importe código con aliases fallará con `Cannot find module`.
- **Fix:**
  ```json
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/$1",
    "^@shared/(.*)$": "<rootDir>/shared/$1",
    "^@modules/(.*)$": "<rootDir>/modules/$1"
  }
  ```

### 4. Refresh tokens sin persistencia, rotación ni revocación
- **Archivos:** `src/modules/auth/application/use-cases/refresh-token.use-case.ts:13-16`, `src/modules/auth/infrastructure/services/jwt-token.service.ts:33-50`
- El refresh solo verifica firma + expiración del JWT y firma un par nuevo. No hay tabla de refresh tokens, ni `jti`, ni revocación del token anterior, ni endpoint de logout. Un refresh token robado es usable toda su vida (7 días) y reutilizable indefinidamente. Además, un usuario **borrado o con contraseña cambiada** puede seguir renovando tokens (el use case no comprueba que `sub` siga existiendo).
- **Fix:** persistir refresh tokens (hash, `jti`, `userId`, `expiresAt`, `revokedAt`), rotar en cada uso, detectar reuso (revocar toda la familia), añadir `POST /auth/logout`, e inyectar `USER_REPOSITORY` en `RefreshTokenUseCase` para validar que el usuario exista.

### 5. Sin autorización: cualquier usuario autenticado puede editar/borrar a cualquier otro (IDOR/BOLA)
- **Archivo:** `src/modules/users/infrastructure/http/user.controller.ts:58-73`
- `PATCH /users/:id` y `DELETE /users/:id` solo requieren JWT válido; no comparan `:id` con `@CurrentUser().id` ni hay roles. `GET /users` también lista todos los usuarios a cualquier autenticado.
- **Fix:** verificar ownership en los use cases de update/delete (`if (user.id !== currentUser.id) throw ...Forbidden`) o introducir roles.

### 6. Endpoint de signed-url nunca matchea las keys reales
- **Archivos:** `src/modules/files/infrastructure/http/file.controller.ts:43` + `src/modules/files/application/use-cases/upload-file.use-case.ts:21`
- Las keys se generan como `2026/<uuid>.jpg` (contienen `/`), pero `@Get(':key/signed-url')` solo captura un segmento. `GET /files/2026/abc.jpg/signed-url` → 404 siempre. El endpoint es inutilizable.
- **Fix:** pasar la key como query param (`GET /files/signed-url?key=...`) o usar wildcard en la ruta.

### 7. Las URLs del driver `local` de storage apuntan a rutas inexistentes
- **Archivo:** `src/shared/storage/adapters/local-storage.adapter.ts:19,31,52`
- Genera URLs `${STORAGE_LOCAL_PUBLIC_URL}/${key}`, pero no hay static serving (`main.ts` no llama `useStaticAssets`, no hay `ServeStaticModule`) ni endpoint de descarga. Toda URL devuelta con driver local da 404.
- **Fix:** servir `./uploads` con `app.useStaticAssets(root, { prefix })` o añadir un endpoint `GET /files/:key` que streamee con `storage.get(key)`.

---

## Severidad MEDIA

### 8. Race condition en registro + unique violation → 500 con leak del mensaje interno
- **Archivos:** `src/modules/users/application/use-cases/create-user.use-case.ts:25-39`, `src/modules/users/infrastructure/persistence/drizzle-user.repository.ts:29-32`
- El patrón check-then-insert (`findByEmail` → `insert`) es TOCTOU: dos requests concurrentes con el mismo email pasan el check y el segundo insert lanza el error `23505` de Postgres, que el filtro serializa como 500 (no 409) **y con el mensaje crudo al cliente** (nombre de la constraint, valores).
- **Fix:** capturar `code === '23505'` en el repositorio y traducirlo a `UserAlreadyExistsException` (409). Dejar el check previo solo como fast-path.

### 9. El filtro global expone `err.message` de errores desconocidos al cliente
- **Archivo:** `src/shared/filters/domain-exception.filter.ts:72-79`
- Para cualquier error no tipado (Drizzle, AWS SDK, fs, bugs) la respuesta incluye el mensaje interno: `message: err?.message ?? 'Internal server error'`. Filtra nombres de columnas, constraints, rutas.
- **Fix:** en errores ≥500 responder siempre `'Internal server error'` y loguear el real solo en servidor.

### 10. `DrizzleUserRepository.update()` pierde campos: nunca persiste `passwordHash` ni `email`
- **Archivo:** `src/modules/users/infrastructure/persistence/drizzle-user.repository.ts:34-41`
- El `.set()` solo incluye `name` y `updatedAt`. La entidad tiene `changePassword()` pero cualquier use case que lo use perderá silenciosamente el nuevo hash. Además, si la fila desaparece entre `findById` y `update`, `UserMapper.toDomain(undefined)` revienta con 500 genérico.
- **Fix:** persistir todos los campos mutables vía `UserMapper.toPersistence(user)` y lanzar `UserNotFoundException` si `returning()` viene vacío.

### 11. La capa de aplicación importa una plantilla React Email (violación hexagonal)
- **Archivos:** `src/modules/users/application/use-cases/create-user.use-case.ts:3,6,46`, `src/shared/mail/ports/mail.service.ts:6`
- `CreateUserUseCase` importa `@shared/mail/templates/welcome.email` y hace `React.createElement(...)`. Viola la regla 2 (application solo importa de domain y puertos de shared) y arrastra React al runtime de application. La raíz es el puerto: `SendMailInput.template: ReactElement` acopla el puerto a React Email.
- **Fix:** que el puerto acepte datos neutros (`{ templateId: 'welcome', props: {...} }` o HTML ya renderizado) y que la construcción de la plantilla viva en los adaptadores de mail.

### 12. La entidad `User` lanza `Error` plano en sus invariantes
- **Archivo:** `src/modules/users/domain/entities/user.entity.ts:29,32,35`
- Contradice la convención del repo ("never throw plain Error from domain"). Como `UserMapper.toDomain()` llama a `User.create()`, un dato corrupto en DB produce 500 con mensaje interno.
- **Fix:** crear `InvalidUserDataException extends DomainException` (422) y usarla en los tres checks. Lo mismo aplica al scaffold (ver #20) y a `@CurrentUser()` (`current-user.decorator.ts:13`).

### 13. CORS completamente abierto
- **Archivo:** `src/main.ts:22`
- `app.enableCors()` sin opciones refleja cualquier origen. Sin variable de entorno ni documentación.
- **Fix:** `app.enableCors({ origin: config.get('CORS_ORIGIN')?.split(','), credentials: true })`, registrando la var en `env.validation.ts` + `.env.example`.

### 14. Sin rate limiting en auth ni registro
- Login vulnerable a fuerza bruta/credential stuffing; el registro público permite crear cuentas ilimitadas y envío masivo de emails (abuso de cuota SMTP).
- **Fix:** añadir `@nestjs/throttler` (nueva dependencia — señalarla) con límite global y uno estricto (p.ej. 5/min) en `auth.controller.ts` y `POST /users`.

### 15. Path traversal en `LocalStorageAdapter`
- **Archivo:** `src/shared/storage/adapters/local-storage.adapter.ts:23-25`
- `pathFor()` hace `join(this.root, key)` sin sanitizar; una key `../../etc/passwd` escapa del root. Hoy ningún endpoint pasa keys de usuario a `get`/`delete`, pero el de signed-url ya acepta keys arbitrarias.
- **Fix:** rechazar `..`, paths absolutos y separadores iniciales; verificar `resolve(root, key).startsWith(root + sep)`.

### 16. Upload sin límites: multer en memoria, sin `limits` ni `fileFilter`
- **Archivo:** `src/modules/files/infrastructure/http/file.controller.ts:33`
- `FileInterceptor('file')` con memory storage por defecto y sin `limits.fileSize`: un POST grande agota la RAM (DoS trivial). Tampoco hay allowlist de MIME types.
- **Fix:** `FileInterceptor('file', { limits: { fileSize: ... } })` + validación de `mimetype`.

### 17. Migración `0001` rompe bases de datos con usuarios existentes
- **Archivo:** `drizzle/0001_add_password_hash.sql:1`
- `ADD COLUMN "password_hash" varchar(255) NOT NULL` sin `DEFAULT`: Postgres rechaza el ALTER si hay filas.
- **Fix:** regenerar como nullable + backfill + `SET NOT NULL`, o documentar que asume tabla vacía.

### 18. `db:migrate:run` no cumple su propósito (CI/prod sin devDeps)
- **Archivos:** `scripts/migrate.ts`, `package.json:26`
- El script dice ser para "deploy/CI sin drizzle-kit", pero corre con `ts-node -r tsconfig-paths/register` y ambos son **devDependencies**; en una imagen `--prod` el comando no existe.
- **Fix:** compilar el script a `dist/` y correrlo con `node`, o documentar el requisito.

### 19. `pnpm test:e2e` apunta a un archivo inexistente
- **Archivo:** `package.json:23` → `jest --config ./test/jest-e2e.json`, pero `test/` no existe. El README lo lista como disponible.
- **Fix:** eliminar el script hasta crear el scaffold e2e (supertest ya está en devDependencies sin uso).

### 20. El scaffold `new-module.sh` genera código que viola las reglas del propio repo
- **Archivo:** `scripts/new-module.sh:77,343-415`
- La entidad generada hace `throw new Error(...)` (prohibido por AGENTS.md) y el controller no lleva `@ApiBearerAuth()` (exigido en cada endpoint).
- Además, el awk de auto-wiring (`scripts/new-module.sh:461-474`) **falla silenciosamente** si no hay imports `@modules/` previos o si el formato cambia: imprime `✅ Wired...` sin haber insertado nada.
- **Fix:** generar `XValidationException extends DomainException`, añadir `@ApiBearerAuth()`, y comprobar con `cmp -s` que el awk realmente modificó el archivo (abortar si no).

---

## Severidad BAJA

### 21. User enumeration por timing en login
- `src/modules/auth/application/use-cases/login.use-case.ts:22-29` — si el email no existe se lanza la excepción sin `bcrypt.compare` (~100 ms de diferencia medible).
- **Fix:** comparar contra un hash dummy precalculado cuando `user` es null.

### 22. Secretos JWT sin requisito de fortaleza; duraciones sin validar formato
- `src/shared/config/env.validation.ts:124-134` — `@IsString()` acepta `"x"`; un `JWT_*_EXPIRES_IN` mal formado falla en runtime, no en boot.
- **Fix:** `@MinLength(32)` en los secretos y `@Matches(/^\d+[smhd]?$/)` en las duraciones.

### 23. El guard no revalida que el usuario siga existiendo
- `src/modules/auth/infrastructure/http/jwt-auth.guard.ts:30-32` — un access token de un usuario eliminado sigue funcionando hasta expirar.
- **Fix:** acortar `JWT_ACCESS_EXPIRES_IN` y resolver con la persistencia de refresh tokens (#4); opcionalmente verificar existencia en el guard (coste: 1 query/request).

### 24. Swagger expuesto en producción
- `src/main.ts:24-31` — se registra incondicionalmente.
- **Fix:** envolver en `if (NODE_ENV !== 'production')` o protegerlo con auth.

### 25. Sin headers de seguridad (helmet)
- No está `helmet` en `package.json` ni en `main.ts`.
- **Fix:** `app.use(helmet())` (nueva dependencia — señalarla).

### 26. `findAll()` de usuarios sin paginación ni orden
- `src/modules/users/domain/ports/user.repository.ts:6` — devuelve la tabla completa, orden no determinista.
- **Fix:** `findAll({ limit, offset })` en el puerto + query params en el controlador.

### 27. `drizzle.config.ts` incluido en el build de la app
- `tsconfig.json:29` — `nest build` compila `drizzle.config.ts` (que importa `drizzle-kit`, devDep) a `dist/`.
- **Fix:** sacarlo del `include`.

### 28. `tsconfig` no es realmente "strict"
- `tsconfig.json` activa flags sueltos pero no `strict: true` (faltan `strictPropertyInitialization`, `noImplicitThis`, etc.) pese a lo que anuncian README y AGENTS.
- **Fix:** `"strict": true` y corregir lo que salte, o suavizar la documentación.

### 29. Pool de Postgres nunca se cierra
- `src/shared/database/database.module.ts:21` — sin `OnModuleDestroy`/`client.end()`, y `main.ts` no llama `enableShutdownHooks()`. En watch-mode se acumulan conexiones.
- **Fix:** cerrar el client en `onModuleDestroy` y/o `app.enableShutdownHooks()`.

### 30. `LocalStorageAdapter.getSignedUrl()` ignora `expiresInSeconds`
- `src/shared/storage/adapters/local-storage.adapter.ts:51-53` — devuelve una URL pública permanente; la "signed URL" no firma ni expira. Incumple el contrato del puerto silenciosamente.
- **Fix:** documentar la limitación o implementar token HMAC con expiración.

### 31. `expiresIn` del endpoint signed-url sin validar
- `src/modules/files/infrastructure/http/file.controller.ts:49-50` — `Number(expiresIn)` puede ser `NaN` (truthy) o absurdo → 500 desde S3.
- **Fix:** DTO con `@IsInt() @Min(1) @Max(604800)`.

### 32. `out.Body!` en el adaptador S3
- `src/shared/storage/adapters/s3-storage.adapter.ts:63` — non-null assertion; TypeError opaco si `Body` viene undefined.
- **Fix:** comprobar `if (!out.Body)` antes de `transformToByteArray()`.

### 33. `drizzle.config.ts` enmascara la falta de `DATABASE_URL`
- `drizzle.config.ts:9` — `?? ''` convierte el error real en uno críptico de conexión.
- **Fix:** lanzar error explícito si está vacía (como ya hace `scripts/migrate.ts:15`).

### 34. README desactualizado
- `README.md:399` — `docker compose logs -f pg` pero el servicio se llama `postgres` (el comando falla).
- `README.md:433` — lista `test:e2e` que no puede funcionar (#19).

### 35. Dependencias dudosas
- `dotenv` en `dependencies` pero solo lo usa tooling de desarrollo.
- `source-map-support` (devDep) no se importa en ningún sitio.
- `supertest` + `@types/supertest` sin infra e2e.

### 36. Código muerto e inconsistencias menores
- `User.changePassword()` (`user.entity.ts:44`) sin callers (y choca con #10).
- `StorageService.get/delete/exists` sin ningún caller.
- `welcome.email.tsx:30` tiene un comentario en español en un codebase en inglés.
- `FileController.upload` devuelve `StorageObject` crudo sin response DTO (Swagger sin tipar), rompiendo la convención.
- `.lint-staged` corre prettier sobre `*.json` staged sin excluir `postman/*.json` (archivo exportado que será reformateado).

---

## Orden sugerido de ataque

1. **Desbloquear el tooling** (5 min): #1, #2, #3 — sin esto no hay lint, format ni tests.
2. **Endpoints rotos** (30 min): #6, #7 — el módulo files hoy no funciona con driver local.
3. **Seguridad inmediata**: #9, #8, #13, #5 (IDOR), #14, #16.
4. **Auth de verdad**: #4 (refresh tokens persistidos + logout + revocación) — es el cambio más grande; incluye #23.
5. **Robustez de datos**: #10, #17, #26.
6. **Deuda del boilerplate**: #11, #12, #20 (que el scaffold genere código que cumple las propias reglas), y el resto de bajas.

---

## Lo que SÍ está bien hecho

- **Puertos `interface + Symbol` en el mismo archivo**, consistentes en todos los módulos; bindings `{ provide: TOKEN, useClass }` correctos; `UsersModule` exporta el token para `auth`.
- **Reglas hexagonales cumplidas** en `domain/` (salvo la excepción deliberada de `HttpStatus`); `application/` solo viola la regla en #11.
- **Entidad `User` inmutable** con `private constructor`, factory y métodos que devuelven nuevas instancias.
- **Error handling centralizado ejemplar**: `DomainException` con `code`/`httpStatus`/`details` y un único `APP_FILTER` (solo le sobra el leak de #9).
- **`env.validation.ts` sólido**: coerción explícita (evita la trampa de `Boolean("false")`), validación condicional por driver con `ValidateIf`, y coincidencia 100% con `.env.example`.
- **JWT con secretos distintos para access/refresh**, verificación con el secreto correcto, y parser de duraciones sin ambigüedad.
- **`passwordHash` nunca sale en respuestas** (`UserResponse.fromDomain` construye el objeto explícito).
- **Guard global con `@Public()`** — rutas nuevas nacen protegidas; `getAllAndOverride` correcto.
- **`ValidationPipe` global** con `whitelist` + `forbidNonWhitelisted` + `transform` — bloquea mass assignment.
- **Email de bienvenida best-effort**: un fallo de SMTP no rompe el registro.
- **Adaptadores por env con `useFactory` + `switch`**, `forcePathStyle` para MinIO, `OnModuleDestroy` en SMTP, credenciales AWS opcionales con cadena de providers.
- **Migraciones sincronizadas con el schema** (sin drift entre `drizzle/` y `user.schema.ts`).
- **docker-compose correcto**: healthcheck `pg_isready`, volumen persistente, credenciales coherentes con `.env.example`.
- **Husky v9 bien configurado**, `packageManager`/`engines`/`.nvmrc` coherentes, `bcrypt` acotado 4–15 rondas.
- **`scripts/migrate.ts` valida `DATABASE_URL` explícitamente** y usa `max: 1` para el migrator.

## Deuda estructural a considerar

- **No hay ningún test** (`*.spec.ts`). Antes de corregir los hallazgos de seguridad conviene arreglar #3 y escribir specs para los use cases de auth (son puros y mockeables sin Nest ni DB, según la propia convención del repo).
- Nuevas dependencias propuestas (marcarlas explícitamente al añadirlas, según AGENTS.md): `@nestjs/throttler` (#14) y `helmet` (#25).
