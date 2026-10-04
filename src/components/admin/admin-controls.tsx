"use client";

import { BadgeCheck, Ban, Check, RotateCcw, Unlock, X } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  adminActionReportAction,
  adminBanAction,
  adminDismissReportAction,
  adminResetDemoAction,
  adminUnbanAction,
  adminUpdateSettingsAction,
  adminVerifyAction,
  type ActionState,
} from "@/app/actions";
import { FormMessage, SubmitButton } from "@/components/common/form-bits";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Result = { ok: boolean; message?: string };

function useRun() {
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<Result>) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) toast.success(res.message ?? "Gata!");
      else toast.error(res.message ?? "Eroare");
    });
  return { pending, run };
}

export function UserModerationActions({
  profileId,
  isBanned,
  isVerified,
  isAdmin,
}: {
  profileId: string;
  isBanned: boolean;
  isVerified: boolean;
  isAdmin: boolean;
}) {
  const { pending, run } = useRun();
  const [reset, setReset] = useState(true);
  if (isAdmin) return <span className="text-xs text-muted-foreground">moderator</span>;
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => adminVerifyAction(profileId, !isVerified))}>
        <BadgeCheck aria-hidden /> {isVerified ? "Scoate verificarea" : "Verifică"}
      </Button>
      {isBanned ? (
        <>
          <Label className="flex items-center gap-1.5 text-xs font-normal">
            <Checkbox checked={reset} onCheckedChange={(v) => setReset(v === true)} /> resetează contorul
          </Label>
          <Button size="sm" disabled={pending} onClick={() => run(() => adminUnbanAction(profileId, reset))}>
            <Unlock aria-hidden /> Deblochează
          </Button>
        </>
      ) : (
        <Button variant="destructive" size="sm" disabled={pending} onClick={() => run(() => adminBanAction(profileId))}>
          <Ban aria-hidden /> Suspendă
        </Button>
      )}
    </div>
  );
}

export function ReportActions({ reportId }: { reportId: string }) {
  const { pending, run } = useRun();
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => adminActionReportAction(reportId))}>
        <Check aria-hidden /> Rezolvat
      </Button>
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => adminDismissReportAction(reportId))}>
        <X aria-hidden /> Respinge
      </Button>
    </div>
  );
}

export function SettingsForm({ threshold, enabled }: { threshold: number; enabled: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(adminUpdateSettingsAction, null);
  useEffect(() => {
    if (state?.ok) toast.success(state.message);
  }, [state]);
  return (
    <form action={action} className="space-y-4">
      <div className="flex items-center gap-3">
        <Switch id="autoBanEnabled" name="autoBanEnabled" defaultChecked={enabled} />
        <Label htmlFor="autoBanEnabled">Suspendare automată activă</Label>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="autoBanThreshold">Prag raportări (utilizatori diferiți)</Label>
        <Input id="autoBanThreshold" name="autoBanThreshold" type="number" min={1} max={100} defaultValue={threshold} className="w-32" />
        <p className="text-xs text-muted-foreground">Regula e aplicată de un trigger în baza de date, imediat la inserarea raportului.</p>
      </div>
      {!state?.ok && <FormMessage state={state} />}
      <SubmitButton size="default">Salvează regulile</SubmitButton>
    </form>
  );
}

export function ResetDemoButton() {
  const { pending, run } = useRun();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={pending}>
          <RotateCcw aria-hidden /> Resetează datele demo
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Resetezi baza de date demo?</AlertDialogTitle>
          <AlertDialogDescription>
            Toate modificările făcute în demo se pierd și datele de test sunt încărcate din nou. Vei fi delogat.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Înapoi</AlertDialogCancel>
          <AlertDialogAction onClick={() => run(adminResetDemoAction)}>Resetează</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
