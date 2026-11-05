---
paths:
  - 'src/modules/auth/**'
  - 'src/modules/users/**'
  - 'src/shared/security/**'
  - 'src/modules/**/infrastructure/http/**'
---

# Authentication, authorization & rate limiting

## Tokens

- `POST /auth/login` → `{ accessToken, refreshToken, tokenType: 'Bearer', expiresIn }`.
- **Access token**: JWT signed with `JWT_ACCESS_SECRET`, TTL
  `JWT_ACCESS_EXPIRES_IN` (default `15m`), payload `{ sub, email }`. Verified
  statelessly by the guard — no DB lookup per request.
- **Refresh token**: JWT signed with `JWT_REFRESH_SECRET` (TTL
  `JWT_REFRESH_EXPIRES_IN`, default `7d`) carrying `jti` + `family`. It is
  **persisted** in `refresh_tokens` as a SHA-256 hash (`hashToken`), never in
  plaintext.
- `TokenIssuer` (application service) mints a pair and stores the refresh
  record; login starts a new family, refresh rotates within the family.
- `POST /auth/refresh` (`RefreshTokenUseCase`): unknown `jti` → 401; already
  revoked (reuse) → revokes the **whole family** + 401; expired or hash
  mismatch → 401; user no longer exists → revoke family + 401; otherwise
  revoke the used token and issue a new pair.
- `POST /auth/logout` revokes the family; idempotent (bad token = success).
- Errors: `InvalidCredentialsException` (`INVALID_CREDENTIALS`) and
  `InvalidTokenException` (`INVALID_TOKEN`), both 401.
- Login always runs a bcrypt compare (dummy hash when the email is unknown) to
  avoid user enumeration by timing — keep it that way.
- The JWT adapter is `JwtTokenService` behind the `TOKEN_SERVICE` port;
  swapping to Auth0/JWKS is a new adapter, use-cases unchanged.

## Passwords

Inject `PASSWORD_HASHER` (`PasswordHasher`: `hash` / `compare`), never bcrypt
directly. Rounds from `BCRYPT_ROUNDS` (4–15).

## Protecting endpoints

- `JwtAuthGuard` is a global `APP_GUARD`: **every route is protected by
  default**. Open one with `@Public()`
  (`@modules/auth/infrastructure/http/public.decorator`).
- Read the caller with `@CurrentUser() current: AuthenticatedUser` →
  `{ id, email }` (`current-user.decorator.ts`).
- There are no roles yet. Authorization is an **ownership check in the
  use-case**: pass `current.id` and throw `<X>ActionForbiddenException` (403)
  when it does not match (see `UpdateUserUseCase`). Introducing roles/RBAC is a
  new subsystem — ask first.
- Never register another guard or another `JwtModule`.

## Rate limiting & HTTP hardening

- `ThrottlerModule` + global `ThrottlerGuard`: 100 requests/min/IP.
- Endpoints that accept credentials or are public writes (login, refresh,
  registration) tighten it: `@Throttle({ default: { limit: 5, ttl: 60_000 } })`.
  Add it to any new endpoint that takes a password, token or one-time code.
- Never register another throttler.
- `main.ts` owns `helmet()`, CORS (allowlist from `CORS_ORIGIN`, disabled when
  unset) and Swagger (disabled when `NODE_ENV=production`).
