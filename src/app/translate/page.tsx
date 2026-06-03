"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  Loader2,
  Wifi,
  WifiOff,
  Copy,
  Check,
  MessageSquare,
  Star,
  Languages,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, Select, Textarea } from "@/components/ui/primitives";
import {
  TRANSLATE_LANGS,
  buildChain,
  tName,
  AGLC_CHARS,
  commentUrl,
  EARN_FORM_URL,
} from "@/lib/translator-ui";

type Status = "loading" | "online" | "offline";

export default function TranslatePage() {
  const [status, setStatus] = useState<Status>("loading");
  const [checking, setChecking] = useState(false);
  const [source, setSource] = useState("francais");
  const [target, setTarget] = useState("ghomala");
  const [text, setText] = useState("");
  const [output, setOutput] = useState("");
  const [comment, setComment] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const checkStatus = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/translate/status", { cache: "no-store" });
      const data = await res.json();
      setStatus(data.online ? "online" : "offline");
    } catch {
      setStatus("offline");
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  function insertChar(ch: string) {
    const ta = taRef.current;
    if (!ta) return setText((t) => t + ch);
    const start = ta.selectionStart ?? text.length;
    const end = ta.selectionEnd ?? text.length;
    setText(text.slice(0, start) + ch + text.slice(end));
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + ch.length;
    });
  }

  function swap() {
    setSource(target);
    setTarget(source);
    setText(output || text);
    setOutput("");
    setComment(null);
  }

  async function doTranslate() {
    const chain = buildChain(source, target);
    if (!chain) {
      setError("Choose two different languages.");
      return;
    }
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    setOutput("");
    setComment(null);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, models: chain }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Translation failed");
      setOutput(data.output);
      setComment(commentUrl(chain, text, data.output));
      if (status !== "online") setStatus("online");
    } catch (e) {
      setError(
        e instanceof Error && e.message.includes("respond")
          ? "The translation server didn't respond — it may be asleep. Try again shortly."
          : e instanceof Error
            ? e.message
            : "Translation failed",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-grain flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-2.5">
            <StatusPill status={status} checking={checking} onRetry={checkStatus} />
            <a href="https://huggingface.co/flagship-ai" target="_blank" rel="noreferrer">
              <Button size="sm" variant="outline">
                Models
              </Button>
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">
        <div className="mb-6 text-center">
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            Translate Cameroonian languages
          </h1>
          <p className="mx-auto mt-3 max-w-md text-muted">
            Our original French-pivot models — the text foundation the voice
            project grew from.
          </p>
        </div>

        {/* earn banner (original Google Form) */}
        <a href={EARN_FORM_URL} target="_blank" rel="noreferrer" className="block">
          <div className="mb-5 flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-accent-600">
            <Star className="h-4 w-4" /> Aidez-nous à traduire votre langue, et
            gagnez de l&apos;argent !
          </div>
        </a>

        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line bg-paper/60 p-3">
            <Select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="h-10 border-0 bg-transparent font-semibold focus:ring-0"
            >
              {TRANSLATE_LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </Select>
            <button
              onClick={swap}
              aria-label="Swap languages"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-black/5 hover:text-ink"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </button>
            <Select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="h-10 border-0 bg-transparent font-semibold focus:ring-0"
            >
              {TRANSLATE_LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="p-4">
            <Textarea
              ref={taRef}
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Texte à traduire…"
              className="border-0 px-0 text-lg focus:ring-0"
            />
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-semibold text-muted">
                Caractères spéciaux (AGLC)
              </span>
              {AGLC_CHARS.map((c, i) => {
                const combining = ["́", "̀", "̌"].includes(c);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => insertChar(c)}
                    className="h-8 min-w-8 rounded-lg border border-line bg-card px-2 text-sm font-medium transition hover:border-primary/60 hover:bg-paper"
                  >
                    {combining ? "◌" + c : c}
                  </button>
                );
              })}
            </div>
          </div>

          {(output || busy || error) && (
            <div className="border-t border-line bg-paper/40 p-4">
              {busy && (
                <p className="inline-flex items-center gap-2 text-sm text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" /> Traduction…
                </p>
              )}
              {error && (
                <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
                  {error}
                </p>
              )}
              {output && !busy && (
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-semibold text-accent-600">
                      {tName(target)}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(output);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-success" /> Copié
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copier
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-lg">{output}</p>
                  {comment && (
                    <a
                      href={comment}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Laisser un
                      commentaire sur cette traduction
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="p-4 pt-0">
            <Button
              className="w-full"
              size="lg"
              onClick={doTranslate}
              disabled={busy || !text.trim() || source === target}
            >
              {busy ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Traduction…
                </>
              ) : (
                <>
                  <Languages className="h-5 w-5" /> Traduire
                </>
              )}
            </Button>
          </div>
        </Card>

        <p className="mt-10 text-center text-sm text-muted">
          Want better models for your language?{" "}
          <Link href="/app" className="font-semibold text-accent-600">
            Contribute your voice →
          </Link>
        </p>
      </main>
    </div>
  );
}

function StatusPill({
  status,
  checking,
  onRetry,
}: {
  status: Status;
  checking: boolean;
  onRetry: () => void;
}) {
  if (status === "loading" || checking)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking…
      </span>
    );
  if (status === "online")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
        <Wifi className="h-3.5 w-3.5" /> Server online
      </span>
    );
  return (
    <button
      onClick={onRetry}
      className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning transition hover:bg-warning/15"
    >
      <WifiOff className="h-3.5 w-3.5" /> Server asleep · retry
    </button>
  );
}
