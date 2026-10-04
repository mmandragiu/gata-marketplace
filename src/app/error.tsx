"use client";

import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <TriangleAlert className="size-12 text-destructive" aria-hidden />
      <h1 className="text-3xl font-bold">Ceva n-a mers</h1>
      <p className="text-muted-foreground">
        {process.env.NODE_ENV === "development" ? error.message : "A apărut o eroare neașteptată. Încearcă din nou."}
      </p>
      <Button onClick={reset}>Reîncearcă</Button>
    </div>
  );
}
