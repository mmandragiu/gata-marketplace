import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <SearchX className="size-12 text-muted-foreground" aria-hidden />
      <h1 className="text-3xl font-bold">Pagina nu există</h1>
      <p className="text-muted-foreground">Jobul sau profilul căutat a fost șters sau linkul e greșit.</p>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/jobs">Vezi joburile</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Acasă</Link>
        </Button>
      </div>
    </div>
  );
}
