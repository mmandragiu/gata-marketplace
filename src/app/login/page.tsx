import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Ban, Crown, Shield } from "lucide-react";

import { loginDemoAccount } from "@/app/actions";
import { UserAvatar } from "@/components/common/user-avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getViewer } from "@/lib/auth/session";
import { dataMode, DEMO_PASSWORD } from "@/lib/config";
import { seedUsers, type SeedUser } from "@/lib/seed/data";

import { AuthForms } from "./auth-forms";

export const metadata: Metadata = { title: "Autentificare" };

const GROUPS: { id: SeedUser["group"]; title: string; hint: string }[] = [
  { id: "client", title: "Beneficiari (clienți)", hint: "Au joburi postate și oferte primite" },
  { id: "skilled", title: "Lucrători calificați", hint: "Electrician, instalator, tâmplar, programator, designer" },
  { id: "casual", title: "Lucrători casnic / joburi ușoare", hint: "Curățenie, montaj IKEA, mutări, câini" },
  { id: "moderation", title: "Securitate & moderare", hint: "Cont suspendat automat, cont la 4/5 raportări, admin" },
];

function note(u: SeedUser): { icon?: typeof Ban; text: string } | null {
  if (u.key === "cristian") return { icon: Ban, text: "suspendat automat (5/5 raportări)" };
  if (u.key === "gelu") return { text: "4/5 raportări: încă una și e suspendat" };
  if (u.isAdmin) return { icon: Shield, text: "panou de moderare" };
  if (u.isPremium) return { icon: Crown, text: "Premium" };
  return null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") ? sp.next : "/dashboard";
  if (await getViewer()) redirect(next);
  const demoMode = dataMode() === "demo";

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Conturi de test pentru demo</h1>
          <p className="text-muted-foreground">
            Un click și ești autentificat. {demoMode ? "Datele sunt fictive și se resetează la repornire." : `Parola comună: ${DEMO_PASSWORD}`}
          </p>
          {sp.reset === "1" && <p className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">Datele demo au fost resetate.</p>}
          {typeof sp.error === "string" && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Autentificarea a eșuat{sp.error !== "unknown" ? `: ${sp.error}` : ""}. Rulează `npm run db:seed` dacă baza Supabase e goală.
            </p>
          )}
        </div>
        {GROUPS.map((g) => (
          <section key={g.id} className="space-y-3">
            <div>
              <h2 className="font-semibold">{g.title}</h2>
              <p className="text-xs text-muted-foreground">{g.hint}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {seedUsers
                .filter((u) => u.group === g.id)
                .map((u) => {
                  const n = note(u);
                  return (
                    <form key={u.key} action={loginDemoAccount}>
                      <input type="hidden" name="email" value={u.email} />
                      <input type="hidden" name="next" value={next} />
                      <button
                        type="submit"
                        className="flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                      >
                        <UserAvatar name={u.fullName} ring={u.key === "cristian" ? "banned" : u.isPremium ? "premium" : undefined} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{u.fullName}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {u.tags.length > 0 ? u.tags.map((t) => t.slug.replaceAll("-", " ")).join(", ") : u.city}
                          </span>
                          {n && (
                            <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-casual">
                              {n.icon && <n.icon className="size-3" aria-hidden />} {n.text}
                            </span>
                          )}
                        </span>
                      </button>
                    </form>
                  );
                })}
            </div>
          </section>
        ))}
      </div>

      <Card className="h-fit lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle>{demoMode ? "Sau creează un cont nou" : "Autentificare"}</CardTitle>
          <CardDescription>
            {demoMode ? "În modul demo contul se creează instant, fără confirmare pe e-mail." : "Cont Supabase Auth cu e-mail și parolă."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForms next={next} demoMode={demoMode} />
        </CardContent>
      </Card>
    </div>
  );
}
