import { createHash } from "node:crypto";

import { aiConfig } from "@/lib/config";
import type { Db } from "@/lib/db/types";
import {
  computeMatch,
  jobText,
  localSemantic,
  normalizeOpenAiSimilarity,
  verdictFor,
  workerText,
} from "@/lib/matching/engine";
import { analyzeWithLlm, embedTexts, openAiEnabled } from "@/lib/matching/openai";
import { sameCity, sharedConcepts } from "@/lib/matching/text";

import { listMyBids } from "./bids";
import { AppError } from "./errors";
import { requireViewer } from "./guards";
import { getJob, listJobs } from "./jobs";
import { num } from "./mappers";
import { getWorker, getWorkersByIds, listWorkers } from "./profiles";
import type {
  Ctx,
  Job,
  MatchAnalysis,
  MatchResult,
  RecommendedJob,
  RecommendedWorker,
  Worker,
} from "./types";

type Semantic = { sims: Map<string, number>; source: "openai" | "local" };
type EmbedItem = { ownerType: "job" | "profile"; ownerId: string; text: string };

const CONCEPT_LABELS: Record<string, string> = {
  electric: "instalații electrice",
  sanitar: "instalații sanitare",
  lemn: "tâmplărie",
  montaj: "montaj și asamblare",
  mutare: "mutări",
  curatenie: "curățenie",
  ingrijire: "ajutor în gospodărie",
  calcat: "călcat",
  gradina: "grădinărit",
  animale: "animale de companie",
  web: "dezvoltare web",
  design: "design",
  foto: "fotografie",
  zugrav: "zugrăveli",
  faianta: "faianță și gresie",
};

/** Computes missing/stale embeddings (one OpenAI call) and stores them in the pgvector table. */
async function ensureEmbeddings(db: Db, items: EmbedItem[]): Promise<void> {
  const model = aiConfig.embeddingModel();
  const hashed = items.map((i) => ({
    ...i,
    hash: createHash("sha256").update(`${model}\n${i.text}`).digest("hex"),
  }));
  const existing = await db.system((q) =>
    q.query<{ owner_type: string; owner_id: string; content_hash: string }>(
      `select e.owner_type, e.owner_id, e.content_hash
       from public.embeddings e
       join jsonb_to_recordset($1::text::jsonb) as x(t text, id uuid) on e.owner_type = x.t and e.owner_id = x.id`,
      [JSON.stringify(hashed.map((i) => ({ t: i.ownerType, id: i.ownerId })))],
    ),
  );
  const have = new Map(existing.map((e) => [`${e.owner_type}:${e.owner_id}`, e.content_hash]));
  const missing = hashed.filter((i) => have.get(`${i.ownerType}:${i.ownerId}`) !== i.hash);
  if (missing.length === 0) return;

  const vectors = await embedTexts(missing.map((m) => m.text));
  await db.system(async (q) => {
    for (let k = 0; k < missing.length; k++) {
      const m = missing[k];
      await q.query(
        `insert into public.embeddings (owner_type, owner_id, model, content_hash, embedding, updated_at)
         values ($1, $2, $3, $4, $5::text::extensions.vector, now())
         on conflict (owner_type, owner_id) do update
           set model = excluded.model, content_hash = excluded.content_hash,
               embedding = excluded.embedding, updated_at = now()`,
        [m.ownerType, m.ownerId, model, m.hash, JSON.stringify(vectors[k])],
      );
    }
  });
}

async function workerSimilarities(ctx: Ctx, job: Job, workers: Worker[]): Promise<Semantic> {
  if (openAiEnabled() && workers.length > 0) {
    try {
      await ensureEmbeddings(ctx.db, [
        { ownerType: "job", ownerId: job.id, text: jobText(job) },
        ...workers.map((w) => ({ ownerType: "profile" as const, ownerId: w.id, text: workerText(w) })),
      ]);
      const rows = await ctx.db.system((q) =>
        q.query<{ profile_id: string; similarity: number }>(
          "select profile_id, similarity from public.match_profiles_for_job($1)",
          [job.id],
        ),
      );
      const sims = new Map(rows.map((r) => [String(r.profile_id), normalizeOpenAiSimilarity(num(r.similarity))]));
      if (workers.every((w) => sims.has(w.id))) return { sims, source: "openai" };
    } catch (err) {
      console.warn("[gata] OpenAI indisponibil, folosesc potrivirea locală:", (err as Error).message);
    }
  }
  return { sims: new Map(workers.map((w) => [w.id, localSemantic(job, w)])), source: "local" };
}

