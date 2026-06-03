import { randomUUID } from "node:crypto";

// Bridges to the t2t worker (Python infer.py) over the same Redis as the old
// lingo.cm: push a job onto `job_queue`, await the matching result on the
// `results` pub/sub channel.
//   - On Cloudflare Workers: raw RESP over Cloudflare TCP sockets.
//   - In Node/dev: the `redis` package.

const JOB_QUEUE = "job_queue";
const RESULTS = "results";

/* eslint-disable @typescript-eslint/no-explicit-any */

function redisParts() {
  const url = new URL(process.env.REDIS_URL || "");
  return {
    hostname: url.hostname,
    port: Number(url.port || 6379),
    username: decodeURIComponent(url.username || "default") || "default",
    password: decodeURIComponent(url.password || ""),
  };
}

// ---------- Workers: RESP over cloudflare:sockets ----------

// Import the Workers-only sockets module without the bundler trying to resolve
// it at build time (it only exists in the workerd runtime).
function importSockets(): Promise<any> {
  // Non-foldable specifier so bundlers leave it as a runtime import; only the
  // workerd runtime provides "cloudflare:sockets".
  const mod =
    (globalThis as any).__CF_SOCKETS__ ?? ["cloudflare", "sockets"].join(":");
  return import(/* webpackIgnore: true */ /* @vite-ignore */ mod);
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function respCmd(...args: string[]) {
  let s = `*${args.length}\r\n`;
  for (const a of args) s += `$${enc.encode(a).length}\r\n${a}\r\n`;
  return enc.encode(s);
}

function concat(a: Uint8Array, b: Uint8Array) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function indexOfCRLF(buf: Uint8Array, from: number) {
  for (let i = from; i + 1 < buf.length; i++)
    if (buf[i] === 13 && buf[i + 1] === 10) return i;
  return -1;
}

// Parse one RESP reply; returns [value, nextPos] or null if incomplete.
function parseReply(buf: Uint8Array, pos: number): [any, number] | null {
  if (pos >= buf.length) return null;
  const type = buf[pos];
  const end = indexOfCRLF(buf, pos + 1);
  if (end === -1) return null;
  const line = dec.decode(buf.slice(pos + 1, end));
  const next = end + 2;
  if (type === 0x2b) return [line, next]; // +simple
  if (type === 0x2d) return [{ error: line }, next]; // -error
  if (type === 0x3a) return [parseInt(line, 10), next]; // :int
  if (type === 0x24) {
    // $bulk
    const len = parseInt(line, 10);
    if (len === -1) return [null, next];
    if (buf.length < next + len + 2) return null;
    return [dec.decode(buf.slice(next, next + len)), next + len + 2];
  }
  if (type === 0x2a) {
    // *array
    const count = parseInt(line, 10);
    if (count === -1) return [null, next];
    let p = next;
    const arr: any[] = [];
    for (let i = 0; i < count; i++) {
      const r = parseReply(buf, p);
      if (!r) return null;
      arr.push(r[0]);
      p = r[1];
    }
    return [arr, p];
  }
  return null;
}

async function runJobWorkers(
  payload: Record<string, unknown>,
  timeoutMs: number,
): Promise<{ output?: unknown; error?: string }> {
  const { connect } = await importSockets();
  const { hostname, port, username, password } = redisParts();
  const jobId = randomUUID();
  const auth = password ? respCmd("AUTH", username, password) : new Uint8Array(0);

  // A subscribed connection rejects RPUSH, so use two sockets (like
  // node-redis duplicate()): one subscribes to results, one pushes the job.
  const sub = (connect as any)({ hostname, port });
  const pub = (connect as any)({ hostname, port });
  const subW = sub.writable.getWriter();
  const subR = sub.readable.getReader();
  const pubW = pub.writable.getWriter();

  try {
    await subW.write(
      new Uint8Array([...auth, ...respCmd("SUBSCRIBE", RESULTS)]),
    );
    await pubW.write(
      new Uint8Array([
        ...auth,
        ...respCmd("RPUSH", JOB_QUEUE, JSON.stringify({ jobId, ...payload })),
      ]),
    );

    let buf = new Uint8Array(0);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const remaining = deadline - Date.now();
      const read = await Promise.race([
        subR.read(),
        new Promise<{ timeout: true }>((r) => setTimeout(() => r({ timeout: true }), remaining)),
      ]);
      if ((read as any).timeout) break;
      const { value, done } = read as ReadableStreamReadResult<Uint8Array>;
      if (done) break;
      if (value) buf = concat(buf, value);

      let pos = 0;
      for (;;) {
        const r = parseReply(buf, pos);
        if (!r) break;
        const [val, nextPos] = r;
        pos = nextPos;
        if (Array.isArray(val) && val[0] === "message" && val[1] === RESULTS) {
          try {
            const data = JSON.parse(val[2]);
            if (data.jobId === jobId) return data;
          } catch {
            /* ignore */
          }
        }
      }
      if (pos > 0) buf = buf.slice(pos);
    }
    throw new Error("timeout");
  } finally {
    for (const w of [subW, pubW]) {
      try {
        await w.close();
      } catch {
        /* ignore */
      }
    }
    for (const s of [sub, pub]) {
      try {
        s.close();
      } catch {
        /* ignore */
      }
    }
  }
}

