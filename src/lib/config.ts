/**
 * Central, env-driven configuration.
 *
 * Data modes:
 *  - "demo": embedded PostgreSQL (PGlite) seeded at startup. No external services needed.
 *  - "supabase": Supabase Auth + Realtime, PostgreSQL via DATABASE_URL (RLS enforced per request).
 *
 * If DATA_MODE is not set, the app uses "supabase" only when all required variables exist.
 */

export type DataMode = "demo" | "supabase";

export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "Gata",
  tagline: "Găsește omul potrivit pentru orice treabă",
  premiumPriceLabel: "9,99 $ / lună",
  currency: "lei",
};

/**
 * Reads a variable at runtime. `process.env.NEXT_PUBLIC_X` written literally is inlined by `next build`
 * (also in server code), which would freeze it inside a prebuilt Docker image; a dynamic lookup is not.
 * Client components receive these values as props from the server.
 */
function runtimeEnv(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

export function supabaseUrl(): string | undefined {
  return runtimeEnv("NEXT_PUBLIC_SUPABASE_URL");
}

export function supabaseAnonKey(): string | undefined {
  return runtimeEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || runtimeEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export function dataMode(): DataMode {
  const explicit = runtimeEnv("DATA_MODE")?.toLowerCase();
  if (explicit === "demo" || explicit === "supabase") return explicit;
  return runtimeEnv("DATABASE_URL") && supabaseUrl() && supabaseAnonKey() ? "supabase" : "demo";
}

export const aiConfig = {
  apiKey: () => process.env.OPENAI_API_KEY || undefined,
  model: () => process.env.OPENAI_MODEL || "gpt-4o-mini",
  embeddingModel: () => process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
  /** Embeddings are always requested at this size so they fit the vector(1536) column. */
  embeddingDimensions: 1536,
};

export function demoSessionSecret(): string {
  return process.env.DEMO_SESSION_SECRET || "gata-demo-secret-change-me";
}

/** Shared password of the seeded demo accounts in Supabase mode (see scripts/seed.ts). */
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "Demo1234!";
