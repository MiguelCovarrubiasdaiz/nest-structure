import { User } from '../../domain/entities/user.entity';
import type { NewUserRow, UserRow } from './user.schema';

export const UserMapper = {
  toDomain(row: UserRow): User {
    return User.create({
      id: row.id,
      email: row.email,
      name: row.name,
      passwordHash: row.passwordHash,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  },

  toPersistence(user: User): NewUserRow {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  },
};
