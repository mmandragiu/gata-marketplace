import type { Metadata } from "next";
import Link from "next/link";
import { Fragment, Suspense } from "react";
import { Crown, Inbox, Plus } from "lucide-react";

import { AdBanner } from "@/components/common/ad-banner";
import { EmptyState } from "@/components/common/empty-state";
import { JobCard } from "@/components/jobs/job-card";
import { SearchFilters } from "@/components/jobs/search-filters";
import { Button } from "@/components/ui/button";
import { getCtx } from "@/lib/auth/session";
import { listCategories } from "@/lib/services/catalog";
import { listJobs } from "@/lib/services/jobs";
import type { CategoryKind } from "@/lib/services/types";

export const metadata: Metadata = { title: "Joburi" };

const one = (v: string | string[] | undefined) => (typeof v === "string" && v.trim() ? v.trim() : null);

export default async function JobsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const ctx = await getCtx();
  const kind = one(sp.kind);
  const [categories, jobs] = await Promise.all([
    listCategories(ctx),
    listJobs(ctx, {
      q: one(sp.q),
      tag: one(sp.tag),
      city: one(sp.city),
      kind: kind === "specialized" || kind === "casual" ? (kind as CategoryKind) : null,
    }),
  ]);
  const premium = Boolean(ctx.viewer?.profile.isPremium);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold">Joburi deschise</h1>
          <p className="text-muted-foreground">{jobs.length} rezultate · joburile clienților Premium sunt fixate sus</p>
        </div>
        <Button asChild>
          <Link href={ctx.viewer ? "/jobs/new" : "/login?next=/jobs/new"}>
            <Plus aria-hidden /> Postează job
          </Link>
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <Suspense>
            <SearchFilters categories={categories} placeholder="Caută: tablou electric, curățenie, logo…" />
          </Suspense>
          {jobs.length === 0 ? (
            <EmptyState icon={Inbox} title="Niciun job găsit">
              Încearcă alt cuvânt sau resetează filtrele.
            </EmptyState>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {jobs.map((job, i) => (
                <Fragment key={job.id}>
                  <JobCard job={job} />
                  {(i + 1) % 4 === 0 && !premium && (
                    <div className="md:col-span-2">
                      <AdBanner index={i} />
                    </div>
                  )}
                </Fragment>
              ))}
            </div>
          )}
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <AdBanner hidden={premium} variant="sidebar" index={2} />
          <div className="rounded-2xl border bg-premium-soft/50 p-5">
            <Crown className="size-6 text-premium" aria-hidden />
            <p className="mt-2 font-semibold">{premium ? "Ești Premium" : "Vrei mai multă vizibilitate?"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {premium
                ? "Joburile tale sunt fixate sus, ofertele tale apar primele și nu vezi reclame."
                : "Cu Premium, joburile tale sunt evidențiate și ofertele tale apar primele. Fără reclame."}
            </p>
            {!premium && (
              <Button asChild size="sm" className="mt-3">
                <Link href="/premium">Vezi Premium</Link>
              </Button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
