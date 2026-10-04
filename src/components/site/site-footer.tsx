import Link from "next/link";

import { appConfig, dataMode } from "@/lib/config";
import { openAiEnabled } from "@/lib/matching/openai";

import { Logo } from "./logo";

export function SiteFooter() {
  const mode = dataMode();
  return (
    <footer className="mt-20 border-t">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
        <div className="space-y-3 md:col-span-2">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">
            {appConfig.tagline}. Platforma facilitează conexiunea și selecția; execuția lucrării rămâne în responsabilitatea părților.
          </p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold">Platformă</p>
          <ul className="space-y-1.5 text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/jobs">Joburi</Link></li>
            <li><Link className="hover:text-foreground" href="/workers">Lucrători</Link></li>
            <li><Link className="hover:text-foreground" href="/premium">Premium</Link></li>
            <li><Link className="hover:text-foreground" href="/docs">API și MCP</Link></li>
          </ul>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold">Stare</p>
          <ul className="space-y-1.5 text-muted-foreground">
            <li>Date: {mode === "demo" ? "mod demo (PostgreSQL în proces)" : "Supabase"}</li>
            <li>Potrivire AI: {openAiEnabled() ? "OpenAI" : "model local"}</li>
            <li>Realizat pentru VNUHack 2026</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
