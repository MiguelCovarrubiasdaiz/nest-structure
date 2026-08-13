import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@shared/database/database.tokens';
import type { Database } from '@shared/database/database.module';
import type {
  RefreshTokenRecord,
  RefreshTokenRepository,
} from '../../domain/ports/refresh-token.repository';
import { refreshTokens, type RefreshTokenRow } from './refresh-token.schema';

function toRecord(row: RefreshTokenRow): RefreshTokenRecord {
  return {
    jti: row.jti,
    userId: row.userId,
    familyId: row.familyId,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt ?? null,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class DrizzleRefreshTokenRepository implements RefreshTokenRepository {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async save(record: RefreshTokenRecord): Promise<void> {
    await this.db.insert(refreshTokens).values({
      jti: record.jti,
      userId: record.userId,
      familyId: record.familyId,
      tokenHash: record.tokenHash,
      expiresAt: record.expiresAt,
      revokedAt: record.revokedAt,
      createdAt: record.createdAt,
    });
  }

  async findByJti(jti: string): Promise<RefreshTokenRecord | null> {
    const [row] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.jti, jti))
      .limit(1);
    return row ? toRecord(row) : null;
  }

  async revoke(jti: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.jti, jti), isNull(refreshTokens.revokedAt)));
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.familyId, familyId),
          isNull(refreshTokens.revokedAt),
        ),
      );
  }
}
