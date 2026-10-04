"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Browser client (Realtime subscriptions). Uses the session cookies set by the server. */
export function createSupabaseBrowserClient(url: string, key: string) {
  return createBrowserClient(url, key);
}
