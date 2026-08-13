import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@shared/database/database.tokens';
import type { Database } from '@shared/database/database.module';
import { User } from '../../domain/entities/user.entity';
import {
  UserAlreadyExistsException,
  UserNotFoundException,
} from '../../domain/exceptions/user.exceptions';
import {
  PaginationOptions,
  UserRepository,
} from '../../domain/ports/user.repository';
import { users } from './user.schema';
import { UserMapper } from './user.mapper';

// Postgres unique_violation
const PG_UNIQUE_VIOLATION = '23505';

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === PG_UNIQUE_VIOLATION
  );
}

@Injectable()
export class DrizzleUserRepository implements UserRepository {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async findAll({ limit, offset }: PaginationOptions): Promise<User[]> {
    const rows = await this.db
      .select()
      .from(users)
      .orderBy(asc(users.createdAt), asc(users.id))
      .limit(limit)
      .offset(offset);
    return rows.map(UserMapper.toDomain);
  }

  async findById(id: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return row ? UserMapper.toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return row ? UserMapper.toDomain(row) : null;
  }

  async save(user: User): Promise<User> {
    try {
      const [row] = await this.db
        .insert(users)
        .values(UserMapper.toPersistence(user))
        .returning();
      return UserMapper.toDomain(row);
    } catch (err) {
      // Translate the unique-email constraint into a clean 409 (handles the
      // check-then-insert race in CreateUserUseCase) instead of a leaky 500.
      if (isUniqueViolation(err)) {
        throw new UserAlreadyExistsException(user.email);
      }
      throw err;
    }
  }

  async update(user: User): Promise<User> {
    const [row] = await this.db
      .update(users)
      .set(UserMapper.toPersistence(user))
      .where(eq(users.id, user.id))
      .returning();
    if (!row) throw new UserNotFoundException(user.id);
    return UserMapper.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  }
}
