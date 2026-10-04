import { api } from "@/lib/api";
import { banUser } from "@/lib/services/admin";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return api(async (ctx) => {
    let reason: string | null = null;
    try {
      const body = (await request.json()) as { reason?: unknown };
      reason = typeof body.reason === "string" ? body.reason : null;
    } catch {
      // an empty body is allowed
    }
    await banUser(ctx, id, reason);
    return { ok: true };
  });
}
