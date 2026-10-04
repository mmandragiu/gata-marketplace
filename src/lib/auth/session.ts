import { cookies } from "next/headers";
import { cache } from "react";

import { dataMode } from "@/lib/config";
import { getDb } from "@/lib/db";
import { getOwnProfile } from "@/lib/services/profiles";
import type { Ctx, Viewer } from "@/lib/services/types";

import { DEMO_COOKIE, verifyDemoToken } from "./demo";

async function resolveAuthUserId(): Promise<string | null> {
  if (dataMode() === "demo") {
    const token = (await cookies()).get(DEMO_COOKIE)?.value;
    return verifyDemoToken(token);
  }
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** The signed-in user and their profile (deduplicated per request). */
export const getViewer = cache(async (): Promise<Viewer> => {
  const authUserId = await resolveAuthUserId();
  if (!authUserId) return null;
  const db = await getDb();
  const profile = await getOwnProfile(db, authUserId);
  return profile ? { authUserId, profile } : null;
});

/** Database handle + viewer, passed to every service call. */
export async function getCtx(): Promise<Ctx> {
  const [db, viewer] = await Promise.all([getDb(), getViewer()]);
  return { db, viewer };
}
