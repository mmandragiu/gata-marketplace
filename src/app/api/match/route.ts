import { api, readJson } from "@/lib/api";
import { AppError } from "@/lib/services/errors";
import { analyzeMatch } from "@/lib/services/matching";

export async function POST(request: Request) {
  return api(async (ctx) => {
    const body = await readJson(request);
    const jobId = typeof body.jobId === "string" ? body.jobId : "";
    const workerId = typeof body.workerId === "string" ? body.workerId : "";
    if (!jobId || !workerId) throw new AppError("VALIDATION", "Trimite jobId și workerId.");
    return analyzeMatch(ctx, jobId, workerId);
  });
}
