import { AppError, BANNED_MESSAGE } from "./errors";
import type { Ctx, Profile } from "./types";

export function requireViewer(ctx: Ctx): { authUserId: string; profile: Profile } {
  if (!ctx.viewer) throw new AppError("UNAUTHENTICATED", "Trebuie să fii autentificat.");
  return ctx.viewer;
}

export function requireActive(ctx: Ctx): { authUserId: string; profile: Profile } {
  const viewer = requireViewer(ctx);
  if (viewer.profile.isBanned) throw new AppError("BANNED", BANNED_MESSAGE);
  return viewer;
}

export function requireAdmin(ctx: Ctx): { authUserId: string; profile: Profile } {
  const viewer = requireViewer(ctx);
  if (!viewer.profile.isAdmin) throw new AppError("FORBIDDEN", "Doar moderatorii au acces aici.");
  return viewer;
}

export const viewerAuthId = (ctx: Ctx): string | null => ctx.viewer?.authUserId ?? null;
