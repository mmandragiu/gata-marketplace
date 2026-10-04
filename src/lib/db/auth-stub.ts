/**
 * SQL that prepares a plain PostgreSQL database (PGlite, or an empty Postgres used by the tests)
 * for the Supabase migration. Supabase itself already provides all of this.
 */

/**
 * Minimal stand-in for the Supabase `auth` schema so the same migration and RLS policies
 * run inside the embedded database. auth.uid() matches Supabase's implementation.
 */
export const AUTH_STUB_SQL = `
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(
    coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    ),
    ''
  )::uuid
$$;

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;

grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
`;

export const EXTENSIONS_GRANT_SQL = `grant usage on schema extensions to anon, authenticated;`;
