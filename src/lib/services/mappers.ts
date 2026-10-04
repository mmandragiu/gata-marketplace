import type { Job, PortfolioItem, Profile, ProfileSummary, Tag, WorkerTag } from "./types";

type R = Record<string, unknown>;

export function iso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? v : d.toISOString();
  }
  return new Date(0).toISOString();
}

export function isoOrNull(v: unknown): string | null {
  return v === null || v === undefined ? null : iso(v);
}

export function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  if (typeof v === "bigint") return Number(v);
  return 0;
}

function json<T>(v: unknown, fallback: T): T {
  if (v === null || v === undefined) return fallback;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  return v as T;
}

export function mapSummary(v: unknown): ProfileSummary {
  const o = json<R>(v, {});
  return {
    id: String(o.id),
    fullName: String(o.fullName ?? ""),
    avatarUrl: (o.avatarUrl as string | null) ?? null,
    city: String(o.city ?? ""),
    isPremium: Boolean(o.isPremium),
    isVerified: Boolean(o.isVerified),
    isBanned: Boolean(o.isBanned),
    ratingAvg: num(o.ratingAvg),
    ratingCount: num(o.ratingCount),
  };
}

export function mapTags(v: unknown): Tag[] {
  return json<R[]>(v, []).map((t) => ({
    id: String(t.id),
    slug: String(t.slug),
    name: String(t.name),
    categoryId: String(t.categoryId),
    requiresLicense: Boolean(t.requiresLicense),
    licenseNote: (t.licenseNote as string | null) ?? null,
  }));
}

export function mapWorkerTags(v: unknown): WorkerTag[] {
  return json<R[]>(v, []).map((t) => ({
    id: String(t.id),
    slug: String(t.slug),
    name: String(t.name),
    categoryId: String(t.categoryId),
    requiresLicense: Boolean(t.requiresLicense),
    licenseNote: (t.licenseNote as string | null) ?? null,
    yearsExperience: num(t.yearsExperience),
    categoryName: String(t.categoryName ?? ""),
    categoryKind: t.categoryKind === "casual" ? "casual" : "specialized",
  }));
}

export function mapProfile(r: R): Profile {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    fullName: String(r.full_name ?? ""),
    avatarUrl: (r.avatar_url as string | null) ?? null,
    bio: String(r.bio ?? ""),
    city: String(r.city ?? ""),
    roleMode: r.role_mode === "worker" ? "worker" : "client",
    isPremium: Boolean(r.is_premium),
    premiumSince: isoOrNull(r.premium_since),
    boostLevel: num(r.boost_level),
    isBanned: Boolean(r.is_banned),
    bannedReason: (r.banned_reason as string | null) ?? null,
    isAdmin: Boolean(r.is_admin),
    isVerified: Boolean(r.is_verified),
    licenseInfo: (r.license_info as string | null) ?? null,
    hourlyRate: r.hourly_rate === null || r.hourly_rate === undefined ? null : num(r.hourly_rate),
    portfolio: json<PortfolioItem[]>(r.portfolio, []),
    ratingAvg: num(r.rating_avg),
    ratingCount: num(r.rating_count),
    createdAt: iso(r.created_at),
  };
}

export function mapJob(r: R): Job {
  const category = json<R>(r.category, {});
  const client = mapSummary(r.client);
  const status = String(r.status) as Job["status"];
  return {
    id: String(r.id),
    title: String(r.title),
    description: String(r.description),
    budget: num(r.budget),
    city: String(r.city ?? ""),
    location: String(r.location ?? ""),
    isRemote: Boolean(r.is_remote),
    urgency: String(r.urgency) as Job["urgency"],
    status,
    bidCount: num(r.bid_count),
    createdAt: iso(r.created_at),
    completedAt: isoOrNull(r.completed_at),
    assignedBidId: (r.assigned_bid_id as string | null) ?? null,
    assignedWorkerId: (r.assigned_worker_id as string | null) ?? null,
    category: {
      id: String(category.id),
      slug: String(category.slug),
      name: String(category.name),
      kind: category.kind === "casual" ? "casual" : "specialized",
      icon: String(category.icon ?? "briefcase"),
    },
    tags: mapTags(r.tags),
    client,
    isPromoted: client.isPremium && status === "open",
  };
}
