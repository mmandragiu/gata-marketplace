import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BriefcaseBusiness, CalendarDays, Image as ImageIcon, MapPin, ShieldCheck, Star, Wallet } from "lucide-react";

import { BannedBadge, PremiumBadge, VerifiedBadge } from "@/components/common/badges";
import { RatingStars } from "@/components/common/rating-stars";
import { ReportDialog } from "@/components/common/report-dialog";
import { TagChip } from "@/components/common/tag-chip";
import { UserAvatar } from "@/components/common/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RatingDistribution } from "@/components/workers/rating-distribution";
import { getCtx } from "@/lib/auth/session";
import { formatDate, timeAgo } from "@/lib/format";
import { getWorker } from "@/lib/services/profiles";
import { listReviewsForProfile, ratingDistribution } from "@/lib/services/reviews";
import type { WorkerTag } from "@/lib/services/types";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { title: "Profil" };
  const worker = await getWorker(await getCtx(), id);
  return { title: worker?.fullName ?? "Profil" };
}

export default async function WorkerPage({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const ctx = await getCtx();
  const worker = await getWorker(ctx, id);
  if (!worker) notFound();
  const reviews = await listReviewsForProfile(ctx, worker.id);
  const dist = ratingDistribution(reviews);
  const isMe = ctx.viewer?.profile.id === worker.id;

  const groups = worker.tags.reduce<Record<string, WorkerTag[]>>((acc, t) => {
    (acc[t.categoryName] ??= []).push(t);
    return acc;
  }, {});
  const byService = reviews
    .filter((r) => r.direction === "client_to_worker")
    .reduce<Record<string, { sum: number; count: number }>>((acc, r) => {
      const key = r.serviceName ?? "General";
      acc[key] ??= { sum: 0, count: 0 };
      acc[key].sum += r.rating;
      acc[key].count += 1;
      return acc;
    }, {});

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border bg-card">
        <div className="h-28 bg-linear-to-r from-primary/30 via-skilled/20 to-casual/30" aria-hidden />
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-end">
          <UserAvatar
            name={worker.fullName}
            size="xl"
            className="-mt-16 border-4 border-card"
            ring={worker.isBanned ? "banned" : worker.isPremium ? "premium" : undefined}
          />
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold">{worker.fullName}</h1>
              {worker.isVerified && <VerifiedBadge />}
              {worker.isPremium && <PremiumBadge />}
              {worker.isBanned && <BannedBadge />}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <RatingStars value={worker.ratingAvg} count={worker.ratingCount} size="md" />
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4" aria-hidden /> {worker.city || "—"}
              </span>
              <span className="inline-flex items-center gap-1">
                <BriefcaseBusiness className="size-4" aria-hidden /> {worker.completedJobs} lucrări finalizate
              </span>
              {worker.hourlyRate ? (
                <span className="inline-flex items-center gap-1">
                  <Wallet className="size-4" aria-hidden /> ~{worker.hourlyRate} lei/oră
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-4" aria-hidden /> membru din {formatDate(worker.createdAt)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {isMe ? (
              <Button asChild variant="outline">
                <Link href="/profile">Editează profilul</Link>
              </Button>
            ) : (
              ctx.viewer && <ReportDialog targetType="profile" targetId={worker.id} targetName={worker.fullName} disabled={ctx.viewer.profile.isBanned} />
            )}
          </div>
        </div>
      </div>

      {worker.isBanned && (
        <p className="mt-4 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
          {worker.bannedReason ?? "Cont suspendat."} Profilul nu apare în căutări și nu poate primi joburi până la finalul investigației.
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Despre</h2>
            <p className="leading-relaxed whitespace-pre-line text-foreground/90">{worker.bio || "Fără descriere încă."}</p>
            {worker.licenseInfo && (
              <p className="inline-flex items-center gap-2 rounded-xl bg-skilled-soft px-3 py-2 text-sm text-skilled">
                <ShieldCheck className="size-4" aria-hidden /> {worker.licenseInfo}
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Servicii</h2>
            {worker.tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">Acest cont este folosit doar ca beneficiar.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(groups).map(([category, tags]) => (
                  <div key={category} className="rounded-2xl border p-4">
                    <p className="mb-2 text-sm font-semibold">{category}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((t) => (
                        <TagChip key={t.id} name={t.name} kind={t.categoryKind} years={t.yearsExperience} requiresLicense={t.requiresLicense} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {worker.portfolio.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Portofoliu</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {worker.portfolio.map((p, i) => (
                  <div key={p.title} className="overflow-hidden rounded-2xl border">
                    <div
                      className="flex h-28 items-center justify-center"
                      style={{ background: `linear-gradient(135deg, oklch(0.9 0.05 ${(i * 70 + 150) % 360}), oklch(0.8 0.09 ${(i * 70 + 200) % 360}))` }}
                    >
                      <ImageIcon className="size-8 text-foreground/40" aria-hidden />
                    </div>
                    <div className="p-4">
                      <p className="font-semibold">{p.title}</p>
                      <p className="text-sm text-muted-foreground">{p.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Recenzii ({reviews.length})</h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nicio recenzie încă.</p>
            ) : (
              <ul className="space-y-3">
                {reviews.map((r) => (
                  <li key={r.id} className="rounded-2xl border bg-card p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <UserAvatar name={r.reviewer.fullName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{r.reviewer.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {r.direction === "client_to_worker" ? "client" : "lucrător"} · {r.jobTitle}
                        </p>
                      </div>
                      <RatingStars value={r.rating} showValue={false} />
                      <span className="text-xs text-muted-foreground">{timeAgo(r.createdAt)}</span>
                    </div>
                    {r.serviceName && (
                      <span className="mt-2 inline-block rounded-full bg-muted px-2 py-0.5 text-xs">Serviciu: {r.serviceName}</span>
                    )}
                    {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="size-4 fill-premium text-premium" aria-hidden /> Rating
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-2">
                <span className="font-heading text-4xl font-bold">{worker.ratingCount ? worker.ratingAvg.toFixed(1) : "—"}</span>
                <span className="pb-1 text-sm text-muted-foreground">din {worker.ratingCount} recenzii</span>
              </div>
              <RatingDistribution data={dist} total={reviews.length} />
            </CardContent>
          </Card>
          {Object.keys(byService).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Rating pe serviciu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {Object.entries(byService).map(([service, s]) => (
                  <div key={service} className="flex items-center justify-between gap-2">
                    <span>{service}</span>
                    <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
                      {(s.sum / s.count).toFixed(1)} <Star className="size-3.5 fill-premium text-premium" aria-hidden />
                      <span className="font-normal text-muted-foreground">({s.count})</span>
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
