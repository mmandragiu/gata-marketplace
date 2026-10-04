"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Keeps a page fresh: Supabase mode subscribes to Realtime changes (RLS applies);
 * demo mode polls by refreshing the router every few seconds.
 */
export function LiveRefresh({
  mode,
  table,
  filter,
  supabaseUrl,
  supabaseKey,
  intervalMs = 5000,
}: {
  mode: "demo" | "supabase";
  table: "bids" | "messages";
  filter: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    if (mode === "supabase" && supabaseUrl && supabaseKey) {
      const supabase = createSupabaseBrowserClient(supabaseUrl, supabaseKey);
      const channel = supabase
        .channel(`live-${table}-${filter}`)
        .on("postgres_changes", { event: "*", schema: "public", table, filter }, () => router.refresh())
        .subscribe();
      return () => {
        void supabase.removeChannel(channel);
      };
    }
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [mode, table, filter, supabaseUrl, supabaseKey, intervalMs, router]);

  return null;
}
