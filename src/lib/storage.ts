import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";

// Storage abstraction. On Cloudflare Workers we use the native R2 binding (env
// BUCKET) — no credentials. In Node/dev we fall back to the local filesystem.
// Objects are always served via /api/media/<key> so clients get a stable URL.

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

type R2Like = {
  put: (key: string, value: ArrayBuffer | Uint8Array, opts?: unknown) => Promise<unknown>;
  get: (key: string) => Promise<{ arrayBuffer: () => Promise<ArrayBuffer> } | null>;
  delete: (key: string) => Promise<void>;
};

async function bucket(): Promise<R2Like | undefined> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = getCloudflareContext();
    return (env as Record<string, unknown>).BUCKET as R2Like | undefined;
  } catch {
    return undefined;
  }
}

export async function putObject(
  key: string,
  data: Buffer,
  contentType = "application/octet-stream",
): Promise<string> {
  const b = await bucket();
  if (b) {
    await b.put(key, new Uint8Array(data), {
      httpMetadata: { contentType },
    });
  } else {
    const full = path.join(UPLOAD_DIR, key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
  }
  return `/api/media/${key}`;
}

export async function getObject(key: string): Promise<Buffer> {
  const b = await bucket();
  if (b) {
    const obj = await b.get(key);
    if (!obj) throw new Error("Not found");
    return Buffer.from(await obj.arrayBuffer());
  }
  const full = path.join(UPLOAD_DIR, key);
  if (!full.startsWith(UPLOAD_DIR)) throw new Error("Invalid key");
  return readFile(full);
}

export async function deleteObject(key: string): Promise<void> {
  const b = await bucket();
  if (b) {
    await b.delete(key);
    return;
  }
  const full = path.join(UPLOAD_DIR, key);
  if (!full.startsWith(UPLOAD_DIR)) throw new Error("Invalid key");
  await unlink(full).catch(() => {});
}
