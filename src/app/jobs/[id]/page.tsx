import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck, Clock, Lock, Mail, MapPin, MessageSquare, Phone, ShieldAlert, Sparkles, Wallet, Wifi } from "lucide-react";

import { AdBanner } from "@/components/common/ad-banner";
import { BannedBadge, BidStatusBadge, JobStatusBadge, PromotedBadge } from "@/components/common/badges";
import { CategoryIcon } from "@/components/common/category-icon";
import { EmptyState } from "@/components/common/empty-state";
import { LiveRefresh } from "@/components/common/live-refresh";
import { RatingStars } from "@/components/common/rating-stars";
import { ReportDialog } from "@/components/common/report-dialog";
import { TagChip } from "@/components/common/tag-chip";
import { UserAvatar } from "@/components/common/user-avatar";
import { AnalyzeMatchButton } from "@/components/jobs/analyze-button";
import { BidForm } from "@/components/jobs/bid-form";
import { BidsList } from "@/components/jobs/bids-list";
import { ChatPanel } from "@/components/jobs/chat-panel";
import { OwnerActions } from "@/components/jobs/owner-actions";
import { ReviewForm } from "@/components/jobs/review-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkerCard } from "@/components/workers/worker-card";
import { getCtx } from "@/lib/auth/session";
import { dataMode, supabaseAnonKey, supabaseUrl } from "@/lib/config";
import { formatHours, formatLei, timeAgo, urgencyLabel } from "@/lib/format";
import { listBidsForJob } from "@/lib/services/bids";
import { getCounterpartyContact, isJobParty, listMessages } from "@/lib/services/chat";
import { getJob } from "@/lib/services/jobs";
import { recommendWorkersForJob, scoreBidders } from "@/lib/services/matching";
import { hasReviewed } from "@/lib/services/reviews";
import type { MatchResult } from "@/lib/services/types";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const job = await getJob(await getCtx(), id);
  return { title: job?.title ?? "Job" };
}

