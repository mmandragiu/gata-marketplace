/**
 * Shared SQL fragments. Nested objects are built with json_build_object so both drivers
 * (PGlite and postgres.js) return ready-to-use JS objects. Only columns granted to the
 * anon/authenticated roles are referenced here (report_count is never selected).
 */

export const profileSummaryJson = (a: string) => `json_build_object(
  'id', ${a}.id, 'fullName', ${a}.full_name, 'avatarUrl', ${a}.avatar_url, 'city', ${a}.city,
  'isPremium', ${a}.is_premium, 'isVerified', ${a}.is_verified, 'isBanned', ${a}.is_banned,
  'ratingAvg', ${a}.rating_avg::float8, 'ratingCount', ${a}.rating_count)`;

export const PROFILE_COLUMNS = (a: string) => `${a}.id, ${a}.user_id, ${a}.full_name, ${a}.avatar_url, ${a}.bio, ${a}.city,
  ${a}.role_mode, ${a}.is_premium, ${a}.premium_since, ${a}.boost_level, ${a}.is_banned, ${a}.banned_reason,
  ${a}.is_admin, ${a}.is_verified, ${a}.license_info, ${a}.hourly_rate, ${a}.portfolio,
  ${a}.rating_avg::float8 as rating_avg, ${a}.rating_count, ${a}.created_at`;

export const tagJson = (t: string) => `json_build_object(
  'id', ${t}.id, 'slug', ${t}.slug, 'name', ${t}.name, 'categoryId', ${t}.category_id,
  'requiresLicense', ${t}.requires_license, 'licenseNote', ${t}.license_note)`;

export const jobTagsJson = (j: string) => `coalesce((
  select json_agg(${tagJson("t")} order by t.sort, t.name)
  from public.job_tags jt join public.tags t on t.id = jt.tag_id
  where jt.job_id = ${j}.id), '[]'::json)`;

export const workerTagsJson = (p: string) => `coalesce((
  select json_agg(json_build_object(
    'id', t.id, 'slug', t.slug, 'name', t.name, 'categoryId', t.category_id,
    'requiresLicense', t.requires_license, 'licenseNote', t.license_note,
    'yearsExperience', wt.years_experience, 'categoryName', c.name, 'categoryKind', c.kind
  ) order by c.sort, t.sort)
  from public.worker_tags wt
  join public.tags t on t.id = wt.tag_id
  join public.categories c on c.id = t.category_id
  where wt.profile_id = ${p}.id), '[]'::json)`;

export const JOB_SELECT = `
  select j.id, j.title, j.description, j.budget, j.city, j.location, j.is_remote, j.urgency, j.status,
         j.bid_count, j.created_at, j.completed_at, j.assigned_bid_id, j.assigned_worker_id,
         json_build_object('id', cat.id, 'slug', cat.slug, 'name', cat.name, 'kind', cat.kind, 'icon', cat.icon) as category,
         ${jobTagsJson("j")} as tags,
         ${profileSummaryJson("c")} as client
  from public.jobs j
  join public.categories cat on cat.id = j.category_id
  join public.profiles c on c.id = j.client_id`;

/** Accent- and case-insensitive containment, e.g. "curatenie" matches "Curățenie". */
export const ilikeUnaccent = (expr: string, param: string) =>
  `extensions.unaccent(lower(${expr})) like '%' || extensions.unaccent(lower(${param})) || '%'`;
