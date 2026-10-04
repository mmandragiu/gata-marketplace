import type { Job, MatchBreakdown, MatchResult, Worker } from "@/lib/services/types";

import { cosine, sameCity, vectorize } from "./text";

/** Weights of the hybrid score (sum = 1). */
export const WEIGHTS = { tag: 0.55, semantic: 0.35, location: 0.1 } as const;

export function jobText(job: Pick<Job, "title" | "description" | "tags" | "category">): string {
  return [
    job.title,
    job.description,
    `Categorie: ${job.category.name}`,
    `Servicii: ${job.tags.map((t) => t.name).join(", ")}`,
  ].join("\n");
}

export function workerText(w: Pick<Worker, "fullName" | "bio" | "tags" | "portfolio" | "licenseInfo">): string {
  return [
    w.fullName,
    w.bio,
    `Servicii: ${w.tags.map((t) => `${t.name} (${t.yearsExperience} ani)`).join(", ")}`,
    w.licenseInfo ? `Licență: ${w.licenseInfo}` : "",
    ...w.portfolio.map((p) => `${p.title}: ${p.description}`),
  ]
    .filter(Boolean)
    .join("\n");
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** OpenAI text-embedding-3 cosine values cluster between ~0.2 (unrelated) and ~0.65 (very close). */
export function normalizeOpenAiSimilarity(cos: number): number {
  return clamp01((cos - 0.2) / (0.62 - 0.2));
}

/** Local term-vector cosine: ~0.35+ already means a strong overlap of concepts. */
export function normalizeLocalSimilarity(cos: number): number {
  return clamp01(cos / 0.38);
}

/**
 * Free text only (tags are already scored by the tag-overlap component, so they are not counted twice):
 * job title + description vs worker bio, licence and portfolio.
 */
export function jobSemanticText(job: Pick<Job, "title" | "description">): string {
  return `${job.title}\n${job.description}`;
}

export function workerSemanticText(w: Pick<Worker, "bio" | "portfolio" | "licenseInfo">): string {
  return [w.bio, w.licenseInfo ?? "", ...w.portfolio.map((p) => `${p.title}: ${p.description}`)].filter(Boolean).join("\n");
}

export function localSemantic(
  job: Pick<Job, "title" | "description">,
  worker: Pick<Worker, "bio" | "portfolio" | "licenseInfo">,
): number {
  return normalizeLocalSimilarity(cosine(vectorize(jobSemanticText(job)), vectorize(workerSemanticText(worker))));
}

/** Premium boost added to the ranking (not to the match score itself). */
export function boostFor(w: { isPremium: boolean; boostLevel: number }): number {
  if (!w.isPremium) return 0;
  return 10 + Math.max(0, w.boostLevel - 1) * 5;
}

export function computeMatch(
  job: Pick<Job, "tags" | "city" | "isRemote">,
  worker: Pick<Worker, "tags" | "city" | "licenseInfo" | "isPremium" | "boostLevel">,
  semantic: number,
  semanticSource: MatchBreakdown["semanticSource"],
): MatchResult {
  const workerSlugs = new Set(worker.tags.map((t) => t.slug));
  const workerCategories = new Set(worker.tags.map((t) => t.categoryId));
  const matched = job.tags.filter((t) => workerSlugs.has(t.slug));
  const missing = job.tags.filter((t) => !workerSlugs.has(t.slug));

  let tag = job.tags.length > 0 ? matched.length / job.tags.length : 0;
  if (tag === 0 && job.tags.some((t) => workerCategories.has(t.categoryId))) tag = 0.25;

  const location = job.isRemote || sameCity(job.city, worker.city) ? 1 : 0.3;

  const needsLicense = job.tags.some((t) => t.requiresLicense);
  const licensedForJob =
    !needsLicense || (job.tags.filter((t) => t.requiresLicense).every((t) => workerSlugs.has(t.slug)) && !!worker.licenseInfo);
  const licenseWarning = needsLicense && !licensedForJob;

  let raw = WEIGHTS.tag * tag + WEIGHTS.semantic * clamp01(semantic) + WEIGHTS.location * location;
  if (licenseWarning) raw *= 0.7;

  const score = Math.round(clamp01(raw) * 100);
  const boost = boostFor(worker);
  return {
    score,
    boost,
    rankScore: score + boost,
    breakdown: {
      tag,
      semantic: clamp01(semantic),
      location,
      matchedTags: matched.map((t) => t.name),
      missingTags: missing.map((t) => t.name),
      semanticSource,
      licenseWarning,
    },
  };
}

export function verdictFor(score: number): string {
  if (score >= 80) return "Potrivire foarte bună";
  if (score >= 60) return "Potrivire bună";
  if (score >= 40) return "Potrivire parțială";
  return "Potrivire slabă";
}
