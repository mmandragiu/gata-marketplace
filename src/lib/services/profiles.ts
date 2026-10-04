import type { Db } from "@/lib/db/types";
import { parseOrThrow, profileInputSchema, type ProfileInput } from "@/lib/validation";

import { AppError, toAppError } from "./errors";
import { requireViewer, viewerAuthId } from "./guards";
import { mapProfile, mapWorkerTags, num } from "./mappers";
import { ilikeUnaccent, PROFILE_COLUMNS, workerTagsJson } from "./sql";
import type { CategoryKind, Contact, Ctx, Profile, RoleMode, Worker } from "./types";

const WORKER_SELECT = `
  select ${PROFILE_COLUMNS("p")},
         ${workerTagsJson("p")} as tags,
         (select count(*)::int from public.jobs j where j.assigned_worker_id = p.id and j.status = 'completed') as completed_jobs
  from public.profiles p`;

function mapWorker(r: Record<string, unknown>): Worker {
  return { ...mapProfile(r), tags: mapWorkerTags(r.tags), completedJobs: num(r.completed_jobs) };
}

/** The signed-in user's own profile (RLS: runs as that user). */
export async function getOwnProfile(db: Db, authUserId: string): Promise<Profile | null> {
  const rows = await db.asUser(authUserId, (q) =>
    q.query(`select ${PROFILE_COLUMNS("p")} from public.profiles p where p.user_id = auth.uid()`),
  );
  return rows[0] ? mapProfile(rows[0]) : null;
}

export async function getWorker(ctx: Ctx, profileId: string): Promise<Worker | null> {
  const rows = await ctx.db.asUser(viewerAuthId(ctx), (q) =>
    q.query(`${WORKER_SELECT} where p.id = $1`, [profileId]),
  );
  return rows[0] ? mapWorker(rows[0]) : null;
}

/** Worker profiles by id, including banned ones (used to score existing bids). */
export async function getWorkersByIds(ctx: Ctx, ids: string[]): Promise<Worker[]> {
  if (ids.length === 0) return [];
  const rows = await ctx.db.asUser(viewerAuthId(ctx), (q) =>
    q.query(`${WORKER_SELECT} where p.id in (select (jsonb_array_elements_text($1::jsonb))::uuid)`, [JSON.stringify(ids)]),
  );
  return rows.map(mapWorker);
}

export type WorkerFilters = {
  q?: string | null;
  tag?: string | null;
  kind?: CategoryKind | null;
  city?: string | null;
  excludeProfileId?: string | null;
  limit?: number;
};

/** Workers = profiles with at least one service tag. Banned accounts are hidden. Premium first. */
export async function listWorkers(ctx: Ctx, f: WorkerFilters = {}): Promise<Worker[]> {
  const rows = await ctx.db.asUser(viewerAuthId(ctx), (q) =>
    q.query(
      `${WORKER_SELECT}
       where exists (select 1 from public.worker_tags wt where wt.profile_id = p.id)
         and p.is_banned = false
         and ($1::text is null or exists (
               select 1 from public.worker_tags wt join public.tags t on t.id = wt.tag_id
               where wt.profile_id = p.id and t.slug = $1))
         and ($2::text is null or exists (
               select 1 from public.worker_tags wt
               join public.tags t on t.id = wt.tag_id
               join public.categories c on c.id = t.category_id
               where wt.profile_id = p.id and c.kind = $2))
         and ($3::text is null or ${ilikeUnaccent("p.full_name || ' ' || p.bio", "$3")})
         and ($4::text is null or ${ilikeUnaccent("p.city", "$4")})
         and ($5::uuid is null or p.id <> $5::uuid)
       order by p.is_premium desc, p.boost_level desc, p.rating_avg desc, p.rating_count desc, p.full_name
       limit $6::int`,
      [f.tag || null, f.kind || null, f.q || null, f.city || null, f.excludeProfileId || null, f.limit ?? 60],
    ),
  );
  return rows.map(mapWorker);
}

export async function updateMyProfile(ctx: Ctx, raw: unknown): Promise<void> {
  const viewer = requireViewer(ctx);
  const input: ProfileInput = parseOrThrow(profileInputSchema, raw);

  try {
    await ctx.db.asUser(viewer.authUserId, async (q) => {
      if (input.tags.length > 0) {
        const known = await q.query<{ slug: string }>(
          "select slug from public.tags where slug in (select jsonb_array_elements_text($1::jsonb))",
          [JSON.stringify(input.tags.map((t) => t.slug))],
        );
        const knownSet = new Set(known.map((k) => k.slug));
        const unknown = input.tags.find((t) => !knownSet.has(t.slug));
        if (unknown) throw new AppError("VALIDATION", `Tag necunoscut: ${unknown.slug}`, { tags: "Tag necunoscut." });
      }

      await q.query(
        `update public.profiles
         set full_name = $1, bio = $2, city = $3, hourly_rate = $4::int, license_info = $5
         where user_id = auth.uid()`,
        [input.fullName, input.bio, input.city, input.hourlyRate, input.licenseInfo],
      );
      await q.query(
        `insert into public.contacts (profile_id, phone, email)
         values (public.current_profile_id(), $1, $2)
         on conflict (profile_id) do update set phone = excluded.phone, email = excluded.email`,
        [input.phone, input.contactEmail],
      );
      await q.query("delete from public.worker_tags where profile_id = public.current_profile_id()");
      for (const t of input.tags) {
        await q.query(
          `insert into public.worker_tags (profile_id, tag_id, years_experience)
           select public.current_profile_id(), t.id, $2::int from public.tags t where t.slug = $1`,
          [t.slug, t.years],
        );
      }
    });
  } catch (err) {
    throw toAppError(err);
  }
}

export async function setRoleMode(ctx: Ctx, mode: RoleMode): Promise<void> {
  const viewer = requireViewer(ctx);
  if (mode !== "worker" && mode !== "client") throw new AppError("VALIDATION", "Mod invalid.");
  await ctx.db.asUser(viewer.authUserId, (q) =>
    q.query("update public.profiles set role_mode = $1 where user_id = auth.uid()", [mode]),
  );
}

/** Mock checkout (no real payment): toggles Premium for the signed-in user. */
export async function setPremium(ctx: Ctx, enabled: boolean): Promise<void> {
  const viewer = requireViewer(ctx);
  try {
    await ctx.db.asUser(viewer.authUserId, (q) => q.query("select public.set_premium_demo($1::boolean)", [enabled]));
  } catch (err) {
    throw toAppError(err);
  }
}

/** Contact details; RLS returns nothing unless it's your own or an accepted-bid counterparty. */
export async function getContact(ctx: Ctx, profileId: string): Promise<Contact | null> {
  if (!ctx.viewer) return null;
  const rows = await ctx.db.asUser(ctx.viewer.authUserId, (q) =>
    q.query<{ profile_id: string; full_name: string; phone: string | null; email: string | null }>(
      `select c.profile_id, p.full_name, c.phone, c.email
       from public.contacts c join public.profiles p on p.id = c.profile_id
       where c.profile_id = $1`,
      [profileId],
    ),
  );
  const r = rows[0];
  return r ? { profileId: r.profile_id, fullName: r.full_name, phone: r.phone, email: r.email } : null;
}

export async function getMyContact(ctx: Ctx): Promise<Contact | null> {
  if (!ctx.viewer) return null;
  return getContact(ctx, ctx.viewer.profile.id);
}
