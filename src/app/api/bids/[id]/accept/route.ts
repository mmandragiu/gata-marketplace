import { api } from "@/lib/api";
import { acceptBid } from "@/lib/services/bids";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return api(async (ctx) => {
    await acceptBid(ctx, id);
    return { ok: true };
  });
}
