"use client";

import { CircleAlert, CircleCheck, Loader2, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";

import { analyzeMatchAction } from "@/app/actions";
import { MatchScore } from "@/components/common/match-score";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { MatchAnalysis } from "@/lib/services/types";

export function AnalyzeMatchButton({ jobId, workerId, workerName }: { jobId: string; workerId: string; workerName: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<MatchAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  function analyze() {
    setOpen(true);
    if (result) return;
    setError(null);
    startTransition(async () => {
      const res = await analyzeMatchAction(jobId, workerId);
      if (res.ok && res.data) setResult(res.data);
      else if (!res.ok) setError(res.message);
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={analyze}>
        <Sparkles aria-hidden /> Analizează cu AI
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" aria-hidden /> Potrivire: {workerName}
            </DialogTitle>
            <DialogDescription>
              Analiza compară descrierea jobului cu profilul, experiența și tagurile lucrătorului.
            </DialogDescription>
          </DialogHeader>
          {pending && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Se analizează…
            </p>
          )}
          {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          {result && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <MatchScore score={result.score} />
                <div>
                  <p className="font-semibold">{result.verdict}</p>
                  <p className="text-xs text-muted-foreground">
                    Sursa: {result.source === "openai" ? "OpenAI (LLM)" : "motor local (fără cheie OpenAI)"}
                  </p>
                </div>
              </div>
              {result.strengths.length > 0 && (
                <ul className="space-y-1.5">
                  {result.strengths.map((s) => (
                    <li key={s} className="flex gap-2 text-sm">
                      <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> {s}
                    </li>
                  ))}
                </ul>
              )}
              {result.concerns.length > 0 && (
                <ul className="space-y-1.5">
                  {result.concerns.map((s) => (
                    <li key={s} className="flex gap-2 text-sm">
                      <CircleAlert className="mt-0.5 size-4 shrink-0 text-casual" aria-hidden /> {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
