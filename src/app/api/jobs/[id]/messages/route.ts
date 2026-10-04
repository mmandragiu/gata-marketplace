import { api, readJson } from "@/lib/api";
import { listMessages, sendMessage } from "@/lib/services/chat";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return api((ctx) => listMessages(ctx, id));
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return api(async (ctx) => ({ id: await sendMessage(ctx, id, await readJson(request)) }), 201);
}
