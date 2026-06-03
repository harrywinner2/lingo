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
  RefreshCw,
  Moon,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, Select, Textarea } from "@/components/ui/primitives";
import { parseModels, buildChain, tName, AGLC_CHARS } from "@/lib/translator-ui";

type Status = "loading" | "online" | "offline";

export default function TranslatePage() {
  const [status, setStatus] = useState<Status>("loading");
  const [langs, setLangs] = useState<string[]>([]);
  const [pairs, setPairs] = useState<Set<string>>(new Set());
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [text, setText] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const checkStatus = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/translate/status", { cache: "no-store" });
      const data = await res.json();
      if (data.online && data.models?.length) {
        const parsed = parseModels(data.models);
        setPairs(parsed.pairs);
        setLangs(parsed.langs);
        setStatus("online");
        setSource((s) => s || (parsed.langs.includes("francais") ? "francais" : parsed.langs[0]));
        setTarget(
          (t) => t || parsed.langs.find((l) => l !== "francais") || parsed.langs[1] || "",
        );
      } else {
        setStatus("offline");
      }
    } catch {
      setStatus("offline");
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const id = setInterval(checkStatus, 15000);
    return () => clearInterval(id);
  }, [checkStatus]);

  const chain = buildChain(pairs, source, target);
  const online = status === "online";

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
  }

  async function doTranslate() {
    if (!chain) return;
    setBusy(true);
    setError(null);
    setOutput("");
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, models: chain }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Translation failed");
      setOutput(data.output);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Translation failed");
    } finally {
      setBusy(false);
    }
  }

  const canTranslate = online && !!chain && !!text.trim() && !busy;

  return (
    <div className="bg-grain flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3.5">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-2.5">
            <StatusPill status={status} checking={checking} onRetry={checkStatus} />
            <Link href="/app">
              <Button size="sm" variant="outline">
                Open app
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10 sm:py-14">
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-sm font-medium text-muted">
            <Sparkles className="h-4 w-4 text-accent" /> Our original open models
          </span>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">
            Translate Cameroonian languages
          </h1>
          <p className="mx-auto mt-3 max-w-md text-muted">
            Free French-pivot machine translation — the text foundation the voice
            project grew from.
          </p>
        </div>

        {status === "offline" && (
          <OfflineNotice onRetry={checkStatus} checking={checking} />
        )}

        <Card
          className={`overflow-hidden transition ${
            online ? "" : "pointer-events-none opacity-60"
          }`}
        >
          {/* language bar */}
          <div className="flex items-center gap-2 border-b border-line bg-paper/60 p-3">
            <Select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              disabled={!online}
              className="h-10 border-0 bg-transparent font-semibold focus:ring-0"
            >
              {langs.length === 0 && <option>—</option>}
              {langs.map((l) => (
                <option key={l} value={l}>
                  {tName(l)}
                </option>
              ))}
            </Select>
            <button
              onClick={swap}
              disabled={!online}
              aria-label="Swap languages"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-black/5 hover:text-ink disabled:opacity-40"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </button>
            <Select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              disabled={!online}
              className="h-10 border-0 bg-transparent font-semibold focus:ring-0"
            >
              {langs.length === 0 && <option>—</option>}
              {langs.map((l) => (
                <option key={l} value={l}>
                  {tName(l)}
                </option>
              ))}
            </Select>
          </div>

          {source && target && !chain && online && (
            <p className="border-b border-line bg-warning/10 px-4 py-2 text-sm text-warning">
              No model path between {tName(source)} and {tName(target)} yet — try
              going through French.
            </p>
          )}

          {/* input */}
          <div className="p-4">
            <Textarea
              ref={taRef}
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={online ? "Type text to translate…" : "Waiting for the server…"}
              disabled={!online}
              className="border-0 px-0 text-lg focus:ring-0"
            />
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-semibold text-muted">
                Special chars
              </span>
              {AGLC_CHARS.map((c, i) => {
                const combining = ["́", "̀", "̌", "̂"].includes(c);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => insertChar(c)}
                    disabled={!online}
                    className="h-8 min-w-8 rounded-lg border border-line bg-card px-2 text-sm font-medium transition hover:border-primary/60 hover:bg-paper disabled:opacity-40"
                    title="Insert special character (AGLC)"
                  >
                    {combining ? "◌" + c : c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* result */}
          {(output || busy || error) && (
            <div className="border-t border-line bg-paper/40 p-4">
              {busy && (
                <p className="inline-flex items-center gap-2 text-sm text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" /> Translating…
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
                          <Check className="h-3.5 w-3.5 text-success" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-lg">{output}</p>
                </div>
              )}
            </div>
          )}

          <div className="p-4 pt-0">
            <Button className="w-full" size="lg" onClick={doTranslate} disabled={!canTranslate}>
              {busy ? "Translating…" : "Translate"}
            </Button>
          </div>
        </Card>

        {output && <Feedback />}

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
  if (status === "loading")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking…
      </span>
    );
  if (status === "online")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
        </span>
        Server online
      </span>
    );
  return (
    <button
      onClick={onRetry}
      className="inline-flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger/15"
    >
      {checking ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <WifiOff className="h-3.5 w-3.5" />
      )}
      Server offline · retry
    </button>
  );
}

function OfflineNotice({
  onRetry,
  checking,
}: {
  onRetry: () => void;
  checking: boolean;
}) {
  return (
    <Card className="mb-5 flex items-start gap-4 border-warning/30 bg-warning/5 p-5">
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
        <Moon className="h-5 w-5" />
      </span>
      <div className="flex-1">
        <p className="font-semibold">The translation server is asleep</p>
        <p className="mt-1 text-sm text-muted">
          Our models run on a server that isn&apos;t always on. Translation will
          light up automatically the moment it&apos;s back — or tap retry.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={onRetry}
          disabled={checking}
        >
          {checking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Checking…
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" /> Check again
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

function Feedback() {
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  if (sent)
    return (
      <p className="mt-5 text-center text-sm font-semibold text-accent-600">
        Thanks for the feedback! 🙏
      </p>
    );
  return (
    <Card className="mt-5 p-4">
      <p className="mb-2 text-sm font-semibold">Leave a comment on this translation</p>
      <Textarea
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Was it accurate? Suggest a better translation…"
      />
      <Button
        size="sm"
        variant="outline"
        className="mt-2"
        disabled={!comment.trim()}
        onClick={async () => {
          try {
            await fetch("/api/translate/feedback", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ comment }),
            });
          } catch {
            /* best-effort */
          }
          setSent(true);
        }}
      >
        Send feedback
      </Button>
    </Card>
  );
}
