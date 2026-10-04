import Link from "next/link";
import { Clock, MapPin, MessageSquareText, Wifi } from "lucide-react";

import { JobStatusBadge, PromotedBadge } from "@/components/common/badges";
import { CategoryIcon } from "@/components/common/category-icon";
import { MatchScore } from "@/components/common/match-score";
import { TagChip } from "@/components/common/tag-chip";
import { UserAvatar } from "@/components/common/user-avatar";
import { formatLei, timeAgo, urgencyLabel } from "@/lib/format";
import type { Job, MatchResult } from "@/lib/services/types";
import { cn } from "@/lib/utils";

export function JobCard({
  job,
  match,
  showStatus,
  alreadyBid,
}: {
  job: Job;
  match?: MatchResult;
  showStatus?: boolean;
  alreadyBid?: boolean;
}) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className={cn(
        "group relative flex flex-col gap-4 rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg",
        job.isPromoted && "premium-ring",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "inline-flex size-11 shrink-0 items-center justify-center rounded-xl",
            job.category.kind === "specialized" ? "bg-skilled-soft text-skilled" : "bg-casual-soft text-casual",
          )}
        >
          <CategoryIcon icon={job.category.icon} className="size-5" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {job.isPromoted && <PromotedBadge label="Evidențiat" />}
            {showStatus && <JobStatusBadge status={job.status} />}
            {job.urgency === "urgent" && (
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">Urgent</span>
            )}
            {alreadyBid && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">Ai trimis ofertă</span>}
          </div>
          <h3 className="line-clamp-2 text-base font-semibold leading-snug group-hover:text-primary">{job.title}</h3>
          <p className="text-xs text-muted-foreground">{job.category.name}</p>
        </div>
        {match ? (
          <MatchScore score={match.score} breakdown={match.breakdown} size="sm" />
        ) : (
          <div className="text-right">
            <p className="font-heading text-lg font-bold tabular-nums">{formatLei(job.budget)}</p>
            <p className="text-xs text-muted-foreground">buget estimativ</p>
          </div>
        )}
      </div>

      <p className="line-clamp-2 text-sm text-muted-foreground">{job.description}</p>

      <div className="flex flex-wrap gap-1.5">
        {job.tags.map((t) => (
          <TagChip key={t.id} name={t.name} kind={job.category.kind} requiresLicense={t.requiresLicense} />
        ))}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <UserAvatar name={job.client.fullName} size="sm" className="size-6 text-[10px]" />
          {job.client.fullName}
        </span>
        <span className="inline-flex items-center gap-1">
          {job.isRemote ? <Wifi className="size-3.5" aria-hidden /> : <MapPin className="size-3.5" aria-hidden />}
          {job.location || job.city}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" aria-hidden />
          {urgencyLabel[job.urgency]}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageSquareText className="size-3.5" aria-hidden />
          {job.bidCount} {job.bidCount === 1 ? "ofertă" : "oferte"}
        </span>
        <span className="ml-auto">{timeAgo(job.createdAt)}</span>
        {match && <span className="font-semibold text-foreground">{formatLei(job.budget)}</span>}
      </div>
    </Link>
  );
}
