"use server";

import { refresh } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { createDemoToken, DEMO_COOKIE } from "@/lib/auth/demo";
import { getCtx } from "@/lib/auth/session";
import { dataMode, DEMO_PASSWORD } from "@/lib/config";
import { getDb, resetDemoDatabase } from "@/lib/db";
import * as admin from "@/lib/services/admin";
import * as bids from "@/lib/services/bids";
import * as chat from "@/lib/services/chat";
import { AppError, toAppError } from "@/lib/services/errors";
import * as jobs from "@/lib/services/jobs";
import { analyzeMatch } from "@/lib/services/matching";
import * as profiles from "@/lib/services/profiles";
import * as reports from "@/lib/services/reports";
import * as reviews from "@/lib/services/reviews";
import type { MatchAnalysis, RoleMode } from "@/lib/services/types";

export type ActionState = { ok: boolean; message?: string; fieldErrors?: Record<string, string> } | null;
export type ActionResult<T = undefined> = { ok: true; message?: string; data?: T } | { ok: false; message: string };

function fail(err: unknown): { ok: false; message: string; fieldErrors?: Record<string, string> } {
  const e = toAppError(err);
  return { ok: false, message: e.message, fieldErrors: e.fieldErrors };
}

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

function safeNext(next: string): string {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

/** `Secure` only over HTTPS, so a production build served over plain HTTP (Docker on a LAN address) still logs in. */
async function sessionCookieOptions() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto")?.split(",")[0].trim() || (/^https:/i.test(h.get("origin") ?? "") ? "https" : "http");
  return { httpOnly: true, sameSite: "lax" as const, path: "/", secure: proto === "https", maxAge: 60 * 60 * 24 * 7 };
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/** One-click login for the seeded demo accounts (demo cookie, or Supabase password login). */
export async function loginDemoAccount(formData: FormData): Promise<void> {
  const email = str(formData, "email");
  const next = safeNext(str(formData, "next") || "/dashboard");
  if (dataMode() === "demo") {
    const db = await getDb();
    const rows = await db.system((q) => q.query<{ id: string }>("select id from auth.users where email = $1", [email]));
    if (!rows[0]) redirect("/login?error=unknown");
    (await cookies()).set(DEMO_COOKIE, createDemoToken(rows[0].id), await sessionCookieOptions());
  } else {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
    if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect(next);
}

export async function loginWithPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = str(formData, "email");
  const password = String(formData.get("password") ?? "");
  const next = safeNext(str(formData, "next") || "/dashboard");
  if (dataMode() === "demo") {
    return { ok: false, message: "În modul demo alege unul dintre conturile de test de mai jos sau creează un cont nou." };
  }
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: "E-mail sau parolă greșite." };
  redirect(next);
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fullName = str(formData, "fullName");
  const email = str(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (fullName.length < 2) return { ok: false, message: "Scrie-ți numele.", fieldErrors: { fullName: "Scrie-ți numele." } };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Adresa de e-mail nu e validă.", fieldErrors: { email: "Adresa de e-mail nu e validă." } };
  }

  if (dataMode() === "demo") {
    const db = await getDb();
    try {
      const { createDemoAuthUser } = await import("@/lib/db/pglite");
      const id = await createDemoAuthUser(db, { email, fullName });
      (await cookies()).set(DEMO_COOKIE, createDemoToken(id), await sessionCookieOptions());
    } catch (err) {
      return fail(toAppError(err, "Există deja un cont cu acest e-mail."));
    }
    redirect("/profile?welcome=1");
  }

  if (password.length < 8) {
    return { ok: false, message: "Parola trebuie să aibă cel puțin 8 caractere.", fieldErrors: { password: "Minimum 8 caractere." } };
  }
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
  if (error) return { ok: false, message: error.message };
  if (!data.session) {
    return { ok: true, message: "Cont creat. Confirmă adresa de e-mail din mesajul primit, apoi autentifică-te." };
  }
  redirect("/profile?welcome=1");
}

export async function logout(): Promise<void> {
  if (dataMode() === "demo") {
    (await cookies()).delete(DEMO_COOKIE);
  } else {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

export async function switchRole(mode: RoleMode): Promise<ActionResult> {
  try {
    await profiles.setRoleMode(await getCtx(), mode);
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true };
}

export async function togglePremium(enabled: boolean): Promise<ActionResult> {
  try {
    await profiles.setPremium(await getCtx(), enabled);
  } catch (err) {
    return fail(err);
  }
  refresh();
  return {
    ok: true,
    message: enabled ? "Premium activat (plată simulată). Fără reclame, cu boost." : "Abonamentul Premium a fost oprit.",
  };
}

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const tagSlugs = formData.getAll("tags").map(String);
  const input = {
    fullName: str(formData, "fullName"),
    bio: str(formData, "bio"),
    city: str(formData, "city"),
    hourlyRate: str(formData, "hourlyRate"),
    licenseInfo: str(formData, "licenseInfo"),
    phone: str(formData, "phone"),
    contactEmail: str(formData, "contactEmail"),
    tags: tagSlugs.map((slug) => ({ slug, years: str(formData, `years_${slug}`) || "0" })),
  };
  try {
    await profiles.updateMyProfile(await getCtx(), input);
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true, message: "Profil salvat." };
}

// ---------------------------------------------------------------------------
// Jobs & bids
// ---------------------------------------------------------------------------

export async function createJobAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let jobId: string;
  try {
    jobId = await jobs.createJob(await getCtx(), {
      title: str(formData, "title"),
      description: str(formData, "description"),
      budget: str(formData, "budget"),
      categorySlug: str(formData, "categorySlug"),
      tagSlugs: formData.getAll("tags").map(String),
      city: str(formData, "city"),
      location: str(formData, "location"),
      isRemote: formData.get("isRemote") === "on",
      urgency: str(formData, "urgency"),
    });
  } catch (err) {
    return fail(err);
  }
  redirect(`/jobs/${jobId}?created=1`);
}

