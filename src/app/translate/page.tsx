"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRightLeft, Languages, Loader2, Wifi, WifiOff } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, Select, Textarea } from "@/components/ui/primitives";
import {
  parseModels,
  buildChain,
  tName,
  AGLC_CHARS,
} from "@/lib/translator-ui";

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
  const [error, setError] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/translate/status", { cache: "no-store" });
      const data = await res.json();
      if (data.online && data.models?.length) {
        const { pairs, langs } = parseModels(data.models);
        setPairs(pairs);
        setLangs(langs);
        setStatus("online");
        setSource((s) => s || (langs.includes("francais") ? "francais" : langs[0]));
        setTarget((t) => t || langs.find((l) => l !== "francais") || langs[1] || "");
      } else {
        setStatus("offline");
      }
    } catch {
      setStatus("offline");
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const id = setInterval(checkStatus, 15000);
    return () => clearInterval(id);
  }, [checkStatus]);

  const chain = buildChain(pairs, source, target);

  function insertChar(ch: string) {
    const ta = taRef.current;
    if (!ta) {
      setText((t) => t + ch);
      return;
    }
    const start = ta.selectionStart ?? text.length;
    const end = ta.selectionEnd ?? text.length;
    const next = text.slice(0, start) + ch + text.slice(end);
    setText(next);
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

  const canTranslate = status === "online" && !!chain && !!text.trim() && !busy;

  return (
    <div className="bg-grain flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3.5">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <StatusPill status={status} />
            <Link href="/app">
              <Button size="sm" variant="outline">
                Open app
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <div className="mb-6 flex items-center gap-2">
          <Languages className="h-5 w-5 text-accent-600" />
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Text translator
          </h1>
        </div>
        <p className="mb-6 max-w-xl text-muted">
          Our original French-pivot models for Cameroonian languages — the
          foundation the voice project is built on. Free to use while a worker is
          online.
        </p>

        {status === "offline" && (
          <Card className="mb-5 flex items-center gap-3 border-warning/40 bg-warning/5 p-4">
            <WifiOff className="h-5 w-5 text-warning" />
            <p className="text-sm">
              The translation server is currently offline, so translation is
              paused. The status updates automatically when a worker comes back
              online.
            </p>
          </Card>
        )}

        <Card className="p-5">
          {/* language bar */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-muted">
                From
              </label>
              <Select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                disabled={status !== "online"}
              >
                {langs.map((l) => (
                  <option key={l} value={l}>
                    {tName(l)}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="mb-0.5"
              onClick={swap}
              disabled={status !== "online"}
              aria-label="Swap languages"
            >
              <ArrowRightLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-muted">
                To
              </label>
              <Select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                disabled={status !== "online"}
              >
                {langs.map((l) => (
                  <option key={l} value={l}>
                    {tName(l)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {source && target && !chain && status === "online" && (
            <p className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
              No model path between {tName(source)} and {tName(target)} yet.
            </p>
          )}

          {/* input */}
          <div className="mt-4">
            <Textarea
              ref={taRef}
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type text to translate…"
              disabled={status !== "online"}
            />
            <div className="mt-2 flex flex-wrap gap-1">
              {AGLC_CHARS.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => insertChar(c)}
                  className="h-8 min-w-8 rounded-md border border-line bg-paper px-2 text-sm font-medium hover:border-primary/60"
                  title="Insert special character (AGLC)"
                >
                  {c === "́" || c === "̀" || c === "̌" || c === "̂" ? "◌" + c : c}
                </button>
              ))}
            </div>
          </div>

          <Button
            className="mt-4 w-full"
            size="lg"
            onClick={doTranslate}
            disabled={!canTranslate}
          >
            {busy ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Translating…
              </>
            ) : (
              "Translate"
            )}
          </Button>

          {error && (
            <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
              {error}
            </p>
          )}

          {output && (
            <div className="mt-4 rounded-xl border border-accent/30 bg-accent/5 p-4">
              <p className="mb-1 text-xs font-semibold text-accent-600">
                {tName(target)}
              </p>
              <p className="text-lg">{output}</p>
            </div>
          )}
        </Card>

        {output && <Feedback />}

        <p className="mt-8 text-center text-sm text-muted">
          Want better models for your language?{" "}
          <Link href="/app" className="font-semibold text-accent-600">
            Contribute your voice →
          </Link>
        </p>
      </main>
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  if (status === "loading")
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
    <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger">
      <WifiOff className="h-3.5 w-3.5" /> Server offline
    </span>
  );
}

function Feedback() {
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  if (sent)
    return (
      <p className="mt-4 text-center text-sm font-semibold text-accent-600">
        Thanks for the feedback!
      </p>
    );
  return (
    <Card className="mt-4 p-4">
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
