import { getDb, languages } from "@/db";
import { TARGET_LANGUAGES } from "@/lib/languages";

export type LanguageOption = {
  code: string;
  name: string;
  countries: string;
  custom: boolean;
};

// Built-in languages merged with researcher-created ones (custom wins on code).
export async function getAllLanguages(): Promise<LanguageOption[]> {
  const db = await getDb();
  const custom = await db.select().from(languages);
  const map = new Map<string, LanguageOption>();
  for (const l of TARGET_LANGUAGES)
    map.set(l.code, { code: l.code, name: l.name, countries: "", custom: false });
  for (const l of custom)
    map.set(l.code, {
      code: l.code,
      name: l.name,
      countries: l.countries,
      custom: true,
    });
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
