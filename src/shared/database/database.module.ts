import {
  Global,
  Inject,
  Logger,
  Module,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import { DATABASE_CONNECTION } from './database.tokens';
import * as schema from './schema';

export type Database = PostgresJsDatabase<typeof schema>;

const POSTGRES_CLIENT = Symbol('POSTGRES_CLIENT');

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: POSTGRES_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Sql => {
        const url = config.getOrThrow<string>('DATABASE_URL');
        const sslRaw = config.get<string | boolean>('DATABASE_SSL', false);
        const ssl = sslRaw === true || sslRaw === 'true';
        const client = postgres(url, { ssl: ssl ? 'require' : false, max: 10 });
        Logger.log(
          `Connected to PostgreSQL via Drizzle (ssl=${ssl})`,
          'DatabaseModule',
        );
        return client;
      },
    },
    {
      provide: DATABASE_CONNECTION,
      inject: [POSTGRES_CLIENT],
      useFactory: (client: Sql): Database => drizzle(client, { schema }),
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(POSTGRES_CLIENT) private readonly client: Sql) {}

  async onModuleDestroy(): Promise<void> {
    await this.client.end({ timeout: 5 });
  }
}
