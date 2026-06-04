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
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useI18n } from "@/i18n/provider";
import {
  parseModels,
  buildChain,
  tName,
  AGLC_CHARS,
  commentUrl,
  EARN_FORM_URL,
} from "@/lib/translator-ui";

type Status = "loading" | "online" | "offline";

export default function TranslatePage() {
  const { d } = useI18n();
  const tr = d.translate;
  const [status, setStatus] = useState<Status>("loading");
  const [checking, setChecking] = useState(false);
  const [langs, setLangs] = useState<string[]>([]);
  const [pairs, setPairs] = useState<Set<string>>(new Set());
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [text, setText] = useState("");
  const [output, setOutput] = useState("");
  const [comment, setComment] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  // Cache last successful request so identical re-clicks don't hit the backend.
  const lastReq = useRef<{ key: string; output: string; comment: string } | null>(null);

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
        setTarget((t) => t || parsed.langs.find((l) => l !== "francais") || parsed.langs[1] || "");
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
  }, [checkStatus]);

  const chain = buildChain(pairs, source, target);

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
    if (!chain || !text.trim()) return;
    const key = `${source}|${target}|${text.trim()}`;
    // Identical to the last successful translation — reuse, don't re-request.
    if (lastReq.current && lastReq.current.key === key) {
      setOutput(lastReq.current.output);
      setComment(lastReq.current.comment);
      setError(null);
      return;
    }
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
      const c = commentUrl(chain, text, data.output);
      setOutput(data.output);
      setComment(c);
      lastReq.current = { key, output: data.output, comment: c };
    } catch (e) {
      setError(
        e instanceof Error && e.message.includes("respond") ? tr.asleepNotice : tr.translate + " ✗",
      );
    } finally {
      setBusy(false);
    }
  }

  const online = status === "online";

  return (
    <div className="bg-grain flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-2.5">
            <LocaleSwitcher />
            <StatusPill status={status} checking={checking} onRetry={checkStatus} />
            <a href="https://huggingface.co/flagship-ai" target="_blank" rel="noreferrer" className="hidden sm:block">
              <Button size="sm" variant="outline">
                {d.nav.models}
              </Button>
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">
        <div className="mb-6 text-center">
          <h1 className="font-display text-4xl font-semibold tracking-tight">{tr.title}</h1>
          <p className="mx-auto mt-3 max-w-md text-muted">{tr.subtitle}</p>
        </div>

        <a href={EARN_FORM_URL} target="_blank" rel="noreferrer" className="block">
          <div className="mb-5 flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-accent-600">
            <Star className="h-4 w-4" /> {tr.earnBanner}
          </div>
        </a>

        {status === "offline" && (
          <Card className="mb-5 flex items-center gap-3 border-warning/30 bg-warning/5 p-4">
            <WifiOff className="h-5 w-5 text-warning" />
            <p className="text-sm">{tr.asleepNotice}</p>
          </Card>
        )}

        <Card className={`overflow-hidden ${online ? "" : "opacity-60"}`}>
          <div className="flex items-center gap-2 border-b border-line bg-paper/60 p-3">
            <Select value={source} onChange={(e) => setSource(e.target.value)} disabled={!online} className="h-10 border-0 bg-transparent font-semibold focus:ring-0">
              {langs.length === 0 && <option>—</option>}
              {langs.map((l) => (
                <option key={l} value={l}>{tName(l)}</option>
              ))}
            </Select>
            <button onClick={swap} disabled={!online} aria-label="Swap" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-black/5 hover:text-ink disabled:opacity-40">
              <ArrowRightLeft className="h-4 w-4" />
            </button>
            <Select value={target} onChange={(e) => setTarget(e.target.value)} disabled={!online} className="h-10 border-0 bg-transparent font-semibold focus:ring-0">
              {langs.length === 0 && <option>—</option>}
              {langs.map((l) => (
                <option key={l} value={l}>{tName(l)}</option>
              ))}
            </Select>
          </div>

          {source && target && !chain && online && (
            <p className="border-b border-line bg-warning/10 px-4 py-2 text-sm text-warning">{tr.noPath}</p>
          )}

          <div className="p-4">
            <Textarea ref={taRef} rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={tr.placeholder} disabled={!online} className="border-0 px-0 text-lg focus:ring-0" />
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-semibold text-muted">{tr.specialChars}</span>
              {AGLC_CHARS.map((c, i) => {
                const combining = ["́", "̀", "̌"].includes(c);
                return (
                  <button key={i} type="button" onClick={() => insertChar(c)} disabled={!online} className="h-8 min-w-8 rounded-lg border border-line bg-card px-2 text-sm font-medium transition hover:border-primary/60 hover:bg-paper disabled:opacity-40">
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
                  <Loader2 className="h-4 w-4 animate-spin" /> {tr.translating}
                </p>
              )}
              {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p>}
              {output && !busy && (
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-semibold text-accent-600">{tName(target)}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(output);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink"
                    >
                      {copied ? (<><Check className="h-3.5 w-3.5 text-success" /> {tr.copied}</>) : (<><Copy className="h-3.5 w-3.5" /> {tr.copy}</>)}
                    </button>
                  </div>
                  <p className="text-lg">{output}</p>
                  {comment && (
                    <a href={comment} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink">
                      <MessageSquare className="h-3.5 w-3.5" /> {tr.comment}
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="p-4 pt-0">
            <Button className="w-full" size="lg" onClick={doTranslate} disabled={!online || !chain || !text.trim() || busy}>
              {busy ? (<><Loader2 className="h-5 w-5 animate-spin" /> {tr.translating}</>) : (<><Languages className="h-5 w-5" /> {tr.translate}</>)}
            </Button>
          </div>
        </Card>

        <p className="mt-10 text-center text-sm text-muted">
          {tr.contributePrompt}{" "}
          <Link href="/app" className="font-semibold text-accent-600">{tr.contributeCta}</Link>
        </p>
      </main>
    </div>
  );
}

function StatusPill({ status, checking, onRetry }: { status: Status; checking: boolean; onRetry: () => void }) {
  const { d } = useI18n();
  if (status === "loading" || checking)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> {d.translate.checking}
      </span>
    );
  if (status === "online")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
        <Wifi className="h-3.5 w-3.5" /> {d.translate.online}
      </span>
    );
  return (
    <button onClick={onRetry} className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning transition hover:bg-warning/15">
      <WifiOff className="h-3.5 w-3.5" /> {d.translate.asleep}
    </button>
  );
}
