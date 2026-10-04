import { BadgeCheck, Ban, Crown, Megaphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { bidStatusLabel, jobStatusLabel } from "@/lib/format";
import type { BidStatus, JobStatus } from "@/lib/services/types";
import { cn } from "@/lib/utils";

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium text-skilled", className)} title="Profil verificat">
      <BadgeCheck className="size-4" aria-hidden />
      Verificat
    </span>
  );
}

export function PremiumBadge({ className }: { className?: string }) {
  return (
    <Badge className={cn("gap-1 border-premium/40 bg-premium-soft text-foreground", className)} variant="outline">
      <Crown className="size-3 text-premium" aria-hidden />
      Premium
    </Badge>
  );
}

export function PromotedBadge({ className, label = "Promovat" }: { className?: string; label?: string }) {
  return (
    <Badge className={cn("gap-1 border-premium/40 bg-premium-soft text-foreground", className)} variant="outline">
      <Megaphone className="size-3 text-premium" aria-hidden />
      {label}
    </Badge>
  );
}

export function BannedBadge({ className }: { className?: string }) {
  return (
    <Badge variant="destructive" className={cn("gap-1", className)}>
      <Ban className="size-3" aria-hidden />
      Suspendat · investigație
    </Badge>
  );
}

const jobStatusClass: Record<JobStatus, string> = {
  open: "bg-success-soft text-success border-success/20",
  assigned: "bg-skilled-soft text-skilled border-skilled/20",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <Badge variant="outline" className={jobStatusClass[status]}>
      {jobStatusLabel[status]}
    </Badge>
  );
}

const bidStatusClass: Record<BidStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  accepted: "bg-success-soft text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

export function BidStatusBadge({ status }: { status: BidStatus }) {
  return (
    <Badge variant="outline" className={bidStatusClass[status]}>
      {bidStatusLabel[status]}
    </Badge>
  );
}
