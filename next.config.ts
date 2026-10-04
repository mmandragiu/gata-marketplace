import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (embedded PostgreSQL for demo mode) loads its WASM/data files at runtime: keep it unbundled.
  serverExternalPackages: ["@electric-sql/pglite", "@electric-sql/pglite-pgvector", "postgres"],
  // The demo database applies the same SQL migrations as Supabase; ship them with the server output.
  outputFileTracingIncludes: {
    "/**": ["./supabase/migrations/**/*.sql"],
  },
  poweredByHeader: false,
};

export default nextConfig;
