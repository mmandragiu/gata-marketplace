import type { Metadata } from "next";
import { headers } from "next/headers";
import { Bot, FileJson } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buildOpenApiDocument, originFromHeaders } from "@/lib/openapi";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "API și MCP" };

const METHOD_CLASS: Record<string, string> = {
  get: "bg-skilled-soft text-skilled",
  post: "bg-success-soft text-success",
  put: "bg-casual-soft text-casual",
  delete: "bg-destructive/10 text-destructive",
};

type Operation = { summary?: string; tags?: string[]; security?: unknown[]; parameters?: { name: string; in: string }[] };

export default async function DocsPage() {
  const origin = originFromHeaders(await headers());
  const doc = buildOpenApiDocument(origin);
  const groups = new Map<string, { method: string; path: string; op: Operation }[]>();
  for (const [path, methods] of Object.entries(doc.paths)) {
    for (const [method, op] of Object.entries(methods as Record<string, Operation>)) {
      const tag = op.tags?.[0] ?? "Altele";
      if (!groups.has(tag)) groups.set(tag, []);
      groups.get(tag)!.push({ method, path, op });
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-6">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">API REST și server MCP</h1>
        <p className="text-muted-foreground">
          Specificația completă OpenAPI 3.1 este la{" "}
          <a className="font-medium text-primary underline-offset-2 hover:underline" href="/api/openapi">
            /api/openapi
          </a>{" "}
          (o poți importa în Postman, Insomnia sau Swagger Editor). Răspunsurile au forma <code>{"{ data }"}</code> sau{" "}
          <code>{"{ error: { code, message } }"}</code>.
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1">
            <FileJson className="size-3" aria-hidden /> OpenAPI 3.1
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Bot className="size-3" aria-hidden /> MCP (Model Context Protocol)
          </Badge>
        </div>
      </div>

      <section className="space-y-3 rounded-3xl border bg-card p-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Bot className="size-5 text-primary" aria-hidden /> Server MCP pentru asistenți AI
        </h2>
        <p className="text-sm text-muted-foreground">
          Serverul din <code>mcp/server.ts</code> expune marketplace-ul către Claude, Cursor sau alt client MCP: caută joburi și lucrători,
          vezi detalii și cere recomandări AI pentru un job. Pornește aplicația, apoi adaugă în configurația clientului MCP:
        </p>
        <pre className="overflow-x-auto rounded-xl bg-muted p-4 text-xs">{`{
  "mcpServers": {
    "gata": {
      "command": "npx",
      "args": ["-y", "tsx", "<cale-absolută>/gata-marketplace/mcp/server.ts"],
      "env": { "GATA_API_URL": "${origin}" }
    }
  }
}`}</pre>
        <p className="text-sm text-muted-foreground">
          Unelte: <code>list_categories</code>, <code>search_jobs</code>, <code>get_job</code>, <code>search_workers</code>,{" "}
          <code>get_worker</code>, <code>recommend_workers</code>, <code>analyze_match</code>, <code>platform_health</code>.
        </p>
      </section>

      {[...groups.entries()].map(([tag, ops]) => (
        <section key={tag} className="space-y-3">
          <h2 className="text-lg font-semibold">{tag}</h2>
          <ul className="divide-y overflow-hidden rounded-2xl border">
            {ops.map(({ method, path, op }) => (
              <li key={`${method}-${path}`} className="flex flex-wrap items-center gap-3 p-4">
                <span className={cn("w-16 rounded-md px-2 py-1 text-center text-xs font-bold uppercase", METHOD_CLASS[method])}>{method}</span>
                <code className="text-sm font-semibold">{path}</code>
                <span className="min-w-0 flex-1 text-sm text-muted-foreground">{op.summary}</span>
                {op.security && <Badge variant="outline">autentificat</Badge>}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Exemplu</h2>
        <pre className="overflow-x-auto rounded-xl bg-muted p-4 text-xs">{`curl "${origin}/api/jobs?tag=electrician"
curl "${origin}/api/jobs/<job-id>/recommendations?limit=3"
curl -X POST "${origin}/api/match" -H "content-type: application/json" \\
     -d '{"jobId":"<job-id>","workerId":"<profile-id>"}'`}</pre>
      </section>
    </div>
  );
}
