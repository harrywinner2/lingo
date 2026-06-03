import { langName } from "@/lib/languages";

// Model repo names look like "francais-bulu" / "bulu-francais" / "english-francais".
// We parse them into a directed set of available pairs and pivot through French
// when there's no direct model — exactly how the legacy lingo.cm chains models.

export function parseModels(models: string[]) {
  const pairs = new Set<string>();
  const langs = new Set<string>();
  for (const m of models) {
    const i = m.indexOf("-");
    if (i <= 0) continue;
    const from = m.slice(0, i);
    const to = m.slice(i + 1);
    if (!from || !to) continue;
    pairs.add(m);
    langs.add(from);
    langs.add(to);
  }
  return { pairs, langs: [...langs].sort() };
}

export function buildChain(
  pairs: Set<string>,
  source: string,
  target: string,
): string[] | null {
  if (!source || !target || source === target) return null;
  if (pairs.has(`${source}-${target}`)) return [`${source}-${target}`];
  // pivot through French
  if (pairs.has(`${source}-francais`) && pairs.has(`francais-${target}`))
    return [`${source}-francais`, `francais-${target}`];
  return null;
}

const SPECIAL: Record<string, string> = {
  francais: "Français",
  english: "English",
  anglais: "English",
};

export function tName(code: string) {
  if (SPECIAL[code]) return SPECIAL[code];
  const n = langName(code);
  return n === code ? code.charAt(0).toUpperCase() + code.slice(1) : n;
}

// AGLC / IPA helpers commonly needed to write these languages.
export const AGLC_CHARS = [
  "ɑ", "ɛ", "ə", "ɔ", "ŋ", "ɲ", "ʒ", "ʉ", "ɣ", "ɓ", "ɗ", "ʼ",
  "́", "̀", "̌", "̂",
];
