"use client";

import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, UploadCloud } from "lucide-react";
import {
  isEnabled,
  startAutoFlush,
  subscribe,
  flush,
  type QueueSnapshot,
} from "@/lib/offline-queue";

/**
 * Tiny status pill showing how many voice recordings are waiting to upload and
 * whether a sync is in progress. Auto-flushes when connectivity returns
 * (wired in src/lib/offline-queue.ts via startAutoFlush). Tapping it forces a
 * retry.
 *
 * Feature-gated: renders nothing unless NEXT_PUBLIC_OFFLINE_QUEUE === "true",
 * and nothing when the queue is empty (so it stays out of the way on a good
 * connection). Strings default to English; pass `labels` (from the i18n dict)
 * to localize — see wiring notes.
 */
export type OfflineQueueLabels = {
  /** e.g. "{n} waiting to upload" — use {n} as the count placeholder. */
  pending: string;
  /** e.g. "Syncing…" */
  syncing: string;
  /** e.g. "Offline — saved" */
  offline: string;
  /** e.g. "Tap to retry" (used as title/aria) */
  retry: string;
};

const DEFAULT_LABELS: OfflineQueueLabels = {
  pending: "{n} waiting to upload",
  syncing: "Syncing…",
  offline: "Offline — saved",
  retry: "Tap to retry",
};

export function OfflineQueueIndicator({
  labels,
  className = "",
}: {
  labels?: Partial<OfflineQueueLabels>;
  className?: string;
}) {
  const l = { ...DEFAULT_LABELS, ...labels };
  const [snap, setSnap] = useState<QueueSnapshot>({
    pending: 0,
    syncing: false,
    online: true,
  });

  useEffect(() => {
    if (!isEnabled()) return;
    const stopFlush = startAutoFlush();
    const unsub = subscribe(setSnap);
    return () => {
      unsub();
      stopFlush();
    };
  }, []);

  // Inert when disabled or nothing is queued.
  if (!isEnabled() || snap.pending === 0) return null;

  const offline = !snap.online;
  const text = snap.syncing
    ? l.syncing
    : offline
      ? l.offline
      : l.pending.replace("{n}", String(snap.pending));

  return (
    <button
      type="button"
      onClick={() => void flush()}
      title={l.retry}
      aria-label={l.retry}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border border-line",
        "bg-card px-2.5 py-1 text-xs font-semibold text-muted",
        "transition hover:text-ink",
        offline ? "text-danger" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {snap.syncing ? (
        <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : offline ? (
        <CloudOff className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <UploadCloud className="h-3.5 w-3.5" aria-hidden />
      )}
      <span>{text}</span>
      {!snap.syncing && !offline && (
        <span className="ml-0.5 rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">
          {snap.pending}
        </span>
      )}
    </button>
  );
}

export default OfflineQueueIndicator;
