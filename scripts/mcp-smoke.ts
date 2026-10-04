/**
 * Smoke test for the MCP server: starts mcp/server.ts over stdio with the official SDK client and
 * calls every tool against a running app (GATA_API_URL, default http://localhost:3000).
 *
 *   npm run dev            # in another terminal
 *   npm run mcp:smoke
 */
import assert from "node:assert/strict";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

type ToolResult = { isError?: boolean; content: { type: string; text?: string }[] };

async function main() {
  const client = new Client({ name: "gata-smoke", version: "1.0.0" });
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: ["--import", "tsx", "mcp/server.ts"],
      env: { ...(process.env as Record<string, string>), GATA_API_URL: process.env.GATA_API_URL || "http://localhost:3000" },
      stderr: "inherit",
    }),
  );

  async function tool<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
    const res = (await client.callTool({ name, arguments: args })) as ToolResult;
    const text = res.content.find((c) => c.type === "text")?.text ?? "";
    if (res.isError) throw new Error(`${name}: ${text}`);
    return JSON.parse(text) as T;
  }

  const { tools } = await client.listTools();
  console.log("tools:", tools.map((t) => t.name).join(", "));
  assert.equal(tools.length, 8);

  const health = await tool<{ status: string; mode: string; ai: string }>("platform_health");
  assert.equal(health.status, "ok");
  console.log("health:", health);

  const categories = await tool<{ slug: string; services: { slug: string }[] }[]>("list_categories");
  assert.ok(categories.length >= 5);
  console.log("categories:", categories.map((c) => `${c.slug}(${c.services.length})`).join(" "));

  const electrical = await tool<{ title: string; status: string }[]>("search_jobs", { tag: "electrician", status: "all" });
  assert.ok(electrical.length >= 1, "electrical jobs exist");
  console.log("search_jobs electrician (toate):", electrical.map((j) => `${j.status}: ${j.title}`));

  const jobs = await tool<{ id: string; title: string; status: string }[]>("search_jobs", { limit: 5 });
  assert.ok(jobs.length >= 1, "open jobs exist");
  assert.ok(jobs.every((j) => j.status === "open"));

  const job = await tool<{ id: string; description: string }>("get_job", { id: jobs[0].id });
  assert.ok(job.description.length > 20);

  const recs = await tool<{ score: number; premiumBoost: number; worker: { id: string; name: string } }[]>(
    "recommend_workers",
    { jobId: jobs[0].id, limit: 3 },
  );
  assert.equal(recs.length, 3);
  console.log("recommend_workers:", recs.map((r) => `${r.worker.name} ${r.score}(+${r.premiumBoost})`).join(", "));

  const workers = await tool<{ id: string; name: string }[]>("search_workers", { q: "IKEA" });
  assert.ok(workers.length >= 1);
  console.log("search_workers IKEA:", workers.map((w) => w.name));

  const worker = await tool<{ name: string; rating: number; latestReviews: unknown[] }>("get_worker", { id: recs[0].worker.id });
  console.log("get_worker:", worker.name, worker.rating, `${worker.latestReviews.length} recenzii`);

  const analysis = await tool<{ score: number; verdict: string; source: string }>("analyze_match", {
    jobId: jobs[0].id,
    workerId: recs[0].worker.id,
  });
  console.log("analyze_match:", analysis.score, analysis.verdict, analysis.source);

  const missing = (await client.callTool({
    name: "get_job",
    arguments: { id: "00000000-0000-4000-8000-000000000000" },
  })) as ToolResult;
  assert.equal(missing.isError, true);
  console.log("get_job (inexistent):", missing.content[0].text);

  const invalid = (await client.callTool({ name: "get_job", arguments: { id: "nu-e-uuid" } })) as ToolResult;
  assert.equal(invalid.isError, true);
  console.log("get_job (id invalid): eroare de validare OK");

  await client.close();
  console.log("MCP smoke test: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
