/**
 * Shared setup for the integration tests.
 *
 * By default every test file gets a fresh in-process PGlite database with the Supabase migration applied.
 * With TEST_DATABASE_URL set, the files run through the postgres.js adapter (the one Supabase mode uses)
 * against that PostgreSQL database instead. It must be a local, disposable database with the pgvector and
 * unaccent extensions available: it is WIPED before each test file. Run with `npm run test:pg`.
 */
import postgres from "postgres";

import { AUTH_STUB_SQL, EXTENSIONS_GRANT_SQL } from "@/lib/db/auth-stub";
import { readMigrations } from "@/lib/db/migrations";
import { createPgliteDb } from "@/lib/db/pglite";
import { createPostgresDb } from "@/lib/db/postgres";
import type { Db } from "@/lib/db/types";

const RESET_SQL = `
drop schema if exists public cascade;
drop schema if exists extensions cascade;
drop schema if exists auth cascade;
create schema public;
grant usage on schema public to public;
`;

export async function createTestDb(): Promise<Db> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return createPgliteDb();

  const host = new URL(url).hostname;
  if (!["localhost", "127.0.0.1", "[::1]", "::1"].includes(host)) {
    throw new Error(`TEST_DATABASE_URL must point to a local, disposable database (got host "${host}"); it is wiped.`);
  }
  const setup = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await setup.unsafe(RESET_SQL).simple();
    await setup.unsafe(AUTH_STUB_SQL).simple();
    for (const m of readMigrations()) await setup.unsafe(m.sql).simple();
    await setup.unsafe(EXTENSIONS_GRANT_SQL).simple();
  } finally {
    await setup.end();
  }
  return createPostgresDb(url);
}
