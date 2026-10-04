import { api, readJson } from "@/lib/api";
import { AppError } from "@/lib/services/errors";
import { setRoleMode } from "@/lib/services/profiles";

export async function POST(request: Request) {
  return api(async (ctx) => {
    const { mode } = await readJson(request);
    if (mode !== "worker" && mode !== "client") throw new AppError("VALIDATION", "mode trebuie să fie worker sau client.");
    await setRoleMode(ctx, mode);
    return { mode };
  });
}
