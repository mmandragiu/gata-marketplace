/**
 * The OpenAI path of the matching engine, run against an in-process mock of the OpenAI API:
 * embeddings stored in pgvector and ranked by cosine similarity, content-hash caching, the LLM analysis
 * (JSON mode + validation + cache) and the local fallbacks when the API fails or answers garbage.
 */
import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";

import type { Db } from "@/lib/db/types";
import { vectorize } from "@/lib/matching/text";
import { seedDemoDatabase } from "@/lib/seed";
import * as jobs from "@/lib/services/jobs";
import * as matching from "@/lib/services/matching";
import * as profiles from "@/lib/services/profiles";
import type { Ctx, Job } from "@/lib/services/types";

import { createTestDb } from "./helpers";

const DIMS = 1536;

/**
 * Deterministic stand-in for text-embedding-3: a hashed term/concept vector plus a shared component, so
 * unrelated texts land near cosine 0.2 and related ones higher, like the real model.
 */
function fakeEmbedding(text: string): number[] {
  const v = new Array<number>(DIMS).fill(0);
  for (const [term, weight] of vectorize(text)) {
    let h = 2166136261;
    for (let i = 0; i < term.length; i++) h = Math.imul(h ^ term.charCodeAt(i), 16777619);
    v[(h >>> 0) % DIMS] += weight;
  }
  const norm = Math.hypot(...v) || 1;
  const withShared = v.map((x) => x / norm + 0.5 / Math.sqrt(DIMS));
  const norm2 = Math.hypot(...withShared);
  return withShared.map((x) => x / norm2);
}

const ANALYSIS = {
  score: 91,
  verdict: "Potrivire excelentă (mock)",
  strengths: ["Electrician autorizat ANRE"],
  concerns: [],
};

const mock = {
  embeddingRequests: 0,
  embeddedTexts: 0,
  chatRequests: 0,
  embeddings: "ok" as "ok" | "fail",
  chat: "ok" as "ok" | "fail" | "garbage",
  lastEmbeddingBody: null as Record<string, unknown> | null,
  lastChatBody: null as Record<string, unknown> | null,
};

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return chunks.length ? (JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>) : {};
}

let server: Server;
let db: Db;

async function as(email: string | null): Promise<Ctx> {
  if (!email) return { db, viewer: null };
  const rows = await db.system((q) => q.query<{ id: string }>("select id from auth.users where email = $1", [email]));
  const profile = await profiles.getOwnProfile(db, rows[0].id);
  assert.ok(profile, `profile for ${email}`);
  return { db, viewer: { authUserId: rows[0].id, profile } };
}

const profileId = async (email: string) => (await as(email)).viewer!.profile.id;

before(async () => {
  server = createServer(async (req, res) => {
    const send = (status: number, data: unknown) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(data));
    };
    const body = await readBody(req);
    if (req.method === "POST" && req.url === "/v1/embeddings") {
      mock.embeddingRequests++;
      mock.lastEmbeddingBody = body;
      if (mock.embeddings === "fail") return send(500, { error: { message: "mock outage", type: "server_error" } });
      const input = body.input as string[];
      mock.embeddedTexts += input.length;
      return send(200, {
        object: "list",
        model: body.model,
        data: input.map((text, index) => ({ object: "embedding", index, embedding: fakeEmbedding(text) })),
        usage: { prompt_tokens: input.length, total_tokens: input.length },
      });
    }
    if (req.method === "POST" && req.url === "/v1/chat/completions") {
      mock.chatRequests++;
      mock.lastChatBody = body;
      if (mock.chat === "fail") return send(500, { error: { message: "mock outage", type: "server_error" } });
      const content = mock.chat === "garbage" ? "Sigur! Iată analiza: foarte potrivit." : JSON.stringify(ANALYSIS);
      return send(200, {
        id: "chatcmpl-mock",
        object: "chat.completion",
        created: 0,
        model: body.model,
        choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content } }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      });
    }
    send(404, { error: { message: `no mock for ${req.method} ${req.url}` } });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.OPENAI_API_KEY = "sk-test-mock";
  process.env.OPENAI_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;

  db = await createTestDb();
  await seedDemoDatabase(db);
});

