"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { ContinuousTabs } from "@/components/third-party/continuous-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Category } from "@/lib/services/types";

/** URL-driven filters shared by the jobs and workers listings. */
export function SearchFilters({ categories, placeholder }: { categories: Category[]; placeholder: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  function update(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    startTransition(() => router.push(`${pathname}?${sp.toString()}`, { scroll: false }));
  }

  const kind = params.get("kind") ?? "all";
  const tag = params.get("tag") ?? "all";
  const hasFilters = Boolean(params.get("q") || params.get("kind") || params.get("tag") || params.get("city"));

  return (
    <div className="space-y-3" data-pending={pending ? "" : undefined}>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: q.trim() || null });
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="h-11 pl-9" aria-label="Caută" />
        </div>
        <Button type="submit" size="lg" className="h-11 px-5">
          Caută
        </Button>
      </form>
      <div className="flex flex-wrap items-center gap-2">
        <ContinuousTabs
          layoutId={`kind-${pathname}`}
          size="sm"
          ariaLabel="Tip de serviciu"
          value={kind}
          onValueChange={(id) => update({ kind: id === "all" ? null : id, tag: null })}
          tabs={[
            { id: "all", label: "Toate" },
            { id: "specialized", label: "Calificate" },
            { id: "casual", label: "Casnice & ușoare" },
          ]}
        />
        <Select value={tag} onValueChange={(v) => update({ tag: v === "all" ? null : v })}>
          <SelectTrigger className="h-9 w-56" aria-label="Filtrează după tag">
            <SelectValue placeholder="Toate tagurile" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate tagurile</SelectItem>
            {categories
              .filter((c) => kind === "all" || c.kind === kind)
              .map((c) => (
                <SelectGroup key={c.id}>
                  <SelectLabel>{c.name}</SelectLabel>
                  {c.tags.map((t) => (
                    <SelectItem key={t.id} value={t.slug}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ("");
              startTransition(() => router.push(pathname, { scroll: false }));
            }}
          >
            <X aria-hidden /> Resetează
          </Button>
        )}
      </div>
    </div>
  );
}
