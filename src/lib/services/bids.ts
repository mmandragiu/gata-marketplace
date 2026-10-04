import { bidInputSchema, parseOrThrow, type BidInput } from "@/lib/validation";

import { AppError, toAppError } from "./errors";
import { requireActive, requireViewer } from "./guards";
import { iso, mapSummary, mapWorkerTags, num } from "./mappers";
import { profileSummaryJson, workerTagsJson } from "./sql";
import type { Bid, BidStatus, Ctx, JobStatus, MyBid } from "./types";

function mapBid(r: Record<string, unknown>): Bid {
  const worker = mapSummary(r.worker);
  return {
    id: String(r.id),
    jobId: String(r.job_id),
    price: num(r.price),
    durationHours: num(r.duration_hours),
    message: String(r.message ?? ""),
    status: String(r.status) as BidStatus,
    createdAt: iso(r.created_at),
    worker: { ...worker, licenseInfo: (r.license_info as string | null) ?? null, tags: mapWorkerTags(r.worker_tags) },
    isPromoted: worker.isPremium && !worker.isBanned,
  };
}

/**
 * Bids for a job. RLS returns all bids to the job owner and only their own bid to a worker.
 * Order: accepted → Premium (promoted) → others by time; banned workers last.
 */
export async function listBidsForJob(ctx: Ctx, jobId: string): Promise<Bid[]> {
  if (!ctx.viewer) return [];
  const rows = await ctx.db.asUser(ctx.viewer.authUserId, (q) =>
    q.query(
      `select b.id, b.job_id, b.price, b.duration_hours::float8 as duration_hours, b.message, b.status, b.created_at,
              ${profileSummaryJson("w")} as worker, w.license_info, ${workerTagsJson("w")} as worker_tags
       from public.bids b
       join public.profiles w on w.id = b.worker_id
       where b.job_id = $1
       order by (b.status = 'accepted') desc, w.is_banned asc, (w.is_premium) desc, b.created_at asc`,
      [jobId],
    ),
  );
  return rows.map(mapBid);
}

export async function placeBid(ctx: Ctx, jobId: string, raw: unknown): Promise<string> {
  const viewer = requireActive(ctx);
  const input: BidInput = parseOrThrow(bidInputSchema, raw);

  try {
    return await ctx.db.asUser(viewer.authUserId, async (q) => {
      const job = await q.query<{ status: JobStatus; client_id: string }>(
        "select status, client_id from public.jobs where id = $1",
        [jobId],
      );
      if (!job[0]) throw new AppError("NOT_FOUND", "Jobul nu există.");
      if (job[0].client_id === viewer.profile.id) throw new AppError("FORBIDDEN", "Nu poți trimite o ofertă la propriul job.");
      if (job[0].status !== "open") throw new AppError("CONFLICT", "Jobul nu mai acceptă oferte.");

      const inserted = await q.query<{ id: string }>(
        `insert into public.bids (job_id, worker_id, price, duration_hours, message)
         values ($1, public.current_profile_id(), $2::int, $3::numeric, $4)
         returning id`,
        [jobId, input.price, input.durationHours, input.message],
      );
      return inserted[0].id;
    });
  } catch (err) {
    throw toAppError(err, "Ai trimis deja o ofertă pentru acest job.");
  }
}

export async function acceptBid(ctx: Ctx, bidId: string): Promise<void> {
  const viewer = requireViewer(ctx);
  try {
    await ctx.db.asUser(viewer.authUserId, (q) => q.query("select public.accept_bid($1)", [bidId]));
  } catch (err) {
    throw toAppError(err);
  }
}

export async function rejectBid(ctx: Ctx, bidId: string): Promise<void> {
  const viewer = requireViewer(ctx);
  try {
    await ctx.db.asUser(viewer.authUserId, (q) => q.query("select public.reject_bid($1)", [bidId]));
  } catch (err) {
    throw toAppError(err);
  }
}

export async function listMyBids(ctx: Ctx): Promise<MyBid[]> {
  const viewer = requireViewer(ctx);
  const rows = await ctx.db.asUser(viewer.authUserId, (q) =>
    q.query(
      `select b.id, b.price, b.duration_hours::float8 as duration_hours, b.status, b.created_at,
              json_build_object('id', j.id, 'title', j.title, 'status', j.status, 'budget', j.budget,
                                'location', j.location, 'clientName', c.full_name) as job
       from public.bids b
       join public.jobs j on j.id = b.job_id
       join public.profiles c on c.id = j.client_id
       where b.worker_id = public.current_profile_id()
       order by b.created_at desc`,
    ),
  );
  return rows.map((r) => {
    const job = (typeof r.job === "string" ? JSON.parse(r.job) : r.job) as Record<string, unknown>;
    return {
      id: String(r.id),
      price: num(r.price),
      durationHours: num(r.duration_hours),
      status: String(r.status) as BidStatus,
      createdAt: iso(r.created_at),
      job: {
        id: String(job.id),
        title: String(job.title),
        status: String(job.status) as JobStatus,
        budget: num(job.budget),
        location: String(job.location ?? ""),
        clientName: String(job.clientName ?? ""),
      },
    };
  });
}
