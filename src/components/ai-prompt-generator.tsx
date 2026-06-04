"use client";

import { useState } from "react";
import { Sparkles, Loader2, Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Input, Select } from "@/components/ui/primitives";

type Props = {
  campaignId: string;
  /** Called with the prompts the researcher selected, so the page can persist them. */
  onAdd: (prompts: string[]) => void | Promise<void>;
  /** UI locale; forwarded to the API (prompts are always French) and used for labels. */
  locale?: string;
};

const COUNTS = [5, 10, 15, 20];

const STRINGS = {
  en: {
    title: "Generate prompts with AI",
    subtitle:
      "Describe a theme and let Claude draft culturally-adapted prompts in French.",
    topicPlaceholder: "Theme (optional) — e.g. market haggling, greetings…",
    countLabel: "How many",
    generate: "Generate with AI",
    generating: "Generating…",
    selectAll: "Select all",
    clear: "Clear",
    add: (n: number) => `Add ${n} selected`,
    none: "No prompts generated. Try a different theme.",
    failed: "Could not generate prompts.",
  },
  fr: {
    title: "Générer des invites avec l'IA",
    subtitle:
      "Décrivez un thème et laissez Claude rédiger des invites adaptées culturellement, en français.",
    topicPlaceholder: "Thème (optionnel) — ex. marchander au marché, salutations…",
    countLabel: "Combien",
    generate: "Générer avec l'IA",
    generating: "Génération…",
    selectAll: "Tout sélectionner",
    clear: "Effacer",
    add: (n: number) => `Ajouter ${n} sélectionnée${n === 1 ? "" : "s"}`,
    none: "Aucune invite générée. Essayez un autre thème.",
    failed: "Impossible de générer les invites.",
  },
};

export function AiPromptGenerator({ campaignId, onAdd, locale }: Props) {
  const t = STRINGS[locale === "fr" ? "fr" : "en"];

  // Hide entirely once we learn the feature is not configured (503).
  const [hidden, setHidden] = useState(false);
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(10);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  if (hidden) return null;

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/generate-prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ campaignId, topic: topic.trim(), count, locale }),
      });
      if (res.status === 503) {
        // Feature not configured — disappear gracefully.
        setHidden(true);
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error || t.failed);
        return;
      }
      const data = (await res.json()) as { prompts?: string[] };
      const prompts = (data.prompts ?? []).filter(Boolean);
      setResults(prompts);
      setSelected(new Set(prompts.map((_, i) => i)));
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  }

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function add() {
    const chosen = results.filter((_, i) => selected.has(i));
    if (chosen.length === 0) return;
    setAdding(true);
    try {
      await onAdd(chosen);
      // Drop the ones we added so the list reflects what is left.
      const remaining = results.filter((_, i) => !selected.has(i));
      setResults(remaining);
      setSelected(new Set(remaining.map((_, i) => i)));
    } finally {
      setAdding(false);
    }
  }

  const selectedCount = selected.size;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-accent-600" />
        <h3 className="font-semibold">{t.title}</h3>
      </div>
      <p className="mt-1 text-sm text-muted">{t.subtitle}</p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={t.topicPlaceholder}
          disabled={busy}
        />
        <div className="flex gap-2">
          <Select
            className="w-28"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            disabled={busy}
            aria-label={t.countLabel}
          >
            {COUNTS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
          <Button variant="accent" onClick={generate} disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {busy ? t.generating : t.generate}
          </Button>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm font-semibold text-danger">{error}</p>
      )}

      {results.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <button
              type="button"
              className="font-semibold text-accent-600 hover:underline"
              onClick={() => setSelected(new Set(results.map((_, i) => i)))}
            >
              {t.selectAll}
            </button>
            <button
              type="button"
              className="font-semibold text-muted hover:text-ink"
              onClick={() => setSelected(new Set())}
            >
              {t.clear}
            </button>
          </div>

          <ul className="space-y-2">
            {results.map((p, i) => {
              const on = selected.has(i);
              return (
                <li key={`${i}-${p}`}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-paper px-3.5 py-2.5 transition hover:border-primary/60">
                    <span
                      className={
                        "mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-md border " +
                        (on
                          ? "border-accent-600 bg-accent text-white"
                          : "border-line bg-card")
                      }
                    >
                      {on && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={on}
                      onChange={() => toggle(i)}
                    />
                    <span className="text-[0.95rem] text-ink">{p}</span>
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-3">
            <Button
              onClick={add}
              disabled={adding || selectedCount === 0}
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {t.add(selectedCount)}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setResults([]);
                setSelected(new Set());
              }}
              disabled={adding}
            >
              <X className="h-4 w-4" /> {t.clear}
            </Button>
          </div>
        </div>
      )}

      {!busy && !error && results.length === 0 && selectedCount === 0 && (
        <p className="sr-only">{t.none}</p>
      )}
    </Card>
  );
}
