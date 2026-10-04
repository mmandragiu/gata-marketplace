import { parseOrThrow, settingsInputSchema } from "@/lib/validation";

import { AppError } from "./errors";
import { requireAdmin } from "./guards";
import { iso, isoOrNull, num } from "./mappers";
import type { Ctx, ReportReason, ReportTarget } from "./types";

export type AdminReport = {
  id: string;
  targetType: ReportTarget;
  targetId: string;
  reason: ReportReason;
  details: string;
  status: "open" | "dismissed" | "actioned";
  createdAt: string;
  reporter: { id: string; fullName: string };
  targetProfile: { id: string; fullName: string; reportCount: number; isBanned: boolean };
};

export type ModerationUser = {
  id: string;
  fullName: string;
  city: string;
  reportCount: number;
  isBanned: boolean;
  bannedReason: string | null;
  bannedAt: string | null;
  isPremium: boolean;
  isAdmin: boolean;
  isVerified: boolean;
  isWorker: boolean;
  ratingAvg: number;
  ratingCount: number;
};

export type ModerationSettings = { autoBanThreshold: number; autoBanEnabled: boolean };

function obj(v: unknown): Record<string, unknown> {
  return (typeof v === "string" ? JSON.parse(v) : v) as Record<string, unknown>;
}

export async function listReports(ctx: Ctx, status: "open" | "dismissed" | "actioned" | null = null): Promise<AdminReport[]> {
  requireAdmin(ctx);
  const rows = await ctx.db.system((q) =>
    q.query(
      `select r.id, r.target_type, r.target_id, r.reason, r.details, r.status, r.created_at,
              json_build_object('id', rp.id, 'fullName', rp.full_name) as reporter,
              json_build_object('id', tp.id, 'fullName', tp.full_name, 'reportCount', tp.report_count,
                                'isBanned', tp.is_banned) as target_profile
       from public.reports r
       join public.profiles rp on rp.id = r.reporter_id
       join public.profiles tp on tp.id = r.target_profile_id
       where ($1::text is null or r.status = $1)
       order by r.created_at desc
       limit 300`,
      [status],
    ),
  );
  return rows.map((r) => {
    const reporter = obj(r.reporter);
    const target = obj(r.target_profile);
    return {
      id: String(r.id),
      targetType: String(r.target_type) as ReportTarget,
      targetId: String(r.target_id),
      reason: String(r.reason) as ReportReason,
      details: String(r.details ?? ""),
      status: String(r.status) as AdminReport["status"],
      createdAt: iso(r.created_at),
      reporter: { id: String(reporter.id), fullName: String(reporter.fullName) },
      targetProfile: {
        id: String(target.id),
        fullName: String(target.fullName),
        reportCount: num(target.reportCount),
        isBanned: Boolean(target.isBanned),
      },
    };
  });
}

export async function listModerationUsers(ctx: Ctx): Promise<ModerationUser[]> {
  requireAdmin(ctx);
  const rows = await ctx.db.system((q) =>
    q.query(
      `select p.id, p.full_name, p.city, p.report_count, p.is_banned, p.banned_reason, p.banned_at,
              p.is_premium, p.is_admin, p.is_verified, p.rating_avg::float8 as rating_avg, p.rating_count,
              exists (select 1 from public.worker_tags wt where wt.profile_id = p.id) as is_worker
       from public.profiles p
       order by p.is_banned desc, p.report_count desc, p.full_name`,
    ),
  );
  return rows.map((r) => ({
    id: String(r.id),
    fullName: String(r.full_name),
    city: String(r.city ?? ""),
    reportCount: num(r.report_count),
    isBanned: Boolean(r.is_banned),
    bannedReason: (r.banned_reason as string | null) ?? null,
    bannedAt: isoOrNull(r.banned_at),
    isPremium: Boolean(r.is_premium),
    isAdmin: Boolean(r.is_admin),
    isVerified: Boolean(r.is_verified),
    isWorker: Boolean(r.is_worker),
    ratingAvg: num(r.rating_avg),
    ratingCount: num(r.rating_count),
  }));
}

