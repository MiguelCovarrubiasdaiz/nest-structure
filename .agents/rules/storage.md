---
paths:
  - 'src/shared/storage/**'
  - 'src/modules/files/**'
  - 'src/**/*upload*'
---

# File storage

A shared hexagonal kernel in `src/shared/storage/`, not a feature module.

## The port

`StorageService` (`ports/storage.service.ts`), token `STORAGE_SERVICE`:

```ts
put({ key, body, contentType }): Promise<StorageObject>;   // { key, url }
get(key): Promise<Buffer>;
delete(key): Promise<void>;
exists(key): Promise<boolean>;
getSignedUrl(key, expiresInSeconds?): Promise<string>;
```

Inject the token in a use-case — never `@aws-sdk/*` or `node:fs` outside the
adapters. Invalid keys throw `InvalidStorageKeyException` (400).

## Adapters (`STORAGE_DRIVER`)

- `local` → `LocalStorageAdapter`, writes under `STORAGE_LOCAL_PATH`; `main.ts`
  serves that folder statically at `STORAGE_LOCAL_PUBLIC_URL` (default `/files`).
- `s3` → `S3StorageAdapter`; S3-compatible (MinIO, R2) through
  `STORAGE_S3_ENDPOINT`; optional CDN base via `STORAGE_S3_PUBLIC_URL`.

A new provider = a class implementing `StorageService` + a `case` in
`storage.module.ts` + its env vars (`project.md`).

## Keys

The use-case builds the key, never the client: `${year}/${randomUUID()}${ext}`
(see `upload-file.use-case.ts`). Store the key on your entity; derive URLs
with the port.

## Upload endpoints

Size limit + MIME allowlist in the controller, only primitives cross into the
use-case — see `api.md` → "File uploads".
