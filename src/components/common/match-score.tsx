import { Sparkles } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MatchBreakdown } from "@/lib/services/types";
import { cn } from "@/lib/utils";

function tone(score: number) {
  if (score >= 75) return "text-success";
  if (score >= 50) return "text-skilled";
  if (score >= 30) return "text-casual";
  return "text-muted-foreground";
}

/** Circular Match Score (0–100) with a breakdown tooltip. */
export function MatchScore({
  score,
  breakdown,
  boost,
  size = "md",
}: {
  score: number;
  breakdown?: MatchBreakdown;
  boost?: number;
  size?: "sm" | "md";
}) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const dim = size === "sm" ? "size-11" : "size-14";
  const ring = (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", dim)} aria-label={`Potrivire AI ${score}%`}>
      <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" strokeWidth="4" className="stroke-muted" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          className={cn("stroke-current transition-[stroke-dashoffset] duration-700", tone(score))}
        />
      </svg>
      <span className={cn("font-bold tabular-nums", size === "sm" ? "text-xs" : "text-sm", tone(score))}>{score}</span>
    </span>
  );
  if (!breakdown) return ring;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {ring}
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 space-y-1.5 text-left">
        <p className="flex items-center gap-1 font-semibold">
          <Sparkles className="size-3.5" aria-hidden /> Potrivire AI: {score}%
        </p>
        <p>Taguri potrivite: {Math.round(breakdown.tag * 100)}% {breakdown.matchedTags.length > 0 && `(${breakdown.matchedTags.join(", ")})`}</p>
        <p>
          Analiză semantică: {Math.round(breakdown.semantic * 100)}% ({breakdown.semanticSource === "openai" ? "OpenAI embeddings" : "model local"})
        </p>
        <p>Locație: {breakdown.location === 1 ? "potrivită" : "alt oraș"}</p>
        {breakdown.missingTags.length > 0 && <p>Lipsesc: {breakdown.missingTags.join(", ")}</p>}
        {breakdown.licenseWarning && <p className="font-medium">Atenție: lipsește autorizația cerută (ANRE).</p>}
        {boost ? <p>Boost Premium în clasament: +{boost}</p> : null}
      </TooltipContent>
    </Tooltip>
  );
}
