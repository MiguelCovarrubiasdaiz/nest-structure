import { Global, Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DATABASE_CONNECTION } from './database.tokens';
import * as schema from './schema';

export type Database = PostgresJsDatabase<typeof schema>;

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DATABASE_CONNECTION,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Database => {
        const url = config.getOrThrow<string>('DATABASE_URL');
        const sslRaw = config.get<string | boolean>('DATABASE_SSL', false);
        const ssl = sslRaw === true || sslRaw === 'true';
        const client = postgres(url, { ssl: ssl ? 'require' : false, max: 10 });
        Logger.log(`Connected to PostgreSQL via Drizzle (ssl=${ssl})`, 'DatabaseModule');
        return drizzle(client, { schema });
      },
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}