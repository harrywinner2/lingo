// Server-only helper. Do not import from client components.
// (Not using the "server-only" package to avoid adding a dependency;
// this module reads process.env.OPENAI_API_KEY and must run on the server.)

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = process.env.OPENAI_MODEL || "gpt-4o";

export type GeneratePromptsInput = {
  /** Target language name speakers will record in, e.g. "Lingala", "Wolof". */
  language: string;
  /** Country / region context as a comma list, e.g. "DR Congo, Republic of Congo". */
  countries?: string;
  /** Theme / domain the researcher wants prompts about, e.g. "market haggling". */
  topic?: string;
  /** How many prompts to generate. Clamped to 1..30. */
  count?: number;
  /** UI locale of the requester ("en" | "fr") — only affects nothing user-facing; prompts are always French. */
  locale?: string;
};

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI authoring not configured: OPENAI_API_KEY is not set.");
    this.name = "AiNotConfiguredError";
  }
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/**
 * Generate culturally-adapted data-collection prompts with OpenAI.
 * Prompts are returned in French (the project pivot language), short and concrete.
 * Throws AiNotConfiguredError when OPENAI_API_KEY is unset.
 */
export async function generatePrompts(
  input: GeneratePromptsInput,
): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AiNotConfiguredError();

  const language = (input.language || "").trim() || "the target language";
  const countries = (input.countries || "").trim();
  const topic = (input.topic || "").trim();
  const count = Math.max(1, Math.min(30, Math.round(input.count ?? 10)));

  const contextLines = [
    `Langue cible des enregistrements : ${language}.`,
    countries ? `Pays / région concernés : ${countries}.` : null,
    topic ? `Thème souhaité : ${topic}.` : null,
  ].filter(Boolean);

  const userText = [
    `Tu aides un chercheur à constituer un corpus vocal pour une langue africaine peu dotée.`,
    `Génère ${count} phrases d'invite (prompts) courtes, concrètes et naturelles, que des locuteurs liront puis enregistreront.`,
    "",
    ...contextLines,
    "",
    `Contraintes :`,
    `- Écris les phrases en FRANÇAIS (langue pivot du projet).`,
    `- Chaque phrase doit être courte (idéalement 4 à 12 mots) et facile à dire à voix haute.`,
    `- Privilégie des situations du quotidien culturellement appropriées à la région indiquée (marché, famille, salutations, transports, santé, agriculture, etc.).`,
    `- Évite les références spécifiques à une autre culture, les marques, et tout contenu sensible.`,
    `- Varie les phrases : questions, affirmations, demandes polies.`,
    "",
    `Réponds UNIQUEMENT avec un objet JSON de la forme {"prompts": ["…", "…"]} contenant exactement ${count} chaînes, sans texte additionnel.`,
  ].join("\n");

  const res = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: userText }],
    }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const errBody = (await res.json()) as { error?: { message?: string } };
      detail = errBody?.error?.message ?? "";
    } catch {
      /* ignore parse errors */
    }
    throw new Error(
      `OpenAI API error (${res.status})${detail ? `: ${detail}` : ""}`,
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = (data.choices?.[0]?.message?.content ?? "").trim();

  return parsePrompts(text, count);
}

function parsePrompts(text: string, count: number): string[] {
  let out: string[] = [];

  // Prefer a fenced/embedded JSON object.
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const obj = JSON.parse(jsonMatch[0]) as { prompts?: unknown };
      if (Array.isArray(obj.prompts)) {
        out = obj.prompts
          .filter((p): p is string => typeof p === "string")
          .map((p) => p.trim());
      }
    } catch {
      /* fall through to line parsing */
    }
  }

  // Fallback: try a bare JSON array.
  if (out.length === 0) {
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try {
        const arr = JSON.parse(arrMatch[0]) as unknown;
        if (Array.isArray(arr)) {
          out = arr
            .filter((p): p is string => typeof p === "string")
            .map((p) => p.trim());
        }
      } catch {
        /* fall through */
      }
    }
  }

  // Last resort: split lines and strip bullet/number prefixes.
  if (out.length === 0) {
    out = text
      .split("\n")
      .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
      .map((l) => l.replace(/^["“”']|["“”']$/g, "").trim())
      .filter((l) => l.length > 0);
  }

  // De-dupe, drop empties, clamp to count.
  const seen = new Set<string>();
  const result: string[] = [];
  for (const p of out) {
    if (!p) continue;
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(p);
    if (result.length >= count) break;
  }
  return result;
}
