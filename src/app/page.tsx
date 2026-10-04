import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Crown,
  Handshake,
  MessageSquareLock,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";

import { CategoryIcon } from "@/components/common/category-icon";
import { MatchScore } from "@/components/common/match-score";
import { TagChip } from "@/components/common/tag-chip";
import { JobCard } from "@/components/jobs/job-card";
import { Marquee } from "@/components/third-party/marquee";
import { ShimmerShine, shimmerClasses } from "@/components/third-party/shimmer-button";
import { TextMorph } from "@/components/third-party/text-morph";
import { Button } from "@/components/ui/button";
import { WorkerCard } from "@/components/workers/worker-card";
import { getCtx } from "@/lib/auth/session";
import { appConfig } from "@/lib/config";
import { kindLabel } from "@/lib/format";
import { listCategoriesWithCounts } from "@/lib/services/catalog";
import { listJobs } from "@/lib/services/jobs";
import { listWorkers } from "@/lib/services/profiles";
import { getPlatformStats } from "@/lib/services/stats";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const ctx = await getCtx();
  const [stats, categories, jobs, workers] = await Promise.all([
    getPlatformStats(ctx),
    listCategoriesWithCounts(ctx),
    listJobs(ctx, { limit: 6 }),
    listWorkers(ctx, { limit: 4 }),
  ]);
  const loggedIn = Boolean(ctx.viewer);
  const allTags = categories.flatMap((c) => c.tags.map((t) => ({ ...t, kind: c.kind })));

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" aria-hidden />
        <div className="absolute -top-32 -left-24 size-96 rounded-full bg-primary/20 blur-3xl" aria-hidden />
        <div className="absolute -top-20 right-0 size-96 rounded-full bg-skilled/15 blur-3xl" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:py-24">
          <div className="space-y-7">
            <span className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-medium shadow-sm backdrop-blur">
              <Sparkles className="size-3.5 text-primary" aria-hidden /> Potrivire AI · meserii calificate și treburi casnice
            </span>
            <h1 className="text-4xl leading-[1.05] font-bold sm:text-5xl lg:text-6xl">
              Găsește omul potrivit pentru{" "}
              <TextMorph
                words={["orice reparație", "montaj IKEA", "curățenie", "un site nou", "plimbat câinele"]}
                interval={2200}
                className="text-primary"
              />
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Publici jobul, primești oferte de la electricieni, instalatori, programatori sau oameni care vor un venit în plus,
              compari prețul, ratingul și scorul AI, apoi alegi. Contactul se deblochează doar după ce accepți o ofertă.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href={loggedIn ? "/jobs/new" : "/login?next=/jobs/new"} className={shimmerClasses("px-7")}>
                <span className="relative z-10 inline-flex items-center gap-2">
                  Postează un job gratuit <ArrowRight className="size-4" aria-hidden />
                </span>
                <ShimmerShine />
              </Link>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-xl px-6">
                <Link href={loggedIn ? "/dashboard" : "/login?next=/profile"}>Vreau să câștig bani</Link>
              </Button>
            </div>
            <dl className="grid max-w-lg grid-cols-3 gap-4 pt-2">
              {[
                { label: "lucrători activi", value: stats.workers },
                { label: "joburi deschise", value: stats.openJobs },
                { label: "rating mediu", value: stats.avgRating.toFixed(1) },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border bg-background/60 p-3 backdrop-blur">
                  <dt className="text-xs text-muted-foreground">{s.label}</dt>
                  <dd className="font-heading text-2xl font-bold tabular-nums">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Bento preview */}
          <div className="relative grid content-center gap-4">
            <div className="rounded-3xl border bg-card/90 p-5 shadow-xl backdrop-blur">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Oferte primite</span>
                <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">live</span>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  { name: "Ion M.", tag: "Electrician · ANRE", price: "1.450 lei", score: 92, promoted: true },
                  { name: "Andrei P.", tag: "Montaj mobilă IKEA", price: "380 lei", score: 81, promoted: false },
                  { name: "Gelu T.", tag: "fără autorizație", price: "700 lei", score: 23, promoted: false },
                ].map((b) => (
                  <div key={b.name} className={cn("flex items-center gap-3 rounded-2xl border p-3", b.promoted && "premium-ring")}>
                    <MatchScore score={b.score} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {b.name} {b.promoted && <Crown className="inline size-3.5 text-premium" aria-label="Promovat" />}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{b.tag}</p>
                    </div>
                    <p className="font-heading font-bold tabular-nums">{b.price}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-3xl border bg-card/90 p-4 shadow-lg backdrop-blur">
                <ShieldCheck className="size-6 text-primary" aria-hidden />
                <p className="mt-2 text-sm font-semibold">Suspendare automată</p>
                <p className="text-xs text-muted-foreground">La 5 raportări, contul intră în investigație.</p>
              </div>
              <div className="rounded-3xl border bg-card/90 p-4 shadow-lg backdrop-blur">
                <MessageSquareLock className="size-6 text-skilled" aria-hidden />
                <p className="mt-2 text-sm font-semibold">Contact protejat</p>
                <p className="text-xs text-muted-foreground">Telefonul apare doar după acceptarea ofertei.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative border-t bg-background/60 py-3 backdrop-blur">
          <Marquee pauseOnHover speed="slow" className="[--gap:0.75rem]">
            {allTags.map((t) => (
              <TagChip key={t.id} name={t.name} kind={t.kind} href={`/jobs?tag=${t.slug}`} className="py-1 text-sm" />
            ))}
          </Marquee>
        </div>
      </section>

      {/* Skilled vs casual */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 max-w-2xl space-y-2">
          <h2 className="text-3xl font-bold">Două lumi, o singură platformă</h2>
          <p className="text-muted-foreground">
            Meseriași cu experiență și autorizații, dar și oameni care vor să câștige un ban în plus din treburi simple.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {(["specialized", "casual"] as const).map((kind) => (
            <div
              key={kind}
              className={cn(
                "rounded-3xl border p-6",
                kind === "specialized" ? "bg-skilled-soft/50" : "bg-casual-soft/60",
              )}
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-xl font-bold">{kindLabel[kind]}</h3>
                <span className={cn("text-sm font-semibold", kind === "specialized" ? "text-skilled" : "text-casual")}>
                  {kind === "specialized" ? stats.skilledWorkers : stats.casualWorkers} lucrători
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {categories
                  .filter((c) => c.kind === kind)
                  .map((c) => (
                    <Link
                      key={c.id}
                      href={`/jobs?kind=${kind}`}
                      className="group rounded-2xl border bg-background p-4 transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "inline-flex size-10 items-center justify-center rounded-xl",
                            kind === "specialized" ? "bg-skilled-soft text-skilled" : "bg-casual-soft text-casual",
                          )}
                        >
                          <CategoryIcon icon={c.icon} className="size-5" />
                        </span>
                        <div>
                          <p className="font-semibold group-hover:text-primary">{c.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.openJobs} joburi · {c.workers} lucrători
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">{c.tags.map((t) => t.name).join(" · ")}</p>
                    </Link>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works + AI */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-3">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold">Cum funcționează</h2>
            <p className="text-muted-foreground">
              Un singur cont: comuți din meniu între <b>Client</b> și <b>Lucrător</b>. {appConfig.name} face potrivirea și selecția;
              lucrarea și plata se stabilesc direct între voi.
            </p>
          </div>
          <ol className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
            {[
              { icon: Search, title: "Publici jobul", text: "Titlu, descriere, buget, taguri, locație și urgență. Gratuit." },
              { icon: Bot, title: "AI-ul recomandă", text: "Match Score din taguri potrivite, analiză semantică a descrierii și locație." },
              { icon: Users, title: "Compari ofertele", text: "Preț, durată, rating, verificare și scor AI, într-o listă comparativă." },
              { icon: Handshake, title: "Accepți și vorbiți", text: "Se deblochează telefonul, e-mailul și chatul intern. La final, recenzii reciproce." },
            ].map((s, i) => (
              <li key={s.title} className="rounded-2xl border bg-card p-5">
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <s.icon className="size-5 text-muted-foreground" aria-hidden />
                </div>
                <p className="mt-3 font-semibold">{s.title}</p>
                <p className="text-sm text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Latest jobs */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Joburi recente</h2>
            <p className="text-muted-foreground">Joburile clienților Premium apar primele.</p>
          </div>
          <Button asChild variant="ghost">
            <Link href="/jobs">
              Toate joburile <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </section>

      {/* Top workers */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Lucrători de top</h2>
            <p className="flex items-center gap-1 text-muted-foreground">
              <Star className="size-4 fill-premium text-premium" aria-hidden /> Recenzii doar de la clienți reali, după joburi finalizate.
            </p>
          </div>
          <Button asChild variant="ghost">
            <Link href="/workers">
              Toți lucrătorii <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {workers.map((w) => (
            <WorkerCard key={w.id} worker={w} compact />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-foreground p-10 text-background">
          <div className="absolute -right-16 -bottom-24 size-80 rounded-full bg-primary/40 blur-3xl" aria-hidden />
          <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Ai abilități? Transformă-le în venit.</h2>
              <p className="max-w-xl text-background/70">
                Alege tagurile, scrie două rânduri despre tine și primește joburi recomandate de AI. Cu Premium, ofertele tale apar primele.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary" className="h-12 rounded-xl px-6">
                <Link href={loggedIn ? "/profile" : "/login?next=/profile"}>
                  <BadgeCheck aria-hidden /> Creează profilul
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-xl border-background/30 bg-transparent px-6 text-background hover:bg-background/10 hover:text-background">
                <Link href="/premium">
                  <Crown aria-hidden /> Vezi Premium
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