export async function banUser(ctx: Ctx, profileId: string, reason?: string | null): Promise<void> {
  const admin = requireAdmin(ctx);
  if (profileId === admin.profile.id) throw new AppError("VALIDATION", "Nu îți poți suspenda propriul cont.");
  const rows = await ctx.db.system((q) =>
    q.query(
      `update public.profiles
       set is_banned = true, banned_at = now(), banned_reason = coalesce(nullif($2, ''), 'Suspendat manual de un moderator')
       where id = $1 and is_admin = false
       returning id`,
      [profileId, reason ?? null],
    ),
  );
  if (!rows[0]) throw new AppError("NOT_FOUND", "Utilizatorul nu există sau este moderator.");
}

/** Unbans; by default also resets the report counter and closes open reports (otherwise the next report re-bans). */
export async function unbanUser(ctx: Ctx, profileId: string, resetReports = true): Promise<void> {
  requireAdmin(ctx);
  await ctx.db.system(async (q) => {
    const rows = await q.query(
      `update public.profiles
       set is_banned = false, banned_at = null, banned_reason = null,
           report_count = case when $2::boolean then 0 else report_count end
       where id = $1
       returning id`,
      [profileId, resetReports],
    );
    if (!rows[0]) throw new AppError("NOT_FOUND", "Utilizatorul nu există.");
    if (resetReports) {
      await q.query("update public.reports set status = 'dismissed' where target_profile_id = $1 and status = 'open'", [
        profileId,
      ]);
    }
  });
}

/** Dismisses one report and gives the counter back (does not unban automatically). */
export async function dismissReport(ctx: Ctx, reportId: string): Promise<void> {
  requireAdmin(ctx);
  await ctx.db.system(async (q) => {
    const rows = await q.query<{ target_profile_id: string }>(
      "update public.reports set status = 'dismissed' where id = $1 and status = 'open' returning target_profile_id",
      [reportId],
    );
    if (!rows[0]) throw new AppError("NOT_FOUND", "Raportul nu există sau a fost deja procesat.");
    await q.query("update public.profiles set report_count = greatest(report_count - 1, 0) where id = $1", [
      rows[0].target_profile_id,
    ]);
  });
}

export async function markReportActioned(ctx: Ctx, reportId: string): Promise<void> {
  requireAdmin(ctx);
  const rows = await ctx.db.system((q) =>
    q.query("update public.reports set status = 'actioned' where id = $1 and status = 'open' returning id", [reportId]),
  );
  if (!rows[0]) throw new AppError("NOT_FOUND", "Raportul nu există sau a fost deja procesat.");
}

export async function verifyUser(ctx: Ctx, profileId: string, verified: boolean): Promise<void> {
  requireAdmin(ctx);
  const rows = await ctx.db.system((q) =>
    q.query("update public.profiles set is_verified = $2::boolean where id = $1 returning id", [profileId, verified]),
  );
  if (!rows[0]) throw new AppError("NOT_FOUND", "Utilizatorul nu există.");
}

export async function getModerationSettings(ctx: Ctx): Promise<ModerationSettings> {
  const rows = await ctx.db.system((q) =>
    q.query<{ auto_ban_threshold: number; auto_ban_enabled: boolean }>(
      "select auto_ban_threshold, auto_ban_enabled from public.moderation_settings where id = 1",
    ),
  );
  return {
    autoBanThreshold: num(rows[0]?.auto_ban_threshold ?? 5),
    autoBanEnabled: rows[0]?.auto_ban_enabled ?? true,
  };
}

export async function updateModerationSettings(ctx: Ctx, raw: unknown): Promise<ModerationSettings> {
  requireAdmin(ctx);
  const input = parseOrThrow(settingsInputSchema, raw);
  await ctx.db.system((q) =>
    q.query(
      "update public.moderation_settings set auto_ban_threshold = $1::int, auto_ban_enabled = $2::boolean, updated_at = now() where id = 1",
      [input.autoBanThreshold, input.autoBanEnabled],
    ),
  );
  return input;
}
