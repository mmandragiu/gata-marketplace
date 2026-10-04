import { parseOrThrow, reportInputSchema } from "@/lib/validation";

import { toAppError } from "./errors";
import { requireActive } from "./guards";
import type { Ctx, ReportReason } from "./types";

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: "Spam sau mesaje repetitive",
  fraud: "Fraudă / cere bani în avans",
  inappropriate: "Comportament nepotrivit",
  fake_profile: "Profil fals",
  no_show: "Nu s-a prezentat / lucrare abandonată",
  unlicensed: "Lucrează fără autorizația necesară",
  other: "Altceva",
};

export type ReportResult = { id: string; targetProfileId: string; targetBanned: boolean };

/**
 * Files a report. The database resolves which profile it concerns, increments its counter
 * and auto-bans it when the threshold (default 5) is reached.
 */
export async function createReport(ctx: Ctx, raw: unknown): Promise<ReportResult> {
  const viewer = requireActive(ctx);
  const input = parseOrThrow(reportInputSchema, raw);
  try {
    const inserted = await ctx.db.asUser(viewer.authUserId, (q) =>
      q.query<{ id: string; target_profile_id: string }>(
        `insert into public.reports (reporter_id, target_type, target_id, reason, details)
         values (public.current_profile_id(), $1, $2, $3, $4)
         returning id, target_profile_id`,
        [input.targetType, input.targetId, input.reason, input.details],
      ),
    );
    const { id, target_profile_id } = inserted[0];
    const status = await ctx.db.asUser(viewer.authUserId, (q) =>
      q.query<{ is_banned: boolean }>("select is_banned from public.profiles where id = $1", [target_profile_id]),
    );
    return { id, targetProfileId: target_profile_id, targetBanned: Boolean(status[0]?.is_banned) };
  } catch (err) {
    throw toAppError(err, "Ai raportat deja acest conținut.");
  }
}
