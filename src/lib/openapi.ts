import { appConfig } from "@/lib/config";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Schema = Record<string, any>;

const ref = (name: string): Schema => ({ $ref: `#/components/schemas/${name}` });
const arrayOf = (s: Schema): Schema => ({ type: "array", items: s });
const uuid: Schema = { type: "string", format: "uuid" };

const ok = (schema: Schema, description = "OK", status = "200") => ({
  [status]: {
    description,
    content: { "application/json": { schema: { type: "object", properties: { data: schema }, required: ["data"] } } },
  },
});

const errors = (...codes: number[]) =>
  Object.fromEntries(
    codes.map((c) => [
      String(c),
      {
        description:
          { 400: "Date invalide", 401: "Neautentificat", 403: "Interzis sau cont suspendat", 404: "Nu există", 409: "Conflict de stare" }[c] ??
          "Eroare",
        content: { "application/json": { schema: ref("Error") } },
      },
    ]),
  );

const body = (schema: Schema, example?: unknown) => ({
  required: true,
  content: { "application/json": { schema, ...(example ? { example } : {}) } },
});

const idParam = (name = "id", description = "ID") => ({ name, in: "path", required: true, schema: uuid, description });
const q = (name: string, description: string, schema: Schema = { type: "string" }) => ({
  name,
  in: "query",
  required: false,
  schema,
  description,
});

const auth = [{ demoCookie: [] }, { supabaseCookie: [] }];

/**
 * Public origin of the current request (honours reverse proxies), used for the "servers" entry and the
 * examples. `request.url` is not used because `next start` reports it as localhost.
 */
