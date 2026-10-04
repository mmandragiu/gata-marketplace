import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/** Reads the SQL migrations shared with the Supabase CLI (supabase/migrations/*.sql), in order. */
export function readMigrations(): { name: string; sql: string }[] {
  const dir = path.join(process.cwd(), "supabase", "migrations");
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  } catch {
    throw new Error(
      `Nu găsesc migrațiile SQL în ${dir}. Pornește aplicația din rădăcina proiectului (gata-marketplace).`,
    );
  }
  return files.map((name) => ({ name, sql: readFileSync(path.join(dir, name), "utf8") }));
}
