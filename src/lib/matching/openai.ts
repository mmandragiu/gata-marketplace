import OpenAI from "openai";
import { z } from "zod";

import { aiConfig } from "@/lib/config";

let client: OpenAI | null = null;

export function openAiEnabled(): boolean {
  return Boolean(aiConfig.apiKey());
}

function getClient(): OpenAI {
  const apiKey = aiConfig.apiKey();
  if (!apiKey) throw new Error("OPENAI_API_KEY lipsește");
  if (!client) client = new OpenAI({ apiKey, timeout: 20_000, maxRetries: 1 });
  return client;
}

/** Embeds texts in one request (order preserved). Always 1536 dimensions to fit vector(1536). */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await getClient().embeddings.create({
    model: aiConfig.embeddingModel(),
    input: texts,
    dimensions: aiConfig.embeddingDimensions,
  });
  return [...res.data].sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

const analysisSchema = z.object({
  score: z.coerce.number().min(0).max(100),
  verdict: z.string().min(1).max(300),
  strengths: z.array(z.string().max(300)).max(6).default([]),
  concerns: z.array(z.string().max(300)).max(6).default([]),
});

export type LlmAnalysis = z.infer<typeof analysisSchema>;

const SYSTEM_PROMPT = `Ești motorul de potrivire al unei platforme românești care conectează clienți cu prestatori de servicii.
Primești un job și profilul unui lucrător, plus semnale calculate de platformă (taguri potrivite, oraș).
Evaluează cât de potrivit este lucrătorul pentru job: competențe și experiență, soft skills, detalii specifice din descriere,
locație și autorizări cerute de lege (de exemplu, lucrările la instalații electrice cer electrician autorizat ANRE).
Folosește doar informațiile primite; nu inventa experiență sau certificări.
Răspunde DOAR cu un obiect JSON, în limba română, cu forma:
{"score": număr 0-100, "verdict": "o propoziție scurtă", "strengths": ["..."], "concerns": ["..."]}`;

export async function analyzeWithLlm(payload: unknown): Promise<LlmAnalysis> {
  const completion = await getClient().chat.completions.create({
    model: aiConfig.model(),
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(payload) },
    ],
  });
  const content = completion.choices[0]?.message?.content ?? "";
  return analysisSchema.parse(JSON.parse(content));
}