async function jobSimilarities(ctx: Ctx, worker: Worker, jobs: Job[]): Promise<Semantic> {
  if (openAiEnabled() && jobs.length > 0) {
    try {
      await ensureEmbeddings(ctx.db, [
        { ownerType: "profile", ownerId: worker.id, text: workerText(worker) },
        ...jobs.map((j) => ({ ownerType: "job" as const, ownerId: j.id, text: jobText(j) })),
      ]);
      const rows = await ctx.db.system((q) =>
        q.query<{ job_id: string; similarity: number }>(
          `select j.owner_id as job_id, 1 - (j.embedding operator(extensions.<=>) w.embedding) as similarity
           from public.embeddings w
           join public.embeddings j on j.owner_type = 'job'
           where w.owner_type = 'profile' and w.owner_id = $1
             and j.owner_id in (select (jsonb_array_elements_text($2::text::jsonb))::uuid)`,
          [worker.id, JSON.stringify(jobs.map((j) => j.id))],
        ),
      );
      const sims = new Map(rows.map((r) => [String(r.job_id), normalizeOpenAiSimilarity(num(r.similarity))]));
      if (jobs.every((j) => sims.has(j.id))) return { sims, source: "openai" };
    } catch (err) {
      console.warn("[gata] OpenAI indisponibil, folosesc potrivirea locală:", (err as Error).message);
    }
  }
  return { sims: new Map(jobs.map((j) => [j.id, localSemantic(j, worker)])), source: "local" };
}

/** Scores the given workers for a job (hybrid: tags + semantic + location). */
export async function scoreWorkersForJob(ctx: Ctx, job: Job, workers: Worker[]): Promise<Map<string, MatchResult>> {
  const { sims, source } = await workerSimilarities(ctx, job, workers);
  return new Map(workers.map((w) => [w.id, computeMatch(job, w, sims.get(w.id) ?? 0, source)]));
}

/** Scores the workers who bid on a job (banned bidders included, for the comparison table). */
export async function scoreBidders(ctx: Ctx, job: Job, workerIds: string[]): Promise<Map<string, MatchResult>> {
  const workers = await getWorkersByIds(ctx, workerIds);
  return scoreWorkersForJob(ctx, job, workers);
}

/** Recommended workers for a job, ordered by Match Score + Premium boost. */
export async function recommendWorkersForJob(ctx: Ctx, jobId: string, limit = 6): Promise<RecommendedWorker[]> {
  const job = await getJob(ctx, jobId);
  if (!job) throw new AppError("NOT_FOUND", "Jobul nu există.");
  const workers = await listWorkers(ctx, { excludeProfileId: job.client.id, limit: 200 });
  const scores = await scoreWorkersForJob(ctx, job, workers);
  return workers
    .map((w) => ({ worker: w, ...scores.get(w.id)! }))
    .sort((a, b) => b.rankScore - a.rankScore || b.score - a.score || b.worker.ratingAvg - a.worker.ratingAvg)
    .slice(0, limit);
}

