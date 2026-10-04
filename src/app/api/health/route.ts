import { NextResponse } from "next/server";

import { appConfig, dataMode } from "@/lib/config";
import { openAiEnabled } from "@/lib/matching/openai";

export async function GET() {
  return NextResponse.json({
    data: { status: "ok", app: appConfig.name, mode: dataMode(), ai: openAiEnabled() ? "openai" : "local" },
  });
}
