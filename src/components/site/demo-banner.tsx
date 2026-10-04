import Link from "next/link";
import { FlaskConical } from "lucide-react";

import { dataMode } from "@/lib/config";

export function DemoBanner() {
  if (dataMode() !== "demo") return null;
  return (
    <div className="border-b bg-casual-soft/70 text-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-1.5 text-center">
        <FlaskConical className="size-3.5 shrink-0 text-casual" aria-hidden />
        <span>
          Mod demo: date fictive într-un PostgreSQL local, resetate la repornire.{" "}
          <Link href="/login" className="font-semibold underline underline-offset-2">
            Intră cu un cont de test
          </Link>
        </span>
      </div>
    </div>
  );
}
