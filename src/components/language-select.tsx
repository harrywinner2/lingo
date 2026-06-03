"use client";

import { useState } from "react";
import { Plus, Check, X, Globe2 } from "lucide-react";
import { createLanguage } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/primitives";
import { COUNTRIES } from "@/lib/languages";
import { cn } from "@/lib/utils";

type Option = { code: string; name: string; countries?: string; custom?: boolean };

export function LanguageSelect({
  languages,
  value,
  onSelect,
}: {
  languages: Option[];
  value: string;
  onSelect: (opt: { code: string; name: string }) => void;
}) {
  const [list, setList] = useState<Option[]>(languages);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [countries, setCountries] = useState<string[]>(["Cameroon"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleCountry(c: string) {
    setCountries((cs) =>
      cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c],
    );
  }

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const lang = await createLanguage({ name: name.trim(), countries });
      setList((l) =>
        l.some((x) => x.code === lang.code) ? l : [...l, { ...lang, custom: true }],
      );
      onSelect(lang);
      setCreating(false);
      setName("");
      setCountries(["Cameroon"]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create language");
    } finally {
      setBusy(false);
    }
  }

  if (creating) {
    return (
      <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-primary-600" />
          <span className="text-sm font-semibold">New language</span>
        </div>
        <Input
          autoFocus
          placeholder="Language name (e.g. Ngiemboon)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <p className="mt-3 mb-1.5 text-xs font-semibold text-muted">
          Spoken in (pick all that apply)
        </p>
        <div className="flex max-h-36 flex-wrap gap-1.5 overflow-auto">
          {COUNTRIES.map((c) => {
            const on = countries.includes(c);
            return (
              <button
                type="button"
                key={c}
                onClick={() => toggleCountry(c)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-line bg-card text-muted hover:border-primary/50",
                )}
              >
                {c}
              </button>
            );
          })}
        </div>
        {error && <p className="mt-2 text-sm font-medium text-danger">{error}</p>}
        <div className="mt-3 flex gap-2">
          <Button type="button" size="sm" onClick={create} disabled={busy}>
            <Check className="h-4 w-4" /> {busy ? "Adding…" : "Add language"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setCreating(false)}
          >
            <X className="h-4 w-4" /> Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Select
        value={value}
        onChange={(e) => {
          const opt = list.find((l) => l.code === e.target.value);
          if (opt) onSelect({ code: opt.code, name: opt.name });
        }}
        required
      >
        <option value="" disabled>
          Choose a language…
        </option>
        {list.map((l) => (
          <option key={l.code} value={l.code}>
            {l.name}
            {l.custom ? " (custom)" : ""}
          </option>
        ))}
      </Select>
      <Button
        type="button"
        variant="outline"
        onClick={() => setCreating(true)}
        className="shrink-0"
      >
        <Plus className="h-4 w-4" /> New
      </Button>
    </div>
  );
}
