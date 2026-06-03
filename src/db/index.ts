import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

// Both drivers expose the same query API; we type everything as the
// better-sqlite3 client for inference (D1 result is cast to it).
export type DB = BetterSQLite3Database<typeof schema>;

const g = globalThis as unknown as { __db?: DB; __dbPromise?: Promise<DB> };

async function resolve(): Promise<DB> {
  if (g.__db) return g.__db;

  // Cloudflare Workers: D1 binding.
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = getCloudflareContext();
    const d1 = (env as Record<string, unknown>).DB;
    if (d1) {
      const { drizzle } = await import("drizzle-orm/d1");
      g.__db = drizzle(d1 as never, { schema }) as unknown as DB;
      return g.__db;
    }
  } catch {
    // not on Workers
  }

  // Node/dev: better-sqlite3 on the local file.
  const { drizzle } = await import("drizzle-orm/better-sqlite3");
  const Database = (await import("better-sqlite3")).default;
  const path = await import("node:path");
  const raw = process.env.DATABASE_URL ?? "file:./dev.db";
  const file = raw.replace(/^file:/, "");
  const abs = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  g.__db = drizzle(new Database(abs), { schema });
  return g.__db;
}

export function getDb(): Promise<DB> {
  if (g.__db) return Promise.resolve(g.__db);
  if (!g.__dbPromise) g.__dbPromise = resolve();
  return g.__dbPromise;
}

export { schema };
export * from "./schema";
