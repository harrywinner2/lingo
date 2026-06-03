# Deploying Lingo on / behind Cloudflare

Short answer: **yes**, and your domain already being on Cloudflare makes it easy.
There are two viable shapes. The deciding factor is the **legacy t2t translator**,
which talks to a Redis the Python worker (`infer.py`) listens on — and raw Redis
(TCP + pub/sub) does **not** run cleanly inside Cloudflare Workers.

## Recommended: Node host behind Cloudflare (least friction, keeps everything)

Run the Next.js app on a small Node host and point Cloudflare at it. You keep
Cloudflare's DNS, CDN, caching, WAF, and R2 — and nothing about the app has to
change (Redis, Prisma, Auth.js, server actions all "just work").

- **App runtime:** Fly.io / Render / Railway (free–cheap tiers), or a VPS.
- **DNS + CDN + WAF:** Cloudflare (proxy the host through an orange-cloud record).
- **Audio storage:** **Cloudflare R2** (zero egress) — implement the `r2` branch
  in `src/lib/storage.ts` (S3-compatible; `@aws-sdk/client-s3` or `aws4fetch`).
- **Database:** managed Postgres (Neon free tier) — switch `prisma/schema.prisma`
  datasource to `postgresql`, `prisma migrate deploy`.
- **t2t translator:** unchanged — the Node app reaches the existing Redis directly.
- **Env:** `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, Google keys, `REDIS_URL`,
  `DATABASE_URL`, `STORAGE_DRIVER=r2` + `R2_*`.

This is the fastest path to a live lingo.cm replacement with full functionality.

## Alternative: fully on Cloudflare Workers (OpenNext)

Run the app itself on Workers via the OpenNext adapter. More "Cloudflare-native"
and scales to zero, but the Redis translator needs reworking.

- **Adapter:** `@opennextjs/cloudflare` (supports App Router, RSC, server actions).
- **Database:** **Cloudflare D1** (SQLite — our schema is already SQLite-shaped)
  via Prisma's D1 driver adapter, **or** Postgres/Neon through **Hyperdrive**.
- **Audio:** R2 (native binding).
- **Auth.js:** works on Workers (`AUTH_SECRET`, `AUTH_TRUST_HOST`).
- **t2t translator — the catch.** Workers can't hold a Redis pub/sub TCP
  connection. Pick one:
  1. **Translate-proxy** — a tiny always-on Node service that bridges
     HTTP ↔ Redis; the Worker calls it over `fetch`. Existing `infer.py`
     untouched. *(simplest)*
  2. **Upstash-style REST + polling** — have `infer.py` also `RPUSH` each result
     to a per-job key; the Worker polls it over REST instead of subscribing.
     Needs a small worker change.

## What to do regardless of shape

1. Implement the **R2 storage driver** in `src/lib/storage.ts`.
2. Move DB from dev SQLite to **Postgres (Neon)** or **D1**.
3. Set production env (`AUTH_SECRET`, `AUTH_TRUST_HOST=true`, Google redirect URI
   for the prod domain, `REDIS_URL`).
4. Point the Cloudflare domain at the deployment; add the prod Google redirect
   URI `https://lingo.cm/api/auth/callback/google`.

**Recommendation:** ship first on a **Node host behind Cloudflare + R2 + Neon**
(everything works today), then migrate to Workers/D1 later if you want
scale-to-zero — at which point we add the translate-proxy.
