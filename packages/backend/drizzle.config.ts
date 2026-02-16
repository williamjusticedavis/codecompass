import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

export default {
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString:
      process.env.DATABASE_URL || 'postgresql://dev:dev@localhost:5432/explain_codebase_dev',
  },
  verbose: true,
  strict: true,
} satisfies Config;
