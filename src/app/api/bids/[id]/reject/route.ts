import { api } from "@/lib/api";
import { rejectBid } from "@/lib/services/bids";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return api(async (ctx) => {
    await rejectBid(ctx, id);
    return { ok: true };
  });
}
