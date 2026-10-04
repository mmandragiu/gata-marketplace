import { jobInputSchema, parseOrThrow, type JobInput } from "@/lib/validation";

import { AppError, toAppError } from "./errors";
import { requireActive, requireViewer, viewerAuthId } from "./guards";
import { mapJob } from "./mappers";
import { ilikeUnaccent, JOB_SELECT } from "./sql";
import type { CategoryKind, Ctx, Job, JobStatus } from "./types";

export type JobFilters = {
  q?: string | null;
  tag?: string | null;
  kind?: CategoryKind | null;
  category?: string | null;
  city?: string | null;
  status?: JobStatus | "all";
  limit?: number;
};

/** Public feed. Jobs of Premium clients are pinned on top; banned clients' jobs are hidden. */
export async function listJobs(ctx: Ctx, f: JobFilters = {}): Promise<Job[]> {
  const rows = await ctx.db.asUser(viewerAuthId(ctx), (q) =>
    q.query(
      `${JOB_SELECT}
       where ($1::text = 'all' or j.status = $1)
         and c.is_banned = false
         and ($2::text is null or exists (
               select 1 from public.job_tags jt join public.tags t on t.id = jt.tag_id
               where jt.job_id = j.id and t.slug = $2))
         and ($3::text is null or cat.kind = $3)
         and ($4::text is null or cat.slug = $4)
         and ($5::text is null or ${ilikeUnaccent("j.title || ' ' || j.description || ' ' || j.location", "$5")})
         and ($6::text is null or j.is_remote or ${ilikeUnaccent("j.city", "$6")})
       order by (c.is_premium and j.status = 'open') desc, j.created_at desc
       limit $7::int`,
      [f.status ?? "open", f.tag || null, f.kind || null, f.category || null, f.q || null, f.city || null, f.limit ?? 50],
    ),
  );
  return rows.map(mapJob);
}

export async function getJob(ctx: Ctx, id: string): Promise<Job | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await ctx.db.asUser(viewerAuthId(ctx), (q) => q.query(`${JOB_SELECT} where j.id = $1`, [id]));
  return rows[0] ? mapJob(rows[0]) : null;
}

/** All jobs posted by the signed-in user (any status). */
export async function listMyJobs(ctx: Ctx): Promise<Job[]> {
  const viewer = requireViewer(ctx);
  const rows = await ctx.db.asUser(viewer.authUserId, (q) =>
    q.query(`${JOB_SELECT} where j.client_id = public.current_profile_id() order by j.created_at desc`),
  );
  return rows.map(mapJob);
}

export async function createJob(ctx: Ctx, raw: unknown): Promise<string> {
  const viewer = requireActive(ctx);
  const input: JobInput = parseOrThrow(jobInputSchema, raw);

  try {
    return await ctx.db.asUser(viewer.authUserId, async (q) => {
      const category = await q.query<{ id: string }>("select id from public.categories where slug = $1", [input.categorySlug]);
      if (!category[0]) throw new AppError("VALIDATION", "Categoria nu există.", { categorySlug: "Categoria nu există." });

      const tags = await q.query<{ id: string; slug: string }>(
        "select id, slug from public.tags where slug in (select jsonb_array_elements_text($1::text::jsonb))",
        [JSON.stringify(input.tagSlugs)],
      );
      if (tags.length !== new Set(input.tagSlugs).size) {
        throw new AppError("VALIDATION", "Unul dintre taguri nu există.", { tagSlugs: "Tag necunoscut." });
      }

      const inserted = await q.query<{ id: string }>(
        `insert into public.jobs (client_id, title, description, budget, category_id, city, location, is_remote, urgency)
         values (public.current_profile_id(), $1, $2, $3::int, $4, $5, $6, $7::boolean, $8)
         returning id`,
        [
          input.title,
          input.description,
          input.budget,
          category[0].id,
          input.city,
          input.location || (input.isRemote ? "Online" : input.city),
          input.isRemote,
          input.urgency,
        ],
      );
      const jobId = inserted[0].id;
      for (const t of tags) {
        await q.query("insert into public.job_tags (job_id, tag_id) values ($1, $2)", [jobId, t.id]);
      }
      return jobId;
    });
  } catch (err) {
    throw toAppError(err);
  }
}

export async function completeJob(ctx: Ctx, jobId: string): Promise<void> {
  const viewer = requireViewer(ctx);
  try {
    await ctx.db.asUser(viewer.authUserId, (q) => q.query("select public.complete_job($1)", [jobId]));
  } catch (err) {
    throw toAppError(err);
  }
}

export async function cancelJob(ctx: Ctx, jobId: string): Promise<void> {
  const viewer = requireViewer(ctx);
  try {
    await ctx.db.asUser(viewer.authUserId, (q) => q.query("select public.cancel_job($1)", [jobId]));
  } catch (err) {
    throw toAppError(err);
  }
}