after(async () => {
  await db.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("AI matching with OpenAI (mock API)", () => {
  let tablou: Job;

  it("stores 1536-d embeddings in pgvector and ranks workers by cosine similarity", async () => {
    tablou = (await jobs.listJobs(await as(null), { tag: "electrician" }))[0];
    const recs = await matching.recommendWorkersForJob(await as("andreea.popescu@example.com"), tablou.id, 20);
    assert.equal(recs[0].worker.fullName, "Ion Marinescu");
    assert.ok(recs.every((r) => r.breakdown.semanticSource === "openai"));

    assert.equal(mock.lastEmbeddingBody?.model, "text-embedding-3-small");
    assert.equal(mock.lastEmbeddingBody?.dimensions, DIMS);
    const rows = await db.system((q) =>
      q.query<{ owner_type: string; n: number; dims: number }>(
        `select owner_type, count(*)::int as n, max(extensions.vector_dims(embedding))::int as dims
         from public.embeddings group by owner_type order by owner_type`,
      ),
    );
    assert.deepEqual(
      rows.map((r) => [r.owner_type, r.n, r.dims]),
      [
        ["job", 1, DIMS],
        ["profile", 9, DIMS],
      ],
    );

    const semantic = (name: string) => recs.find((r) => r.worker.fullName === name)!.breakdown.semantic;
    assert.ok(semantic("Ion Marinescu") > semantic("Sorina Matei"), "the electrician is closer than the dog walker");
  });

  it("re-embeds only the texts that changed (content-hash cache)", async () => {
    const before = mock.embeddedTexts;
    await matching.recommendWorkersForJob(await as("andreea.popescu@example.com"), tablou.id, 5);
    assert.equal(mock.embeddedTexts, before, "nothing changed, nothing re-embedded");

    const ion = await profileId("ion.marinescu@example.com");
    await db.system((q) => q.query("update public.profiles set bio = bio || ' Lucrez și în weekend.' where id = $1", [ion]));
    await matching.recommendWorkersForJob(await as("andreea.popescu@example.com"), tablou.id, 5);
    assert.equal(mock.embeddedTexts, before + 1, "only Ion's profile is re-embedded");
  });

  it("recommends jobs to a worker using the job embeddings", async () => {
    const recs = await matching.recommendJobsForViewer(await as("sorina.matei@example.com"), 5);
    assert.ok(recs.length > 0);
    assert.ok(recs.every((r) => r.breakdown.semanticSource === "openai"));
    assert.match(recs[0].job.title, /câine/i);
  });

  it("asks the LLM in JSON mode, validates the answer and caches it", async () => {
    const ion = await profileId("ion.marinescu@example.com");
    const calls = mock.chatRequests;
    const first = await matching.analyzeMatch(await as("andreea.popescu@example.com"), tablou.id, ion);
    assert.deepEqual(first, { ...ANALYSIS, source: "openai" });
    assert.equal(mock.chatRequests, calls + 1);
    assert.equal(mock.lastChatBody?.model, "gpt-4o-mini");
    assert.deepEqual(mock.lastChatBody?.response_format, { type: "json_object" });

    const second = await matching.analyzeMatch(await as(null), tablou.id, ion);
    assert.deepEqual(second, first);
    assert.equal(mock.chatRequests, calls + 1, "the second identical request is served from the cache");
  });

  it("falls back to the local analysis when the LLM fails or answers garbage", async () => {
    const gelu = await profileId("gelu.tudose@example.com");
    try {
      mock.chat = "garbage";
      assert.equal((await matching.analyzeMatch(await as(null), tablou.id, gelu)).source, "local");
      mock.chat = "fail";
      assert.equal((await matching.analyzeMatch(await as(null), tablou.id, gelu)).source, "local");
    } finally {
      mock.chat = "ok";
    }
  });

  it("falls back to local similarity when the embeddings API is down", async () => {
    const id = await jobs.createJob(await as("mihai.ionescu@example.com"), {
      title: "Montaj corpuri de iluminat și două prize în dormitor",
      description: "Am nevoie de un electrician autorizat pentru două aplice, o lustră și două prize noi.",
      budget: 400,
      categorySlug: "instalatii-constructii",
      tagSlugs: ["electrician"],
      city: "București",
      location: "București · Titan",
      isRemote: false,
      urgency: "week",
    });
    try {
      mock.embeddings = "fail";
      const recs = await matching.recommendWorkersForJob(await as("mihai.ionescu@example.com"), id, 3);
      assert.ok(recs.length > 0);
      assert.ok(recs.every((r) => r.breakdown.semanticSource === "local"));
      assert.equal(recs[0].worker.fullName, "Ion Marinescu");
    } finally {
      mock.embeddings = "ok";
    }
  });
});
