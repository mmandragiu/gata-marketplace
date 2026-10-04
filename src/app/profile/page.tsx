import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PartyPopper } from "lucide-react";

import { ProfileForm } from "@/components/profile/profile-form";
import { Button } from "@/components/ui/button";
import { getCtx } from "@/lib/auth/session";
import { listCategories } from "@/lib/services/catalog";
import { getMyContact, getWorker } from "@/lib/services/profiles";

export const metadata: Metadata = { title: "Profilul meu" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await getCtx();
  if (!ctx.viewer) redirect("/login?next=/profile");
  const sp = await searchParams;
  const [me, contact, categories] = await Promise.all([
    getWorker(ctx, ctx.viewer.profile.id),
    getMyContact(ctx),
    listCategories(ctx),
  ]);
  if (!me) redirect("/login");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {sp.welcome === "1" && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-success/30 bg-success-soft p-4 text-sm">
          <PartyPopper className="size-5 shrink-0 text-success" aria-hidden />
          <p>
            Bine ai venit! Completează-ți profilul. Dacă vrei să câștigi bani, alege serviciile pe care le oferi; dacă doar cauți pe cineva,
            poți posta direct un job.
          </p>
        </div>
      )}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Profilul meu</h1>
          <p className="text-muted-foreground">Același cont funcționează ca client și ca lucrător.</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/workers/${me.id}`}>Vezi profilul public</Link>
        </Button>
      </div>
      <div className="rounded-3xl border bg-card p-6 sm:p-8">
        <ProfileForm me={me} contact={contact} categories={categories} />
      </div>
    </div>
  );
}
