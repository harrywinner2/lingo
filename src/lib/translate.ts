import { randomUUID } from "node:crypto";

// Talks to the existing lingo.cm translation worker (Python `infer.py`) over the
// same Redis: push a job onto `job_queue`, await the matching result on the
// `results` pub/sub channel. `redis` is imported dynamically so Workers builds
// don't pull a TCP client unless the translator is actually configured/used.
// (On Cloudflare, point this at an HTTP-reachable Redis like Upstash to enable.)

const JOB_QUEUE = "job_queue";
const RESULTS = "results";

/* eslint-disable @typescript-eslint/no-explicit-any */
let pub: any = null;

async function getPub(): Promise<any> {
  if (pub?.isOpen) return pub;
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL not configured");
  const { createClient } = await import("redis");
  pub = createClient({ url });
  pub.on("error", () => {});
  await pub.connect();
  return pub;
}

async function runJob(
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
    const result = new Promise<{ output?: unknown; error?: string }>(
      (resolve, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
        sub.subscribe(RESULTS, (message: string) => {
          try {
            const data = JSON.parse(message);
            if (data.jobId === jobId) resolve(data);
          } catch {
            /* ignore malformed */
          }
        });
      },
    );
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
  const data = await runJob({}, timeoutMs); // no input => worker returns model list
  return Array.isArray(data.output) ? (data.output as string[]) : [];
}
