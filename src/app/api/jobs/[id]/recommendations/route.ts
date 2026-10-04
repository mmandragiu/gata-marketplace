import { api, searchParam } from "@/lib/api";
import { recommendWorkersForJob } from "@/lib/services/matching";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const limit = Math.min(Math.max(Number(searchParam(request, "limit") ?? 6) || 6, 1), 20);
  return api((ctx) => recommendWorkersForJob(ctx, id, limit));
}
