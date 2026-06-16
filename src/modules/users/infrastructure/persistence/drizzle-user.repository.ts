import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@shared/database/database.tokens';
import type { Database } from '@shared/database/database.module';
import { User } from '../../domain/entities/user.entity';
import { UserRepository } from '../../domain/ports/user.repository';
import { users } from './user.schema';
import { UserMapper } from './user.mapper';

@Injectable()
export class DrizzleUserRepository implements UserRepository {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async findAll(): Promise<User[]> {
    const rows = await this.db.select().from(users);
    return rows.map(UserMapper.toDomain);
  }

  async findById(id: string): Promise<User | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ? UserMapper.toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [row] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return row ? UserMapper.toDomain(row) : null;
  }

  async save(user: User): Promise<User> {
    const [row] = await this.db.insert(users).values(UserMapper.toPersistence(user)).returning();
    return UserMapper.toDomain(row);
  }

  async update(user: User): Promise<User> {
    const [row] = await this.db
      .update(users)
      .set({ name: user.name, updatedAt: user.updatedAt })
      .where(eq(users.id, user.id))
      .returning();
    return UserMapper.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  }
}