---
paths:
  - 'src/**/*.spec.ts'
---

# Testing

Jest 29 + ts-jest, configured inline in `package.json` (`rootDir: src`,
`testRegex: .*\.spec\.ts$`, path aliases mapped). Run with `pnpm test`.
Full playbook: `.agents/skills/write-tests/SKILL.md`.

## Where and what

- Specs live **next to the file under test**: `user.entity.spec.ts` beside
  `user.entity.ts`.
- Priority: entities (invariants, immutable methods) and use-cases (business
  rules, ownership, error paths). Controllers and Drizzle adapters are thin —
  only test them when they hold real logic (e.g. error translation).
- Every new domain rule or use-case branch gets a spec.

## How

- Domain and application are pure: **no Nest `TestingModule`, no DB, no
  network**. Instantiate the class directly:
  `new UpdateUserUseCase(repo)`.
- Mock ports with plain objects typed by the port interface
  (`jest.Mocked<UserRepository>`), one `jest.fn()` per method.
- Assert on domain exceptions by class (`rejects.toBeInstanceOf(UserNotFoundException)`),
  not by message.
- Build fixtures through the real factory (`User.create({...})`) so invariants
  stay enforced.
- No snapshots, no sleeping, no real time dependency you can't control
  (`jest.useFakeTimers()` when dates matter).
