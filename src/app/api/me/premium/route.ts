import { api, readJson } from "@/lib/api";
import { AppError } from "@/lib/services/errors";
import { setPremium } from "@/lib/services/profiles";

/** Mock checkout: toggles Premium without a real payment (hackathon demo). */
export async function POST(request: Request) {
  return api(async (ctx) => {
    const { enabled } = await readJson(request);
    if (typeof enabled !== "boolean") throw new AppError("VALIDATION", "enabled trebuie să fie true sau false.");
    await setPremium(ctx, enabled);
    return { enabled };
  });
}
