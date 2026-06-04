/**
 * Offline upload queue for voice recordings.
 *
 * Low-bandwidth-first: a recording made offline or on a flaky connection is
 * persisted to IndexedDB and auto-retried with exponential backoff so it is
 * never lost. Items replay against the EXACT same contract used by
 * record-task.tsx today: a multipart POST to `/api/recordings` with fields
 * `audio` (the Blob, filename `clip.{ext}`), `promptId`, and `durationMs`.
 *
 * This is a plain library module (no "use client" needed) but it touches
 * browser-only APIs (indexedDB, navigator, fetch, events). Every entry point
 * guards with `typeof window` / `typeof indexedDB` so it is inert and safe
 * during SSR / on the server.
 *
 * Feature gate: the queue is only "active" when
 * NEXT_PUBLIC_OFFLINE_QUEUE === "true". When disabled, isEnabled() returns
 * false and callers should fall back to a direct upload. The storage API
 * still works if called directly (so nothing is lost), but the indicator and
 * auto-flush wiring stay dormant.
 */

export const UPLOAD_ENDPOINT = "/api/recordings";

const DB_NAME = "lingo-offline-queue";
const DB_VERSION = 1;
const STORE = "uploads";

/** Backoff schedule (ms) indexed by attempt count; last value repeats. */
const BACKOFF_MS = [0, 5_000, 15_000, 60_000, 5 * 60_000, 30 * 60_000];

export type QueueMeta = {
  promptId: string;
  durationMs: number;
  /** filename to send, e.g. "clip.webm" / "clip.m4a" — matches record-task. */
  filename: string;
};

export type QueuedItem = {
  id: number;
  blob: Blob;
  meta: QueueMeta;
  createdAt: number;
  attempts: number;
  /** epoch ms before which we should not retry (backoff gate). */
  nextAttemptAt: number;
  lastError?: string;
};

type StoredItem = Omit<QueuedItem, "id">;

export type QueueListener = (snapshot: QueueSnapshot) => void;

export type QueueSnapshot = {
  pending: number;
  syncing: boolean;
  online: boolean;
};

export function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

/** Whether the offline-queue feature is enabled via env flag. */
export function isEnabled(): boolean {
  return process.env.NEXT_PUBLIC_OFFLINE_QUEUE === "true";
}

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  // navigator.onLine can be undefined in some environments; treat as online.
  return navigator.onLine !== false;
}

/* ------------------------------------------------------------------ */
/* IndexedDB helpers (raw indexedDB, no deps)                          */
/* ------------------------------------------------------------------ */

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!isBrowser()) {
    return Promise.reject(new Error("IndexedDB unavailable (SSR)"));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
  return dbPromise;
}

function tx(
  db: IDBDatabase,
  mode: IDBTransactionMode,
): IDBObjectStore {
  return db.transaction(STORE, mode).objectStore(STORE);
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
  });
}

/* ------------------------------------------------------------------ */
/* Subscriptions                                                       */
/* ------------------------------------------------------------------ */

const listeners = new Set<QueueListener>();
let syncing = false;

async function notify(): Promise<void> {
  if (!listeners.size) return;
  const snapshot: QueueSnapshot = {
    pending: await count(),
    syncing,
    online: isOnline(),
  };
  for (const l of listeners) {
    try {
      l(snapshot);
    } catch {
      /* listener errors must not break the queue */
    }
  }
}

/** Subscribe to queue changes. Returns an unsubscribe function. */
export function subscribe(listener: QueueListener): () => void {
  listeners.add(listener);
  // Push an initial snapshot asynchronously.
  void (async () => {
    try {
      listener({
        pending: await count(),
        syncing,
        online: isOnline(),
      });
    } catch {
      listener({ pending: 0, syncing, online: isOnline() });
    }
  })();
  return () => listeners.delete(listener);
}

/* ------------------------------------------------------------------ */
/* Public storage API                                                  */
/* ------------------------------------------------------------------ */

/** Persist a recording for later upload. Returns the new item id. */
export async function enqueue(blob: Blob, meta: QueueMeta): Promise<number> {
  if (!isBrowser()) throw new Error("enqueue requires a browser environment");
  const db = await openDb();
  const item: StoredItem = {
    blob,
    meta,
    createdAt: Date.now(),
    attempts: 0,
    nextAttemptAt: 0,
  };
  const id = (await reqToPromise(tx(db, "readwrite").add(item))) as number;
  await notify();
  return id;
}

