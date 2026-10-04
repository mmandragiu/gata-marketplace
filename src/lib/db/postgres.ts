import postgres from "postgres";

import { claimsFor, SET_ROLE_SQL, type Db, type Queryable, type Row } from "./types";

type Tx = postgres.TransactionSql<Record<string, unknown>>;

function wrap(tx: Tx): Queryable {
  return {
    async query<T extends Row = Row>(text: string, params: unknown[] = []) {
      const rows = await tx.unsafe(text, params as never[]);
      return rows as unknown as T[];
    },
  };
}

/**
 * PostgreSQL connection for Supabase mode. Use the transaction pooler URL (port 6543) on
 * serverless platforms; prepared statements are disabled for pooler compatibility.
 */
export function createPostgresDb(url: string): Db {
  const local = /localhost|127\.0\.0\.1/.test(url);
  const sql = postgres(url, {
    prepare: false,
    max: Number(process.env.DB_POOL_MAX || 5),
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: local || process.env.DB_SSL === "disable" ? false : "require",
  });

  return {
    kind: "postgres",
    async asUser<T>(authUserId: string | null, fn: (q: Queryable) => Promise<T>): Promise<T> {
      const result = await sql.begin(async (tx) => {
        const { role, claims } = claimsFor(authUserId);
        await tx.unsafe(SET_ROLE_SQL, [role, claims]);
        return fn(wrap(tx));
      });
      return result as T;
    },
    async system<T>(fn: (q: Queryable) => Promise<T>): Promise<T> {
      const result = await sql.begin(async (tx) => fn(wrap(tx)));
      return result as T;
    },
    async close() {
      await sql.end({ timeout: 5 });
    },
  };
}