/** Open jobs recommended to the signed-in worker, with their AI match score. */
export async function recommendJobsForViewer(ctx: Ctx, limit = 12): Promise<RecommendedJob[]> {
  const viewer = requireViewer(ctx);
  const me = await getWorker(ctx, viewer.profile.id);
  if (!me || me.tags.length === 0) return [];
  const [jobs, myBids] = await Promise.all([listJobs(ctx, { status: "open", limit: 200 }), listMyBids(ctx)]);
  const candidates = jobs.filter((j) => j.client.id !== me.id);
  const bidJobIds = new Set(myBids.map((b) => b.job.id));
  const { sims, source } = await jobSimilarities(ctx, me, candidates);
  return candidates
    .map((job) => ({
      job,
      alreadyBid: bidJobIds.has(job.id),
      ...computeMatch(job, me, sims.get(job.id) ?? 0, source),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.job.isPromoted) - Number(a.job.isPromoted) ||
        b.job.createdAt.localeCompare(a.job.createdAt),
    )
    .slice(0, limit);
}

function localAnalysis(job: Job, worker: Worker, match: MatchResult): MatchAnalysis {
  const strengths: string[] = [];
  const concerns: string[] = [];
  const { breakdown } = match;

  if (breakdown.matchedTags.length > 0) {
    strengths.push(`Oferă exact serviciile cerute: ${breakdown.matchedTags.join(", ")}.`);
    const years = worker.tags
      .filter((t) => job.tags.some((jt) => jt.slug === t.slug))
      .map((t) => t.yearsExperience);
    const maxYears = Math.max(0, ...years);
    if (maxYears >= 2) strengths.push(`${maxYears} ani de experiență în domeniu.`);
  }
  const shared = sharedConcepts(jobText(job), workerText(worker))
    .map((c) => CONCEPT_LABELS[c])
    .filter(Boolean);
  if (shared.length > 0) strengths.push(`Profilul acoperă teme din descrierea jobului: ${[...new Set(shared)].join(", ")}.`);

  if (job.isRemote) strengths.push("Jobul se poate face online, deci locația nu contează.");
  else if (sameCity(job.city, worker.city)) strengths.push(`Este din același oraș (${worker.city}).`);
  else concerns.push(`Este din ${worker.city || "alt oraș"}, iar jobul e în ${job.city || job.location}.`);

  if (worker.ratingCount > 0 && worker.ratingAvg >= 4.5) {
    strengths.push(`Rating ${worker.ratingAvg.toFixed(1)} din ${worker.ratingCount} ${worker.ratingCount === 1 ? "recenzie" : "recenzii"}.`);
  } else if (worker.ratingCount === 0) {
    concerns.push("Nu are încă recenzii pe platformă.");
  } else if (worker.ratingAvg < 3.5) {
    concerns.push(`Rating scăzut: ${worker.ratingAvg.toFixed(1)} din 5.`);
  }
  if (worker.isVerified) strengths.push("Profil verificat de echipa platformei.");
  if (breakdown.missingTags.length > 0) concerns.push(`Nu are tagurile cerute: ${breakdown.missingTags.join(", ")}.`);
  if (breakdown.licenseWarning) {
    const note = job.tags.find((t) => t.requiresLicense)?.licenseNote;
    concerns.push(note ?? "Jobul cere o autorizație pe care profilul nu o indică.");
  }

  return {
    score: match.score,
    verdict: `${verdictFor(match.score)} (${match.score}%).`,
    strengths: strengths.slice(0, 5),
    concerns: concerns.slice(0, 5),
    source: "local",
  };
}

/** LLM analyses keyed by a hash of their input (bounded, per server instance). */
const llmAnalysisCache = new Map<string, MatchAnalysis>();
const LLM_CACHE_MAX = 500;

/** Detailed compatibility analysis for one job–worker pair (LLM when configured, local otherwise). */
export async function analyzeMatch(ctx: Ctx, jobId: string, workerId: string): Promise<MatchAnalysis> {
  const [job, worker] = await Promise.all([getJob(ctx, jobId), getWorker(ctx, workerId)]);
  if (!job) throw new AppError("NOT_FOUND", "Jobul nu există.");
  if (!worker) throw new AppError("NOT_FOUND", "Lucrătorul nu există.");
  const match = (await scoreWorkersForJob(ctx, job, [worker])).get(worker.id)!;

  if (openAiEnabled()) {
    try {
      const input = {
        job: {
          title: job.title,
          description: job.description,
          budgetLei: job.budget,
          city: job.city,
          remote: job.isRemote,
          services: job.tags.map((t) => t.name),
          licenseRequirements: job.tags.filter((t) => t.requiresLicense).map((t) => t.licenseNote),
        },
        worker: {
          name: worker.fullName,
          bio: worker.bio,
          city: worker.city,
          services: worker.tags.map((t) => ({ name: t.name, years: t.yearsExperience })),
          license: worker.licenseInfo,
          rating: worker.ratingAvg,
          reviews: worker.ratingCount,
          verified: worker.isVerified,
          portfolio: worker.portfolio,
        },
        signals: {
          matchedServices: match.breakdown.matchedTags,
          missingServices: match.breakdown.missingTags,
          sameCity: sameCity(job.city, worker.city),
          hybridScore: match.score,
        },
      };
      // Same job + same worker profile → same answer: serve it from the cache instead of paying for another call.
      const key = createHash("sha256").update(`${aiConfig.model()}\n${JSON.stringify(input)}`).digest("hex");
      const cached = llmAnalysisCache.get(key);
      if (cached) return cached;
      const llm = await analyzeWithLlm(input);
      const analysis: MatchAnalysis = {
        score: Math.round(llm.score),
        verdict: llm.verdict,
        strengths: llm.strengths,
        concerns: llm.concerns,
        source: "openai",
      };
      llmAnalysisCache.set(key, analysis);
      if (llmAnalysisCache.size > LLM_CACHE_MAX) llmAnalysisCache.delete(llmAnalysisCache.keys().next().value!);
      return analysis;
    } catch (err) {
      console.warn("[gata] Analiza OpenAI a eșuat, folosesc analiza locală:", (err as Error).message);
    }
  }
  return localAnalysis(job, worker, match);
}
