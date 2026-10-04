import type { Metadata } from "next";
import Link from "next/link";
import { Check, Crown, EyeOff, Megaphone, Pin, Sparkles, X } from "lucide-react";

import { PremiumToggle } from "@/components/premium/premium-toggle";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/session";
import { appConfig } from "@/lib/config";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Premium" };

const FEATURES = [
  { icon: EyeOff, title: "Fără reclame", text: "Toate bannerele dispar din feed, dashboard și pagini." },
  { icon: Pin, title: "Boost la joburi", text: "Joburile tale sunt evidențiate și fixate sus în feed." },
  { icon: Megaphone, title: "Boost la profil", text: "Ofertele tale apar primele în lista clientului, cu insigna Promovat." },
  { icon: Sparkles, title: "Prioritate în recomandări", text: "Bonus transparent în clasamentul AI (+10 la scor de ordonare)." },
];

export default async function PremiumPage() {
  const viewer = await getViewer();
  const isPremium = Boolean(viewer?.profile.isPremium);

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-3 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-premium/40 bg-premium-soft px-3 py-1 text-xs font-semibold">
          <Crown className="size-3.5 text-premium" aria-hidden /> {appConfig.name} Premium
        </span>
        <h1 className="text-4xl font-bold">Mai multă vizibilitate, zero reclame</h1>
        <p className="text-muted-foreground">Pentru clienții care vor răspunsuri rapide și lucrătorii care vor mai multe joburi.</p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border bg-card p-8">
          <p className="text-sm font-semibold text-muted-foreground">Gratuit</p>
          <p className="mt-2 font-heading text-4xl font-bold">0 $</p>
          <ul className="mt-6 space-y-3 text-sm">
            {["Postezi joburi nelimitat", "Trimiți oferte", "Potrivire AI și recenzii", "Chat după acceptare"].map((f) => (
              <li key={f} className="flex gap-2">
                <Check className="size-4 text-success" aria-hidden /> {f}
              </li>
            ))}
            {["Reclame în feed", "Fără boost"].map((f) => (
              <li key={f} className="flex gap-2 text-muted-foreground">
                <X className="size-4" aria-hidden /> {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative overflow-hidden rounded-3xl border-2 border-premium bg-card p-8 shadow-xl">
          <div className="absolute -top-20 -right-20 size-56 rounded-full bg-premium/25 blur-3xl" aria-hidden />
          <div className="relative">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Crown className="size-4 text-premium" aria-hidden /> Premium
            </p>
            <p className="mt-2 font-heading text-4xl font-bold">
              9,99 $ <span className="text-base font-normal text-muted-foreground">/ lună</span>
            </p>
            <ul className="mt-6 space-y-4">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex gap-3">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-premium-soft">
                    <f.icon className="size-4 text-premium" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{f.title}</span>
                    <span className="block text-sm text-muted-foreground">{f.text}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-8 space-y-2">
              {viewer ? (
                <>
                  <PremiumToggle isPremium={isPremium} />
                  {isPremium && viewer.profile.premiumSince && (
                    <p className="text-center text-xs text-muted-foreground">Activ din {formatDate(viewer.profile.premiumSince)}</p>
                  )}
                </>
              ) : (
                <Button asChild size="lg" className="w-full">
                  <Link href="/login?next=/premium">Intră în cont ca să activezi</Link>
                </Button>
              )}
              <p className="text-center text-xs text-muted-foreground">
                Demo hackathon: plata e simulată. În producție, abonamentul se activează dintr-un webhook de plăți (ex. Stripe).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
