"use client";

import { Loader2, Send } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { sendMessageAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTime } from "@/lib/format";
import type { Message } from "@/lib/services/types";
import { cn } from "@/lib/utils";

export function ChatPanel({
  jobId,
  messages,
  meId,
  disabled,
}: {
  jobId: string;
  messages: Message[];
  meId: string;
  disabled?: boolean;
}) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const list = useRef<HTMLDivElement>(null);

  // Scroll only the message list (not the window) to the newest message.
  useEffect(() => {
    const el = list.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  return (
    <div className="flex flex-col gap-3">
      <div ref={list} className="max-h-80 space-y-2 overflow-y-auto rounded-xl bg-muted/40 p-3">
        {messages.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Niciun mesaj încă. Spune bună!</p>}
        {messages.map((m) => {
          const mine = m.senderId === meId;
          return (
            <div key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                  mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-card shadow-sm",
                )}
              >
                {m.body}
              </div>
              <span className="mt-0.5 text-[11px] text-muted-foreground">
                {mine ? "Tu" : m.senderName} · {formatTime(m.createdAt)}
              </span>
            </div>
          );
        })}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const text = body.trim();
          if (!text) return;
          startTransition(async () => {
            const res = await sendMessageAction(jobId, text);
            if (res.ok) setBody("");
            else toast.error(res.message);
          });
        }}
      >
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={disabled ? "Chat indisponibil" : "Scrie un mesaj…"}
          maxLength={2000}
          disabled={disabled || pending}
          aria-label="Mesaj"
        />
        <Button type="submit" disabled={disabled || pending || !body.trim()} aria-label="Trimite">
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
        </Button>
      </form>
    </div>
  );
}
