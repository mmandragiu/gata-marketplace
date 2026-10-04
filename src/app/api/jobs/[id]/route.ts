import { api, notFound } from "@/lib/api";
import { listBidsForJob } from "@/lib/services/bids";
import { getCounterpartyContact } from "@/lib/services/chat";
import { getJob } from "@/lib/services/jobs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return api(async (ctx) => {
    const job = await getJob(ctx, id);
    if (!job) notFound("Jobul");
    const [bids, contact] = await Promise.all([listBidsForJob(ctx, id), getCounterpartyContact(ctx, job)]);
    return { job, bids, contact };
  });
}