// ---------- Node/dev: redis package ----------

let pub: any = null;
async function getPub(): Promise<any> {
  if (pub?.isOpen) return pub;
  const { createClient } = await import("redis");
  pub = createClient({ url: process.env.REDIS_URL });
  pub.on("error", () => {});
  await pub.connect();
  return pub;
}

async function runJobNode(
  payload: Record<string, unknown>,
  timeoutMs: number,
): Promise<{ output?: unknown; error?: string }> {
  const jobId = randomUUID();
  const client = await getPub();
  const sub = client.duplicate();
  sub.on("error", () => {});
  await sub.connect();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = new Promise<{ output?: unknown; error?: string }>((resolve, reject) => {
      timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
      sub.subscribe(RESULTS, (message: string) => {
        try {
          const data = JSON.parse(message);
          if (data.jobId === jobId) resolve(data);
        } catch {
          /* ignore */
        }
      });
    });
    await client.rPush(JOB_QUEUE, JSON.stringify({ jobId, ...payload }));
    return await result;
  } finally {
    if (timer) clearTimeout(timer);
    try {
      await sub.quit();
    } catch {
      /* ignore */
    }
  }
}

// ---------- dispatch ----------

async function runJob(payload: Record<string, unknown>, timeoutMs: number) {
  if (!process.env.REDIS_URL) throw new Error("REDIS_URL not configured");
  // Prefer the sockets path on Workers; fall back to node redis in dev.
  try {
    await importSockets();
    return await runJobWorkers(payload, timeoutMs);
  } catch (e) {
    if (e instanceof Error && e.message === "timeout") throw e;
    return await runJobNode(payload, timeoutMs);
  }
}

export async function translate(
  input: string,
  models: string[],
  timeoutMs = 20000,
): Promise<string> {
  const data = await runJob({ input, models }, timeoutMs);
  if (data.error) throw new Error(data.error);
  return typeof data.output === "string" ? data.output : String(data.output ?? "");
}

export async function listModels(timeoutMs = 5000): Promise<string[]> {
  const data = await runJob({}, timeoutMs);
  return Array.isArray(data.output) ? (data.output as string[]) : [];
}

// Diagnostic: confirm the Worker can reach Redis (PING) and report job_queue
// length — distinguishes "Redis unreachable" from "worker offline".
export async function redisDiag(timeoutMs = 6000): Promise<any> {
  try {
    const { connect } = await importSockets();
    const { hostname, port, username, password } = redisParts();
    const socket = (connect as any)({ hostname, port });
    const writer = socket.writable.getWriter();
    const reader = socket.readable.getReader();
    try {
      const cmds = [
        ...(password ? respCmd("AUTH", username, password) : []),
        ...respCmd("PING"),
        ...respCmd("LLEN", JOB_QUEUE),
      ];
      await writer.write(new Uint8Array(cmds));
      const expected = password ? 3 : 2;
      const replies: any[] = [];
      let buf = new Uint8Array(0);
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline && replies.length < expected) {
        const remaining = deadline - Date.now();
        const read = await Promise.race([
          reader.read(),
          new Promise<{ timeout: true }>((r) => setTimeout(() => r({ timeout: true }), remaining)),
        ]);
        if ((read as any).timeout) break;
        const { value, done } = read as ReadableStreamReadResult<Uint8Array>;
        if (done) break;
        if (value) buf = concat(buf, value);
        let pos = 0;
        for (;;) {
          const r = parseReply(buf, pos);
          if (!r) break;
          replies.push(r[0]);
          pos = r[1];
        }
        if (pos > 0) buf = buf.slice(pos);
      }
      return { ok: true, replies };
    } finally {
      try {
        await writer.close();
      } catch {
        /* ignore */
      }
      try {
        socket.close();
      } catch {
        /* ignore */
      }
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
