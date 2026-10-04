import { api, searchParam } from "@/lib/api";
import { listWorkers } from "@/lib/services/profiles";
import type { CategoryKind } from "@/lib/services/types";

export async function GET(request: Request) {
  const kind = searchParam(request, "kind");
  const limit = Number(searchParam(request, "limit") ?? 60);
  return api((ctx) =>
    listWorkers(ctx, {
      q: searchParam(request, "q"),
      tag: searchParam(request, "tag"),
      city: searchParam(request, "city"),
      kind: kind === "specialized" || kind === "casual" ? (kind as CategoryKind) : null,
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 60,
    }),
  );
}
