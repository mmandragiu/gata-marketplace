import { api, readJson } from "@/lib/api";
import { listBidsForJob, placeBid } from "@/lib/services/bids";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return api((ctx) => listBidsForJob(ctx, id));
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return api(async (ctx) => ({ id: await placeBid(ctx, id, await readJson(request)) }), 201);
}
