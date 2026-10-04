-- =============================================================================
-- Gata · Service matchmaking marketplace
-- Schema, Row Level Security, triggers and RPC functions.
--
-- Runs unchanged on Supabase (PostgreSQL 15+) and on the embedded PGlite
-- database used by demo mode. Demo mode creates a minimal `auth` schema
-- (auth.users, auth.uid(), roles anon/authenticated) before applying this file.
-- =============================================================================

create schema if not exists extensions;
create extension if not exists vector with schema extensions;
create extension if not exists unaccent with schema extensions;

-- -----------------------------------------------------------------------------
-- Taxonomy: categories (specialized vs casual) and tags
-- -----------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kind text not null check (kind in ('specialized', 'casual')),
  icon text not null default 'briefcase',
  description text not null default '',
  sort int not null default 0
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  slug text not null unique,
  name text not null,
  requires_license boolean not null default false,
  license_note text,
  sort int not null default 0
);
create index tags_category_idx on public.tags (category_id);

-- -----------------------------------------------------------------------------
-- Profiles (one per auth user; a single account works as client and worker)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  bio text not null default '' check (char_length(bio) <= 2000),
  city text not null default '',
  role_mode text not null default 'client' check (role_mode in ('worker', 'client')),
  is_premium boolean not null default false,
  premium_since timestamptz,
  boost_level int not null default 0 check (boost_level between 0 and 3),
  is_banned boolean not null default false,
  banned_reason text,
  banned_at timestamptz,
  report_count int not null default 0 check (report_count >= 0),
  is_admin boolean not null default false,
  is_verified boolean not null default false,
  license_info text,
  hourly_rate int check (hourly_rate is null or hourly_rate between 0 and 10000),
  portfolio jsonb not null default '[]'::jsonb,
  rating_avg numeric(3, 2) not null default 0,
  rating_count int not null default 0,
  created_at timestamptz not null default now()
);
create index profiles_banned_idx on public.profiles (is_banned);

-- Contact details are kept apart so they can be unlocked only after a bid is accepted.
create table public.contacts (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  phone text check (phone is null or char_length(phone) <= 40),
  email text check (email is null or char_length(email) <= 200)
);

create table public.worker_tags (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  years_experience int not null default 0 check (years_experience between 0 and 70),
  primary key (profile_id, tag_id)
);
create index worker_tags_tag_idx on public.worker_tags (tag_id);

-- -----------------------------------------------------------------------------
-- Jobs and bids
-- -----------------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 5 and 120),
  description text not null check (char_length(description) between 20 and 4000),
  budget int not null check (budget between 0 and 10000000),
  category_id uuid not null references public.categories (id),
  city text not null default '',
  location text not null default '',
  is_remote boolean not null default false,
  urgency text not null default 'flexible' check (urgency in ('urgent', 'week', 'flexible')),
  status text not null default 'open' check (status in ('open', 'assigned', 'completed', 'cancelled')),
  assigned_bid_id uuid,
  assigned_worker_id uuid references public.profiles (id) on delete set null,
  bid_count int not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index jobs_status_created_idx on public.jobs (status, created_at desc);
create index jobs_client_idx on public.jobs (client_id);

create table public.job_tags (
  job_id uuid not null references public.jobs (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (job_id, tag_id)
);
create index job_tags_tag_idx on public.job_tags (tag_id);

create table public.bids (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  worker_id uuid not null references public.profiles (id) on delete cascade,
  price int not null check (price between 1 and 10000000),
  duration_hours numeric(6, 1) not null check (duration_hours > 0 and duration_hours <= 5000),
  message text not null default '' check (char_length(message) <= 2000),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  unique (job_id, worker_id)
);
create index bids_job_idx on public.bids (job_id);
create index bids_worker_idx on public.bids (worker_id);

alter table public.jobs
  add constraint jobs_assigned_bid_fk foreign key (assigned_bid_id) references public.bids (id) on delete set null;

-- -----------------------------------------------------------------------------
-- Internal chat (unlocked after a bid is accepted)
-- -----------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_job_idx on public.messages (job_id, created_at);

-- -----------------------------------------------------------------------------
-- Reviews: mutual, 1–5 stars, tied to (job_id, worker_id, service_id)
-- -----------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  worker_id uuid not null references public.profiles (id) on delete cascade,
  service_id uuid references public.tags (id) on delete set null,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewee_id uuid not null references public.profiles (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 2000),
  created_at timestamptz not null default now(),
  unique (job_id, reviewer_id),
  check (reviewer_id <> reviewee_id)
);
create index reviews_reviewee_idx on public.reviews (reviewee_id);

