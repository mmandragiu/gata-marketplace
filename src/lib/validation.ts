import { z } from "zod";

import { AppError } from "@/lib/services/errors";

const uuid = z.uuid({ error: "Identificator invalid." });

export const jobInputSchema = z.object({
  title: z.string().trim().min(5, "Titlul trebuie să aibă cel puțin 5 caractere.").max(120, "Titlul poate avea cel mult 120 de caractere."),
  description: z
    .string()
    .trim()
    .min(20, "Descrierea trebuie să aibă cel puțin 20 de caractere.")
    .max(4000, "Descrierea poate avea cel mult 4.000 de caractere."),
  budget: z.coerce
    .number({ error: "Bugetul trebuie să fie un număr." })
    .int("Bugetul trebuie să fie un număr întreg de lei.")
    .min(0, "Bugetul nu poate fi negativ.")
    .max(10_000_000, "Buget prea mare."),
  categorySlug: z.string().trim().min(1, "Alege o categorie."),
  tagSlugs: z.array(z.string().trim().min(1)).min(1, "Alege cel puțin un tag.").max(5, "Poți alege cel mult 5 taguri."),
  city: z.string().trim().max(80).default(""),
  location: z.string().trim().max(120).default(""),
  isRemote: z.boolean().default(false),
  urgency: z.enum(["urgent", "week", "flexible"], { error: "Alege urgența." }),
});
export type JobInput = z.infer<typeof jobInputSchema>;

export const bidInputSchema = z.object({
  price: z.coerce
    .number({ error: "Prețul trebuie să fie un număr." })
    .int("Prețul trebuie să fie un număr întreg de lei.")
    .min(1, "Prețul trebuie să fie cel puțin 1 leu.")
    .max(10_000_000, "Preț prea mare."),
  durationHours: z.coerce
    .number({ error: "Durata trebuie să fie un număr de ore." })
    .positive("Durata trebuie să fie mai mare decât 0.")
    .max(5000, "Durată prea mare."),
  message: z.string().trim().max(2000, "Mesajul poate avea cel mult 2.000 de caractere.").default(""),
});
export type BidInput = z.infer<typeof bidInputSchema>;

export const reviewInputSchema = z.object({
  jobId: uuid,
  rating: z.coerce.number().int().min(1, "Alege între 1 și 5 stele.").max(5, "Alege între 1 și 5 stele."),
  comment: z.string().trim().max(2000, "Comentariul poate avea cel mult 2.000 de caractere.").default(""),
});
export type ReviewInput = z.infer<typeof reviewInputSchema>;

export const reportReasons = ["spam", "fraud", "inappropriate", "fake_profile", "no_show", "unlicensed", "other"] as const;

export const reportInputSchema = z.object({
  targetType: z.enum(["profile", "job", "bid"]),
  targetId: uuid,
  reason: z.enum(reportReasons, { error: "Alege un motiv." }),
  details: z.string().trim().max(1000, "Detaliile pot avea cel mult 1.000 de caractere.").default(""),
});
export type ReportInput = z.infer<typeof reportInputSchema>;

export const profileInputSchema = z.object({
  fullName: z.string().trim().min(2, "Numele trebuie să aibă cel puțin 2 caractere.").max(80),
  bio: z.string().trim().max(2000, "Descrierea poate avea cel mult 2.000 de caractere.").default(""),
  city: z.string().trim().max(80).default(""),
  hourlyRate: z
    .union([z.literal(""), z.coerce.number().int().min(0).max(10000)])
    .transform((v) => (v === "" ? null : v))
    .default(null),
  licenseInfo: z
    .string()
    .trim()
    .max(200)
    .transform((v) => (v === "" ? null : v))
    .default(null),
  phone: z
    .string()
    .trim()
    .max(40)
    .transform((v) => (v === "" ? null : v))
    .default(null),
  contactEmail: z
    .union([z.literal(""), z.email("Adresa de e-mail nu e validă.")])
    .transform((v) => (v === "" ? null : v))
    .default(null),
  tags: z
    .array(z.object({ slug: z.string().trim().min(1), years: z.coerce.number().int().min(0).max(70).default(0) }))
    .max(12, "Poți alege cel mult 12 taguri.")
    .default([]),
});
export type ProfileInput = z.infer<typeof profileInputSchema>;

export const messageInputSchema = z.object({
  body: z.string().trim().min(1, "Scrie un mesaj.").max(2000, "Mesajul poate avea cel mult 2.000 de caractere."),
});

export const settingsInputSchema = z.object({
  autoBanThreshold: z.coerce.number().int().min(1, "Pragul minim e 1.").max(100, "Pragul maxim e 100."),
  autoBanEnabled: z.boolean(),
});
export type SettingsInput = z.infer<typeof settingsInputSchema>;

/** Parses input or throws a VALIDATION AppError with per-field messages. */
export function parseOrThrow<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const res = schema.safeParse(input);
  if (res.success) return res.data;
  const fieldErrors: Record<string, string> = {};
  for (const issue of res.error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  const first = Object.values(fieldErrors)[0] ?? "Datele trimise nu sunt valide.";
  throw new AppError("VALIDATION", first, fieldErrors);
}
