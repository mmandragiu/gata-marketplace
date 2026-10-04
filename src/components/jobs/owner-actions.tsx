"use client";

import { CheckCheck, XCircle } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { cancelJobAction, completeJobAction } from "@/app/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { JobStatus } from "@/lib/services/types";

export function OwnerActions({ jobId, status }: { jobId: string; status: JobStatus }) {
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) toast.success(res.message ?? "Gata!");
      else toast.error(res.message ?? "Eroare");
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "assigned" && (
        <Button disabled={pending} onClick={() => run(() => completeJobAction(jobId))}>
          <CheckCheck aria-hidden /> Marchează ca finalizat
        </Button>
      )}
      {(status === "open" || status === "assigned") && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={pending}>
              <XCircle aria-hidden /> Anulează jobul
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Anulezi jobul?</AlertDialogTitle>
              <AlertDialogDescription>Ofertele în așteptare vor fi respinse. Acțiunea nu poate fi anulată.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Înapoi</AlertDialogCancel>
              <AlertDialogAction onClick={() => run(() => cancelJobAction(jobId))}>Da, anulează</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
