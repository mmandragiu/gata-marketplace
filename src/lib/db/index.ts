import { dataMode } from "@/lib/config";

import type { Db } from "./types";

export type { Db, Queryable, Row } from "./types";

type DbGlobal = typeof globalThis & { __gataDb?: Promise<Db> };
const g = globalThis as DbGlobal;

async function createDb(): Promise<Db> {
  if (dataMode() === "supabase") {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL lipsește (necesar în modul supabase).");
    const { createPostgresDb } = await import("./postgres");
    return createPostgresDb(url);
  }
  const { createPgliteDb } = await import("./pglite");
  const { seedDemoDatabase } = await import("@/lib/seed");
  const db = await createPgliteDb();
  await seedDemoDatabase(db);
  return db;
}

/** Process-wide database handle (survives hot reloads in development). */
export function getDb(): Promise<Db> {
  if (!g.__gataDb) {
    g.__gataDb = createDb().catch((err) => {
      g.__gataDb = undefined;
      throw err;
    });
  }
  return g.__gataDb;
}

/** Demo mode only: throws away the embedded database and seeds a fresh one. */
export async function resetDemoDatabase(): Promise<void> {
  if (dataMode() !== "demo") throw new Error("Resetarea e disponibilă doar în modul demo.");
  const previous = g.__gataDb;
  g.__gataDb = undefined;
  if (previous) {
    try {
      await (await previous).close();
    } catch {
      // ignore: the old instance may already be closed
    }
  }
  await getDb();
}
