"use client";

import { Wifi } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import { createJobAction, type ActionState } from "@/app/actions";
import { FieldError, FormMessage, SubmitButton } from "@/components/common/form-bits";
import { CategoryIcon } from "@/components/common/category-icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Category } from "@/lib/services/types";
import { cn } from "@/lib/utils";

export function JobForm({ categories, defaultCity }: { categories: Category[]; defaultCity: string }) {
  const [state, action] = useActionState<ActionState, FormData>(createJobAction, null);
  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? "");
  const [tags, setTags] = useState<string[]>([]);
  const [remote, setRemote] = useState(false);
  const category = useMemo(() => categories.find((c) => c.slug === categorySlug), [categories, categorySlug]);
  const fe = state?.fieldErrors ?? {};
  const licenseTag = category?.tags.find((t) => tags.includes(t.slug) && t.requiresLicense);

  return (
    <form action={action} className="space-y-8">
      <section className="space-y-3">
        <Label className="text-base font-semibold">1. Ce fel de serviciu cauți?</Label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCategorySlug(c.slug);
                setTags([]);
              }}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                categorySlug === c.slug ? "border-primary bg-accent" : "hover:bg-muted",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
                  c.kind === "specialized" ? "bg-skilled-soft text-skilled" : "bg-casual-soft text-casual",
                )}
              >
                <CategoryIcon icon={c.icon} className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{c.name}</span>
                <span className="block text-xs text-muted-foreground">{c.kind === "specialized" ? "Calificat" : "Casnic / ușor"}</span>
              </span>
            </button>
          ))}
        </div>
        <input type="hidden" name="categorySlug" value={categorySlug} />
        <FieldError message={fe.categorySlug} />

        {category && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Alege tagurile potrivite (1–5):</p>
            <div className="flex flex-wrap gap-2">
              {category.tags.map((t) => {
                const on = tags.includes(t.slug);
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setTags((prev) => (on ? prev.filter((s) => s !== t.slug) : prev.length < 5 ? [...prev, t.slug] : prev))}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                      on
                        ? category.kind === "specialized"
                          ? "border-skilled bg-skilled text-white"
                          : "border-casual bg-casual text-white"
                        : "hover:bg-muted",
                    )}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
            {tags.map((t) => (
              <input key={t} type="hidden" name="tags" value={t} />
            ))}
            <FieldError message={fe.tagSlugs} />
            {licenseTag && (
              <p className="rounded-lg bg-casual-soft px-3 py-2 text-xs text-foreground">{licenseTag.licenseNote}</p>
            )}
          </div>
        )}
      </section>

      <section className="grid gap-5">
        <Label className="text-base font-semibold">2. Descrie lucrarea</Label>
        <div className="space-y-1.5">
          <Label htmlFor="title">Titlu</Label>
          <Input id="title" name="title" required minLength={5} maxLength={120} placeholder="Ex.: Montaj dulap PAX cu 2 uși glisante" />
          <FieldError message={fe.title} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Descriere detaliată</Label>
          <Textarea
            id="description"
            name="description"
            required
            minLength={20}
            maxLength={4000}
            rows={6}
            placeholder="Ce trebuie făcut, dimensiuni, materiale, acces (etaj, lift), când ai nevoie…"
          />
          <FieldError message={fe.description} />
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-2">
        <Label className="text-base font-semibold sm:col-span-2">3. Buget, locație și urgență</Label>
        <div className="space-y-1.5">
          <Label htmlFor="budget">Buget estimativ (lei)</Label>
          <Input id="budget" name="budget" type="number" min={0} step={10} required placeholder="450" />
          <FieldError message={fe.budget} />
        </div>
        <div className="flex items-end gap-3 rounded-xl border p-3">
          <Switch id="isRemote" name="isRemote" checked={remote} onCheckedChange={setRemote} />
          <Label htmlFor="isRemote" className="flex items-center gap-1.5">
            <Wifi className="size-4" aria-hidden /> Se poate face online
          </Label>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">Oraș</Label>
          <Input id="city" name="city" defaultValue={defaultCity} maxLength={80} placeholder="Cluj-Napoca" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="location">Zonă / cartier</Label>
          <Input id="location" name="location" maxLength={120} placeholder={remote ? "Online" : "Cluj-Napoca · Gheorgheni"} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Urgență</Label>
          <RadioGroup name="urgency" defaultValue="week" className="grid gap-2 sm:grid-cols-3">
            {[
              ["urgent", "Urgent (24h)"],
              ["week", "În această săptămână"],
              ["flexible", "Flexibil"],
            ].map(([v, l]) => (
              <Label key={v} className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent">
                <RadioGroupItem value={v} id={`urgency-${v}`} /> {l}
              </Label>
            ))}
          </RadioGroup>
          <FieldError message={fe.urgency} />
        </div>
      </section>

      <FormMessage state={state} />
      <SubmitButton pendingLabel="Se publică…" className="w-full sm:w-auto">
        Publică jobul
      </SubmitButton>
    </form>
  );
}
