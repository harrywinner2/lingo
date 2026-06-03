import { createClient, type RedisClientType } from "redis";

// Lightweight producer for background jobs (audio preprocessing). The consumer
// is the Python worker in /worker. Reuses the same Redis as the t2t worker but a
// different key, so the model server and the preprocessing fleet stay decoupled.

const PREPROCESS_QUEUE = "preprocess_queue";

let client: RedisClientType | null = null;
async function getClient(): Promise<RedisClientType> {
  if (client?.isOpen) return client;
  client = createClient({ url: process.env.REDIS_URL }) as RedisClientType;
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