/** List all pending items, oldest first. */
export async function list(): Promise<QueuedItem[]> {
  if (!isBrowser()) return [];
  const db = await openDb();
  const all = (await reqToPromise(tx(db, "readonly").getAll())) as QueuedItem[];
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

/** Number of pending items. */
export async function count(): Promise<number> {
  if (!isBrowser()) return 0;
  const db = await openDb();
  return (await reqToPromise(tx(db, "readonly").count())) as number;
}

async function remove(id: number): Promise<void> {
  const db = await openDb();
  await reqToPromise(tx(db, "readwrite").delete(id));
}

async function update(item: QueuedItem): Promise<void> {
  const db = await openDb();
  await reqToPromise(tx(db, "readwrite").put(item));
}

/** Remove every queued item (e.g. on sign-out). */
export async function clear(): Promise<void> {
  if (!isBrowser()) return;
  const db = await openDb();
  await reqToPromise(tx(db, "readwrite").clear());
  await notify();
}

/* ------------------------------------------------------------------ */
/* Upload + flush                                                      */
/* ------------------------------------------------------------------ */

/**
 * Replays a single queued item against /api/recordings using the identical
 * multipart contract as record-task.tsx.
 */
async function uploadItem(item: QueuedItem): Promise<void> {
  const fd = new FormData();
  fd.append("audio", item.blob, item.meta.filename);
  fd.append("promptId", item.meta.promptId);
  fd.append("durationMs", String(item.meta.durationMs));
  const res = await fetch(UPLOAD_ENDPOINT, { method: "POST", body: fd });
  if (!res.ok) {
    let msg = `Upload failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) msg = body.error;
    } catch {
      /* ignore non-JSON bodies */
    }
    // 4xx (except 408/429) are permanent for this payload: drop so we don't
    // retry forever on e.g. a deleted prompt or an unauthorized speaker.
    const permanent =
      res.status >= 400 &&
      res.status < 500 &&
      res.status !== 408 &&
      res.status !== 429;
    const err = new Error(msg) as Error & { permanent?: boolean };
    err.permanent = permanent;
    throw err;
  }
}

let flushing = false;

/**
 * Attempt to upload every due pending item. Successful items are removed;
 * failures are rescheduled with exponential backoff. Safe to call often —
 * concurrent calls are coalesced. Returns the number of items uploaded.
 */
export async function flush(): Promise<number> {
  if (!isBrowser() || flushing) return 0;
  if (!isOnline()) return 0;
  flushing = true;
  syncing = true;
  await notify();
  let uploaded = 0;
  try {
    const items = await list();
    const now = Date.now();
    for (const item of items) {
      if (!isOnline()) break;
      if (item.nextAttemptAt > now) continue;
      try {
        await uploadItem(item);
        await remove(item.id);
        uploaded += 1;
        await notify();
      } catch (e) {
        const err = e as Error & { permanent?: boolean };
        if (err.permanent) {
          // Permanent client error: drop so the queue can drain.
          await remove(item.id);
        } else {
          const attempts = item.attempts + 1;
          const delay =
            BACKOFF_MS[Math.min(attempts, BACKOFF_MS.length - 1)];
          await update({
            ...item,
            attempts,
            nextAttemptAt: Date.now() + delay,
            lastError: err.message,
          });
        }
        await notify();
      }
    }
  } finally {
    flushing = false;
    syncing = false;
    await notify();
  }
  return uploaded;
}

/* ------------------------------------------------------------------ */
/* online/offline + periodic auto-flush wiring                         */
/* ------------------------------------------------------------------ */

let wired = false;
let retryTimer: ReturnType<typeof setInterval> | null = null;

function onOnline(): void {
  void flush();
}

function onOffline(): void {
  void notify();
}

/**
 * Start listening for connectivity changes and periodically retrying due
 * items. Idempotent. Returns a teardown function. No-op (returns a no-op
 * teardown) when off-feature or during SSR.
 */
export function startAutoFlush(): () => void {
  if (!isBrowser() || !isEnabled() || wired) {
    return () => {};
  }
  wired = true;
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  // Retry loop handles backoff windows that elapse while still online.
  retryTimer = setInterval(() => {
    if (isOnline()) void flush();
  }, 30_000);
  // Kick an immediate flush in case items were left from a previous session.
  void flush();
  return stopAutoFlush;
}

export function stopAutoFlush(): void {
  if (!isBrowser()) return;
  window.removeEventListener("online", onOnline);
  window.removeEventListener("offline", onOffline);
  if (retryTimer) {
    clearInterval(retryTimer);
    retryTimer = null;
  }
  wired = false;
}

export const offlineQueue = {
  isEnabled,
  isBrowser,
  isOnline,
  enqueue,
  list,
  count,
  clear,
  flush,
  subscribe,
  startAutoFlush,
  stopAutoFlush,
};

export default offlineQueue;
