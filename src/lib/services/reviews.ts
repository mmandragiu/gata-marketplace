import { parseOrThrow, reviewInputSchema } from "@/lib/validation";

import { toAppError } from "./errors";
import { requireActive, viewerAuthId } from "./guards";
import { iso, num } from "./mappers";
import type { Ctx, Review } from "./types";

export async function createReview(ctx: Ctx, raw: unknown): Promise<string> {
  const viewer = requireActive(ctx);
  const input = parseOrThrow(reviewInputSchema, raw);
  try {
    const rows = await ctx.db.asUser(viewer.authUserId, (q) =>
      q.query<{ id: string }>("select public.create_review($1, $2::int, $3) as id", [
        input.jobId,
        input.rating,
        input.comment,
      ]),
    );
    return rows[0].id;
  } catch (err) {
    throw toAppError(err, "Ai lăsat deja o recenzie pentru acest job.");
  }
}

export async function listReviewsForProfile(ctx: Ctx, profileId: string): Promise<Review[]> {
  const rows = await ctx.db.asUser(viewerAuthId(ctx), (q) =>
    q.query(
      `select r.id, r.job_id, j.title as job_title, r.rating, r.comment, r.created_at, r.service_id,
              t.name as service_name,
              case when r.reviewee_id = r.worker_id then 'client_to_worker' else 'worker_to_client' end as direction,
              json_build_object('id', rv.id, 'fullName', rv.full_name, 'avatarUrl', rv.avatar_url) as reviewer
       from public.reviews r
       join public.jobs j on j.id = r.job_id
       join public.profiles rv on rv.id = r.reviewer_id
       left join public.tags t on t.id = r.service_id
       where r.reviewee_id = $1
       order by r.created_at desc`,
      [profileId],
    ),
  );
  return rows.map((r) => {
    const reviewer = (typeof r.reviewer === "string" ? JSON.parse(r.reviewer) : r.reviewer) as Record<string, unknown>;
    return {
      id: String(r.id),
      jobId: String(r.job_id),
      jobTitle: String(r.job_title),
      rating: num(r.rating),
      comment: String(r.comment ?? ""),
      createdAt: iso(r.created_at),
      serviceId: (r.service_id as string | null) ?? null,
      serviceName: (r.service_name as string | null) ?? null,
      direction: r.direction === "worker_to_client" ? "worker_to_client" : "client_to_worker",
      reviewer: {
        id: String(reviewer.id),
        fullName: String(reviewer.fullName ?? ""),
        avatarUrl: (reviewer.avatarUrl as string | null) ?? null,
      },
    };
  });
}

/** Counts per star (1–5) for the rating chart. */
export function ratingDistribution(reviews: Review[]): { stars: number; count: number }[] {
  return [5, 4, 3, 2, 1].map((stars) => ({ stars, count: reviews.filter((r) => r.rating === stars).length }));
}

export async function hasReviewed(ctx: Ctx, jobId: string): Promise<boolean> {
  if (!ctx.viewer) return false;
  const rows = await ctx.db.asUser(ctx.viewer.authUserId, (q) =>
    q.query<{ reviewed: boolean }>(
      "select exists (select 1 from public.reviews where job_id = $1 and reviewer_id = public.current_profile_id()) as reviewed",
      [jobId],
    ),
  );
  return Boolean(rows[0]?.reviewed);
}
