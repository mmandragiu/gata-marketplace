import { api } from "@/lib/api";
import { AppError } from "@/lib/services/errors";
import { getMyContact } from "@/lib/services/profiles";

export async function GET() {
  return api(async (ctx) => {
    if (!ctx.viewer) throw new AppError("UNAUTHENTICATED", "Trebuie să fii autentificat.");
    return { profile: ctx.viewer.profile, contact: await getMyContact(ctx) };
  });
}
