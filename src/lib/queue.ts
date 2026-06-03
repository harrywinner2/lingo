// Lightweight producer for background jobs (audio preprocessing). The consumer
// is the Python worker in /worker. `redis` is imported dynamically so it isn't
// bundled unless preprocessing is actually enabled.

const PREPROCESS_QUEUE = "preprocess_queue";

/* eslint-disable @typescript-eslint/no-explicit-any */
let client: any = null;

async function getClient(): Promise<any> {
  if (client?.isOpen) return client;
  const { createClient } = await import("redis");
  client = createClient({ url: process.env.REDIS_URL });
  client.on("error", () => {});
  await client.connect();
  return client;
}

export function preprocessingEnabled() {
  return process.env.PREPROCESS_ENABLED === "true" && !!process.env.REDIS_URL;
}

export async function enqueuePreprocess(job: {
  recordingId: string;
  rawKey: string;
  mimeType: string;
}) {
  const c = await getClient();
  await c.rPush(PREPROCESS_QUEUE, JSON.stringify(job));
}
