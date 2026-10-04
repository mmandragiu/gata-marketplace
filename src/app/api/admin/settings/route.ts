import { api, readJson } from "@/lib/api";
import { getModerationSettings, updateModerationSettings } from "@/lib/services/admin";

export async function GET() {
  return api((ctx) => getModerationSettings(ctx));
}

export async function PUT(request: Request) {
  return api(async (ctx) => updateModerationSettings(ctx, await readJson(request)));
}
