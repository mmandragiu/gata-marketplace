/**
 * Lightweight Romanian text similarity used when no OpenAI key is configured.
 * normalize → tokens → light stemming → concept expansion → weighted term vector → cosine.
 */

const STOPWORDS = new Set(
  `si sau dar iar ca ce cu de la in din pe pentru prin spre sub fara este sunt eram era fi fost am ai are avem aveti au
  un una unei unui niste cel cea cei cele al ale lui ei lor sa se ma te ne va le il o mai foarte doar deja chiar tot toti
  toate acest aceasta aceste acesti acel acea asta ast cand unde cum care cine cat cate cati ori nici nu da ok eu tu el ea
  noi voi ei ele meu mea mei mele tau ta tai tale sau sale nostru noastra vostru voastra apoi atunci acum dupa inainte
  peste intre catre vreau caut caute cauta nevoie zi zile ora ore bine buna ziua salut multumesc poate pot putem`
    .split(/\s+/)
    .filter(Boolean),
);

/**
 * Concept groups: a token activates a concept when the token (as written) or its stem starts with one of the prefixes.
 * Entries written as "=xyz" must match the whole token as written (short or ambiguous words: "tv" must not match "tva",
 * the IKEA range "metod" must not match "metodă").
 * Ambiguous words (birou = office/desk, companie = company/companionship, fontă = cast iron) are left out on purpose.
 */
const CONCEPTS: [string, string[]][] = [
  ["electric", ["electr", "priz", "tablou", "sigurant", "disjunct", "iluminat", "lustr", "anre", "circuit", "cablu", "diferential", "led"]],
  ["sanitar", ["instalator", "sanitar", "chiuvet", "robinet", "bateri", "scurger", "desfund", "teav", "tevi", "calorifer", "central", "termic", "baie"]],
  ["lemn", ["tampl", "lemn", "mobilier", "comand", "bibliotec", "masiv", "stejar"]],
  ["montaj", ["mont", "ikea", "pax", "malm", "=metod", "dulap", "comod", "asambl", "raft", "suport", "mobil", "bormasin", "televiz", "=tv", "vesa", "dibl"]],
  ["mutare", ["mutar", "mut", "transport", "duba", "hamal", "cuti"]],
  ["curatenie", ["curat", "curaten", "menaj", "aspir", "geam", "spal", "praf", "dezinfect"]],
  ["ingrijire", ["gospod", "cumparatur", "gatit", "varstnic", "batran", "ingrij", "mama", "=mamei"]],
  ["calcat", ["calcat", "=calc", "=calca", "rufe", "camas", "lenjer"]],
  ["gradina", ["gradin", "=gard", "=gardul", "=garduri", "=gardului", "tuia", "iarb", "tuns", "frunz", "curte", "plant"]],
  ["animale", ["cain", "catel", "labrador", "plimb", "lesa", "=pet", "pisic", "animal"]],
  ["web", ["site", "web", "next", "react", "typescript", "programat", "aplicat", "seo", "vercel", "frontend", "backend", "full", "postgres", "supabase"]],
  ["design", ["logo", "design", "brand", "identitat", "grafic", "meniu", "ambalaj", "palet", "afis", "ilustrat"]],
  ["foto", ["foto", "poze", "poza"]],
  ["zugrav", ["zugrav", "vopsea", "vops", "lavabil", "glet", "tavan"]],
  ["faianta", ["faiant", "gresie", "placar"]],
];

const SUFFIXES = ["urilor", "ilor", "elor", "ului", "iile", "uri", "ele", "ile", "ii", "ul", "le", "ea", "a", "e", "i", "u"];

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function stem(token: string): string {
  for (const suffix of SUFFIXES) {
    if (token.length - suffix.length >= 4 && token.endsWith(suffix)) return token.slice(0, -suffix.length);
  }
  return token;
}

function rawTokens(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

export function tokens(text: string): string[] {
  return rawTokens(text).map(stem);
}

/** Exact entries compare the token as written; prefixes also try the stem (so "tablou" and "tabloul" both count). */
function matchesEntry(token: string, stemmed: string, entry: string): boolean {
  if (entry.startsWith("=")) return token === entry.slice(1);
  return token.startsWith(entry) || stemmed.startsWith(entry);
}

/** Concepts activated by a normalized token. */
export function conceptsOf(token: string): string[] {
  const stemmed = stem(token);
  return CONCEPTS.filter(([, entries]) => entries.some((e) => matchesEntry(token, stemmed, e))).map(([concept]) => concept);
}

export type TermVector = Map<string, number>;

export function vectorize(text: string): TermVector {
  const v: TermVector = new Map();
  for (const raw of rawTokens(text)) {
    const t = stem(raw);
    v.set(t, (v.get(t) ?? 0) + 1);
    for (const c of conceptsOf(raw)) {
      const key = `§${c}`;
      v.set(key, (v.get(key) ?? 0) + 2);
    }
  }
  return v;
}

export function cosine(a: TermVector, b: TermVector): number {
  if (a.size === 0 || b.size === 0) return 0;
  let dot = 0;
  for (const [k, va] of a) {
    const vb = b.get(k);
    if (vb) dot += va * vb;
  }
  const norm = (v: TermVector) => Math.sqrt([...v.values()].reduce((s, x) => s + x * x, 0));
  return dot / (norm(a) * norm(b));
}

export function sharedConcepts(a: string, b: string): string[] {
  const ca = new Set([...vectorize(a).keys()].filter((k) => k.startsWith("§")));
  return [...vectorize(b).keys()].filter((k) => k.startsWith("§") && ca.has(k)).map((k) => k.slice(1));
}

export function sameCity(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  return na.length > 0 && nb.length > 0 && (na === nb || na.startsWith(nb) || nb.startsWith(na));
}
