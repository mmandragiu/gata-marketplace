import { NextResponse } from "next/server";

import { getCtx } from "@/lib/auth/session";
import { AppError, errorStatus, toAppError } from "@/lib/services/errors";
import type { Ctx } from "@/lib/services/types";

/**
 * Wraps a Route Handler: builds the request context (DB + signed-in user from cookies),
 * returns `{ data }` on success and `{ error: { code, message, fieldErrors? } }` on failure.
 */
export async function api<T>(fn: (ctx: Ctx) => Promise<T>, status = 200): Promise<NextResponse> {
  try {
    const ctx = await getCtx();
    const data = await fn(ctx);
    return NextResponse.json({ data }, { status, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const e = toAppError(err);
    return NextResponse.json(
      { error: { code: e.code, message: e.message, ...(e.fieldErrors ? { fieldErrors: e.fieldErrors } : {}) } },
      { status: errorStatus[e.code], headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) return body as Record<string, unknown>;
  } catch {
    // fall through
  }
  throw new AppError("VALIDATION", "Corpul cererii trebuie să fie un obiect JSON.");
}

export function searchParam(request: Request, key: string): string | null {
  const v = new URL(request.url).searchParams.get(key);
  return v && v.trim() ? v.trim() : null;
}

export function notFound(what = "Resursa"): never {
  throw new AppError("NOT_FOUND", `${what} nu există.`);
}
