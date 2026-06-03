"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Mic,
  RotateCcw,
  Send,
  SkipForward,
  Check,
  Loader2,
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/primitives";
import { langName } from "@/lib/languages";

type Prompt = {
  id: string;
  pivotText: string;
  pivotLang: string;
  targetLang: string;
  domain?: string | null;
  sceneDescription?: string | null;
  imageUrl?: string | null;
};

const MAX_MS = 30_000;
const MIN_MS = 400;

export function RecordTask({ campaignId }: { campaignId: string }) {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [remaining, setRemaining] = useState<number>(0);
  const [loadingPrompt, setLoadingPrompt] = useState(true);
  const [phase, setPhase] = useState<"idle" | "recording" | "recorded" | "uploading">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const startedAtRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const skippedRef = useRef<Set<string>>(new Set());

  const fetchPrompt = useCallback(async () => {
    setLoadingPrompt(true);
    setError(null);
    try {
      const exclude = [...skippedRef.current].join(",");
      const res = await fetch(
        `/api/tasks/record?campaignId=${campaignId}${
          exclude ? `&exclude=${encodeURIComponent(exclude)}` : ""
        }`,
      );
      const data = await res.json();
      setPrompt(data.prompt);
      setRemaining(data.remaining ?? 0);
    } catch {
      setError("Could not load the next prompt.");
    } finally {
      setLoadingPrompt(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchPrompt();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchPrompt]);

  function pickMime() {
    const opts = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    for (const o of opts)
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(o))
        return o;
    return "";
  }

  async function startRecording() {
    if (phase === "recording") return;
    setError(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    try {
      const stream =
        streamRef.current ??
        (await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
        }));
      streamRef.current = stream;

      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        durationRef.current = Date.now() - startedAtRef.current;
        if (timerRef.current) clearInterval(timerRef.current);
        if (durationRef.current < MIN_MS) {
          setPhase("idle");
          setElapsed(0);
          return;
        }
        const blob = new Blob(chunksRef.current, {
          type: mime || "audio/webm",
        });
        blobRef.current = blob;
        setAudioUrl(URL.createObjectURL(blob));
        setPhase("recorded");
      };

      recorderRef.current = rec;
      startedAtRef.current = Date.now();
      rec.start();
      setPhase("recording");
      setElapsed(0);
      timerRef.current = setInterval(() => {
        const ms = Date.now() - startedAtRef.current;
        setElapsed(ms);
        if (ms >= MAX_MS) stopRecording();
      }, 100);
    } catch {
      setError(
        "Microphone access is needed to record. Please allow it and try again.",
      );
      setPhase("idle");
    }
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }

  function reset() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    blobRef.current = null;
    setPhase("idle");
    setElapsed(0);
  }

  async function submit() {
    if (!blobRef.current || !prompt) return;
    setPhase("uploading");
    setError(null);
    try {
      const fd = new FormData();
      const ext = blobRef.current.type.includes("mp4") ? "m4a" : "webm";
      fd.append("audio", blobRef.current, `clip.${ext}`);
      fd.append("promptId", prompt.id);
      fd.append("durationMs", String(durationRef.current));
      const res = await fetch("/api/recordings", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
      setDone((d) => d + 1);
      reset();
      await fetchPrompt();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setPhase("recorded");
    }
  }

  const seconds = (elapsed / 1000).toFixed(1);

  if (loadingPrompt && !prompt) {
    return (
      <Card className="flex items-center justify-center p-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </Card>
    );
  }

  if (!prompt) {
    return (
      <Card className="flex flex-col items-center gap-3 p-12 text-center">
        <PartyPopper className="h-10 w-10 text-primary-600" />
        <p className="font-semibold">You&apos;ve recorded everything available!</p>
        <p className="max-w-sm text-sm text-muted">
          {done > 0 && `You recorded ${done} this session. `}
          Check back later for more prompts.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{remaining} prompts left</span>
        {done > 0 && (
          <span className="inline-flex items-center gap-1 font-semibold text-success">
            <Check className="h-4 w-4" /> {done} recorded
          </span>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-line bg-ink px-5 py-3">
          <p className="text-sm font-semibold text-primary">
            Say this in {langName(prompt.targetLang)}
          </p>
        </div>
        <div className="px-6 py-8 text-center">
          {prompt.domain && (
            <Badge tone="neutral" className="mb-3">
              {prompt.domain}
            </Badge>
          )}
          <p className="font-display text-2xl font-semibold leading-snug">
            {prompt.pivotText}
          </p>
          {prompt.sceneDescription && (
            <p className="mt-2 text-sm text-muted">{prompt.sceneDescription}</p>
          )}
        </div>

        <div className="flex flex-col items-center gap-4 px-6 pb-8">
          {phase === "recorded" && audioUrl ? (
            <audio
              src={audioUrl}
              controls
              className="w-full max-w-sm"
              preload="auto"
            />
          ) : (
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                startRecording();
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                if (phase === "recording") stopRecording();
              }}
              onPointerLeave={() => {
                if (phase === "recording") stopRecording();
              }}
              disabled={phase === "uploading"}
              className={`flex h-28 w-28 select-none items-center justify-center rounded-full text-white transition active:scale-95 ${
                phase === "recording"
                  ? "animate-recording bg-danger"
                  : "bg-primary hover:bg-primary-600"
              }`}
            >
              <Mic className="h-11 w-11" />
            </button>
          )}

          {phase === "recording" && (
            <p className="font-mono text-lg font-bold text-danger">
              {seconds}s
            </p>
          )}
          {phase === "idle" && (
            <p className="text-sm text-muted">Press and hold to record</p>
          )}

          {phase === "recorded" && (
            <div className="flex w-full max-w-sm gap-2">
              <Button variant="outline" className="flex-1" onClick={reset}>
                <RotateCcw className="h-4 w-4" /> Redo
              </Button>
              <Button className="flex-1" onClick={submit}>
                <Send className="h-4 w-4" /> Submit
              </Button>
            </div>
          )}

          {phase === "uploading" && (
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
            </p>
          )}

          {error && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-center text-sm font-medium text-danger">
              {error}
            </p>
          )}
        </div>
      </Card>

      {phase !== "recording" && phase !== "uploading" && (
        <button
          onClick={() => {
            if (prompt) skippedRef.current.add(prompt.id);
            reset();
            fetchPrompt();
          }}
          className="mx-auto flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
        >
          <SkipForward className="h-4 w-4" /> Skip this one
        </button>
      )}
    </div>
  );
}
