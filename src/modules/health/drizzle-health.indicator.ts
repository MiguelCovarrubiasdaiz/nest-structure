import { Inject, Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  type HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { sql } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@shared/database/database.tokens';
import type { Database } from '@shared/database/database.module';

@Injectable()
export class DrizzleHealthIndicator extends HealthIndicator {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {
    super();
  }

  async pingCheck(key = 'database'): Promise<HealthIndicatorResult> {
    try {
      await this.db.execute(sql`SELECT 1`);
      return this.getStatus(key, true);
    } catch (err) {
      throw new HealthCheckError(
        'Database ping failed',
        this.getStatus(key, false, { message: (err as Error).message }),
      );
    }
  }
}
