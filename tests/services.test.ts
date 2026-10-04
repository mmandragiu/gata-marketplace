/**
 * Integration tests: real PostgreSQL (PGlite) + the Supabase migration + RLS + triggers + services.
 * Run with `npm test`.
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { createPgliteDb } from "@/lib/db/pglite";
import type { Db } from "@/lib/db/types";
import { seedDemoDatabase } from "@/lib/seed";
import * as admin from "@/lib/services/admin";
import * as bids from "@/lib/services/bids";
import * as catalog from "@/lib/services/catalog";
import * as chat from "@/lib/services/chat";
import { AppError } from "@/lib/services/errors";
import * as jobs from "@/lib/services/jobs";
import * as matching from "@/lib/services/matching";
import * as profiles from "@/lib/services/profiles";
import * as reports from "@/lib/services/reports";
import * as reviews from "@/lib/services/reviews";
import { getPlatformStats } from "@/lib/services/stats";
import type { Ctx } from "@/lib/services/types";

let db: Db;

async function as(email: string | null): Promise<Ctx> {
  if (!email) return { db, viewer: null };
  const rows = await db.system((q) => q.query<{ id: string }>("select id from auth.users where email = $1", [email]));
  assert.ok(rows[0], `user ${email} exists`);
  const profile = await profiles.getOwnProfile(db, rows[0].id);
  assert.ok(profile, `profile for ${email}`);
  return { db, viewer: { authUserId: rows[0].id, profile } };
}

async function rejects(fn: () => Promise<unknown>, code: AppError["code"]) {
  await assert.rejects(fn, (err: unknown) => {
    assert.ok(err instanceof AppError, `expected AppError, got ${String(err)}`);
    assert.equal(err.code, code, `expected ${code}, got ${err.code}: ${err.message}`);
    return true;
  });
}

const ANDREEA = "andreea.popescu@example.com";
const MIHAI = "mihai.ionescu@example.com";
const ION = "ion.marinescu@example.com";
const ANDREI = "andrei.pop@example.com";
const MARIA = "maria.constantin@example.com";
const SORINA = "sorina.matei@example.com";
const CRISTIAN = "cristian.vasile@example.com";
const GELU = "gelu.tudose@example.com";
const ADMIN = "admin@example.com";

before(async () => {
  db = await createPgliteDb();
  const summary = await seedDemoDatabase(db);
  assert.deepEqual(summary.bannedUsers, ["Cristian Vasile"]);
});

after(async () => {
  await db.close();
});

describe("catalog & feed", () => {
  it("has 2 kinds of categories with tags", async () => {
    const cats = await catalog.listCategories(await as(null));
    assert.equal(cats.length, 5);
    assert.equal(cats.filter((c) => c.kind === "specialized").length, 2);
    assert.equal(cats.reduce((n, c) => n + c.tags.length, 0), 17);
    const electrician = cats.flatMap((c) => c.tags).find((t) => t.slug === "electrician");
    assert.equal(electrician?.requiresLicense, true);
  });

  it("lists 8 open jobs with Premium clients pinned first", async () => {
    const feed = await jobs.listJobs(await as(null));
    assert.equal(feed.length, 8);
    const firstNonPromoted = feed.findIndex((j) => !j.isPromoted);
    assert.ok(firstNonPromoted > 0, "some promoted jobs first");
    assert.ok(feed.slice(firstNonPromoted).every((j) => !j.isPromoted), "promoted jobs are grouped at the top");
    assert.ok(feed.slice(0, firstNonPromoted).every((j) => j.client.fullName === "Andreea Popescu"));
  });

  it("filters by tag, kind and accent-insensitive text", async () => {
    const anon = await as(null);
    assert.equal((await jobs.listJobs(anon, { tag: "electrician" })).length, 1);
    const casual = await jobs.listJobs(anon, { kind: "casual" });
    assert.ok(casual.length >= 4 && casual.every((j) => j.category.kind === "casual"));
    const found = await jobs.listJobs(anon, { q: "curatenie" });
    assert.ok(found.some((j) => j.title.includes("Curățenie")));
    const cluj = await jobs.listJobs(anon, { city: "cluj", category: "montaj-mutari" });
    assert.ok(cluj.length >= 1 && cluj.every((j) => j.category.slug === "montaj-mutari" && (j.isRemote || j.city === "Cluj-Napoca")));
  });

  it("worker directory filters by text, tag, kind and city", async () => {
    const anon = await as(null);
    const all = await profiles.listWorkers(anon);
    assert.equal(all.length, 9, "banned Cristian is hidden");
    assert.ok(all.every((w) => !w.isBanned && w.tags.length > 0));

    const ikea = await profiles.listWorkers(anon, { q: "ikea" });
    assert.deepEqual(ikea.map((w) => w.fullName).sort(), ["Andrei Pop", "Vlad Munteanu"]);

    const electricians = await profiles.listWorkers(anon, { tag: "electrician" });
    assert.deepEqual(electricians.map((w) => w.fullName), ["Ion Marinescu"]);

    const casual = await profiles.listWorkers(anon, { kind: "casual" });
    assert.equal(casual.length, 5);
    assert.ok(casual.every((w) => w.tags.some((t) => t.categoryKind === "casual")));

    const bucuresti = await profiles.listWorkers(anon, { city: "bucuresti" });
    assert.deepEqual(bucuresti.map((w) => w.fullName).sort(), ["Ioana Dumitru", "Maria Constantin", "Radu Stan"]);

    const combined = await profiles.listWorkers(anon, { q: "mutari", kind: "casual", city: "Cluj" });
    assert.deepEqual(combined.map((w) => w.fullName), ["Andrei Pop"]);
  });

  it("platform stats are consistent", async () => {
    const s = await getPlatformStats(await as(null));
    assert.equal(s.openJobs, 8);
    assert.equal(s.workers, 9, "9 non-banned profiles with tags (Cristian is banned)");
    assert.ok(s.avgRating > 4 && s.avgRating < 5);
  });
});

describe("bids visibility (RLS) and ordering", () => {
  it("anon sees no bids; owner sees all, promoted first and banned last", async () => {
    const tablou = (await jobs.listJobs(await as(null), { tag: "electrician" }))[0];
    assert.equal(tablou.bidCount, 3);
    assert.deepEqual(await bids.listBidsForJob(await as(null), tablou.id), []);

    const owner = await bids.listBidsForJob(await as(ANDREEA), tablou.id);
    assert.equal(owner.length, 3);
    assert.equal(owner[0].worker.fullName, "Ion Marinescu");
    assert.equal(owner[0].isPromoted, true);
    assert.equal(owner[2].worker.fullName, "Cristian Vasile");
    assert.equal(owner[2].worker.isBanned, true);
  });

  it("a worker sees only their own bid", async () => {
    const tablou = (await jobs.listJobs(await as(null), { tag: "electrician" }))[0];
    const mine = await bids.listBidsForJob(await as(ION), tablou.id);
    assert.equal(mine.length, 1);
    assert.equal(mine[0].worker.fullName, "Ion Marinescu");
  });
});

describe("job lifecycle: post → bid → accept → chat → complete → review", () => {
  let jobId = "";
  let andreiBid = "";

  it("client posts a job", async () => {
    jobId = await jobs.createJob(await as(MIHAI), {
      title: "Montaj raft și TV pe perete",
      description: "Am un televizor de 55 de inch și două rafturi de montat pe un perete din beton, în sufragerie.",
      budget: 250,
      categorySlug: "montaj-mutari",
      tagSlugs: ["montaj-tv-rafturi"],
      city: "Cluj-Napoca",
      location: "Cluj-Napoca · Zorilor",
      isRemote: false,
      urgency: "week",
    });
    const job = await jobs.getJob(await as(null), jobId);
    assert.equal(job?.status, "open");
    assert.deepEqual(job?.tags.map((t) => t.slug), ["montaj-tv-rafturi"]);
  });

  it("validation errors are reported per field", async () => {
    const ctx = await as(MIHAI);
    await assert.rejects(
      () => jobs.createJob(ctx, { title: "abc", description: "scurt", budget: -5, categorySlug: "", tagSlugs: [], urgency: "x" }),
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.code, "VALIDATION");
        assert.ok(err.fieldErrors?.title && err.fieldErrors?.description && err.fieldErrors?.budget && err.fieldErrors?.tagSlugs);
        return true;
      },
    );
  });

  it("banned users cannot post or bid (service + database)", async () => {
    await rejects(async () => jobs.createJob(await as(CRISTIAN), {
      title: "Titlu valid de test",
      description: "Descriere suficient de lungă pentru validare.",
      budget: 100,
      categorySlug: "montaj-mutari",
      tagSlugs: ["mutari"],
      urgency: "week",
    }), "BANNED");
    await rejects(async () => bids.placeBid(await as(CRISTIAN), jobId, { price: 100, durationHours: 1, message: "" }), "BANNED");

    // Database backstop: bypass the service and insert directly as the banned user.
    const cristian = await as(CRISTIAN);
    await assert.rejects(() =>
      db.asUser(cristian.viewer!.authUserId, (q) =>
        q.query(
          `insert into public.jobs (client_id, title, description, budget, category_id)
           select public.current_profile_id(), 'Titlu direct', 'Descriere directă în baza de date', 10, id from public.categories limit 1`,
        ),
      ),
    /row-level security/);
  });

  it("workers bid once; owners cannot bid on their own job", async () => {
    andreiBid = await bids.placeBid(await as(ANDREI), jobId, { price: 220, durationHours: 2, message: "Pot veni sâmbătă." });
    await rejects(async () => bids.placeBid(await as(ANDREI), jobId, { price: 200, durationHours: 2, message: "" }), "CONFLICT");
    await rejects(async () => bids.placeBid(await as(MIHAI), jobId, { price: 200, durationHours: 2, message: "" }), "FORBIDDEN");
    await bids.placeBid(await as(SORINA), jobId, { price: 260, durationHours: 3, message: "Am bormașină cu percuție." });
    const job = await jobs.getJob(await as(null), jobId);
    assert.equal(job?.bidCount, 2);
  });

  it("only the owner can accept; acceptance assigns the job and rejects the rest", async () => {
    await rejects(async () => bids.acceptBid(await as(ANDREI), andreiBid), "FORBIDDEN");
    await bids.acceptBid(await as(MIHAI), andreiBid);
    const job = await jobs.getJob(await as(null), jobId);
    assert.equal(job?.status, "assigned");
    const all = await bids.listBidsForJob(await as(MIHAI), jobId);
    assert.equal(all.find((b) => b.id === andreiBid)?.status, "accepted");
    assert.ok(all.filter((b) => b.id !== andreiBid).every((b) => b.status === "rejected"));
    await rejects(async () => bids.placeBid(await as(MARIA), jobId, { price: 100, durationHours: 1, message: "" }), "CONFLICT");
  });

  it("contacts unlock only for the two parties", async () => {
    const job = (await jobs.getJob(await as(null), jobId))!;
    const forClient = await chat.getCounterpartyContact(await as(MIHAI), job);
    assert.equal(forClient?.fullName, "Andrei Pop");
    assert.ok(forClient?.phone);
    const forWorker = await chat.getCounterpartyContact(await as(ANDREI), job);
    assert.equal(forWorker?.fullName, "Mihai Ionescu");
    // Elena never worked with Mihai; Sorina bid on this job but was rejected → no contact for either.
    assert.equal(await profiles.getContact(await as("elena.georgescu@example.com"), job.client.id), null);
    assert.equal(await profiles.getContact(await as(SORINA), job.client.id), null);
  });

  it("chat works for parties only", async () => {
    await chat.sendMessage(await as(MIHAI), jobId, { body: "Salut! Te aștept sâmbătă la 10." });
    await chat.sendMessage(await as(ANDREI), jobId, { body: "Perfect, ne vedem atunci." });
    assert.equal((await chat.listMessages(await as(ANDREI), jobId)).length, 2);
    assert.deepEqual(await chat.listMessages(await as(MARIA), jobId), []);
    await rejects(async () => chat.sendMessage(await as(MARIA), jobId, { body: "Bună" }), "FORBIDDEN");
  });

  it("completion unlocks mutual reviews and the rating trigger updates averages", async () => {
    await rejects(async () => reviews.createReview(await as(MIHAI), { jobId, rating: 5, comment: "" }), "CONFLICT");
    await rejects(async () => jobs.completeJob(await as(ANDREI), jobId), "FORBIDDEN");
    await jobs.completeJob(await as(MIHAI), jobId);

    const before = (await profiles.getWorker(await as(null), (await as(ANDREI)).viewer!.profile.id))!;
    await reviews.createReview(await as(MIHAI), { jobId, rating: 3, comment: "A întârziat, dar a făcut treaba." });
    const afterReview = (await profiles.getWorker(await as(null), before.id))!;
    assert.equal(afterReview.ratingCount, before.ratingCount + 1);
    assert.equal(afterReview.ratingAvg, Number(((before.ratingAvg * before.ratingCount + 3) / (before.ratingCount + 1)).toFixed(2)));

    await rejects(async () => reviews.createReview(await as(MIHAI), { jobId, rating: 5, comment: "" }), "CONFLICT");
    await rejects(async () => reviews.createReview(await as(MARIA), { jobId, rating: 5, comment: "" }), "FORBIDDEN");
    await reviews.createReview(await as(ANDREI), { jobId, rating: 5, comment: "Client de nota 10." });
    assert.equal(await reviews.hasReviewed(await as(ANDREI), jobId), true);

    const list = await reviews.listReviewsForProfile(await as(null), before.id);
    assert.equal(list[0].serviceName, "Montaj TV & rafturi");
    assert.equal(list[0].direction, "client_to_worker");
  });

  it("cannot accept a banned worker's bid", async () => {
    const tablou = (await jobs.listJobs(await as(null), { tag: "electrician" }))[0];
    const cristianBid = (await bids.listBidsForJob(await as(ANDREEA), tablou.id)).find((b) => b.worker.isBanned)!;
    await rejects(async () => bids.acceptBid(await as(ANDREEA), cristianBid.id), "CONFLICT");
  });
});

describe("reports & auto-ban", () => {
  it("the 5th report bans automatically and restricts the account", async () => {
    const gelu = await as(GELU);
    assert.equal(gelu.viewer!.profile.isBanned, false);
    const tablou = (await jobs.listJobs(await as(null), { tag: "electrician" }))[0];
    const geluBid = (await bids.listBidsForJob(await as(ANDREEA), tablou.id)).find((b) => b.worker.fullName === "Gelu Tudose")!;

    const res = await reports.createReport(await as(ANDREEA), {
      targetType: "bid",
      targetId: geluBid.id,
      reason: "unlicensed",
      details: "Oferă lucrări electrice fără autorizație.",
    });
    assert.equal(res.targetBanned, true);
    assert.equal(res.targetProfileId, gelu.viewer!.profile.id);

    const geluNow = await as(GELU);
    assert.equal(geluNow.viewer!.profile.isBanned, true);
    await rejects(async () => bids.placeBid(geluNow, tablou.id, { price: 10, durationHours: 1, message: "" }), "BANNED");
    assert.ok(!(await profiles.listWorkers(await as(null))).some((w) => w.fullName === "Gelu Tudose"));
  });

  it("duplicate and self reports are rejected", async () => {
    const ionCtx = await as(ION);
    await reports.createReport(await as(MARIA), { targetType: "profile", targetId: ionCtx.viewer!.profile.id, reason: "other", details: "" });
    await rejects(async () => reports.createReport(await as(MARIA), { targetType: "profile", targetId: ionCtx.viewer!.profile.id, reason: "spam", details: "" }), "CONFLICT");
    await rejects(async () => reports.createReport(ionCtx, { targetType: "profile", targetId: ionCtx.viewer!.profile.id, reason: "spam", details: "" }), "VALIDATION");
  });

  it("report_count is not readable by clients", async () => {
    const maria = await as(MARIA);
    await assert.rejects(() => db.asUser(maria.viewer!.authUserId, (q) => q.query("select report_count from public.profiles limit 1")), /permission denied/);
  });
});

describe("moderation panel", () => {
  it("is admin-only", async () => {
    await rejects(async () => admin.listReports(await as(MARIA)), "FORBIDDEN");
    const list = await admin.listReports(await as(ADMIN));
    assert.ok(list.length >= 10);
  });

  it("unban resets the counter; threshold is configurable", async () => {
    const adminCtx = await as(ADMIN);
    const gelu = (await as(GELU)).viewer!.profile;
    await admin.unbanUser(adminCtx, gelu.id, true);
    const users = await admin.listModerationUsers(adminCtx);
    const g = users.find((u) => u.id === gelu.id)!;
    assert.equal(g.isBanned, false);
    assert.equal(g.reportCount, 0);

    await admin.updateModerationSettings(adminCtx, { autoBanThreshold: 1, autoBanEnabled: true });
    await reports.createReport(await as(SORINA), { targetType: "profile", targetId: gelu.id, reason: "spam", details: "" });
    assert.equal((await as(GELU)).viewer!.profile.isBanned, true, "banned at the new threshold of 1");
    await admin.updateModerationSettings(adminCtx, { autoBanThreshold: 5, autoBanEnabled: true });
    assert.equal((await admin.getModerationSettings(adminCtx)).autoBanThreshold, 5);
  });
});

describe("profiles, roles and premium", () => {
  it("updates profile, contact and tags", async () => {
    await profiles.updateMyProfile(await as(ANDREI), {
      fullName: "Andrei Pop",
      bio: "Student, montez mobilă și ajut la grădinărit.",
      city: "Cluj-Napoca",
      hourlyRate: 55,
      licenseInfo: "",
      phone: "+40 000 000 199",
      contactEmail: "andrei.pop@example.com",
      tags: [
        { slug: "montaj-mobila-ikea", years: 3 },
        { slug: "gradinarit", years: 1 },
      ],
    });
    const me = await as(ANDREI);
    const worker = (await profiles.getWorker(me, me.viewer!.profile.id))!;
    assert.deepEqual(worker.tags.map((t) => t.slug).sort(), ["gradinarit", "montaj-mobila-ikea"]);
    assert.equal(worker.hourlyRate, 55);
    assert.equal((await profiles.getMyContact(me))?.phone, "+40 000 000 199");
  });

  it("role toggle and mock Premium checkout", async () => {
    await profiles.setRoleMode(await as(MIHAI), "worker");
    assert.equal((await as(MIHAI)).viewer!.profile.roleMode, "worker");
    await profiles.setPremium(await as(MIHAI), true);
    const mihai = (await as(MIHAI)).viewer!.profile;
    assert.equal(mihai.isPremium, true);
    const feed = await jobs.listJobs(await as(null));
    assert.ok(feed.filter((j) => j.isPromoted).some((j) => j.client.fullName === "Mihai Ionescu"));
    await profiles.setPremium(await as(MIHAI), false);
  });
});

describe("AI matching (local fallback, no API key)", () => {
  it("recommends the right workers for a job", async () => {
    const mama = (await jobs.listJobs(await as(null), { tag: "ajutor-gospodaresc" }))[0];
    const recs = await matching.recommendWorkersForJob(await as(MIHAI), mama.id, 5);
    assert.equal(recs[0].worker.fullName, "Maria Constantin");
    assert.ok(recs[0].score >= 80, `Maria score ${recs[0].score}`);
    assert.ok(!recs.some((r) => r.worker.isBanned));

    const tablou = (await jobs.listJobs(await as(null), { tag: "electrician" }))[0];
    const forTablou = await matching.recommendWorkersForJob(await as(ANDREEA), tablou.id, 3);
    assert.equal(forTablou[0].worker.fullName, "Ion Marinescu");
    assert.equal(forTablou[0].boost, 10, "Premium boost");
  });

  it("recommends jobs to a worker and analyses a pair", async () => {
    const recs = await matching.recommendJobsForViewer(await as(SORINA), 5);
    assert.ok(recs[0].job.tags.some((t) => ["plimbat-caini", "pet-sitting", "gradinarit"].includes(t.slug)));
    const ikea = (await jobs.listJobs(await as(null), { tag: "montaj-mobila-ikea" }))[0];
    const andrei = (await as(ANDREI)).viewer!.profile;
    const analysis = await matching.analyzeMatch(await as(ANDREEA), ikea.id, andrei.id);
    assert.equal(analysis.source, "local");
    assert.ok(analysis.score >= 60, `score ${analysis.score}`);
    assert.ok(analysis.strengths.length > 0);
  });

  it("license warning lowers the score for unlicensed electrical work", async () => {
    const tablou = (await jobs.listJobs(await as(null), { tag: "electrician" }))[0];
    const scores = await matching.scoreBidders(await as(ANDREEA), tablou, [
      (await as(ION)).viewer!.profile.id,
      (await as(CRISTIAN)).viewer!.profile.id,
    ]);
    const ion = scores.get((await as(ION)).viewer!.profile.id)!;
    const cristian = scores.get((await as(CRISTIAN)).viewer!.profile.id)!;
    assert.equal(ion.breakdown.licenseWarning, false);
    assert.equal(cristian.breakdown.licenseWarning, true);
    assert.ok(ion.score > cristian.score);
  });
});

describe("concurrency", () => {
  it("serializes parallel transactions safely", async () => {
    const anon = await as(null);
    const results = await Promise.all(Array.from({ length: 20 }, () => jobs.listJobs(anon)));
    assert.ok(results.every((r) => r.length === results[0].length));
  });
});
