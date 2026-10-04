"use client";

import Link from "next/link";
import { Check, Clock, X } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { acceptBidAction, rejectBidAction } from "@/app/actions";
import { BannedBadge, BidStatusBadge, PromotedBadge, VerifiedBadge } from "@/components/common/badges";
import { MatchScore } from "@/components/common/match-score";
import { RatingStars } from "@/components/common/rating-stars";
import { ReportDialog } from "@/components/common/report-dialog";
import { UserAvatar } from "@/components/common/user-avatar";
import { Button } from "@/components/ui/button";
import { formatHours, formatLei, timeAgo } from "@/lib/format";
import type { Bid, JobStatus, MatchResult } from "@/lib/services/types";
import { cn } from "@/lib/utils";

import { AnalyzeMatchButton } from "./analyze-button";

export function BidsList({
  bids,
  matches,
  jobId,
  jobStatus,
  isOwner,
  viewerBanned,
}: {
  bids: Bid[];
  matches: Record<string, MatchResult>;
  jobId: string;
  jobStatus: JobStatus;
  isOwner: boolean;
  viewerBanned: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const lowest = bids.filter((b) => !b.worker.isBanned).reduce((m, b) => Math.min(m, b.price), Infinity);

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) toast.success(res.message ?? "Gata!");
      else toast.error(res.message ?? "Eroare");
    });
  }

  return (
    <ul className="space-y-3">
      {bids.map((bid) => {
        const match = matches[bid.worker.id];
        const canDecide = isOwner && jobStatus === "open" && bid.status === "pending" && !viewerBanned;
        return (
          <li
            key={bid.id}
            className={cn(
              "rounded-2xl border bg-card p-4 transition-colors",
              bid.isPromoted && bid.status !== "rejected" && "premium-ring",
              bid.status === "accepted" && "border-success bg-success-soft/40",
              (bid.worker.isBanned || bid.status === "rejected") && "opacity-60",
            )}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <Link href={`/workers/${bid.worker.id}`} className="flex min-w-0 flex-1 items-start gap-3">
                <UserAvatar
                  name={bid.worker.fullName}
                  ring={bid.worker.isBanned ? "banned" : bid.worker.isPremium ? "premium" : undefined}
                />
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold hover:underline">{bid.worker.fullName}</span>
                    {bid.worker.isVerified && <VerifiedBadge />}
                    {bid.isPromoted && <PromotedBadge label="Recomandat · Promovat" />}
                    {bid.worker.isBanned && <BannedBadge />}
                  </div>
                  <RatingStars value={bid.worker.ratingAvg} count={bid.worker.ratingCount} />
                  {bid.worker.licenseInfo && <p className="text-xs text-skilled">{bid.worker.licenseInfo}</p>}
                </div>
              </Link>
              <div className="flex items-center gap-4 sm:justify-end">
                {match && <MatchScore score={match.score} breakdown={match.breakdown} boost={match.boost} size="sm" />}
                <div className="text-right">
                  <p className="font-heading text-xl font-bold tabular-nums">{formatLei(bid.price)}</p>
                  <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" aria-hidden /> {formatHours(bid.durationHours)}
                    {bid.price === lowest && bids.length > 1 && !bid.worker.isBanned && (
                      <span className="ml-1 rounded bg-success-soft px-1.5 font-medium text-success">cel mai mic</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
            {bid.message && <p className="mt-3 rounded-xl bg-muted/60 p-3 text-sm whitespace-pre-line">{bid.message}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <BidStatusBadge status={bid.status} />
              <span className="text-xs text-muted-foreground">{timeAgo(bid.createdAt)}</span>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                {isOwner && <AnalyzeMatchButton jobId={jobId} workerId={bid.worker.id} workerName={bid.worker.fullName} />}
                {isOwner && (
                  <ReportDialog targetType="bid" targetId={bid.id} targetName={`Oferta lui ${bid.worker.fullName}`} disabled={viewerBanned} />
                )}
                {canDecide && (
                  <>
                    <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => rejectBidAction(bid.id))}>
                      <X aria-hidden /> Respinge
                    </Button>
                    <Button size="sm" disabled={pending || bid.worker.isBanned} onClick={() => run(() => acceptBidAction(bid.id))}>
                      <Check aria-hidden /> Acceptă
                    </Button>
                  </>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
