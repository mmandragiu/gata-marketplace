import { api } from "@/lib/api";
import { completeJob } from "@/lib/services/jobs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return api(async (ctx) => {
    await completeJob(ctx, id);
    return { ok: true };
  });
}
