"use client";

import { Star } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { createReviewAction, type ActionState } from "@/app/actions";
import { FormMessage, SubmitButton } from "@/components/common/form-bits";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const LABELS = ["", "Foarte slab", "Slab", "OK", "Foarte bine", "Excelent"];

export function ReviewForm({ jobId, revieweeName }: { jobId: string; revieweeName: string }) {
  const [state, action] = useActionState<ActionState, FormData>(createReviewAction, null);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);

  useEffect(() => {
    if (state?.ok) toast.success(state.message);
  }, [state]);

  const shown = hover || rating;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="rating" value={rating} />
      <div className="space-y-1.5">
        <Label>Cum a fost colaborarea cu {revieweeName}?</Label>
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i} stele`}
              onMouseEnter={() => setHover(i)}
              onClick={() => setRating(i)}
              className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Star className={cn("size-7 transition-colors", i <= shown ? "fill-premium text-premium" : "text-muted-foreground/40")} aria-hidden />
            </button>
          ))}
          <span className="ml-2 text-sm font-medium">{LABELS[shown]}</span>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`comment-${jobId}`}>Comentariu</Label>
        <Textarea id={`comment-${jobId}`} name="comment" rows={3} maxLength={2000} placeholder="Ce a mers bine? Ce s-ar putea îmbunătăți?" />
      </div>
      {!state?.ok && <FormMessage state={state} />}
      <SubmitButton pendingLabel="Se publică…">Publică recenzia</SubmitButton>
    </form>
  );
}
