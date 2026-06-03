"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ThumbsUp,
  ThumbsDown,
  Star,
  SkipForward,
  Loader2,
  Check,
  PartyPopper,
} from "lucide-react";
import { submitVerification } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { langName } from "@/lib/languages";

type Task = {
  recordingId: string;
  audioUrl: string;
  pivotText: string;
  pivotLang: string;
  targetLang: string;
};

export function VerifyTask({ campaignId }: { campaignId: string }) {
  const [task, setTask] = useState<Task | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const skippedRef = useRef<Set<string>>(new Set());

  const fetchTask = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const exclude = [...skippedRef.current].join(",");
      const res = await fetch(
        `/api/tasks/verify?campaignId=${campaignId}${
          exclude ? `&exclude=${encodeURIComponent(exclude)}` : ""
        }`,
      );
      const data = await res.json();
      setTask(data.task);
      setRemaining(data.remaining ?? 0);
    } catch {
      setError("Could not load the next clip.");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  async function rate(verdict: "correct" | "average" | "incorrect") {
    if (!task || busy) return;
    setBusy(true);
    setError(null);
    try {
      await submitVerification(task.recordingId, verdict);
      setDone((d) => d + 1);
      await fetchTask();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !task) {
    return (
      <Card className="flex items-center justify-center p-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </Card>
    );
  }

  if (!task) {
    return (
      <Card className="flex flex-col items-center gap-3 p-12 text-center">
        <PartyPopper className="h-10 w-10 text-accent-600" />
        <p className="font-semibold">Nothing left to verify right now!</p>
        <p className="max-w-sm text-sm text-muted">
          {done > 0 && `You verified ${done} this session. `}
          New recordings will appear as speakers submit them.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{remaining} clips to review</span>
        {done > 0 && (
          <span className="inline-flex items-center gap-1 font-semibold text-success">
            <Check className="h-4 w-4" /> {done} done
          </span>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-line bg-ink px-5 py-3">
          <p className="text-sm font-semibold text-primary">
            Does this clip say the phrase in {langName(task.targetLang)}?
          </p>
        </div>
        <div className="px-6 py-7 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {langName(task.pivotLang)} prompt
          </p>
          <p className="mt-1 font-display text-2xl font-semibold leading-snug">
            “{task.pivotText}”
          </p>
          <audio
            key={task.recordingId}
            src={task.audioUrl}
            controls
            preload="auto"
            className="mx-auto mt-6 w-full max-w-sm"
          />
        </div>

        <div className="grid grid-cols-3 gap-2 px-5 pb-5">
          <Button
            variant="success"
            disabled={busy}
            onClick={() => rate("correct")}
          >
            <ThumbsUp className="h-4 w-4" /> Correct
          </Button>
          <Button
            variant="warning"
            disabled={busy}
            onClick={() => rate("average")}
          >
            <Star className="h-4 w-4" /> So-so
          </Button>
          <Button
            variant="danger"
            disabled={busy}
            onClick={() => rate("incorrect")}
          >
            <ThumbsDown className="h-4 w-4" /> Wrong
          </Button>
        </div>

        {error && (
          <p className="px-5 pb-4 text-center text-sm font-medium text-danger">
            {error}
          </p>
        )}
      </Card>

      <button
        onClick={() => {
          if (task) skippedRef.current.add(task.recordingId);
          fetchTask();
        }}
        disabled={busy}
        className="mx-auto flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
      >
        <SkipForward className="h-4 w-4" /> Skip
      </button>
    </div>
  );
}