export async function placeBidAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await bids.placeBid(await getCtx(), str(formData, "jobId"), {
      price: str(formData, "price"),
      durationHours: str(formData, "durationHours"),
      message: str(formData, "message"),
    });
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true, message: "Oferta a fost trimisă. Clientul o vede acum în lista lui." };
}

export async function acceptBidAction(bidId: string): Promise<ActionResult> {
  try {
    await bids.acceptBid(await getCtx(), bidId);
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true, message: "Ofertă acceptată. Datele de contact și chatul sunt acum deblocate." };
}

export async function rejectBidAction(bidId: string): Promise<ActionResult> {
  try {
    await bids.rejectBid(await getCtx(), bidId);
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true, message: "Oferta a fost respinsă." };
}

export async function completeJobAction(jobId: string): Promise<ActionResult> {
  try {
    await jobs.completeJob(await getCtx(), jobId);
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true, message: "Job finalizat. Acum vă puteți evalua reciproc." };
}

export async function cancelJobAction(jobId: string): Promise<ActionResult> {
  try {
    await jobs.cancelJob(await getCtx(), jobId);
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true, message: "Jobul a fost anulat." };
}

export async function sendMessageAction(jobId: string, body: string): Promise<ActionResult> {
  try {
    await chat.sendMessage(await getCtx(), jobId, { body });
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true };
}

export async function createReviewAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await reviews.createReview(await getCtx(), {
      jobId: str(formData, "jobId"),
      rating: str(formData, "rating"),
      comment: str(formData, "comment"),
    });
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true, message: "Mulțumim! Recenzia a fost publicată." };
}

export async function createReportAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const res = await reports.createReport(await getCtx(), {
      targetType: str(formData, "targetType"),
      targetId: str(formData, "targetId"),
      reason: str(formData, "reason"),
      details: str(formData, "details"),
    });
    refresh();
    return {
      ok: true,
      message: res.targetBanned
        ? "Raport trimis. Contul a atins pragul de raportări și a fost suspendat automat (investigație)."
        : "Raport trimis. Echipa de moderare îl va analiza.",
    };
  } catch (err) {
    return fail(err);
  }
}

export async function analyzeMatchAction(jobId: string, workerId: string): Promise<ActionResult<MatchAnalysis>> {
  try {
    const data = await analyzeMatch(await getCtx(), jobId, workerId);
    return { ok: true, data };
  } catch (err) {
    return fail(err);
  }
}

// ---------------------------------------------------------------------------
// Moderation
// ---------------------------------------------------------------------------

export async function adminBanAction(profileId: string): Promise<ActionResult> {
  try {
    await admin.banUser(await getCtx(), profileId);
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true, message: "Cont suspendat." };
}

export async function adminUnbanAction(profileId: string, resetReports: boolean): Promise<ActionResult> {
  try {
    await admin.unbanUser(await getCtx(), profileId, resetReports);
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true, message: resetReports ? "Cont deblocat, contor resetat." : "Cont deblocat." };
}

export async function adminVerifyAction(profileId: string, verified: boolean): Promise<ActionResult> {
  try {
    await admin.verifyUser(await getCtx(), profileId, verified);
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true, message: verified ? "Profil marcat ca verificat." : "Insigna de verificare a fost scoasă." };
}

export async function adminDismissReportAction(reportId: string): Promise<ActionResult> {
  try {
    await admin.dismissReport(await getCtx(), reportId);
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true, message: "Raport respins; contorul a scăzut cu 1." };
}

export async function adminActionReportAction(reportId: string): Promise<ActionResult> {
  try {
    await admin.markReportActioned(await getCtx(), reportId);
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true, message: "Raport marcat ca rezolvat." };
}

export async function adminUpdateSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await admin.updateModerationSettings(await getCtx(), {
      autoBanThreshold: str(formData, "autoBanThreshold"),
      autoBanEnabled: formData.get("autoBanEnabled") === "on",
    });
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true, message: "Regulile de suspendare au fost salvate." };
}

export async function adminResetDemoAction(): Promise<ActionResult> {
  try {
    const ctx = await getCtx();
    if (!ctx.viewer?.profile.isAdmin) throw new AppError("FORBIDDEN", "Doar moderatorii pot reseta datele.");
    await resetDemoDatabase();
  } catch (err) {
    return fail(err);
  }
  (await cookies()).delete(DEMO_COOKIE);
  redirect("/login?reset=1");
}
