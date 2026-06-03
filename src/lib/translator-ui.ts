// Faithful to the original lingo.cm translator.

export const TRANSLATE_LANGS = [
  { code: "bulu", name: "Bulu" },
  { code: "francais", name: "Français" },
  { code: "fufulde", name: "Fufulde" },
  { code: "ghomala", name: "Ghomala" },
  { code: "pinyin", name: "Pinyin" },
] as const;

// Pivot through French, exactly like the original script.js.
export function buildChain(source: string, target: string): string[] | null {
  if (!source || !target || source === target) return null;
  if (source === "francais" || target === "francais") return [`${source}-${target}`];
  return [`${source}-francais`, `francais-${target}`];
}

export function tName(code: string) {
  return TRANSLATE_LANGS.find((l) => l.code === code)?.name ?? code;
}

// The original AGLC virtual keyboard characters.
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
