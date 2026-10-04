import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import type { CategoryKind } from "@/lib/services/types";
import { cn } from "@/lib/utils";

export function TagChip({
  name,
  kind,
  slug,
  years,
  requiresLicense,
  href,
  className,
}: {
  name: string;
  kind: CategoryKind;
  slug?: string;
  years?: number;
  requiresLicense?: boolean;
  href?: string;
  className?: string;
}) {
  const classes = cn(
    "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors",
    kind === "specialized"
      ? "border-skilled/20 bg-skilled-soft text-skilled"
      : "border-casual/25 bg-casual-soft text-casual",
    href && "hover:border-current",
    className,
  );
  const content = (
    <>
      {requiresLicense && <ShieldAlert className="size-3" aria-label="Necesită autorizație" />}
      {name}
      {years !== undefined && years > 0 && <span className="opacity-70">· {years} ani</span>}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={classes} data-slug={slug}>
        {content}
      </Link>
    );
  }
  return (
    <span className={classes} data-slug={slug}>
      {content}
    </span>
  );
}
