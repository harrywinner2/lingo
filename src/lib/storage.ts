import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

// Pluggable storage. Dev: local filesystem under ./uploads, served via
// /api/media/<key>. Prod: implement an "r2" driver (S3-compatible) and switch
// STORAGE_DRIVER. Clients never see the driver — they get a stable URL.

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function putObject(
  key: string,
  data: Buffer,
): Promise<string> {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver === "local") {
    const full = path.join(UPLOAD_DIR, key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
    return `/api/media/${key}`;
  }
  throw new Error(`Storage driver "${driver}" not implemented yet`);
}

export async function getObject(key: string): Promise<Buffer> {
  const full = path.join(UPLOAD_DIR, key);
  // Guard against path traversal.
  if (!full.startsWith(UPLOAD_DIR)) throw new Error("Invalid key");
  return readFile(full);
}
