export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "BANNED"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "INTERNAL";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const errorStatus: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  BANNED: 403,
  NOT_FOUND: 404,
  VALIDATION: 400,
  CONFLICT: 409,
  INTERNAL: 500,
};

export const BANNED_MESSAGE =
  "Contul tău este suspendat pe durata investigației. Nu poți publica joburi, trimite oferte sau mesaje.";

/** Stable codes raised by the SQL functions (SQLSTATE P0001) → user-facing errors. */
const RAISED: Record<string, [ErrorCode, string]> = {
  UNAUTHENTICATED: ["UNAUTHENTICATED", "Trebuie să fii autentificat."],
  BANNED: ["BANNED", BANNED_MESSAGE],
  FORBIDDEN: ["FORBIDDEN", "Nu ai permisiunea pentru această acțiune."],
  NOT_FOUND: ["NOT_FOUND", "Nu am găsit ce ai cerut."],
  JOB_NOT_OPEN: ["CONFLICT", "Jobul nu mai acceptă oferte."],
  BID_NOT_PENDING: ["CONFLICT", "Oferta a fost deja procesată."],
  WORKER_BANNED: ["CONFLICT", "Lucrătorul are contul suspendat, deci oferta nu poate fi acceptată."],
  JOB_NOT_ASSIGNED: ["CONFLICT", "Jobul poate fi finalizat doar după ce ai ales un lucrător."],
  JOB_NOT_CANCELLABLE: ["CONFLICT", "Jobul nu mai poate fi anulat."],
  JOB_NOT_COMPLETED: ["CONFLICT", "Poți lăsa o recenzie doar după ce jobul e finalizat."],
  NOT_PARTY: ["FORBIDDEN", "Doar clientul și lucrătorul ales pot face asta."],
  ALREADY_REVIEWED: ["CONFLICT", "Ai lăsat deja o recenzie pentru acest job."],
  INVALID_RATING: ["VALIDATION", "Nota trebuie să fie între 1 și 5 stele."],
  REPORT_TARGET_NOT_FOUND: ["NOT_FOUND", "Nu am găsit ce vrei să raportezi."],
  CANNOT_REPORT_SELF: ["VALIDATION", "Nu te poți raporta singur."],
};

type PgLikeError = { code?: string; message?: string; constraint?: string; constraint_name?: string };

export function toAppError(err: unknown, uniqueMessage = "Există deja o înregistrare identică."): AppError {
  if (err instanceof AppError) return err;
  const e = (err ?? {}) as PgLikeError;
  const message = typeof e.message === "string" ? e.message : "";

  if (e.code === "P0001") {
    const key = message.trim().split(/\s/)[0];
    const mapped = RAISED[key];
    if (mapped) return new AppError(mapped[0], mapped[1]);
  }
  switch (e.code) {
    case "23505":
      return new AppError("CONFLICT", uniqueMessage);
    case "23514":
    case "22001":
    case "22P02":
      return new AppError("VALIDATION", "Datele trimise nu sunt valide.");
    case "23503":
      return new AppError("VALIDATION", "Referință invalidă (categorie, tag sau job inexistent).");
    case "42501":
      return new AppError("FORBIDDEN", "Nu ai permisiunea pentru această acțiune.");
  }
  if (/row-level security/i.test(message)) {
    return new AppError("FORBIDDEN", "Nu ai permisiunea pentru această acțiune.");
  }
  console.error("[gata] unexpected error", err);
  return new AppError("INTERNAL", "A apărut o eroare neașteptată. Încearcă din nou.");
}
