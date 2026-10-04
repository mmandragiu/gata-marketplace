import { viewerAuthId } from "./guards";
import { mapTags, num } from "./mappers";
import { tagJson } from "./sql";
import type { Category, CategoryKind, Ctx } from "./types";

export async function listCategories(ctx: Ctx): Promise<Category[]> {
  const rows = await ctx.db.asUser(viewerAuthId(ctx), (q) =>
    q.query(
      `select c.id, c.slug, c.name, c.kind, c.icon, c.description, c.sort,
              coalesce((select json_agg(${tagJson("t")} order by t.sort, t.name)
                        from public.tags t where t.category_id = c.id), '[]'::json) as tags
       from public.categories c
       order by c.sort, c.name`,
    ),
  );
  return rows.map((r) => ({
    id: String(r.id),
    slug: String(r.slug),
    name: String(r.name),
    kind: (r.kind === "casual" ? "casual" : "specialized") as CategoryKind,
    icon: String(r.icon),
    description: String(r.description ?? ""),
    sort: num(r.sort),
    tags: mapTags(r.tags),
  }));
}

export type CategoryWithCounts = Category & { openJobs: number; workers: number };

export async function listCategoriesWithCounts(ctx: Ctx): Promise<CategoryWithCounts[]> {
  const [categories, counts] = await Promise.all([
    listCategories(ctx),
    ctx.db.asUser(viewerAuthId(ctx), (q) =>
      q.query<{ id: string; open_jobs: number; workers: number }>(
        `select c.id,
                (select count(*)::int from public.jobs j
                   join public.profiles cp on cp.id = j.client_id
                  where j.category_id = c.id and j.status = 'open' and not cp.is_banned) as open_jobs,
                (select count(distinct wt.profile_id)::int from public.worker_tags wt
                   join public.tags t on t.id = wt.tag_id
                   join public.profiles p on p.id = wt.profile_id
                  where t.category_id = c.id and not p.is_banned) as workers
         from public.categories c`,
      ),
    ),
  ]);
  const byId = new Map(counts.map((c) => [c.id, c]));
  return categories.map((c) => ({
    ...c,
    openJobs: num(byId.get(c.id)?.open_jobs),
    workers: num(byId.get(c.id)?.workers),
  }));
}
