"use client";

import { Send } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { placeBidAction, type ActionState } from "@/app/actions";
import { FieldError, FormMessage, SubmitButton } from "@/components/common/form-bits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function BidForm({ jobId, budget }: { jobId: string; budget: number }) {
  const [state, action] = useActionState<ActionState, FormData>(placeBidAction, null);
  const fe = state?.fieldErrors ?? {};

  useEffect(() => {
    if (state?.ok) toast.success(state.message);
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="jobId" value={jobId} />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="price">Preț propus (lei)</Label>
          <Input id="price" name="price" type="number" min={1} step={10} required defaultValue={budget || undefined} />
          <FieldError message={fe.price} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="durationHours">Durată estimată (ore)</Label>
          <Input id="durationHours" name="durationHours" type="number" min={0.5} step={0.5} required defaultValue={2} />
          <FieldError message={fe.durationHours} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="message">Mesaj pentru client</Label>
        <Textarea
          id="message"
          name="message"
          rows={4}
          maxLength={2000}
          placeholder="Experiența ta cu lucrări similare, când poți începe, ce include prețul…"
        />
        <FieldError message={fe.message} />
      </div>
      {!state?.ok && <FormMessage state={state} />}
      <SubmitButton className="w-full" pendingLabel="Se trimite…">
        <Send aria-hidden /> Trimite oferta
      </SubmitButton>
    </form>
  );
}
