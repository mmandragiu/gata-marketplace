/**
 * Seeds a Supabase project with the same demo dataset that demo mode loads in memory.
 *
 *   npm run db:seed            # seeds an empty project
 *   npm run db:seed -- --reset # deletes the seeded accounts (and everything they own) first
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DATABASE_URL (read from the
 * environment, .env.local or .env). Apply supabase/migrations first (README → Supabase setup).
 * Every seeded account gets the password DEMO_PASSWORD (default "Demo1234!").
 */
import { existsSync } from "node:fs";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createPostgresDb } from "@/lib/db/postgres";
import { seedDatabase } from "@/lib/seed";
import { seedUsers } from "@/lib/seed/data";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Lipsește variabila ${name}. Vezi .env.example.`);
    process.exit(1);
  }
  return value;
}

async function findSeedUsers(supabase: SupabaseClient): Promise<{ id: string; email: string }[]> {
  const wanted = new Set(seedUsers.map((u) => u.email));
  const found: { id: string; email: string }[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) if (u.email && wanted.has(u.email)) found.push({ id: u.id, email: u.email });
    if (data.users.length < 1000) return found;
  }
}

async function main() {
  const url = required("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = required("SUPABASE_SERVICE_ROLE_KEY");
  const databaseUrl = required("DATABASE_URL");
  const password = process.env.DEMO_PASSWORD || "Demo1234!";
  const reset = process.argv.includes("--reset");

  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const db = createPostgresDb(databaseUrl);

  try {
    const [{ ok }] = await db.system((q) =>
      q.query<{ ok: boolean }>("select to_regclass('public.jobs') is not null as ok"),
    );
    if (!ok) throw new Error("Schema lipsă: rulează mai întâi migrarea din supabase/migrations.");

    const existing = await findSeedUsers(supabase);
    if (existing.length > 0 && !reset) {
      console.error(
        `Există deja ${existing.length} conturi demo (ex. ${existing[0].email}). Rulează cu --reset ca să le recreezi.`,
      );
      process.exitCode = 1;
      return;
    }
    for (const u of existing) {
      // ON DELETE CASCADE removes the profile and everything it owns (jobs, bids, reviews, reports, messages).
      const { error } = await supabase.auth.admin.deleteUser(u.id);
      if (error) throw error;
    }
    if (existing.length > 0) {
      await db.system((q) =>
        q.query(
          `delete from public.embeddings e
           where (e.owner_type = 'job' and not exists (select 1 from public.jobs j where j.id = e.owner_id))
              or (e.owner_type = 'profile' and not exists (select 1 from public.profiles p where p.id = e.owner_id))`,
        ),
      );
      console.log(`Șterse ${existing.length} conturi demo existente.`);
    }

    const summary = await seedDatabase(db, async ({ email, fullName }) => {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (error) throw new Error(`createUser ${email}: ${error.message}`);
      return data.user.id;
    });

    console.log("Seed complet:", summary);
    console.log(`Conturi demo: ${seedUsers.map((u) => u.email).join(", ")}`);
    console.log(`Parola tuturor conturilor: ${password}`);
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
