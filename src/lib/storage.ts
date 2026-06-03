import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { AwsClient } from "aws4fetch";

// Pluggable storage. Dev: local filesystem under ./uploads. Prod: Cloudflare R2
// (S3-compatible) — the primary audio store for raw + cleaned clips. Objects are
// always served back through /api/media/<key> so clients see a stable URL
// regardless of driver.

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

function driver() {
  return process.env.STORAGE_DRIVER ?? "local";
}

// ---- R2 (S3-compatible) ----
let r2: AwsClient | null = null;
function r2Client() {
  if (!r2)
    r2 = new AwsClient({
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      region: "auto",
      service: "s3",
    });
  return r2;
}
function r2Url(key: string) {
  const account = process.env.R2_ACCOUNT_ID;
  const bucket = process.env.R2_BUCKET;
  return `https://${account}.r2.cloudflarestorage.com/${bucket}/${encodeURI(key)}`;
}

// ---- public API ----

export async function putObject(
  key: string,
  data: Buffer,
  contentType = "application/octet-stream",
): Promise<string> {
  if (driver() === "r2") {
    const res = await r2Client().fetch(r2Url(key), {
      method: "PUT",
      body: new Uint8Array(data),
      headers: { "Content-Type": contentType },
    });
    if (!res.ok) throw new Error(`R2 put failed: ${res.status}`);
  } else {
    const full = path.join(UPLOAD_DIR, key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
  }
  return `/api/media/${key}`;
}

export async function getObject(key: string): Promise<Buffer> {
  if (driver() === "r2") {
    const res = await r2Client().fetch(r2Url(key));
    if (!res.ok) throw new Error(`R2 get failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  const full = path.join(UPLOAD_DIR, key);
  if (!full.startsWith(UPLOAD_DIR)) throw new Error("Invalid key");
  return readFile(full);
}

export async function deleteObject(key: string): Promise<void> {
  if (driver() === "r2") {
    await r2Client().fetch(r2Url(key), { method: "DELETE" });
    return;
  }
  const full = path.join(UPLOAD_DIR, key);
  if (!full.startsWith(UPLOAD_DIR)) throw new Error("Invalid key");
  await unlink(full).catch(() => {});
}
