import { cookies } from "next/headers";
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "./dict";

export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return v === "fr" || v === "en" ? v : DEFAULT_LOCALE;
}

export async function getDict() {
  return dictionaries[await getLocale()];
}
