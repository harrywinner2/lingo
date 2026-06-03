import { PrismaClient } from "@/generated/prisma";

// Dual-runtime Prisma:
//  - On Cloudflare Workers: bind to D1 via the request context (lazy, cached).
//  - In Node/dev: the classic file-backed SQLite client (DATABASE_URL).
// We expose a Proxy typed as PrismaClient so existing call sites
// (`prisma.user.findMany()`, `prisma.$transaction(...)`) work unchanged — each
// call resolves the underlying client first.

const globalForPrisma = globalThis as unknown as {
  __prismaClient?: PrismaClient;
  __prismaPromise?: Promise<PrismaClient>;
};

async function resolveClient(): Promise<PrismaClient> {
  if (globalForPrisma.__prismaClient) return globalForPrisma.__prismaClient;

  // Detect the Workers runtime by probing for the D1 binding. Keep detection
  // separate from client creation so a D1 error never falls back to the Node
  // adapter (which can't run on Workers).
  let d1: unknown;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = getCloudflareContext();
    d1 = (env as Record<string, unknown>).DB;
  } catch {
    d1 = undefined;
  }

  if (d1) {
    const { PrismaD1 } = await import("@prisma/adapter-d1");
    globalForPrisma.__prismaClient = new PrismaClient({
      adapter: new PrismaD1(d1 as never),
    });
    return globalForPrisma.__prismaClient;
  }

  // Node/dev: queryCompiler needs an adapter, so use better-sqlite3 on the local
  // file (resolved relative to prisma/, matching the Prisma CLI).
  const { PrismaBetterSQLite3 } = await import("@prisma/adapter-better-sqlite3");
  const path = await import("node:path");
  const raw = process.env.DATABASE_URL ?? "file:./dev.db";
  const file = raw.replace(/^file:/, "");
  const url =
    "file:" +
    (path.isAbsolute(file) ? file : path.join(process.cwd(), "prisma", file));
  globalForPrisma.__prismaClient = new PrismaClient({
    adapter: new PrismaBetterSQLite3({ url }),
  });
  return globalForPrisma.__prismaClient;
}

function getClient(): Promise<PrismaClient> {
  if (globalForPrisma.__prismaClient)
    return Promise.resolve(globalForPrisma.__prismaClient);
  if (!globalForPrisma.__prismaPromise)
    globalForPrisma.__prismaPromise = resolveClient();
  return globalForPrisma.__prismaPromise;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string) {
    if (prop === "$transaction") {
      return (...args: unknown[]) =>
        getClient().then((c) =>
          (c.$transaction as (...a: unknown[]) => unknown)(...args),
        );
    }
    // model delegate (user, campaign, …) or other client method
    return new Proxy(
      {},
      {
        get(__t, method: string) {
          return (...args: unknown[]) =>
            getClient().then((c) => {
              const target = (c as unknown as Record<string, Record<string, (...a: unknown[]) => unknown>>)[prop];
              return target[method](...args);
            });
        },
      },
    );
  },
}) as PrismaClient;
