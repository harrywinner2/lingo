// Target languages currently in the Lingo corpus (from the v1 model set) plus
// room to grow. `pivot` languages are what prompts are presented in.

export const TARGET_LANGUAGES = [
  { code: "aghem", name: "Aghem" },
  { code: "ajamiya", name: "Ajamiya" },
  { code: "akoose", name: "Akoose" },
  { code: "awing", name: "Awing" },
  { code: "babanki", name: "Babanki" },
  { code: "bafia", name: "Bafia" },
  { code: "bakoko", name: "Bakoko" },
  { code: "bakweri", name: "Bakweri" },
  { code: "bidwee", name: "Bidwee" },
  { code: "bulu", name: "Bulu" },
  { code: "ghomala", name: "Ghomala" },
] as const;

export const PIVOT_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "fr", name: "French" },
] as const;

export function langName(code: string) {
  return (
    [...TARGET_LANGUAGES, ...PIVOT_LANGUAGES].find((l) => l.code === code)?.name ??
    code
  );
}
