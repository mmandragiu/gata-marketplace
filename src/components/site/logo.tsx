import Link from "next/link";
import { Check } from "lucide-react";

import { appConfig } from "@/lib/config";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-heading text-lg font-bold tracking-tight">
      <span className="inline-flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <Check className="size-5" strokeWidth={3} aria-hidden />
      </span>
      {appConfig.name}
    </Link>
  );
}