-- -----------------------------------------------------------------------------
-- Reports and moderation
-- -----------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('profile', 'job', 'bid')),
  target_id uuid not null,
  target_profile_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('spam', 'fraud', 'inappropriate', 'fake_profile', 'no_show', 'unlicensed', 'other')),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);
create index reports_target_profile_idx on public.reports (target_profile_id);

create table public.moderation_settings (
  id int primary key default 1 check (id = 1),
  auto_ban_threshold int not null default 5 check (auto_ban_threshold between 1 and 100),
  auto_ban_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.moderation_settings (id) values (1);

-- -----------------------------------------------------------------------------
-- Embeddings for semantic matching (OpenAI text-embedding-3-small, 1536 dims)
-- -----------------------------------------------------------------------------
create table public.embeddings (
  owner_type text not null check (owner_type in ('job', 'profile')),
  owner_id uuid not null,
  model text not null,
  content_hash text not null,
  embedding extensions.vector(1536) not null,
  updated_at timestamptz not null default now(),
  primary key (owner_type, owner_id)
);

-- =============================================================================
-- Helper functions used by RLS policies (SECURITY DEFINER avoids recursion)
-- =============================================================================
create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.profiles p where p.user_id = auth.uid()
$$;

create or replace function public.is_banned_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.is_banned from public.profiles p where p.user_id = auth.uid()), false)
$$;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.is_admin from public.profiles p where p.user_id = auth.uid()), false)
$$;

-- True when the caller is the client or the assigned worker of an assigned/completed job.
create or replace function public.is_job_party(p_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.jobs j
    where j.id = p_job_id
      and j.status in ('assigned', 'completed')
      and public.current_profile_id() is not null
      and (j.client_id = public.current_profile_id() or j.assigned_worker_id = public.current_profile_id())
  )
$$;

