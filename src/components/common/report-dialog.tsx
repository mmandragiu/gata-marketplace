"use client";

import { Flag } from "lucide-react";
import { useActionState, useState } from "react";
import { toast } from "sonner";

import { createReportAction, type ActionState } from "@/app/actions";
import { FormMessage, SubmitButton } from "@/components/common/form-bits";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { ReportTarget } from "@/lib/services/types";

const REASONS: [string, string][] = [
  ["fraud", "Fraudă / cere bani în avans"],
  ["unlicensed", "Lucrează fără autorizația necesară"],
  ["no_show", "Nu s-a prezentat / lucrare abandonată"],
  ["spam", "Spam sau mesaje repetitive"],
  ["fake_profile", "Profil fals"],
  ["inappropriate", "Comportament nepotrivit"],
  ["other", "Altceva"],
];

const TARGET_LABEL: Record<ReportTarget, string> = { profile: "profilul", job: "jobul", bid: "oferta" };

export function ReportDialog({
  targetType,
  targetId,
  targetName,
  disabled,
  trigger,
}: {
  targetType: ReportTarget;
  targetId: string;
  targetName: string;
  disabled?: boolean;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<ActionState, FormData>(async (prev, formData) => {
    const result = await createReportAction(prev, formData);
    if (result?.ok) {
      toast.success(result.message);
      setOpen(false);
    }
    return result;
  }, null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" disabled={disabled} className="text-muted-foreground">
            <Flag aria-hidden /> Raportează
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form action={action} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Raportează {TARGET_LABEL[targetType]}</DialogTitle>
            <DialogDescription>
              {targetName}. La 5 raportări de la utilizatori diferiți, contul e suspendat automat până la verificare.
            </DialogDescription>
          </DialogHeader>
          <input type="hidden" name="targetType" value={targetType} />
          <input type="hidden" name="targetId" value={targetId} />
          <RadioGroup name="reason" defaultValue="fraud" className="gap-2">
            {REASONS.map(([value, label]) => (
              <Label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 font-normal has-[[data-state=checked]]:border-primary">
                <RadioGroupItem value={value} id={`reason-${targetId}-${value}`} />
                {label}
              </Label>
            ))}
          </RadioGroup>
          <div className="space-y-1.5">
            <Label htmlFor={`details-${targetId}`}>Detalii (opțional)</Label>
            <Textarea id={`details-${targetId}`} name="details" maxLength={1000} placeholder="Ce s-a întâmplat?" />
          </div>
          {!state?.ok && <FormMessage state={state} />}
          <DialogFooter>
            <SubmitButton variant="destructive" pendingLabel="Se trimite…">
              <Flag aria-hidden /> Trimite raportul
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