export function originFromHeaders(h: Headers): string {
  const host = h.get("x-forwarded-host")?.split(",")[0].trim() || h.get("host") || "localhost:3000";
  const proto =
    h.get("x-forwarded-proto")?.split(",")[0].trim() || (/^(localhost|127\.|\[::1\])/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}

export function buildOpenApiDocument(origin: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: `${appConfig.name} API`,
      version: "1.0.0",
      description:
        "REST API pentru platforma de servicii: joburi, oferte (bid-uri), potrivire AI, recenzii, raportări și moderare. " +
        "Autentificarea folosește cookie-ul de sesiune setat de aplicație (modul demo) sau cookie-urile Supabase Auth. " +
        "Răspunsurile reușite au forma { data }, erorile { error: { code, message, fieldErrors? } }.",
    },
    servers: [{ url: origin }],
    tags: [
      { name: "Sistem" },
      { name: "Catalog" },
      { name: "Joburi" },
      { name: "Oferte" },
      { name: "Lucrători" },
      { name: "Potrivire AI" },
      { name: "Chat" },
      { name: "Recenzii și raportări" },
      { name: "Contul meu" },
      { name: "Moderare" },
    ],
    paths: {
      "/api/health": {
        get: {
          tags: ["Sistem"],
          summary: "Starea serviciului, modul de date și motorul AI",
          responses: ok({ type: "object", properties: { status: { type: "string" }, mode: { enum: ["demo", "supabase"] }, ai: { enum: ["openai", "local"] } } }),
        },
      },
      "/api/categories": {
        get: { tags: ["Catalog"], summary: "Categorii (calificat / casnic) cu taguri și numărători", responses: ok(arrayOf(ref("Category"))) },
      },
      "/api/jobs": {
        get: {
          tags: ["Joburi"],
          summary: "Feed de joburi (joburile clienților Premium sunt fixate sus)",
          parameters: [
            q("q", "Căutare text (fără diacritice e ok)"),
            q("tag", "Slug tag, ex. electrician"),
            q("kind", "Tip categorie", { enum: ["specialized", "casual"] }),
            q("category", "Slug categorie"),
            q("city", "Oraș (joburile online sunt incluse)"),
            q("status", "Stare", { enum: ["open", "assigned", "completed", "cancelled", "all"], default: "open" }),
            q("limit", "Maxim 100", { type: "integer", default: 50 }),
          ],
          responses: ok(arrayOf(ref("Job"))),
        },
        post: {
          tags: ["Joburi"],
          summary: "Publică un job",
          security: auth,
          requestBody: body(ref("JobInput"), {
            title: "Montaj dulap PAX",
            description: "Dulap PAX de 2 m cu uși glisante, trebuie prins în perete.",
            budget: 450,
            categorySlug: "montaj-mutari",
            tagSlugs: ["montaj-mobila-ikea"],
            city: "Cluj-Napoca",
            location: "Cluj-Napoca · Gheorgheni",
            isRemote: false,
            urgency: "week",
          }),
          responses: { ...ok({ type: "object", properties: { id: uuid } }, "Creat", "201"), ...errors(400, 401, 403) },
        },
      },
      "/api/jobs/{id}": {
        get: {
          tags: ["Joburi"],
          summary: "Detaliile unui job, ofertele vizibile pentru tine și contactul deblocat",
          parameters: [idParam()],
          responses: {
            ...ok({
              type: "object",
              properties: { job: ref("Job"), bids: arrayOf(ref("Bid")), contact: { oneOf: [ref("Contact"), { type: "null" }] } },
            }),
            ...errors(404),
          },
        },
      },
      "/api/jobs/{id}/bids": {
        get: { tags: ["Oferte"], summary: "Ofertele unui job (toate pentru client, doar a ta pentru lucrător)", security: auth, parameters: [idParam()], responses: ok(arrayOf(ref("Bid"))) },
        post: {
          tags: ["Oferte"],
          summary: "Trimite o ofertă",
          security: auth,
          parameters: [idParam()],
          requestBody: body(ref("BidInput"), { price: 400, durationHours: 4, message: "Pot veni sâmbătă." }),
          responses: { ...ok({ type: "object", properties: { id: uuid } }, "Creat", "201"), ...errors(400, 401, 403, 404, 409) },
        },
      },
      "/api/bids/{id}/accept": {
        post: {
          tags: ["Oferte"],
          summary: "Acceptă oferta (doar clientul). Respinge restul, atribuie jobul și deblochează contactul + chatul",
          security: auth,
          parameters: [idParam()],
          responses: { ...ok({ type: "object", properties: { ok: { type: "boolean" } } }), ...errors(401, 403, 404, 409) },
        },
      },
      "/api/bids/{id}/reject": {
        post: { tags: ["Oferte"], summary: "Respinge oferta (doar clientul)", security: auth, parameters: [idParam()], responses: { ...ok({ type: "object" }), ...errors(401, 403, 404, 409) } },
      },
      "/api/jobs/{id}/complete": {
        post: { tags: ["Joburi"], summary: "Marchează jobul ca finalizat (deblochează recenziile)", security: auth, parameters: [idParam()], responses: { ...ok({ type: "object" }), ...errors(401, 403, 409) } },
      },
      "/api/jobs/{id}/cancel": {
        post: { tags: ["Joburi"], summary: "Anulează jobul", security: auth, parameters: [idParam()], responses: { ...ok({ type: "object" }), ...errors(401, 403, 409) } },
      },
      "/api/jobs/{id}/recommendations": {
        get: {
          tags: ["Potrivire AI"],
          summary: "Lucrători recomandați: Match Score (taguri + semantic + locație) + boost Premium",
          parameters: [idParam(), q("limit", "1–20", { type: "integer", default: 6 })],
          responses: { ...ok(arrayOf(ref("RecommendedWorker"))), ...errors(404) },
        },
      },
      "/api/match": {
        post: {
          tags: ["Potrivire AI"],
          summary: "Analiză detaliată job ↔ lucrător (OpenAI dacă e configurat, altfel analiză locală)",
          requestBody: body({ type: "object", required: ["jobId", "workerId"], properties: { jobId: uuid, workerId: uuid } }),
          responses: { ...ok(ref("MatchAnalysis")), ...errors(400, 404) },
        },
      },
      "/api/jobs/{id}/messages": {
        get: { tags: ["Chat"], summary: "Mesajele chatului (doar clientul și lucrătorul ales)", security: auth, parameters: [idParam()], responses: ok(arrayOf(ref("Message"))) },
        post: {
          tags: ["Chat"],
          summary: "Trimite un mesaj",
          security: auth,
          parameters: [idParam()],
          requestBody: body({ type: "object", required: ["body"], properties: { body: { type: "string", maxLength: 2000 } } }),
          responses: { ...ok({ type: "object", properties: { id: uuid } }, "Creat", "201"), ...errors(400, 401, 403) },
        },
      },
      "/api/workers": {
        get: {
          tags: ["Lucrători"],
          summary: "Lucrători (Premium primii, conturile suspendate sunt ascunse)",
          parameters: [q("q", "Nume sau descriere"), q("tag", "Slug tag"), q("kind", "Tip", { enum: ["specialized", "casual"] }), q("city", "Oraș"), q("limit", "Maxim 100", { type: "integer" })],
          responses: ok(arrayOf(ref("Worker"))),
        },
      },
      "/api/workers/{id}": {
        get: {
          tags: ["Lucrători"],
          summary: "Profil de lucrător cu recenzii și distribuția notelor",
          parameters: [idParam()],
          responses: {
            ...ok({
              type: "object",
              properties: {
                worker: ref("Worker"),
                reviews: arrayOf(ref("Review")),
                ratingDistribution: arrayOf({ type: "object", properties: { stars: { type: "integer" }, count: { type: "integer" } } }),
              },
            }),
            ...errors(404),
          },
        },
      },
      "/api/reviews": {
        post: {
          tags: ["Recenzii și raportări"],
          summary: "Recenzie reciprocă (1–5 stele) după finalizare; legată de (job, lucrător, serviciu)",
          security: auth,
          requestBody: body(ref("ReviewInput")),
          responses: { ...ok({ type: "object", properties: { id: uuid } }, "Creat", "201"), ...errors(400, 401, 403, 409) },
        },
      },
      "/api/reports": {
        post: {
          tags: ["Recenzii și raportări"],
          summary: "Raportează un profil, un job sau o ofertă. La pragul configurat (implicit 5) contul e suspendat automat",
          security: auth,
          requestBody: body(ref("ReportInput"), { targetType: "profile", targetId: "00000000-0000-0000-0000-000000000000", reason: "fraud", details: "Cere avans." }),
          responses: {
            ...ok({ type: "object", properties: { id: uuid, targetProfileId: uuid, targetBanned: { type: "boolean" } } }, "Creat", "201"),
            ...errors(400, 401, 403, 404, 409),
          },
        },
      },
      "/api/me": {
        get: { tags: ["Contul meu"], summary: "Profilul și contactul utilizatorului curent", security: auth, responses: { ...ok({ type: "object", properties: { profile: ref("Profile"), contact: ref("Contact") } }), ...errors(401) } },
      },
      "/api/me/role": {
        post: {
          tags: ["Contul meu"],
          summary: "Comută între modul Client și Lucrător",
          security: auth,
          requestBody: body({ type: "object", required: ["mode"], properties: { mode: { enum: ["worker", "client"] } } }),
          responses: { ...ok({ type: "object" }), ...errors(400, 401) },
        },
      },
      "/api/me/premium": {
        post: {
          tags: ["Contul meu"],
          summary: "Checkout simulat Premium (9,99 $/lună): fără reclame + boost",
          security: auth,
          requestBody: body({ type: "object", required: ["enabled"], properties: { enabled: { type: "boolean" } } }),
          responses: { ...ok({ type: "object" }), ...errors(400, 401) },
        },
      },
      "/api/me/recommendations": {
        get: { tags: ["Potrivire AI"], summary: "Joburi recomandate pentru lucrătorul curent, cu scor AI", security: auth, parameters: [q("limit", "1–50", { type: "integer" })], responses: { ...ok(arrayOf(ref("RecommendedJob"))), ...errors(401) } },
      },
      "/api/admin/reports": {
        get: { tags: ["Moderare"], summary: "Raportări (doar moderatori)", security: auth, parameters: [q("status", "Filtru", { enum: ["open", "dismissed", "actioned"] })], responses: { ...ok(arrayOf(ref("AdminReport"))), ...errors(401, 403) } },
      },
      "/api/admin/users": {
        get: { tags: ["Moderare"], summary: "Utilizatori cu contorul de raportări și starea de suspendare", security: auth, responses: { ...ok(arrayOf(ref("ModerationUser"))), ...errors(401, 403) } },
      },
      "/api/admin/users/{id}/ban": {
        post: {
          tags: ["Moderare"],
          summary: "Suspendă manual un cont",
          security: auth,
          parameters: [idParam()],
          requestBody: { required: false, content: { "application/json": { schema: { type: "object", properties: { reason: { type: "string" } } } } } },
          responses: { ...ok({ type: "object" }), ...errors(401, 403, 404) },
        },
      },
      "/api/admin/users/{id}/unban": {
        post: {
          tags: ["Moderare"],
          summary: "Deblochează un cont (implicit resetează contorul și închide raportările deschise)",
          security: auth,
          parameters: [idParam()],
          requestBody: { required: false, content: { "application/json": { schema: { type: "object", properties: { resetReports: { type: "boolean", default: true } } } } } },
          responses: { ...ok({ type: "object" }), ...errors(401, 403, 404) },
        },
      },
      "/api/admin/settings": {
        get: { tags: ["Moderare"], summary: "Regulile de suspendare automată", responses: ok(ref("ModerationSettings")) },
        put: { tags: ["Moderare"], summary: "Actualizează pragul de suspendare automată", security: auth, requestBody: body(ref("ModerationSettings")), responses: { ...ok(ref("ModerationSettings")), ...errors(400, 401, 403) } },
      },
    },
    components: {
      securitySchemes: {
        demoCookie: { type: "apiKey", in: "cookie", name: "gata_demo_session", description: "Sesiunea din modul demo" },
        supabaseCookie: { type: "apiKey", in: "cookie", name: "sb-<project-ref>-auth-token", description: "Sesiunea Supabase Auth" },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "object",
              required: ["code", "message"],
              properties: {
                code: { enum: ["UNAUTHENTICATED", "FORBIDDEN", "BANNED", "NOT_FOUND", "VALIDATION", "CONFLICT", "INTERNAL"] },
                message: { type: "string" },
                fieldErrors: { type: "object", additionalProperties: { type: "string" } },
              },
            },
          },
        },
        Tag: {
          type: "object",
          properties: { id: uuid, slug: { type: "string" }, name: { type: "string" }, categoryId: uuid, requiresLicense: { type: "boolean" }, licenseNote: { type: ["string", "null"] } },
        },
        WorkerTag: { allOf: [ref("Tag"), { type: "object", properties: { yearsExperience: { type: "integer" }, categoryName: { type: "string" }, categoryKind: { enum: ["specialized", "casual"] } } }] },
        Category: {
          type: "object",
          properties: {
            id: uuid, slug: { type: "string" }, name: { type: "string" }, kind: { enum: ["specialized", "casual"] }, icon: { type: "string" },
            description: { type: "string" }, tags: arrayOf(ref("Tag")), openJobs: { type: "integer" }, workers: { type: "integer" },
          },
        },
        ProfileSummary: {
          type: "object",
          properties: {
            id: uuid, fullName: { type: "string" }, avatarUrl: { type: ["string", "null"] }, city: { type: "string" }, isPremium: { type: "boolean" },
            isVerified: { type: "boolean" }, isBanned: { type: "boolean" }, ratingAvg: { type: "number" }, ratingCount: { type: "integer" },
          },
        },
        Profile: {
          allOf: [
            ref("ProfileSummary"),
            {
              type: "object",
              properties: {
                userId: uuid, bio: { type: "string" }, roleMode: { enum: ["worker", "client"] }, boostLevel: { type: "integer" }, bannedReason: { type: ["string", "null"] },
                isAdmin: { type: "boolean" }, licenseInfo: { type: ["string", "null"] }, hourlyRate: { type: ["integer", "null"] },
                portfolio: arrayOf({ type: "object", properties: { title: { type: "string" }, description: { type: "string" } } }), createdAt: { type: "string", format: "date-time" },
              },
            },
          ],
        },
        Worker: { allOf: [ref("Profile"), { type: "object", properties: { tags: arrayOf(ref("WorkerTag")), completedJobs: { type: "integer" } } }] },
        Job: {
          type: "object",
          properties: {
            id: uuid, title: { type: "string" }, description: { type: "string" }, budget: { type: "integer", description: "lei" }, city: { type: "string" },
            location: { type: "string" }, isRemote: { type: "boolean" }, urgency: { enum: ["urgent", "week", "flexible"] },
            status: { enum: ["open", "assigned", "completed", "cancelled"] }, bidCount: { type: "integer" }, createdAt: { type: "string", format: "date-time" },
            category: { type: "object", properties: { id: uuid, slug: { type: "string" }, name: { type: "string" }, kind: { enum: ["specialized", "casual"] } } },
            tags: arrayOf(ref("Tag")), client: ref("ProfileSummary"), isPromoted: { type: "boolean", description: "Client Premium → fixat sus" },
          },
        },
        JobInput: {
          type: "object",
          required: ["title", "description", "budget", "categorySlug", "tagSlugs", "urgency"],
          properties: {
            title: { type: "string", minLength: 5, maxLength: 120 }, description: { type: "string", minLength: 20, maxLength: 4000 },
            budget: { type: "integer", minimum: 0 }, categorySlug: { type: "string" }, tagSlugs: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
            city: { type: "string" }, location: { type: "string" }, isRemote: { type: "boolean" }, urgency: { enum: ["urgent", "week", "flexible"] },
          },
        },
        Bid: {
          type: "object",
          properties: {
            id: uuid, jobId: uuid, price: { type: "integer" }, durationHours: { type: "number" }, message: { type: "string" },
            status: { enum: ["pending", "accepted", "rejected"] }, createdAt: { type: "string", format: "date-time" },
            worker: { allOf: [ref("ProfileSummary"), { type: "object", properties: { licenseInfo: { type: ["string", "null"] }, tags: arrayOf(ref("WorkerTag")) } }] },
            isPromoted: { type: "boolean", description: "Lucrător Premium → afișat primul, insignă Promovat" },
          },
        },
        BidInput: {
          type: "object",
          required: ["price", "durationHours"],
          properties: { price: { type: "integer", minimum: 1 }, durationHours: { type: "number", exclusiveMinimum: 0 }, message: { type: "string", maxLength: 2000 } },
        },
        Review: {
          type: "object",
          properties: {
            id: uuid, jobId: uuid, jobTitle: { type: "string" }, rating: { type: "integer", minimum: 1, maximum: 5 }, comment: { type: "string" },
            serviceId: { type: ["string", "null"] }, serviceName: { type: ["string", "null"] }, direction: { enum: ["client_to_worker", "worker_to_client"] },
            reviewer: { type: "object", properties: { id: uuid, fullName: { type: "string" } } }, createdAt: { type: "string", format: "date-time" },
          },
        },
        ReviewInput: { type: "object", required: ["jobId", "rating"], properties: { jobId: uuid, rating: { type: "integer", minimum: 1, maximum: 5 }, comment: { type: "string" } } },
        ReportInput: {
          type: "object",
          required: ["targetType", "targetId", "reason"],
          properties: {
            targetType: { enum: ["profile", "job", "bid"] }, targetId: uuid,
            reason: { enum: ["spam", "fraud", "inappropriate", "fake_profile", "no_show", "unlicensed", "other"] }, details: { type: "string", maxLength: 1000 },
          },
        },
        Message: { type: "object", properties: { id: uuid, jobId: uuid, senderId: uuid, senderName: { type: "string" }, body: { type: "string" }, createdAt: { type: "string", format: "date-time" } } },
        Contact: { type: "object", properties: { profileId: uuid, fullName: { type: "string" }, phone: { type: ["string", "null"] }, email: { type: ["string", "null"] } } },
        MatchBreakdown: {
          type: "object",
          properties: {
            tag: { type: "number" }, semantic: { type: "number" }, location: { type: "number" }, matchedTags: arrayOf({ type: "string" }),
            missingTags: arrayOf({ type: "string" }), semanticSource: { enum: ["openai", "local"] }, licenseWarning: { type: "boolean" },
          },
        },
        RecommendedWorker: {
          type: "object",
          properties: { worker: ref("Worker"), score: { type: "integer", minimum: 0, maximum: 100 }, boost: { type: "integer" }, rankScore: { type: "integer" }, breakdown: ref("MatchBreakdown") },
        },
        RecommendedJob: {
          type: "object",
          properties: { job: ref("Job"), alreadyBid: { type: "boolean" }, score: { type: "integer" }, boost: { type: "integer" }, rankScore: { type: "integer" }, breakdown: ref("MatchBreakdown") },
        },
        MatchAnalysis: {
          type: "object",
          properties: { score: { type: "integer" }, verdict: { type: "string" }, strengths: arrayOf({ type: "string" }), concerns: arrayOf({ type: "string" }), source: { enum: ["openai", "local"] } },
        },
        AdminReport: {
          type: "object",
          properties: {
            id: uuid, targetType: { enum: ["profile", "job", "bid"] }, targetId: uuid, reason: { type: "string" }, details: { type: "string" },
            status: { enum: ["open", "dismissed", "actioned"] }, createdAt: { type: "string", format: "date-time" },
            reporter: { type: "object", properties: { id: uuid, fullName: { type: "string" } } },
            targetProfile: { type: "object", properties: { id: uuid, fullName: { type: "string" }, reportCount: { type: "integer" }, isBanned: { type: "boolean" } } },
          },
        },
        ModerationUser: {
          type: "object",
          properties: {
            id: uuid, fullName: { type: "string" }, reportCount: { type: "integer" }, isBanned: { type: "boolean" }, bannedReason: { type: ["string", "null"] },
            isPremium: { type: "boolean" }, isAdmin: { type: "boolean" }, isVerified: { type: "boolean" }, isWorker: { type: "boolean" },
          },
        },
        ModerationSettings: {
          type: "object",
          required: ["autoBanThreshold", "autoBanEnabled"],
          properties: { autoBanThreshold: { type: "integer", minimum: 1, maximum: 100 }, autoBanEnabled: { type: "boolean" } },
        },
      },
    },
  };
}
