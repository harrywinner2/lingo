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

export function slugifyLang(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// Countries offered when defining where a language is spoken. Africa-first
// (where Lingo's languages live today), plus a few common others.
export const COUNTRIES = [
  "Cameroon",
  "Nigeria",
  "Chad",
  "Central African Republic",
  "Gabon",
  "Equatorial Guinea",
  "Republic of the Congo",
  "DR Congo",
  "Niger",
  "Ghana",
  "Côte d'Ivoire",
  "Benin",
  "Togo",
  "Burkina Faso",
  "Mali",
  "Senegal",
  "Guinea",
  "Sierra Leone",
  "Liberia",
  "Sudan",
  "South Sudan",
  "Ethiopia",
  "Kenya",
  "Uganda",
  "Tanzania",
  "Rwanda",
  "Burundi",
  "Angola",
  "Zambia",
  "Zimbabwe",
  "Mozambique",
  "Malawi",
  "South Africa",
  "Botswana",
  "Namibia",
  "Other",
] as const;
