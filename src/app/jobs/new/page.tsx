import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BannedBadge } from "@/components/common/badges";
import { JobForm } from "@/components/jobs/job-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getCtx } from "@/lib/auth/session";
import { listCategories } from "@/lib/services/catalog";

export const metadata: Metadata = { title: "Postează un job" };

export default async function NewJobPage() {
  const ctx = await getCtx();
  if (!ctx.viewer) redirect("/login?next=/jobs/new");
  const categories = await listCategories(ctx);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold">Postează un job</h1>
        <p className="text-muted-foreground">Gratuit. Primești oferte, compari și alegi. Contactul tău se vede doar după ce accepți o ofertă.</p>
      </div>
      {ctx.viewer.profile.isBanned ? (
        <Alert variant="destructive">
          <AlertTitle className="flex items-center gap-2">
            <BannedBadge /> Nu poți publica joburi
          </AlertTitle>
          <AlertDescription>{ctx.viewer.profile.bannedReason}</AlertDescription>
        </Alert>
      ) : (
        <div className="rounded-3xl border bg-card p-6 sm:p-8">
          <JobForm categories={categories} defaultCity={ctx.viewer.profile.city} />
        </div>
      )}
    </div>
  );
}
