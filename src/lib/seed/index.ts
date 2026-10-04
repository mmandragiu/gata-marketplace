import type { Db, Queryable } from "@/lib/db/types";

import {
  seedAssignedJob,
  seedCompletedJobs,
  seedOpenJobs,
  seedReports,
  seedUsers,
  type SeedJob,
} from "./data";

export type CreateUserFn = (input: { email: string; fullName: string }) => Promise<string>;

export type SeedSummary = {
  users: number;
  openJobs: number;
  bids: number;
  reviews: number;
  reports: number;
  bannedUsers: string[];
};

function lookup(rows: { id: string; slug: string }[], what: string) {
  const map = new Map(rows.map((r) => [r.slug, r.id]));
  return (slug: string) => {
    const id = map.get(slug);
    if (!id) throw new Error(`Seed: ${what} necunoscut: ${slug}`);
    return id;
  };
}

async function insertJob(
  q: Queryable,
  job: Omit<SeedJob, "key" | "bids" | "client" | "tags" | "category"> & {
    clientId: string;
    categoryId: string;
    status: "open" | "assigned" | "completed";
  },
): Promise<string> {
  const rows = await q.query<{ id: string }>(
    `insert into public.jobs (client_id, title, description, budget, category_id, city, location, is_remote, urgency, status, created_at)
     values ($1, $2, $3, $4::int, $5, $6, $7, $8::boolean, $9, $10, now() - make_interval(secs => $11::float8 * 3600))
     returning id`,
    [
      job.clientId,
      job.title,
      job.description,
      job.budget,
      job.categoryId,
      job.city,
      job.location,
      job.isRemote ?? false,
      job.urgency,
      job.status,
      job.hoursAgo,
    ],
  );
  return rows[0].id;
}

async function insertBid(
  q: Queryable,
  bid: { jobId: string; workerId: string; price: number; hours: number; message: string; hoursAgo: number; status?: string },
): Promise<string> {
  const rows = await q.query<{ id: string }>(
    `insert into public.bids (job_id, worker_id, price, duration_hours, message, status, created_at)
     values ($1, $2, $3::int, $4::numeric, $5, $6, now() - make_interval(secs => $7::float8 * 3600))
     returning id`,
    [bid.jobId, bid.workerId, bid.price, bid.hours, bid.message, bid.status ?? "pending", bid.hoursAgo],
  );
  return rows[0].id;
}

/**
 * Seeds the demo dataset. `createUser` creates the auth user (stub table in demo mode,
 * Supabase Admin API in production) and returns its id; a trigger creates the profile.
 */
