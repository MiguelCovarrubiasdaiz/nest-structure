import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is required to run drizzle-kit');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/shared/database/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url,
  },
  verbose: true,
  strict: true,
});
