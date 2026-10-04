import { api, readJson, searchParam } from "@/lib/api";
import { createJob, listJobs } from "@/lib/services/jobs";
import type { CategoryKind, JobStatus } from "@/lib/services/types";

const STATUSES = ["open", "assigned", "completed", "cancelled", "all"];

export async function GET(request: Request) {
  const kind = searchParam(request, "kind");
  const status = searchParam(request, "status") ?? "open";
  const limit = Number(searchParam(request, "limit") ?? 50);
  return api((ctx) =>
    listJobs(ctx, {
      q: searchParam(request, "q"),
      tag: searchParam(request, "tag"),
      category: searchParam(request, "category"),
      city: searchParam(request, "city"),
      kind: kind === "specialized" || kind === "casual" ? (kind as CategoryKind) : null,
      status: (STATUSES.includes(status) ? status : "open") as JobStatus | "all",
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 50,
    }),
  );
}

export async function POST(request: Request) {
  return api(async (ctx) => ({ id: await createJob(ctx, await readJson(request)) }), 201);
}
