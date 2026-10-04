/**
 * MCP server for Gata: lets an AI assistant (Claude Desktop, Claude Code, Cursor, …) search jobs and
 * workers, read profiles and reviews, and get AI match scores through the app's REST API.
 *
 *   GATA_API_URL=http://localhost:3000 node --import tsx mcp/server.ts
 *
 * Read-only and anonymous: it sees what a signed-out visitor sees (no bids, no contact details).
 * Logs go to stderr; stdout carries the MCP protocol.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import type { CategoryWithCounts } from "../src/lib/services/catalog";
import type { Job, MatchAnalysis, RecommendedWorker, Review, Worker } from "../src/lib/services/types";

const API_URL = (process.env.GATA_API_URL || "http://localhost:3000").replace(/\/+$/, "");

type ApiBody<T> = { data: T } | { error: { code: string; message: string; fieldErrors?: Record<string, string[]> } };

async function call<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: init?.method ?? "GET",
      headers: { accept: "application/json", ...(init?.body ? { "content-type": "application/json" } : {}) },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    throw new Error(
      `Nu pot contacta ${API_URL} (${(err as Error).message}). Pornește aplicația (npm run dev) sau setează GATA_API_URL.`,
    );
  }
  let body: ApiBody<T>;
  try {
    body = (await res.json()) as ApiBody<T>;
  } catch {
    throw new Error(`Răspuns invalid de la ${path} (HTTP ${res.status}).`);
  }
  if ("error" in body) {
    const fields = body.error.fieldErrors
      ? ` ${Object.entries(body.error.fieldErrors)
          .map(([k, v]) => `${k}: ${v.join(", ")}`)
          .join("; ")}`
      : "";
    throw new Error(`${body.error.code}: ${body.error.message}${fields}`);
  }
  return body.data;
}

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

async function run(fn: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    return { content: [{ type: "text", text: JSON.stringify(await fn(), null, 2) }] };
  } catch (err) {
    return { isError: true, content: [{ type: "text", text: (err as Error).message }] };
  }
}

const jobSummary = (j: Job) => ({
  id: j.id,
  title: j.title,
  budgetLei: j.budget,
  city: j.city,
  location: j.location,
  remote: j.isRemote,
  urgency: j.urgency,
  status: j.status,
  category: j.category.name,
  kind: j.category.kind,
  services: j.tags.map((t) => t.name),
  bids: j.bidCount,
  client: j.client.fullName,
  promoted: j.isPromoted,
  createdAt: j.createdAt,
  url: `${API_URL}/jobs/${j.id}`,
});

const workerSummary = (w: Worker) => ({
  id: w.id,
  name: w.fullName,
  city: w.city,
  rating: w.ratingAvg,
  reviews: w.ratingCount,
  completedJobs: w.completedJobs,
  verified: w.isVerified,
  premium: w.isPremium,
  hourlyRateLei: w.hourlyRate,
  license: w.licenseInfo,
  services: w.tags.map((t) => `${t.name} (${t.yearsExperience} ani)`),
  url: `${API_URL}/workers/${w.id}`,
});

const id = z.string().regex(/^[0-9a-f-]{36}$/i, "UUID invalid");
const kind = z.enum(["specialized", "casual"]).optional().describe("specialized = meserii calificate, casual = treburi casnice");
const readOnly = { readOnlyHint: true, openWorldHint: false } as const;

function createServer(): McpServer {
  const server = new McpServer({ name: "gata", version: "0.1.0" });

  server.registerTool(
    "platform_health",
    {
      title: "Starea platformei",
      description: "Verifică dacă aplicația Gata răspunde și ce mod folosește (demo/supabase, AI openai/local).",
      annotations: readOnly,
    },
    () => run(() => call("/api/health")),
  );

  server.registerTool(
    "list_categories",
    {
      title: "Categorii și servicii",
      description:
        "Lista categoriilor (calificate vs. casnice) cu serviciile (taguri) lor, numărul de joburi deschise și de lucrători. Folosește slug-urile ca filtre în search_jobs / search_workers.",
      annotations: readOnly,
    },
    () =>
      run(async () =>
        (await call<CategoryWithCounts[]>("/api/categories")).map((c) => ({
          slug: c.slug,
          name: c.name,
          kind: c.kind,
          openJobs: c.openJobs,
          workers: c.workers,
          services: c.tags.map((t) => ({
            slug: t.slug,
            name: t.name,
            ...(t.requiresLicense ? { licenseRequired: t.licenseNote } : {}),
          })),
        })),
      ),
  );

  server.registerTool(
    "search_jobs",
    {
      title: "Caută joburi",
      description: "Caută joburi după text, categorie, serviciu (tag), oraș și status. Joburile clienților Premium apar primele.",
      inputSchema: {
        q: z.string().max(200).optional().describe("Text liber, ex. „montaj dulap”"),
        category: z.string().max(80).optional().describe("Slug de categorie din list_categories"),
        tag: z.string().max(80).optional().describe("Slug de serviciu, ex. electrician"),
        city: z.string().max(80).optional(),
        kind,
        status: z.enum(["open", "assigned", "completed", "cancelled", "all"]).default("open"),
        limit: z.number().int().min(1).max(100).default(20),
      },
      annotations: readOnly,
    },
    (args) =>
      run(async () => (await call<Job[]>(`/api/jobs${qs(args)}`)).map(jobSummary)),
  );

  server.registerTool(
    "get_job",
    {
      title: "Detalii job",
      description: "Descrierea completă a unui job. Ofertele și contactele sunt vizibile doar părților implicate, în aplicație.",
      inputSchema: { id },
      annotations: readOnly,
    },
    ({ id: jobId }) =>
      run(async () => {
        const { job } = await call<{ job: Job }>(`/api/jobs/${jobId}`);
        return { ...jobSummary(job), description: job.description };
      }),
  );

  server.registerTool(
    "search_workers",
    {
      title: "Caută lucrători",
      description: "Caută lucrători după text, serviciu (tag), oraș și tip. Lucrătorii Premium apar primii; conturile banate sunt ascunse.",
      inputSchema: {
        q: z.string().max(200).optional(),
        tag: z.string().max(80).optional().describe("Slug de serviciu din list_categories"),
        city: z.string().max(80).optional(),
        kind,
        limit: z.number().int().min(1).max(100).default(20),
      },
      annotations: readOnly,
    },
    (args) =>
      run(async () => (await call<Worker[]>(`/api/workers${qs(args)}`)).map(workerSummary)),
  );

  server.registerTool(
    "get_worker",
    {
      title: "Profil lucrător",
      description: "Profilul public al unui lucrător: bio, servicii, portofoliu, rating și recenziile primite pe servicii.",
      inputSchema: { id },
      annotations: readOnly,
    },
    ({ id: workerId }) =>
      run(async () => {
        const data = await call<{ worker: Worker; reviews: Review[]; ratingDistribution: Record<string, number> }>(
          `/api/workers/${workerId}`,
        );
        return {
          ...workerSummary(data.worker),
          bio: data.worker.bio,
          portfolio: data.worker.portfolio,
          ratingDistribution: data.ratingDistribution,
          latestReviews: data.reviews.slice(0, 10).map((r) => ({
            rating: r.rating,
            comment: r.comment,
            service: r.serviceName,
            job: r.jobTitle,
            by: r.reviewer.fullName,
            direction: r.direction,
            createdAt: r.createdAt,
          })),
        };
      }),
  );

  server.registerTool(
    "recommend_workers",
    {
      title: "Recomandări AI pentru un job",
      description:
        "Cei mai potriviți lucrători pentru un job, cu scorul AI 0–100 (taguri 55% + similaritate semantică 35% + locație 10%, penalizare fără licență) și boost-ul Premium folosit la ordonare.",
      inputSchema: { jobId: id, limit: z.number().int().min(1).max(20).default(5) },
      annotations: readOnly,
    },
    ({ jobId, limit }) =>
      run(async () =>
        (await call<RecommendedWorker[]>(`/api/jobs/${jobId}/recommendations${qs({ limit })}`)).map((r) => ({
          score: r.score,
          premiumBoost: r.boost,
          rankScore: r.rankScore,
          matchedServices: r.breakdown.matchedTags,
          missingServices: r.breakdown.missingTags,
          licenseWarning: r.breakdown.licenseWarning,
          semanticSource: r.breakdown.semanticSource,
          worker: workerSummary(r.worker),
        })),
      ),
  );

  server.registerTool(
    "analyze_match",
    {
      title: "Analiză AI job–lucrător",
      description: "Analiză detaliată a potrivirii dintre un job și un lucrător: scor, verdict, puncte forte și riscuri.",
      inputSchema: { jobId: id, workerId: id },
      annotations: readOnly,
    },
    ({ jobId, workerId }) => run(() => call<MatchAnalysis>("/api/match", { method: "POST", body: { jobId, workerId } })),
  );

  return server;
}

async function main() {
  await createServer().connect(new StdioServerTransport());
  console.error(`[gata-mcp] pornit · API: ${API_URL}`);
}

main().catch((err) => {
  console.error("[gata-mcp]", err);
  process.exit(1);
});
