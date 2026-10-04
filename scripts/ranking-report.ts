import { createPgliteDb } from "@/lib/db/pglite";
import { seedDemoDatabase } from "@/lib/seed";
import * as jobs from "@/lib/services/jobs";
import * as matching from "@/lib/services/matching";
import * as profiles from "@/lib/services/profiles";

async function main() {
  const db = await createPgliteDb();
  await seedDemoDatabase(db);
  const [u] = await db.system((q) => q.query<{ id: string }>("select id from auth.users where email = 'andreea.popescu@example.com'"));
  const profile = await profiles.getOwnProfile(db, u.id);
  const ctx = { db, viewer: { authUserId: u.id, profile: profile! } };
  const open = await jobs.listJobs(ctx, { status: "open", limit: 50 });
  for (const j of open) {
    const recs = await matching.recommendWorkersForJob(ctx, j.id, 5);
    console.log(`\n${j.title} [${j.tags.map((t) => t.slug).join(",")}] ${j.city}`);
    for (const r of recs)
      console.log(
        `  ${String(r.score).padStart(3)} (+${r.boost}) ${r.worker.fullName.padEnd(18)} tag=${r.breakdown.tag.toFixed(2)} sem=${r.breakdown.semantic.toFixed(2)} loc=${r.breakdown.location}${r.breakdown.licenseWarning ? " LICENSE!" : ""}`,
      );
  }
  await db.close();
}
main();
