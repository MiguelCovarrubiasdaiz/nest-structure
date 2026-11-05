---
name: write-tests
description: >-
  Write Jest unit tests for nest-hexagonal-boilerplate: domain entities and
  application use-cases tested in isolation, ports mocked as plain objects, no
  Nest TestingModule and no database. Use it WHENEVER the user asks for tests,
  specs, coverage, "pruebas", or when new business logic is added and needs a
  spec.
---

# Write unit tests

Read `.agents/rules/testing.md` first.

## 1. Pick the targets

- Entity → every invariant in `create()` and every business method
  (returns a new instance, original untouched, `updatedAt` changes).
- Use-case → happy path + each branch that throws a domain exception
  (not found, already exists, forbidden, invalid token…) + side effects on
  ports (what was saved, what was revoked, that mail failure is swallowed).

## 2. File placement

Next to the source: `create-user.use-case.ts` → `create-user.use-case.spec.ts`.

## 3. Entity spec shape

```ts
import { User } from './user.entity';
import { InvalidUserDataException } from '../exceptions/user.exceptions';

const validProps = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'jane@doe.com',
  name: 'Jane',
  passwordHash: 'hash',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('User', () => {
  it('rejects an empty name', () => {
    expect(() => User.create({ ...validProps, name: '  ' })).toThrow(
      InvalidUserDataException,
    );
  });

  it('rename returns a new instance and keeps the original', () => {
    const user = User.create(validProps);
    const renamed = user.rename('Janet');

    expect(renamed).not.toBe(user);
    expect(renamed.name).toBe('Janet');
    expect(user.name).toBe('Jane');
  });
});
```

## 4. Use-case spec shape

```ts
import { UpdateUserUseCase } from './update-user.use-case';
import type { UserRepository } from '../../domain/ports/user.repository';
import {
  UserActionForbiddenException,
  UserNotFoundException,
} from '../../domain/exceptions/user.exceptions';

function mockRepo(): jest.Mocked<UserRepository> {
  return {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}

describe('UpdateUserUseCase', () => {
  it('forbids updating another user', async () => {
    const repo = mockRepo();
    const useCase = new UpdateUserUseCase(repo);

    await expect(
      useCase.execute('id-a', { name: 'x' }, 'id-b'),
    ).rejects.toBeInstanceOf(UserActionForbiddenException);
    expect(repo.findById).not.toHaveBeenCalled();
  });

  it('throws when the user does not exist', async () => {
    const repo = mockRepo();
    repo.findById.mockResolvedValue(null);

    await expect(
      new UpdateUserUseCase(repo).execute('id-a', { name: 'x' }, 'id-a'),
    ).rejects.toBeInstanceOf(UserNotFoundException);
  });
});
```

Constructor arguments follow the use-case's constructor order — `@Inject`
decorators are irrelevant when you instantiate directly.

## 5. Run

```bash
pnpm test                       # all
pnpm test -- update-user        # one file by pattern
pnpm lint                       # specs must lint clean too
```

Report which cases are covered and which branches were left out and why.
