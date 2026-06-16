/**
 * Aplica migraciones Drizzle de forma programática.
 * Útil para deploy/CI donde no quieres ejecutar `drizzle-kit migrate` con su devDep.
 *
 * Uso:
 *   pnpm db:migrate:run
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');

  const ssl = process.env.DATABASE_SSL === 'true';
  const client = postgres(url, { ssl: ssl ? 'require' : false, max: 1 });
  const db = drizzle(client);

  console.log('▶ Running migrations…');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('✅ Migrations applied');

  await client.end();
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});