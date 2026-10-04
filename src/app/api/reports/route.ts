import { api, readJson } from "@/lib/api";
import { createReport } from "@/lib/services/reports";

export async function POST(request: Request) {
  return api(async (ctx) => createReport(ctx, await readJson(request)), 201);
}
