import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // DDL runs against the direct endpoint. Neon's pooled endpoint is pgbouncer in
    // transaction mode, where some DDL and session-level statements misbehave.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
