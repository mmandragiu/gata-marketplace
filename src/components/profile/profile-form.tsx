"use client";

import { useActionState, useState } from "react";

import { updateProfileAction, type ActionState } from "@/app/actions";
import { FieldError, FormMessage, SubmitButton } from "@/components/common/form-bits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Category, Contact, Worker } from "@/lib/services/types";
import { cn } from "@/lib/utils";

export function ProfileForm({ me, contact, categories }: { me: Worker; contact: Contact | null; categories: Category[] }) {
  const [state, action] = useActionState<ActionState, FormData>(updateProfileAction, null);
  const [selected, setSelected] = useState<Record<string, number>>(
    Object.fromEntries(me.tags.map((t) => [t.slug, t.yearsExperience])),
  );
  const fe = state?.fieldErrors ?? {};

  function toggle(slug: string) {
    setSelected((prev) => {
      const next = { ...prev };
      if (slug in next) delete next[slug];
      else next[slug] = 0;
      return next;
    });
  }

  return (
    <form action={action} className="space-y-8">
      <section className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Nume complet</Label>
          <Input id="fullName" name="fullName" defaultValue={me.fullName} required minLength={2} maxLength={80} />
          <FieldError message={fe.fullName} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">Oraș</Label>
          <Input id="city" name="city" defaultValue={me.city} maxLength={80} placeholder="Cluj-Napoca" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="bio">Despre tine</Label>
          <Textarea
            id="bio"
            name="bio"
            defaultValue={me.bio}
            rows={5}
            maxLength={2000}
            placeholder="Experiență, ce lucrări faci, unde lucrezi, ce scule ai… Motorul AI folosește acest text pentru potriviri."
          />
          <FieldError message={fe.bio} />
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Servicii oferite</h2>
          <p className="text-sm text-muted-foreground">
            Alege tagurile pentru care vrei să primești joburi. Fără taguri, contul funcționează doar ca client.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {categories.map((c) => (
            <div key={c.id} className="rounded-2xl border p-4">
              <p className="mb-2 flex items-center justify-between text-sm font-semibold">
                {c.name}
                <span className={cn("text-xs font-medium", c.kind === "specialized" ? "text-skilled" : "text-casual")}>
                  {c.kind === "specialized" ? "Calificat" : "Casnic / ușor"}
                </span>
              </p>
              <div className="space-y-2">
                {c.tags.map((t) => {
                  const on = t.slug in selected;
                  return (
                    <div key={t.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(t.slug)}
                        className={cn(
                          "flex-1 rounded-lg border px-3 py-1.5 text-left text-sm transition-colors",
                          on ? (c.kind === "specialized" ? "border-skilled bg-skilled-soft" : "border-casual bg-casual-soft") : "hover:bg-muted",
                        )}
                      >
                        {t.name}
                        {t.requiresLicense && <span className="ml-1 text-xs text-muted-foreground">(autorizație ANRE)</span>}
                      </button>
                      {on && (
                        <>
                          <input type="hidden" name="tags" value={t.slug} />
                          <Input
                            aria-label={`Ani de experiență ${t.name}`}
                            name={`years_${t.slug}`}
                            type="number"
                            min={0}
                            max={70}
                            className="h-8 w-20"
                            value={selected[t.slug]}
                            onChange={(e) => setSelected((p) => ({ ...p, [t.slug]: Number(e.target.value) || 0 }))}
                          />
                          <span className="text-xs text-muted-foreground">ani</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <FieldError message={fe.tags} />
      </section>

      <section className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="hourlyRate">Tarif orientativ (lei/oră)</Label>
          <Input id="hourlyRate" name="hourlyRate" type="number" min={0} max={10000} defaultValue={me.hourlyRate ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="licenseInfo">Autorizații / certificări</Label>
          <Input id="licenseInfo" name="licenseInfo" defaultValue={me.licenseInfo ?? ""} maxLength={200} placeholder="Ex.: Autorizație ANRE gradul II B" />
          <p className="text-xs text-muted-foreground">Insigna „Verificat” o acordă echipa de moderare după verificare.</p>
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <h2 className="text-lg font-semibold">Date de contact</h2>
          <p className="text-sm text-muted-foreground">Vizibile doar pentru partenerul unei oferte acceptate.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Telefon</Label>
          <Input id="phone" name="phone" defaultValue={contact?.phone ?? ""} maxLength={40} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contactEmail">E-mail de contact</Label>
          <Input id="contactEmail" name="contactEmail" type="email" defaultValue={contact?.email ?? ""} maxLength={200} />
          <FieldError message={fe.contactEmail} />
        </div>
      </section>

      <FormMessage state={state} />
      <SubmitButton pendingLabel="Se salvează…">Salvează profilul</SubmitButton>
    </form>
  );
}
