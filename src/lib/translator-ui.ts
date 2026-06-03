// The translator discovers its languages from the worker's live model list
// (model repos are named "<from>-<to>", e.g. "francais-ewondo"), so the UI
// always matches whatever models the worker currently serves.

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
  return { pairs, langs: [...langs].sort((a, b) => tName(a).localeCompare(tName(b))) };
}

// Pivot through French when there's no direct model, exactly like old lingo.cm.
export function buildChain(
  pairs: Set<string>,
  source: string,
  target: string,
): string[] | null {
  if (!source || !target || source === target) return null;
  if (pairs.has(`${source}-${target}`)) return [`${source}-${target}`];
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
  return SPECIAL[code] ?? code.charAt(0).toUpperCase() + code.slice(1);
}

// Original AGLC virtual-keyboard characters.
export const AGLC_CHARS = [
  "́", "ŋ", "̌", "ɑ", "ɛ", "–", "ə", "3", "ɔ", "'", "̀", "ʉ", "Ə", "Ŋ",
];

// Prefilled Google Form for "leave a comment on this translation".
export function commentUrl(models: string[], input: string, output: string) {
  const trace = encodeURIComponent(JSON.stringify({ models, input, output }));
  return (
    "https://docs.google.com/forms/d/e/1FAIpQLSce1fG0yYwBfSY4R6dQSehsQeQpERAVJAkYz4fYYSr7oeDeFQ/viewform?usp=pp_url&entry.1037849118=" +
    trace
  );
}

export const EARN_FORM_URL = "https://forms.gle/n3VbFJ43Ltq95WRC7";
export const WHATSAPP_URL = "https://wa.me/237675112818";
