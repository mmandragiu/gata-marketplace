import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

export function RatingStars({
  value,
  count,
  size = "sm",
  showValue = true,
  className,
}: {
  value: number;
  count?: number;
  size?: "sm" | "md";
  showValue?: boolean;
  className?: string;
}) {
  const icon = size === "md" ? "size-4" : "size-3.5";
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-label={`Rating ${value.toFixed(1)} din 5`}>
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((i) => {
          const fill = Math.max(0, Math.min(1, value - (i - 1)));
          return (
            <span key={i} className={cn("relative", icon)}>
              <Star className={cn("absolute inset-0 text-muted-foreground/30", icon)} aria-hidden />
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className={cn("fill-premium text-premium", icon)} aria-hidden />
              </span>
            </span>
          );
        })}
      </span>
      {showValue && (
        <span className={cn("font-medium tabular-nums", size === "md" ? "text-sm" : "text-xs")}>
          {count === 0 ? "nou" : value.toFixed(1)}
          {count !== undefined && count > 0 && <span className="text-muted-foreground font-normal"> ({count})</span>}
        </span>
      )}
    </span>
  );
}