-- Contact details are visible to the owner and to the counterparty of an accepted bid.
create or replace function public.can_view_contact(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_profile_id() is not null and (
    p_profile_id = public.current_profile_id()
    or exists (
      select 1
      from public.jobs j
      where j.status in ('assigned', 'completed')
        and j.assigned_worker_id is not null
        and (
          (j.client_id = public.current_profile_id() and j.assigned_worker_id = p_profile_id)
          or (j.assigned_worker_id = public.current_profile_id() and j.client_id = p_profile_id)
        )
    )
  )
$$;

-- =============================================================================
-- Triggers
-- =============================================================================

-- New auth user → profile + contact row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
begin
  insert into public.profiles (user_id, full_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(new.email, ''), '@', 1))
  )
  returning id into v_profile_id;

  insert into public.contacts (profile_id, email) values (v_profile_id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep jobs.bid_count in sync (bids themselves are private to the client and the bidder).
create or replace function public.sync_job_bid_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.jobs set bid_count = bid_count + 1 where id = new.job_id;
  elsif tg_op = 'DELETE' then
    update public.jobs set bid_count = greatest(bid_count - 1, 0) where id = old.job_id;
  end if;
  return null;
end;
$$;

create trigger bids_count_sync
  after insert or delete on public.bids
  for each row execute function public.sync_job_bid_count();

-- Recompute the reviewee's average rating whenever reviews change.
create or replace function public.recompute_rating_for(p_profile_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles p
  set rating_avg = coalesce((select round(avg(r.rating)::numeric, 2) from public.reviews r where r.reviewee_id = p_profile_id), 0),
      rating_count = (select count(*)::int from public.reviews r where r.reviewee_id = p_profile_id)
  where p.id = p_profile_id
$$;

create or replace function public.sync_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_rating_for(old.reviewee_id);
  else
    perform public.recompute_rating_for(new.reviewee_id);
    if tg_op = 'UPDATE' and old.reviewee_id <> new.reviewee_id then
      perform public.recompute_rating_for(old.reviewee_id);
    end if;
  end if;
  return null;
end;
$$;

create trigger reviews_rating_sync
  after insert or update or delete on public.reviews
  for each row execute function public.sync_rating();

-- Resolve which profile a report is about (cannot be spoofed by the client).
create or replace function public.reports_resolve_target()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.target_type = 'profile' then
    select p.id into new.target_profile_id from public.profiles p where p.id = new.target_id;
  elsif new.target_type = 'job' then
    select j.client_id into new.target_profile_id from public.jobs j where j.id = new.target_id;
  elsif new.target_type = 'bid' then
    select b.worker_id into new.target_profile_id from public.bids b where b.id = new.target_id;
  end if;

  if new.target_profile_id is null then
    raise exception 'REPORT_TARGET_NOT_FOUND' using errcode = 'P0001';
  end if;
  if new.target_profile_id = new.reporter_id then
    raise exception 'CANNOT_REPORT_SELF' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger reports_before_insert
  before insert on public.reports
  for each row execute function public.reports_resolve_target();

-- Increment report_count and auto-ban at the configured threshold (default 5).
create or replace function public.reports_apply_auto_ban()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
  v_threshold int;
  v_enabled boolean;
begin
  update public.profiles
  set report_count = report_count + 1
  where id = new.target_profile_id
  returning report_count into v_count;

  select s.auto_ban_threshold, s.auto_ban_enabled
  into v_threshold, v_enabled
  from public.moderation_settings s
  where s.id = 1;

  if coalesce(v_enabled, true) and v_count >= coalesce(v_threshold, 5) then
    update public.profiles
    set is_banned = true,
        banned_at = now(),
        banned_reason = 'Suspendat automat după ' || v_count || ' raportări (în investigație)'
    where id = new.target_profile_id and is_banned = false;
  end if;
  return null;
end;
$$;

create trigger reports_after_insert
  after insert on public.reports
  for each row execute function public.reports_apply_auto_ban();

-- =============================================================================
-- RPC functions for state transitions (atomic, ownership-checked)
-- Errors use SQLSTATE P0001 with a stable code in the message.
-- =============================================================================
create or replace function public.accept_bid(p_bid_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.current_profile_id();
  v_bid public.bids%rowtype;
  v_job public.jobs%rowtype;
begin
  if v_me is null then raise exception 'UNAUTHENTICATED' using errcode = 'P0001'; end if;
  if public.is_banned_user() then raise exception 'BANNED' using errcode = 'P0001'; end if;

  select * into v_bid from public.bids where id = p_bid_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;

  select * into v_job from public.jobs where id = v_bid.job_id for update;
  if v_job.client_id <> v_me then raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;
  if v_job.status <> 'open' then raise exception 'JOB_NOT_OPEN' using errcode = 'P0001'; end if;
  if v_bid.status <> 'pending' then raise exception 'BID_NOT_PENDING' using errcode = 'P0001'; end if;
  if exists (select 1 from public.profiles p where p.id = v_bid.worker_id and p.is_banned) then
    raise exception 'WORKER_BANNED' using errcode = 'P0001';
  end if;

  update public.bids set status = 'accepted' where id = p_bid_id;
  update public.bids set status = 'rejected' where job_id = v_job.id and id <> p_bid_id and status = 'pending';
  update public.jobs
  set status = 'assigned', assigned_bid_id = p_bid_id, assigned_worker_id = v_bid.worker_id
  where id = v_job.id;
end;
$$;

create or replace function public.reject_bid(p_bid_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.current_profile_id();
  v_bid public.bids%rowtype;
  v_job public.jobs%rowtype;
begin
  if v_me is null then raise exception 'UNAUTHENTICATED' using errcode = 'P0001'; end if;
  if public.is_banned_user() then raise exception 'BANNED' using errcode = 'P0001'; end if;

  select * into v_bid from public.bids where id = p_bid_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
  select * into v_job from public.jobs where id = v_bid.job_id;
  if v_job.client_id <> v_me then raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;
  if v_bid.status <> 'pending' then raise exception 'BID_NOT_PENDING' using errcode = 'P0001'; end if;

  update public.bids set status = 'rejected' where id = p_bid_id;
end;
$$;

create or replace function public.complete_job(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.current_profile_id();
  v_job public.jobs%rowtype;
begin
  if v_me is null then raise exception 'UNAUTHENTICATED' using errcode = 'P0001'; end if;
  select * into v_job from public.jobs where id = p_job_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
  if v_job.client_id <> v_me then raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;
  if v_job.status <> 'assigned' then raise exception 'JOB_NOT_ASSIGNED' using errcode = 'P0001'; end if;
  update public.jobs set status = 'completed', completed_at = now() where id = p_job_id;
end;
$$;

create or replace function public.cancel_job(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.current_profile_id();
  v_job public.jobs%rowtype;
begin
  if v_me is null then raise exception 'UNAUTHENTICATED' using errcode = 'P0001'; end if;
  select * into v_job from public.jobs where id = p_job_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
  if v_job.client_id <> v_me then raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;
  if v_job.status not in ('open', 'assigned') then raise exception 'JOB_NOT_CANCELLABLE' using errcode = 'P0001'; end if;
  update public.jobs set status = 'cancelled' where id = p_job_id;
  update public.bids set status = 'rejected' where job_id = p_job_id and status = 'pending';
end;
$$;

-- Mutual review after completion. The reviewee and the service are derived from the job.
create or replace function public.create_review(p_job_id uuid, p_rating int, p_comment text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.current_profile_id();
  v_job public.jobs%rowtype;
  v_reviewee uuid;
  v_service uuid;
  v_id uuid;
begin
  if v_me is null then raise exception 'UNAUTHENTICATED' using errcode = 'P0001'; end if;
  if public.is_banned_user() then raise exception 'BANNED' using errcode = 'P0001'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'INVALID_RATING' using errcode = 'P0001'; end if;

  select * into v_job from public.jobs where id = p_job_id;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
  if v_job.status <> 'completed' then raise exception 'JOB_NOT_COMPLETED' using errcode = 'P0001'; end if;

  if v_me = v_job.client_id then
    v_reviewee := v_job.assigned_worker_id;
  elsif v_me = v_job.assigned_worker_id then
    v_reviewee := v_job.client_id;
  else
    raise exception 'NOT_PARTY' using errcode = 'P0001';
  end if;

  select jt.tag_id into v_service
  from public.job_tags jt
  join public.tags t on t.id = jt.tag_id
  where jt.job_id = p_job_id
  order by t.sort, t.name
  limit 1;

  if exists (select 1 from public.reviews r where r.job_id = p_job_id and r.reviewer_id = v_me) then
    raise exception 'ALREADY_REVIEWED' using errcode = 'P0001';
  end if;

  insert into public.reviews (job_id, worker_id, service_id, reviewer_id, reviewee_id, rating, comment)
  values (p_job_id, v_job.assigned_worker_id, v_service, v_me, v_reviewee, p_rating, left(coalesce(p_comment, ''), 2000))
  returning id into v_id;
  return v_id;
end;
$$;

-- Mock checkout for the hackathon: toggles Premium on the caller's own profile.
-- In production this would be set by a payment webhook running with the service role.
create or replace function public.set_premium_demo(p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED' using errcode = 'P0001'; end if;
  update public.profiles
  set is_premium = p_enabled,
      boost_level = case when p_enabled then 1 else 0 end,
      premium_since = case when p_enabled then now() else null end
  where user_id = auth.uid();
end;
$$;

-- Semantic similarity between a job and candidate worker profiles (pgvector cosine).
create or replace function public.match_profiles_for_job(p_job_id uuid)
returns table (profile_id uuid, similarity double precision)
language sql
stable
security definer
set search_path = ''
as $$
  select w.owner_id as profile_id,
         1 - (w.embedding operator(extensions.<=>) j.embedding) as similarity
  from public.embeddings j
  join public.embeddings w on w.owner_type = 'profile'
  where j.owner_type = 'job' and j.owner_id = p_job_id
$$;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.worker_tags enable row level security;
alter table public.jobs enable row level security;
alter table public.job_tags enable row level security;
alter table public.bids enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_settings enable row level security;
alter table public.embeddings enable row level security;

create policy categories_read on public.categories for select to anon, authenticated using (true);
create policy tags_read on public.tags for select to anon, authenticated using (true);

create policy profiles_read on public.profiles for select to anon, authenticated using (true);
create policy profiles_update_own on public.profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy contacts_read on public.contacts for select to authenticated
  using (public.can_view_contact(profile_id));
create policy contacts_insert_own on public.contacts for insert to authenticated
  with check (profile_id = public.current_profile_id());
create policy contacts_update_own on public.contacts for update to authenticated
  using (profile_id = public.current_profile_id()) with check (profile_id = public.current_profile_id());

create policy worker_tags_read on public.worker_tags for select to anon, authenticated using (true);
create policy worker_tags_insert_own on public.worker_tags for insert to authenticated
  with check (profile_id = public.current_profile_id());
create policy worker_tags_delete_own on public.worker_tags for delete to authenticated
  using (profile_id = public.current_profile_id());

create policy jobs_read on public.jobs for select to anon, authenticated using (true);
create policy jobs_insert_own on public.jobs for insert to authenticated
  with check (client_id = public.current_profile_id() and not public.is_banned_user());
create policy jobs_update_own on public.jobs for update to authenticated
  using (client_id = public.current_profile_id())
  with check (client_id = public.current_profile_id() and not public.is_banned_user());

create policy job_tags_read on public.job_tags for select to anon, authenticated using (true);
create policy job_tags_insert_own on public.job_tags for insert to authenticated
  with check (exists (select 1 from public.jobs j where j.id = job_id and j.client_id = public.current_profile_id()));
create policy job_tags_delete_own on public.job_tags for delete to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_id and j.client_id = public.current_profile_id()));

-- Bids are private to the bidder and the job owner. Status changes go through RPC functions.
create policy bids_read on public.bids for select to authenticated
  using (
    worker_id = public.current_profile_id()
    or exists (select 1 from public.jobs j where j.id = job_id and j.client_id = public.current_profile_id())
  );
create policy bids_insert_own on public.bids for insert to authenticated
  with check (
    worker_id = public.current_profile_id()
    and not public.is_banned_user()
    and exists (
      select 1 from public.jobs j
      where j.id = job_id and j.status = 'open' and j.client_id <> public.current_profile_id()
    )
  );

create policy messages_read on public.messages for select to authenticated
  using (public.is_job_party(job_id));
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = public.current_profile_id() and public.is_job_party(job_id) and not public.is_banned_user());

create policy reviews_read on public.reviews for select to anon, authenticated using (true);

create policy reports_read_own on public.reports for select to authenticated
  using (reporter_id = public.current_profile_id());
create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = public.current_profile_id() and not public.is_banned_user());

create policy moderation_settings_read on public.moderation_settings for select to anon, authenticated using (true);
-- embeddings: no policies → only the server (service connection) can read/write.

-- =============================================================================
-- Privileges (least privilege; column-level where it matters)
-- =============================================================================
revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;

grant select on public.categories, public.tags, public.worker_tags, public.jobs, public.job_tags,
  public.reviews, public.moderation_settings to anon, authenticated;

-- report_count is intentionally not readable by clients.
grant select (id, user_id, full_name, avatar_url, bio, city, role_mode, is_premium, premium_since, boost_level,
  is_banned, banned_reason, banned_at, is_admin, is_verified, license_info, hourly_rate, portfolio,
  rating_avg, rating_count, created_at) on public.profiles to anon, authenticated;
grant update (full_name, avatar_url, bio, city, role_mode, hourly_rate, portfolio, license_info)
  on public.profiles to authenticated;

grant select, insert, update on public.contacts to authenticated;
grant insert, delete on public.worker_tags to authenticated;
grant insert (client_id, title, description, budget, category_id, city, location, is_remote, urgency)
  on public.jobs to authenticated;
grant update (title, description, budget, city, location, is_remote, urgency) on public.jobs to authenticated;
grant insert, delete on public.job_tags to authenticated;
grant select on public.bids to authenticated;
grant insert (job_id, worker_id, price, duration_hours, message) on public.bids to authenticated;
grant select on public.messages to authenticated;
grant insert (job_id, sender_id, body) on public.messages to authenticated;
grant select on public.reports to authenticated;
grant insert (reporter_id, target_type, target_id, reason, details) on public.reports to authenticated;

revoke execute on function public.accept_bid(uuid), public.reject_bid(uuid), public.complete_job(uuid),
  public.cancel_job(uuid), public.create_review(uuid, int, text), public.set_premium_demo(boolean),
  public.match_profiles_for_job(uuid), public.recompute_rating_for(uuid) from public;
revoke execute on function public.accept_bid(uuid), public.reject_bid(uuid), public.complete_job(uuid),
  public.cancel_job(uuid), public.create_review(uuid, int, text), public.set_premium_demo(boolean),
  public.match_profiles_for_job(uuid), public.recompute_rating_for(uuid) from anon;
grant execute on function public.accept_bid(uuid), public.reject_bid(uuid), public.complete_job(uuid),
  public.cancel_job(uuid), public.create_review(uuid, int, text), public.set_premium_demo(boolean)
  to authenticated;
grant execute on function public.current_profile_id(), public.is_banned_user(), public.is_admin_user(),
  public.is_job_party(uuid), public.can_view_contact(uuid) to anon, authenticated;

-- Realtime (Supabase only): stream new bids and chat messages. RLS still applies.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.bids, public.messages;
  end if;
end;
$$;

-- =============================================================================
-- Reference data: categories and tags
-- =============================================================================
insert into public.categories (slug, name, kind, icon, description, sort) values
  ('instalatii-constructii', 'Instalații & construcții', 'specialized', 'hammer', 'Electricieni, instalatori, tâmplari, zugravi', 1),
  ('it-creativ', 'IT & creativ', 'specialized', 'code', 'Programare, design, fotografie', 2),
  ('casa-curatenie', 'Casă & curățenie', 'casual', 'sparkles', 'Curățenie, călcat, ajutor gospodăresc', 3),
  ('montaj-mutari', 'Montaj & mutări', 'casual', 'sofa', 'Montaj mobilă, mutări, TV și rafturi', 4),
  ('gradina-animale', 'Grădină & animale', 'casual', 'paw-print', 'Grădinărit, plimbat câini, pet sitting', 5);

insert into public.tags (category_id, slug, name, requires_license, license_note, sort)
select c.id, t.slug, t.name, t.requires_license, t.license_note, t.sort
from (values
  ('instalatii-constructii', 'electrician', 'Electrician', true,
    'Lucrările la instalații electrice se fac de electricieni autorizați ANRE. Cere legitimația înainte de lucrare.', 1),
  ('instalatii-constructii', 'instalator', 'Instalator', false, null, 2),
  ('instalatii-constructii', 'tamplar', 'Tâmplar', false, null, 3),
  ('instalatii-constructii', 'zugrav', 'Zugrav', false, null, 4),
  ('instalatii-constructii', 'faiantar', 'Faianțar', false, null, 5),
  ('it-creativ', 'programator', 'Programator', false, null, 1),
  ('it-creativ', 'designer', 'Designer', false, null, 2),
  ('it-creativ', 'fotograf', 'Fotograf', false, null, 3),
  ('casa-curatenie', 'curatenie', 'Curățenie', false, null, 1),
  ('casa-curatenie', 'ajutor-gospodaresc', 'Ajutor gospodăresc', false, null, 2),
  ('casa-curatenie', 'calcat', 'Călcat rufe', false, null, 3),
  ('montaj-mutari', 'montaj-mobila-ikea', 'Montaj mobilă IKEA', false, null, 1),
  ('montaj-mutari', 'mutari', 'Mutări', false, null, 2),
  ('montaj-mutari', 'montaj-tv-rafturi', 'Montaj TV & rafturi', false, null, 3),
  ('gradina-animale', 'gradinarit', 'Grădinărit', false, null, 1),
  ('gradina-animale', 'plimbat-caini', 'Plimbat câini', false, null, 2),
  ('gradina-animale', 'pet-sitting', 'Pet sitting', false, null, 3)
) as t(category_slug, slug, name, requires_license, license_note, sort)
join public.categories c on c.slug = t.category_slug;
