import { api, searchParam } from "@/lib/api";
import { listReports } from "@/lib/services/admin";

export async function GET(request: Request) {
  const status = searchParam(request, "status");
  return api((ctx) =>
    listReports(ctx, status === "open" || status === "dismissed" || status === "actioned" ? status : null),
  );
}
