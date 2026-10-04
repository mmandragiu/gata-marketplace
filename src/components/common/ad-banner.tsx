import Link from "next/link";
import { Crown, Drill, PaintRoller, Truck } from "lucide-react";

import { cn } from "@/lib/utils";

/** Mock ads (fictional advertisers). Hidden for Premium users. */
const ADS = [
  { icon: Drill, title: "SculeMax", text: "-20% la bormașini și truse de scule pentru meseriași.", cta: "Vezi oferta" },
  { icon: PaintRoller, title: "Vopsea Bună", text: "Lavabile ecologice, livrare gratuită peste 300 lei.", cta: "Descoperă" },
  { icon: Truck, title: "DubaRapidă", text: "Închiriezi o dubă cu șofer pentru mutări, de la 49 lei/oră.", cta: "Rezervă" },
];

export function AdBanner({ hidden, variant = "inline", index = 0 }: { hidden?: boolean; variant?: "inline" | "sidebar"; index?: number }) {
  if (hidden) return null;
  const ad = ADS[index % ADS.length];
  const Icon = ad.icon;
  return (
    <aside
      className={cn(
        "relative overflow-hidden rounded-2xl border border-dashed bg-muted/40 p-4",
        variant === "sidebar" ? "space-y-3" : "flex flex-col gap-3 sm:flex-row sm:items-center",
      )}
      aria-label="Reclamă"
    >
      <span className="absolute top-2 right-3 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Reclamă</span>
      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-background shadow-sm">
        <Icon className="size-5 text-casual" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{ad.title}</p>
        <p className="text-sm text-muted-foreground">{ad.text}</p>
      </div>
      <div className={cn("flex items-center gap-3", variant === "sidebar" && "justify-between")}>
        <span className="rounded-lg bg-background px-3 py-1.5 text-sm font-medium shadow-sm">{ad.cta}</span>
        <Link href="/premium" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <Crown className="size-3" aria-hidden /> Fără reclame
        </Link>
      </div>
    </aside>
  );
}
