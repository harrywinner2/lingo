"use client";

import { createContext, useContext } from "react";
import { dictionaries, type Dict, type Locale } from "./dict";

const Ctx = createContext<{ locale: Locale; d: Dict }>({
  locale: "en",
  d: dictionaries.en,
});

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <Ctx.Provider value={{ locale, d: dictionaries[locale] }}>
      {children}
    </Ctx.Provider>
  );
}

export const useI18n = () => useContext(Ctx);
