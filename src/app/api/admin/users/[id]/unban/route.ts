import { api } from "@/lib/api";
import { unbanUser } from "@/lib/services/admin";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return api(async (ctx) => {
    let resetReports = true;
    try {
      const body = (await request.json()) as { resetReports?: unknown };
      if (typeof body.resetReports === "boolean") resetReports = body.resetReports;
    } catch {
      // an empty body resets the counter by default
    }
    await unbanUser(ctx, id, resetReports);
    return { ok: true, resetReports };
  });
}
