import { api, searchParam } from "@/lib/api";
import { recommendJobsForViewer } from "@/lib/services/matching";

export async function GET(request: Request) {
  const limit = Math.min(Math.max(Number(searchParam(request, "limit") ?? 12) || 12, 1), 50);
  return api((ctx) => recommendJobsForViewer(ctx, limit));
}