export default async function JobPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const ctx = await getCtx();
  const job = await getJob(ctx, id);
  if (!job) notFound();

  const me = ctx.viewer?.profile ?? null;
  const isOwner = me?.id === job.client.id;
  const party = isJobParty(ctx, job);
  const bids = await listBidsForJob(ctx, job.id);
  const myBid = !isOwner ? bids.find((b) => b.worker.id === me?.id) ?? null : null;

  const [matches, recommended, contact, messages, reviewed] = await Promise.all([
    isOwner && bids.length > 0 ? scoreBidders(ctx, job, bids.map((b) => b.worker.id)) : Promise.resolve(new Map<string, MatchResult>()),
    isOwner && job.status === "open" ? recommendWorkersForJob(ctx, job.id, 4) : Promise.resolve([]),
    party ? getCounterpartyContact(ctx, job) : Promise.resolve(null),
    party ? listMessages(ctx, job.id) : Promise.resolve([]),
    party && job.status === "completed" ? hasReviewed(ctx, job.id) : Promise.resolve(false),
  ]);
  const accepted = bids.find((b) => b.status === "accepted");
  const licenseTag = job.tags.find((t) => t.requiresLicense);
  const mode = dataMode();
  const counterpartyName = isOwner ? accepted?.worker.fullName ?? contact?.fullName ?? "lucrătorul" : job.client.fullName;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {isOwner && job.status === "open" && (
        <LiveRefresh mode={mode} table="bids" filter={`job_id=eq.${job.id}`} supabaseUrl={supabaseUrl()} supabaseKey={supabaseAnonKey()} />
      )}
      {party && (
        <LiveRefresh mode={mode} table="messages" filter={`job_id=eq.${job.id}`} supabaseUrl={supabaseUrl()} supabaseKey={supabaseAnonKey()} intervalMs={4000} />
      )}

      {sp.created === "1" && (
        <Alert className="mb-6 border-success/30 bg-success-soft">
          <CircleCheck className="text-success" aria-hidden />
          <AlertTitle>Job publicat!</AlertTitle>
          <AlertDescription>Lucrătorii potriviți îl văd acum în feed. Mai jos ai recomandările AI.</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <JobStatusBadge status={job.status} />
              {job.isPromoted && <PromotedBadge label="Evidențiat (client Premium)" />}
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <CategoryIcon icon={job.category.icon} className="size-4" /> {job.category.name}
              </span>
              <span className="text-sm text-muted-foreground">· postat {timeAgo(job.createdAt)}</span>
            </div>
            <h1 className="text-3xl font-bold sm:text-4xl">{job.title}</h1>
            <div className="flex flex-wrap gap-2">
              {job.tags.map((t) => (
                <TagChip key={t.id} name={t.name} kind={job.category.kind} requiresLicense={t.requiresLicense} href={`/jobs?tag=${t.slug}`} />
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Wallet, label: "Buget estimativ", value: formatLei(job.budget) },
              { icon: job.isRemote ? Wifi : MapPin, label: "Locație", value: job.location || job.city },
              { icon: Clock, label: "Urgență", value: urgencyLabel[job.urgency] },
            ].map((f) => (
              <div key={f.label} className="rounded-2xl border bg-card p-4">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <f.icon className="size-3.5" aria-hidden /> {f.label}
                </p>
                <p className="mt-1 font-semibold">{f.value}</p>
              </div>
            ))}
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Descriere</h2>
            <p className="leading-relaxed whitespace-pre-line text-foreground/90">{job.description}</p>
            {licenseTag && (
              <p className="flex gap-2 rounded-xl bg-casual-soft p-3 text-sm">
                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-casual" aria-hidden /> {licenseTag.licenseNote}
              </p>
            )}
          </section>

          {/* Owner: bids comparison + AI recommendations */}
          {isOwner && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Oferte primite ({bids.length})</h2>
                  <p className="text-sm text-muted-foreground">
                    Ofertele lucrătorilor Premium apar primele. Scorul AI compară jobul cu profilul fiecăruia.
                  </p>
                </div>
                <OwnerActions jobId={job.id} status={job.status} />
              </div>
              {bids.length === 0 ? (
                <EmptyState icon={MessageSquare} title="Încă nu ai oferte">
                  De obicei primele oferte vin în câteva ore. Între timp, vezi lucrătorii recomandați de AI.
                </EmptyState>
              ) : (
                <BidsList
                  bids={bids}
                  matches={Object.fromEntries(matches)}
                  jobId={job.id}
                  jobStatus={job.status}
                  isOwner
                  viewerBanned={Boolean(me?.isBanned)}
                />
              )}
            </section>
          )}

          {isOwner && recommended.length > 0 && (
            <section className="space-y-4">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  <Sparkles className="size-5 text-primary" aria-hidden /> Lucrători recomandați de AI
                </h2>
                <p className="text-sm text-muted-foreground">Ordonați după Match Score + boost Premium. Treci cu mouse-ul peste scor pentru detalii.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {recommended.map((r) => (
                  <div key={r.worker.id} className="space-y-2">
                    <WorkerCard worker={r.worker} match={r} compact />
                    <AnalyzeMatchButton jobId={job.id} workerId={r.worker.id} workerName={r.worker.fullName} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Parties: contact + chat */}
          {party && (
            <section className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="size-4 text-success" aria-hidden /> Date de contact deblocate
                  </CardTitle>
                  <CardDescription>
                    Execuția lucrării și plata se stabilesc direct între voi. Platforma a facilitat doar conexiunea.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {contact ? (
                    <>
                      <p className="font-semibold">{contact.fullName}</p>
                      {contact.phone && (
                        <p className="flex items-center gap-2">
                          <Phone className="size-4 text-muted-foreground" aria-hidden /> {contact.phone}
                        </p>
                      )}
                      {contact.email && (
                        <p className="flex items-center gap-2">
                          <Mail className="size-4 text-muted-foreground" aria-hidden /> {contact.email}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground">Celălalt utilizator nu și-a completat datele de contact.</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="size-4" aria-hidden /> Chat cu {counterpartyName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChatPanel jobId={job.id} messages={messages} meId={me!.id} disabled={me!.isBanned} />
                </CardContent>
              </Card>
            </section>
          )}

          {party && job.status === "completed" && (
            <section className="rounded-3xl border bg-card p-6">
              <h2 className="mb-4 text-xl font-semibold">Recenzie</h2>
              {reviewed ? (
                <p className="flex items-center gap-2 text-sm text-success">
                  <CircleCheck className="size-4" aria-hidden /> Ai lăsat deja o recenzie. Mulțumim!
                </p>
              ) : (
                <ReviewForm jobId={job.id} revieweeName={counterpartyName} />
              )}
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <Card>
            <CardHeader>
              <CardDescription>Client</CardDescription>
              <CardTitle className="flex items-center gap-3">
                <UserAvatar name={job.client.fullName} ring={job.client.isPremium ? "premium" : undefined} />
                <span>
                  <span className="block">{job.client.fullName}</span>
                  <RatingStars value={job.client.ratingAvg} count={job.client.ratingCount} />
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>{job.client.city}</span>
              {!isOwner && me && <ReportDialog targetType="job" targetId={job.id} targetName={job.title} disabled={me.isBanned} />}
            </CardContent>
          </Card>

          {!isOwner && job.status === "open" && (
            <Card>
              <CardHeader>
                <CardTitle>{myBid ? "Oferta ta" : "Trimite o ofertă"}</CardTitle>
                {!myBid && <CardDescription>Clientul compară prețul, durata, ratingul și scorul AI.</CardDescription>}
              </CardHeader>
              <CardContent>
                {!me ? (
                  <Button asChild className="w-full">
                    <Link href={`/login?next=/jobs/${job.id}`}>Intră în cont ca să trimiți o ofertă</Link>
                  </Button>
                ) : me.isBanned ? (
                  <div className="space-y-2 text-sm">
                    <BannedBadge />
                    <p className="text-muted-foreground">Nu poți trimite oferte cât timp contul este suspendat.</p>
                  </div>
                ) : myBid ? (
                  <div className="space-y-2 text-sm">
                    <BidStatusBadge status={myBid.status} />
                    <p className="font-heading text-2xl font-bold">{formatLei(myBid.price)}</p>
                    <p className="text-muted-foreground">{formatHours(myBid.durationHours)} · trimisă {timeAgo(myBid.createdAt)}</p>
                    {myBid.message && <p className="rounded-xl bg-muted p-3">{myBid.message}</p>}
                  </div>
                ) : (
                  <BidForm jobId={job.id} budget={job.budget} />
                )}
              </CardContent>
            </Card>
          )}

          {!isOwner && myBid && job.status !== "open" && (
            <Card>
              <CardHeader>
                <CardTitle>Oferta ta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <BidStatusBadge status={myBid.status} />
                <p className="font-semibold">{formatLei(myBid.price)}</p>
              </CardContent>
            </Card>
          )}

          <AdBanner hidden={Boolean(me?.isPremium)} variant="sidebar" index={0} />
        </aside>
      </div>
    </div>
  );
}
