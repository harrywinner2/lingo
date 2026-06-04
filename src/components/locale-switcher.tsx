"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { LOCALES, LOCALE_COOKIE } from "@/i18n/dict";
import { cn } from "@/lib/utils";

export function LocaleSwitcher() {
  const { locale } = useI18n();
  const router = useRouter();

  function set(l: string) {
    document.cookie = `${LOCALE_COOKIE}=${l};path=/;max-age=31536000;samesite=lax`;
    router.refresh();
  }

  return (
    <div className="inline-flex overflow-hidden rounded-full border border-line text-xs font-bold">
      {LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => set(l)}
          className={cn(
            "px-2.5 py-1.5 transition",
            locale === l ? "bg-ink text-paper" : "bg-card text-muted hover:bg-paper",
          )}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
