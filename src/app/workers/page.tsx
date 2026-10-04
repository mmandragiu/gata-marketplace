import type { Metadata } from "next";
import { Suspense } from "react";
import { Users } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { SearchFilters } from "@/components/jobs/search-filters";
import { WorkerCard } from "@/components/workers/worker-card";
import { getCtx } from "@/lib/auth/session";
import { listCategories } from "@/lib/services/catalog";
import { listWorkers } from "@/lib/services/profiles";
import type { CategoryKind } from "@/lib/services/types";

export const metadata: Metadata = { title: "Lucrători" };

const one = (v: string | string[] | undefined) => (typeof v === "string" && v.trim() ? v.trim() : null);

export default async function WorkersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const ctx = await getCtx();
  const kind = one(sp.kind);
  const [categories, workers] = await Promise.all([
    listCategories(ctx),
    listWorkers(ctx, {
      q: one(sp.q),
      tag: one(sp.tag),
      city: one(sp.city),
      kind: kind === "specialized" || kind === "casual" ? (kind as CategoryKind) : null,
    }),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-3xl font-bold">Lucrători</h1>
        <p className="text-muted-foreground">{workers.length} profiluri · Premium primii, apoi după rating</p>
      </div>
      <Suspense>
        <SearchFilters categories={categories} placeholder="Caută după nume sau experiență: PAX, tablou electric, Next.js…" />
      </Suspense>
      {workers.length === 0 ? (
        <EmptyState icon={Users} title="Niciun lucrător găsit">
          Încearcă alt tag sau alt cuvânt.
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workers.map((w) => (
            <WorkerCard key={w.id} worker={w} />
          ))}
        </div>
      )}
    </div>
  );
}
