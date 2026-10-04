"use client";

import { Crown, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { togglePremium } from "@/app/actions";
import { ShimmerShine, shimmerClasses } from "@/components/third-party/shimmer-button";
import { Button } from "@/components/ui/button";

export function PremiumToggle({ isPremium }: { isPremium: boolean }) {
  const [pending, startTransition] = useTransition();
  const run = (enabled: boolean) =>
    startTransition(async () => {
      const res = await togglePremium(enabled);
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
    });

  if (isPremium) {
    return (
      <Button variant="outline" size="lg" disabled={pending} onClick={() => run(false)} className="w-full">
        {pending && <Loader2 className="animate-spin" aria-hidden />} Oprește abonamentul (demo)
      </Button>
    );
  }
  return (
    <button type="button" disabled={pending} onClick={() => run(true)} className={shimmerClasses("w-full bg-foreground text-background")}>
      <span className="relative z-10 inline-flex items-center gap-2">
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Crown className="size-4 text-premium" aria-hidden />}
        Activează Premium · plată simulată
      </span>
      <ShimmerShine />
    </button>
  );
}
