import { Star } from "lucide-react";

export function RatingDistribution({ data, total }: { data: { stars: number; count: number }[]; total: number }) {
  return (
    <div className="space-y-1.5" role="img" aria-label="Distribuția notelor">
      {data.map((row) => {
        const pct = total > 0 ? (row.count / total) * 100 : 0;
        return (
          <div key={row.stars} className="flex items-center gap-2 text-xs">
            <span className="inline-flex w-8 items-center gap-0.5 tabular-nums">
              {row.stars} <Star className="size-3 fill-premium text-premium" aria-hidden />
            </span>
            <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <span className="absolute inset-y-0 left-0 rounded-full bg-premium transition-[width] duration-700" style={{ width: `${pct}%` }} />
            </span>
            <span className="w-6 text-right tabular-nums text-muted-foreground">{row.count}</span>
          </div>
        );
      })}
    </div>
  );
}
