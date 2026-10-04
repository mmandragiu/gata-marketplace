import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Briefcase, Hammer, Inbox, Plus, Send, Sparkles, UserRoundPen } from "lucide-react";

import { AdBanner } from "@/components/common/ad-banner";
import { BannedBadge, BidStatusBadge, JobStatusBadge } from "@/components/common/badges";
import { EmptyState } from "@/components/common/empty-state";
import { JobCard } from "@/components/jobs/job-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCtx } from "@/lib/auth/session";
import { formatHours, formatLei, timeAgo } from "@/lib/format";
import { listMyBids } from "@/lib/services/bids";
import { listMyJobs } from "@/lib/services/jobs";
import { recommendJobsForViewer } from "@/lib/services/matching";
import { getWorker } from "@/lib/services/profiles";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const ctx = await getCtx();
  if (!ctx.viewer) redirect("/login?next=/dashboard");
  const { profile } = ctx.viewer;

  const [myJobs, myBids, recommended, me] = await Promise.all([
    listMyJobs(ctx),
    listMyBids(ctx),
    recommendJobsForViewer(ctx, 12),
    getWorker(ctx, profile.id),
  ]);
  const hasWorkerProfile = (me?.tags.length ?? 0) > 0;
  const openJobs = myJobs.filter((j) => j.status === "open");
  const pendingBids = myBids.filter((b) => b.status === "pending");

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Bun venit înapoi,</p>
          <h1 className="text-3xl font-bold">{profile.fullName}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/profile">
              <UserRoundPen aria-hidden /> Profil
            </Link>
          </Button>
          {!profile.isBanned && (
            <Button asChild>
              <Link href="/jobs/new">
                <Plus aria-hidden /> Postează job
              </Link>
            </Button>
          )}
        </div>
      </div>

      {profile.isBanned && (
        <Alert variant="destructive">
          <AlertTitle className="flex items-center gap-2">
            <BannedBadge /> Cont restricționat
          </AlertTitle>
          <AlertDescription>
            {profile.bannedReason ?? "Contul este suspendat."} Nu poți publica joburi, trimite oferte sau mesaje până la finalul investigației.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Joburi deschise", value: openJobs.length },
          { label: "Oferte primite", value: myJobs.reduce((n, j) => n + (j.status === "open" ? j.bidCount : 0), 0) },
          { label: "Oferte trimise în așteptare", value: pendingBids.length },
          { label: "Rating", value: profile.ratingCount ? profile.ratingAvg.toFixed(1) : "—" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="font-heading text-2xl font-bold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue={profile.roleMode === "worker" ? "worker" : "client"}>
        <TabsList className="h-11">
          <TabsTrigger value="client" className="px-4">
            <Briefcase aria-hidden /> Beneficiar
          </TabsTrigger>
          <TabsTrigger value="worker" className="px-4">
            <Hammer aria-hidden /> Lucrător
          </TabsTrigger>
        </TabsList>

        <TabsContent value="client" className="space-y-6 pt-4">
          <h2 className="text-xl font-semibold">Joburile mele</h2>
          {myJobs.length === 0 ? (
            <EmptyState icon={Inbox} title="N-ai postat încă niciun job" action={<Button asChild><Link href="/jobs/new">Postează primul job</Link></Button>}>
              Descrie lucrarea și primești oferte de la lucrători potriviți, ordonate după scorul AI.
            </EmptyState>
          ) : (
            <div className="overflow-hidden rounded-2xl border">
              <ul className="divide-y">
                {myJobs.map((job) => (
                  <li key={job.id}>
                    <Link href={`/jobs/${job.id}`} className="flex flex-wrap items-center gap-3 p-4 transition-colors hover:bg-muted/50">
                      <JobStatusBadge status={job.status} />
                      <span className="min-w-0 flex-1 truncate font-medium">{job.title}</span>
                      <span className="text-sm text-muted-foreground">{formatLei(job.budget)}</span>
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">
                        {job.bidCount} {job.bidCount === 1 ? "ofertă" : "oferte"}
                      </span>
                      <span className="w-28 text-right text-xs text-muted-foreground">{timeAgo(job.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <AdBanner hidden={profile.isPremium} index={1} />
        </TabsContent>

        <TabsContent value="worker" className="space-y-8 pt-4">
          {!hasWorkerProfile ? (
            <EmptyState
              icon={Hammer}
              title="Activează-ți profilul de lucrător"
              action={
                <Button asChild>
                  <Link href="/profile">Alege serviciile tale</Link>
                </Button>
              }
            >
              Alege tagurile (ex. Montaj mobilă IKEA, Curățenie, Electrician) și primești joburi recomandate cu scor AI.
            </EmptyState>
          ) : (
            <section className="space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-semibold">
                    <Sparkles className="size-5 text-primary" aria-hidden /> Joburi recomandate pentru tine
                  </h2>
                  <p className="text-sm text-muted-foreground">Ordonate după Match Score (taguri, analiză semantică, locație).</p>
                </div>
                <Button asChild variant="ghost">
                  <Link href="/jobs">Toate joburile</Link>
                </Button>
              </div>
              {recommended.length === 0 ? (
                <EmptyState icon={Inbox} title="Niciun job deschis potrivit acum" />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {recommended.map((r) => (
                    <JobCard key={r.job.id} job={r.job} match={r} alreadyBid={r.alreadyBid} />
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Send className="size-5" aria-hidden /> Ofertele mele
            </h2>
            {myBids.length === 0 ? (
              <EmptyState icon={Send} title="N-ai trimis încă oferte" />
            ) : (
              <div className="overflow-hidden rounded-2xl border">
                <ul className="divide-y">
                  {myBids.map((b) => (
                    <li key={b.id}>
                      <Link href={`/jobs/${b.job.id}`} className="flex flex-wrap items-center gap-3 p-4 transition-colors hover:bg-muted/50">
                        <BidStatusBadge status={b.status} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{b.job.title}</span>
                          <span className="block text-xs text-muted-foreground">
                            {b.job.clientName} · {b.job.location}
                          </span>
                        </span>
                        <span className="text-sm font-semibold tabular-nums">{formatLei(b.price)}</span>
                        <span className="text-xs text-muted-foreground">{formatHours(b.durationHours)}</span>
                        <span className="w-28 text-right text-xs text-muted-foreground">{timeAgo(b.createdAt)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
          <AdBanner hidden={profile.isPremium} index={2} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
