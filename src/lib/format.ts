import type { BidStatus, CategoryKind, JobStatus, Urgency } from "@/lib/services/types";

const TZ = "Europe/Bucharest";

export function formatLei(value: number): string {
  return `${new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(value)} lei`;
}

export function formatHours(hours: number): string {
  const h = Math.round(hours * 10) / 10;
  if (h < 1) return `${Math.round(h * 60)} min`;
  return h === 1 ? "1 oră" : `${new Intl.NumberFormat("ro-RO").format(h)} ore`;
}

export function timeAgo(iso: string, now: Date = new Date()): string {
  const diff = (new Date(iso).getTime() - now.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("ro", { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return "chiar acum";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), "month");
  return rtf.format(Math.round(diff / (86400 * 365)), "year");
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(new Date(iso));
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short", timeZone: TZ }).format(
    new Date(iso),
  );
}

export const urgencyLabel: Record<Urgency, string> = {
  urgent: "Urgent (24h)",
  week: "În această săptămână",
  flexible: "Flexibil",
};

export const jobStatusLabel: Record<JobStatus, string> = {
  open: "Deschis",
  assigned: "Atribuit",
  completed: "Finalizat",
  cancelled: "Anulat",
};

export const bidStatusLabel: Record<BidStatus, string> = {
  pending: "În așteptare",
  accepted: "Acceptată",
  rejected: "Respinsă",
};

export const kindLabel: Record<CategoryKind, string> = {
  specialized: "Meserii calificate",
  casual: "Treburi casnice & joburi ușoare",
};

export const kindShort: Record<CategoryKind, string> = {
  specialized: "Calificat",
  casual: "Casnic",
};

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

/** Deterministic gradient per name (avatars without uploaded photos). */
export function avatarGradient(seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `linear-gradient(135deg, oklch(0.72 0.14 ${h}), oklch(0.58 0.17 ${(h + 50) % 360}))`;
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
