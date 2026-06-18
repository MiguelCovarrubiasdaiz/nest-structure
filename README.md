# Nest Hexagonal Boilerplate

Boilerplate de NestJS + TypeScript + Drizzle ORM (PostgreSQL) + Storage configurable (local o S3) + Mail con [react.email](https://react.email/) con arquitectura hexagonal simple y copiable. Usa **pnpm**.

## Stack

- **NestJS 10** + TypeScript estricto
- **Drizzle ORM** (`postgres-js`) — schemas en TS puro, sin codegen
- **Storage**: driver `local` o `s3` seleccionable por env (compatible con MinIO/R2)
- **Mail**: templates con **React Email** + transport `smtp` (nodemailer) o `log` (dev)
- **class-validator** + **class-transformer** para DTOs y validación de env
- **@nestjs/config** con validación tipada
- **Swagger** en `/api/docs`

## Estructura

```
src/
├── main.ts                       # bootstrap (Validation, Swagger, CORS)
├── app.module.ts                 # raíz: Config + Database + Storage + Mail + módulos
│
├── shared/                       # transversal a todos los módulos
│   ├── config/env.validation.ts
│   ├── database/
│   │   ├── database.module.ts    # provee la conexión Drizzle (global)
│   │   ├── database.tokens.ts
│   │   └── schema.ts             # re-exporta los schemas de cada módulo
│   ├── storage/                  # port + adapters (local | s3)
│   │   ├── storage.module.ts
│   │   ├── storage.tokens.ts
│   │   ├── ports/storage.service.ts
│   │   └── adapters/{local,s3}-storage.adapter.ts
│   ├── mail/                     # port + adapters + templates JSX
│   │   ├── mail.module.ts
│   │   ├── mail.tokens.ts
│   │   ├── ports/mail.service.ts
│   │   ├── adapters/{smtp,log}-mail.adapter.ts
│   │   └── templates/
│   │       ├── _components/base-layout.tsx
│   │       └── welcome.email.tsx
│   └── filters/domain-exception.filter.ts
│
└── modules/
    ├── users/                    # ejemplo CRUD con DB + envío de welcome email
    │   ├── domain/               # reglas puras
    │   │   ├── entities/user.entity.ts
    │   │   ├── exceptions/user.exceptions.ts
    │   │   └── ports/user.repository.ts
    │   ├── application/          # orquesta el dominio
    │   │   ├── dtos/
    │   │   └── use-cases/
    │   ├── infrastructure/       # adapters concretos
    │   │   ├── http/user.controller.ts
    │   │   └── persistence/
    │   │       ├── user.schema.ts
    │   │       ├── user.mapper.ts
    │   │       └── drizzle-user.repository.ts
    │   └── users.module.ts
    │
    └── files/                    # ejemplo consumiendo storage
        ├── application/use-cases/
        ├── infrastructure/http/file.controller.ts
        └── files.module.ts
```

### Las 3 reglas hexagonales

1. **Domain** no importa de `application/` ni `infrastructure/`, ni de `@nestjs/*`. Es TypeScript puro.
2. **Application** sólo importa de `domain/` y de ports de `shared/`. Define casos de uso que dependen de **ports** (interfaces).
3. **Infrastructure** implementa los ports y expone los casos de uso (controllers, repos, gateways).

El módulo Nest hace el binding. Cambiar DB, storage o mail = escribir otro adapter; los use-cases y el dominio no se tocan.

## Storage (local ↔ s3 por env)

```ts
constructor(@Inject(STORAGE_SERVICE) private readonly storage: StorageService) {}
await this.storage.put({ key, body, contentType });
await this.storage.getSignedUrl(key, 3600);
```

```bash
# local
STORAGE_DRIVER=local
STORAGE_LOCAL_PATH=./uploads
STORAGE_LOCAL_PUBLIC_URL=/files

# s3 / MinIO / R2
STORAGE_DRIVER=s3
STORAGE_S3_BUCKET=my-bucket
STORAGE_S3_REGION=us-east-1
STORAGE_S3_ACCESS_KEY=...
STORAGE_S3_SECRET_KEY=...
STORAGE_S3_ENDPOINT=     # opcional para MinIO/R2
STORAGE_S3_PUBLIC_URL=   # opcional para servir desde CDN
```

## Mail con React Email

Los templates son componentes React (`.tsx`) tipados. El port (`MailService`) recibe el JSX y el adapter lo renderiza a HTML + texto plano.

```tsx
// src/shared/mail/templates/welcome.email.tsx
export function WelcomeEmail({ name, ctaUrl }: WelcomeEmailProps) { /* ... */ }
```

```ts
// uso desde cualquier use-case
constructor(@Inject(MAIL_SERVICE) private readonly mail: MailService) {}

await this.mail.send({
  to: user.email,
  subject: 'Welcome!',
  template: React.createElement(WelcomeEmail, { name, ctaUrl }),
});
```

**Driver `log`** (dev): no envía nada, imprime el HTML renderizado en consola.
**Driver `smtp`**: usa nodemailer con cualquier proveedor SMTP (Mailgun, SES, Mailpit local, Postfix, etc.).

```bash
MAIL_DRIVER=smtp
MAIL_FROM=no-reply@example.com
MAIL_SMTP_HOST=smtp.example.com
MAIL_SMTP_PORT=587
MAIL_SMTP_SECURE=false
MAIL_SMTP_USER=...
MAIL_SMTP_PASS=...
```

### Previsualizar templates en el navegador

React Email trae un dev server con hot reload — útil para iterar el diseño sin levantar el backend:

```bash
pnpm email:dev
# → http://localhost:3001
```

Cada `*.email.tsx` con `default export` aparece en la lista; `PreviewProps` define los datos de ejemplo.

### Cómo añadir un template

1. Crea `src/shared/mail/templates/reset-password.email.tsx`.
2. Importa `BaseLayout` y los primitives de `@react-email/components` (`Heading`, `Text`, `Button`, etc.).
3. Añade `PreviewProps` con datos de muestra y exporta como `default` para que aparezca en `pnpm email:dev`.
4. Úsalo: `template: React.createElement(ResetPasswordEmail, { ... })`.

### Cambiar de proveedor (Resend, SES, etc.)

Crea un adapter que implemente `MailService` y añádelo al `switch` de `mail.module.ts`. Los use-cases y los templates no cambian.

## Crear un módulo nuevo

### Opción rápida — scaffold automático

```bash
pnpm new:module order orders
# (singular)  (plural opcional, default: <singular>s)
```

Genera el CRUD completo (entity + port + 5 use-cases + DTOs + controller + drizzle schema/mapper/repo + module) y auto-engancha el schema y el módulo:

- Añade el schema a `src/shared/database/schema.ts`
- Importa el módulo en `src/app.module.ts`

Después sólo queda:

1. Ajustar la entidad, schema Drizzle y DTOs con los campos reales
2. `pnpm db:push` para crear la tabla
3. `pnpm start:dev`

Ejemplos:

```bash
pnpm new:module order              # → src/modules/orders/
pnpm new:module category categories # plural irregular
pnpm new:module order-item         # snake-kebab → OrderItem class
```

### Opción manual

1. `mkdir -p src/modules/orders/{domain/{entities,ports,exceptions},application/{dtos,use-cases},infrastructure/{http,persistence}}`
2. Define la entidad y el port (interface + `Symbol` token).
3. Escribe los use-cases en `application/` — si necesitan storage o mail, inyecta `STORAGE_SERVICE` / `MAIL_SERVICE`.
4. Implementa el repo Drizzle en `infrastructure/persistence/` y exporta su schema.
5. Añade el schema a `src/shared/database/schema.ts`.
6. Crea `<module>.module.ts` con el binding del port.
7. Importa `<Module>Module` en `AppModule`.

## Errores tipados con código

Cada módulo declara sus excepciones en `domain/exceptions/` extendiendo `DomainException`. La excepción lleva su propio `code` (machine-readable) y `httpStatus`, así no hay que mantener un mapeo central:

```ts
// src/modules/users/domain/exceptions/user.exceptions.ts
export class UserNotFoundException extends DomainException {
  readonly code = 'USER_NOT_FOUND';
  readonly httpStatus = HttpStatus.NOT_FOUND;
  constructor(id: string) {
    super(`User with id ${id} not found`, { id }); // details opcional
  }
}
```

El `DomainExceptionFilter` (registrado en `AppModule` como `APP_FILTER`) las captura **todas** y serializa una envoltura consistente:

```json
{
  "statusCode": 404,
  "code": "USER_NOT_FOUND",
  "message": "User with id abc-123 not found",
  "details": { "id": "abc-123" },
  "path": "/api/users/abc-123",
  "timestamp": "2026-06-15T18:30:00.123Z"
}
```

También maneja `HttpException` de Nest (validaciones, `ParseUUIDPipe`, etc.) y errores desconocidos → `INTERNAL_ERROR` con stack en logs.

**¿Por qué no un filter por módulo?** Equivale a duplicar boilerplate. Con este patrón el "código" vive con la excepción dentro del dominio del módulo (donde pertenece), y la serialización HTTP queda centralizada en infrastructure. Si necesitas comportamiento específico de un módulo (logging extra, audit), puedes añadir `@UseFilters(MyFilter)` a su controller.

## Migraciones con Drizzle

Drizzle tiene dos flujos: `push` (dev, sin migraciones) y `generate` + `migrate` (prod-ready).

### Dev rápido — `push`

Sincroniza el schema directamente con la DB. **No genera archivos**. Útil al prototipar:

```bash
pnpm db:push
```

### Flujo real — `generate` + `migrate`

1. **Editas un schema**: `src/modules/users/infrastructure/persistence/user.schema.ts`
2. **Generas el SQL**:
   ```bash
   pnpm db:generate
   ```
   Crea `drizzle/0001_xxx.sql` + `drizzle/meta/` con el snapshot. Revisa el SQL en el PR.
3. **Aplicas las migraciones**:
   ```bash
   pnpm db:migrate          # vía drizzle-kit (dev/local)
   # o
   pnpm db:migrate:run      # vía scripts/migrate.ts (CI/deploy, sin devDeps)
   ```

`db:migrate:run` ejecuta el migrator programático de Drizzle (`drizzle-orm/postgres-js/migrator`), pensado para imágenes Docker de producción donde no quieres instalar `drizzle-kit`.

### Renombrar columnas / cambios destructivos

`drizzle-kit` te preguntará interactivamente si una columna se renombró o se borró + creó. Por eso conviene generar las migraciones desde tu máquina (no en CI).

## Tooling

- **Node**: pin con `.nvmrc` (`nvm use`)
- **Prettier** (`.prettierrc`): `singleQuote`, `trailingComma: 'all'`
- **ESLint** (`.eslintrc.js`): `@typescript-eslint/recommended` + `plugin:prettier/recommended` con `no-explicit-any`, `no-unused-vars` y `lines-between-class-members` como **error**
- **Husky v9** + **lint-staged**: en cada `git commit` corre eslint --fix + prettier --write sobre los archivos staged. Se instala automáticamente con `pnpm install` (script `prepare`)

## Setup

Requisitos: Node 20 (`.nvmrc`), pnpm 9, Docker (para PostgreSQL local).

```bash
nvm use                # lee .nvmrc → Node 20
cp .env.example .env   # ya viene apuntando a postgres://postgres:postgres@localhost:5432/nest_db
pnpm install           # husky se instala solo via `prepare`
docker compose up -d   # levanta PostgreSQL 16 con la base nest_db creada
pnpm db:push           # sincroniza el schema Drizzle con la DB
pnpm start:dev
```

### PostgreSQL local con Docker

El `docker-compose.yml` levanta Postgres 16 con:

- usuario / password: `postgres` / `postgres`
- base de datos: `nest_db` (creada automáticamente en el primer arranque)
- puerto: `5432` expuesto en el host
- volumen `postgres_data` para persistir los datos entre reinicios

```bash
docker compose up -d         # arranca en background
docker compose logs -f pg    # ver logs (Ctrl+C para salir)
docker compose down          # parar (conserva los datos en el volumen)
docker compose down -v       # parar y BORRAR la base de datos
```

Estos defaults matchean el `DATABASE_URL` del `.env.example`. Si quieres apuntar a otra instancia (RDS, Neon, Supabase, etc.), edita `DATABASE_URL` en tu `.env` y opcionalmente `DATABASE_SSL=true`.

### Conectarte a la DB

```bash
docker compose exec postgres psql -U postgres -d nest_db   # CLI dentro del contenedor
pnpm db:studio                                             # Drizzle Studio en el navegador
```

- API: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/api/docs`
- React Email preview: `pnpm email:dev` → `http://localhost:3001`

## Comandos (pnpm)

| Comando | Qué hace |
|---|---|
| `pnpm start:dev` | dev server con watch |
| `pnpm build` | compila a `dist/` |
| `pnpm db:generate` | genera migraciones SQL desde el schema |
| `pnpm db:migrate` | aplica migraciones pendientes (drizzle-kit, dev) |
| `pnpm db:migrate:run` | aplica migraciones (programático, CI/deploy) |
| `pnpm db:push` | sincroniza schema sin migraciones (dev) |
| `pnpm db:studio` | abre Drizzle Studio |
| `pnpm email:dev` | preview de React Email en `:3001` |
| `pnpm email:export` | exporta los templates como HTML estático |
| `pnpm new:module <name>` | scaffolda un módulo hexagonal con CRUD completo |
| `pnpm test` | tests unitarios |
| `pnpm test:e2e` | tests e2e |

## Por qué Drizzle y no Prisma

- Schemas son TypeScript estándar → cero codegen, builds más rápidos
- Queries cercanas al SQL pero con tipado fuerte
- Sin runtime "engine" separado, sólo el driver `postgres-js`
- Ideal para arquitectura hexagonal: el schema vive en `infrastructure/` sin contaminar el dominio

## License

MIT — ver [LICENSE](./LICENSE).