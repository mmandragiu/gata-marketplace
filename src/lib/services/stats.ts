import { viewerAuthId } from "./guards";
import { num } from "./mappers";
import type { Ctx } from "./types";

export type PlatformStats = {
  workers: number;
  skilledWorkers: number;
  casualWorkers: number;
  openJobs: number;
  completedJobs: number;
  reviews: number;
  avgRating: number;
};

export async function getPlatformStats(ctx: Ctx): Promise<PlatformStats> {
  const rows = await ctx.db.asUser(viewerAuthId(ctx), (q) =>
    q.query(
      `select
         (select count(*)::int from public.profiles p
           where not p.is_banned and exists (select 1 from public.worker_tags wt where wt.profile_id = p.id)) as workers,
         (select count(distinct wt.profile_id)::int from public.worker_tags wt
            join public.tags t on t.id = wt.tag_id
            join public.categories c on c.id = t.category_id
            join public.profiles p on p.id = wt.profile_id
           where c.kind = 'specialized' and not p.is_banned) as skilled_workers,
         (select count(distinct wt.profile_id)::int from public.worker_tags wt
            join public.tags t on t.id = wt.tag_id
            join public.categories c on c.id = t.category_id
            join public.profiles p on p.id = wt.profile_id
           where c.kind = 'casual' and not p.is_banned) as casual_workers,
         (select count(*)::int from public.jobs j join public.profiles cp on cp.id = j.client_id
           where j.status = 'open' and not cp.is_banned) as open_jobs,
         (select count(*)::int from public.jobs where status = 'completed') as completed_jobs,
         (select count(*)::int from public.reviews) as reviews,
         (select coalesce(round(avg(rating)::numeric, 2), 0)::float8 from public.reviews) as avg_rating`,
    ),
  );
  const r = rows[0] ?? {};
  return {
    workers: num(r.workers),
    skilledWorkers: num(r.skilled_workers),
    casualWorkers: num(r.casual_workers),
    openJobs: num(r.open_jobs),
    completedJobs: num(r.completed_jobs),
    reviews: num(r.reviews),
    avgRating: num(r.avg_rating),
  };
}
