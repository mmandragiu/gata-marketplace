import { api, notFound } from "@/lib/api";
import { getWorker } from "@/lib/services/profiles";
import { listReviewsForProfile, ratingDistribution } from "@/lib/services/reviews";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return api(async (ctx) => {
    if (!/^[0-9a-f-]{36}$/i.test(id)) notFound("Profilul");
    const worker = await getWorker(ctx, id);
    if (!worker) notFound("Profilul");
    const reviews = await listReviewsForProfile(ctx, id);
    return { worker, reviews, ratingDistribution: ratingDistribution(reviews) };
  });
}
