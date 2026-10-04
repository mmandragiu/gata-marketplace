import { PGlite } from "@electric-sql/pglite";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import { vector } from "@electric-sql/pglite-pgvector";

import { AUTH_STUB_SQL, EXTENSIONS_GRANT_SQL } from "./auth-stub";
import { readMigrations } from "./migrations";
import { claimsFor, SET_ROLE_SQL, type Db, type Queryable, type Row } from "./types";

function wrap(tx: { query: <T>(q: string, p?: unknown[]) => Promise<{ rows: T[] }> }): Queryable {
  return {
    async query<T extends Row = Row>(text: string, params: unknown[] = []) {
      const res = await tx.query<T>(text, params);
      return res.rows;
    },
  };
}

export async function createPgliteDb(): Promise<Db> {
  const pg = await PGlite.create({ extensions: { vector, unaccent } });
  await pg.exec(AUTH_STUB_SQL);
  for (const m of readMigrations()) {
    try {
      await pg.exec(m.sql);
    } catch (err) {
      throw new Error(`Migrația ${m.name} a eșuat în PGlite: ${(err as Error).message}`);
    }
  }
  await pg.exec(EXTENSIONS_GRANT_SQL);

  const db: Db = {
    kind: "pglite",
    asUser(authUserId, fn) {
      return pg.transaction(async (tx) => {
        const { role, claims } = claimsFor(authUserId);
        await tx.query(SET_ROLE_SQL, [role, claims]);
        return fn(wrap(tx));
      });
    },
    system(fn) {
      return pg.transaction(async (tx) => fn(wrap(tx)));
    },
    async close() {
      await pg.close();
    },
  };
  return db;
}

/** Inserts a user into the stub auth schema (the trigger creates the profile). Returns the auth user id. */
export async function createDemoAuthUser(
  db: Db,
  input: { email: string; fullName: string },
): Promise<string> {
  const rows = await db.system((q) =>
    q.query<{ id: string }>(
      "insert into auth.users (email, raw_user_meta_data) values ($1, jsonb_build_object('full_name', $2::text)) returning id",
      [input.email, input.fullName],
    ),
  );
  return rows[0].id;
}
