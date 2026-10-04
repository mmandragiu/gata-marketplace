export type Row = Record<string, unknown>;

/** Minimal query interface shared by PGlite (demo) and postgres.js (Supabase). Use $1, $2… placeholders. */
export interface Queryable {
  query<T extends Row = Row>(text: string, params?: unknown[]): Promise<T[]>;
}

export interface Db {
  readonly kind: "pglite" | "postgres";
  /**
   * Runs `fn` in a transaction as the given auth user (role `authenticated`) or as `anon`
   * when `authUserId` is null. Row Level Security applies exactly like in Supabase.
   */
  asUser<T>(authUserId: string | null, fn: (q: Queryable) => Promise<T>): Promise<T>;
  /** Runs `fn` in a transaction with the server's own privileges (bypasses RLS). */
  system<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export function claimsFor(authUserId: string | null): { role: string; claims: string } {
  const role = authUserId ? "authenticated" : "anon";
  const claims = JSON.stringify(authUserId ? { sub: authUserId, role } : { role });
  return { role, claims };
}

export const SET_ROLE_SQL =
  "select set_config('role', $1, true), set_config('request.jwt.claims', $2, true)";
