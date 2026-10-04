import Link from "next/link";
import { BriefcaseBusiness, MapPin } from "lucide-react";

import { PremiumBadge, VerifiedBadge } from "@/components/common/badges";
import { MatchScore } from "@/components/common/match-score";
import { RatingStars } from "@/components/common/rating-stars";
import { TagChip } from "@/components/common/tag-chip";
import { UserAvatar } from "@/components/common/user-avatar";
import type { MatchResult, Worker } from "@/lib/services/types";
import { cn } from "@/lib/utils";

export function WorkerCard({ worker, match, compact }: { worker: Worker; match?: MatchResult; compact?: boolean }) {
  return (
    <Link
      href={`/workers/${worker.id}`}
      className={cn(
        "group flex flex-col gap-3 rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg",
        worker.isPremium && "premium-ring",
      )}
    >
      <div className="flex items-start gap-3">
        <UserAvatar name={worker.fullName} size="lg" ring={worker.isPremium ? "premium" : undefined} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold group-hover:text-primary">{worker.fullName}</h3>
            {worker.isVerified && <VerifiedBadge />}
          </div>
          <RatingStars value={worker.ratingAvg} count={worker.ratingCount} />
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" aria-hidden /> {worker.city || "—"}
            </span>
            <span className="inline-flex items-center gap-1">
              <BriefcaseBusiness className="size-3" aria-hidden /> {worker.completedJobs} lucrări finalizate
            </span>
            {worker.hourlyRate ? <span>~{worker.hourlyRate} lei/oră</span> : null}
          </p>
        </div>
        {match && <MatchScore score={match.score} breakdown={match.breakdown} boost={match.boost} size="sm" />}
      </div>
      {!compact && <p className="line-clamp-2 text-sm text-muted-foreground">{worker.bio}</p>}
      <div className="flex flex-wrap gap-1.5">
        {worker.tags.slice(0, compact ? 3 : 5).map((t) => (
          <TagChip key={t.id} name={t.name} kind={t.categoryKind} years={compact ? undefined : t.yearsExperience} />
        ))}
      </div>
      {worker.isPremium && !compact && (
        <div className="mt-auto">
          <PremiumBadge />
        </div>
      )}
    </Link>
  );
}
