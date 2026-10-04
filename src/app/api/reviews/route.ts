import { api, readJson } from "@/lib/api";
import { createReview } from "@/lib/services/reviews";

export async function POST(request: Request) {
  return api(async (ctx) => ({ id: await createReview(ctx, await readJson(request)) }), 201);
}