export async function seedDatabase(db: Db, createUser: CreateUserFn): Promise<SeedSummary> {
  const authIds: Record<string, string> = {};
  for (const u of seedUsers) {
    authIds[u.key] = await createUser({ email: u.email, fullName: u.fullName });
  }

  return db.system(async (q) => {
    const tagId = lookup(await q.query<{ id: string; slug: string }>("select id, slug from public.tags"), "tag");
    const categoryId = lookup(
      await q.query<{ id: string; slug: string }>("select id, slug from public.categories"),
      "categorie",
    );

    // Profiles, contacts and worker tags
    const pid: Record<string, string> = {};
    for (const u of seedUsers) {
      const rows = await q.query<{ id: string }>(
        `update public.profiles set
           full_name = $2, bio = $3, city = $4, role_mode = $5,
           is_premium = $6::boolean,
           premium_since = case when $6::boolean then now() - interval '30 days' else null end,
           boost_level = case when $6::boolean then 1 else 0 end,
           is_verified = $7::boolean, is_admin = $8::boolean, license_info = $9,
           hourly_rate = $10::int, portfolio = $11::text::jsonb,
           created_at = now() - make_interval(months => $12::int)
         where user_id = $1
         returning id`,
        [
          authIds[u.key],
          u.fullName,
          u.bio,
          u.city,
          u.roleMode,
          u.isPremium ?? false,
          u.isVerified ?? false,
          u.isAdmin ?? false,
          u.licenseInfo ?? null,
          u.hourlyRate ?? null,
          JSON.stringify(u.portfolio),
          u.monthsAgo,
        ],
      );
      if (!rows[0]) throw new Error(`Seed: profilul pentru ${u.email} nu a fost creat (verifică triggerul on_auth_user_created).`);
      pid[u.key] = rows[0].id;
      await q.query("update public.contacts set phone = $2, email = $3 where profile_id = $1", [
        pid[u.key],
        u.phone,
        u.email,
      ]);
      for (const t of u.tags) {
        await q.query(
          "insert into public.worker_tags (profile_id, tag_id, years_experience) values ($1, $2, $3::int)",
          [pid[u.key], tagId(t.slug), t.years],
        );
      }
    }

    let bidCount = 0;

    // Open jobs with pending bids
    for (const j of seedOpenJobs) {
      const jobId = await insertJob(q, { ...j, clientId: pid[j.client], categoryId: categoryId(j.category), status: "open" });
      for (const t of j.tags) {
        await q.query("insert into public.job_tags (job_id, tag_id) values ($1, $2)", [jobId, tagId(t)]);
      }
      for (const b of j.bids) {
        await insertBid(q, { ...b, jobId, workerId: pid[b.worker] });
        bidCount++;
      }
    }

    // Assigned job: accepted bid, contacts unlocked, chat started
    {
      const j = seedAssignedJob;
      const jobId = await insertJob(q, { ...j, clientId: pid[j.client], categoryId: categoryId(j.category), status: "open" });
      for (const t of j.tags) {
        await q.query("insert into public.job_tags (job_id, tag_id) values ($1, $2)", [jobId, tagId(t)]);
      }
      let acceptedBidId = "";
      for (const b of j.bids) {
        const id = await insertBid(q, { ...b, jobId, workerId: pid[b.worker] });
        bidCount++;
        if (b.worker === j.assignedTo) acceptedBidId = id;
      }
      await q.query("update public.bids set status = 'accepted' where id = $1", [acceptedBidId]);
      await q.query(
        "update public.jobs set status = 'assigned', assigned_bid_id = $2, assigned_worker_id = $3 where id = $1",
        [jobId, acceptedBidId, pid[j.assignedTo!]],
      );
      for (const m of j.messages ?? []) {
        await q.query(
          "insert into public.messages (job_id, sender_id, body, created_at) values ($1, $2, $3, now() - make_interval(secs => $4::float8 * 3600))",
          [jobId, pid[m.from], m.body, m.hoursAgo],
        );
      }
    }

    // Completed jobs with mutual reviews (the rating trigger recomputes averages)
    let reviewCount = 0;
    for (const c of seedCompletedJobs) {
      const hoursAgo = c.daysAgo * 24 + 72;
      const jobId = await insertJob(q, {
        title: c.title,
        description: c.description,
        budget: c.budget,
        city: c.city,
        location: c.city,
        urgency: "week",
        hoursAgo,
        clientId: pid[c.client],
        categoryId: categoryId(c.category),
        status: "completed",
      });
      for (const t of c.tags) {
        await q.query("insert into public.job_tags (job_id, tag_id) values ($1, $2)", [jobId, tagId(t)]);
      }
      const bidId = await insertBid(q, {
        jobId,
        workerId: pid[c.worker],
        price: c.budget,
        hours: 4,
        message: "Ofertă acceptată.",
        hoursAgo: hoursAgo - 2,
        status: "accepted",
      });
      bidCount++;
      await q.query(
        `update public.jobs set assigned_bid_id = $2, assigned_worker_id = $3,
           completed_at = now() - make_interval(days => $4::int)
         where id = $1`,
        [jobId, bidId, pid[c.worker], c.daysAgo],
      );
      const serviceId = tagId(c.tags[0]);
      await q.query(
        `insert into public.reviews (job_id, worker_id, service_id, reviewer_id, reviewee_id, rating, comment, created_at)
         values ($1, $2, $3, $4, $5, $6::int, $7, now() - make_interval(days => $8::int))`,
        [jobId, pid[c.worker], serviceId, pid[c.client], pid[c.worker], c.clientReview.rating, c.clientReview.comment, c.daysAgo],
      );
      reviewCount++;
      if (c.workerReview) {
        await q.query(
          `insert into public.reviews (job_id, worker_id, service_id, reviewer_id, reviewee_id, rating, comment, created_at)
           values ($1, $2, $3, $4, $5, $6::int, $7, now() - make_interval(days => $8::int))`,
          [jobId, pid[c.worker], serviceId, pid[c.worker], pid[c.client], c.workerReview.rating, c.workerReview.comment, c.daysAgo],
        );
        reviewCount++;
      }
    }

    // Reports: the triggers count them and auto-ban at the threshold (5)
    for (const r of seedReports) {
      await q.query(
        `insert into public.reports (reporter_id, target_type, target_id, reason, details, created_at)
         values ($1, 'profile', $2, $3, $4, now() - make_interval(secs => $5::float8 * 3600))`,
        [pid[r.reporter], pid[r.target], r.reason, r.details, r.hoursAgo],
      );
    }

    const banned = await q.query<{ full_name: string }>(
      "select full_name from public.profiles where is_banned order by full_name",
    );

    return {
      users: seedUsers.length,
      openJobs: seedOpenJobs.length,
      bids: bidCount,
      reviews: reviewCount,
      reports: seedReports.length,
      bannedUsers: banned.map((b) => b.full_name),
    };
  });
}

/** Demo mode: users live in the stub auth schema of the embedded database. */
export async function seedDemoDatabase(db: Db): Promise<SeedSummary> {
  const { createDemoAuthUser } = await import("@/lib/db/pglite");
  return seedDatabase(db, (u) => createDemoAuthUser(db, u));
}
