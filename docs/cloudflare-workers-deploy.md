# Cloudflare Workers deploy — status & steps

Target stack (your choice): **Workers (OpenNext) + R2 + D1**.

## What's done and validated locally
- `@opennextjs/cloudflare` + `wrangler` configured (`open-next.config.ts`,
  `wrangler.jsonc` with `nodejs_compat`, D1 `DB` binding, R2 `BUCKET` binding,
  assets).
- `npm run cf:build` produces `.open-next/worker.js` ✅ (all 27 routes bundle).
- `npm run cf:preview` boots the Worker on Miniflare with **local D1 + R2** ✅.
- Storage uses the native **R2 binding** on Workers, local FS in dev (`src/lib/storage.ts`).
- D1 schema migration generated: `prisma/d1-migrations/0001_init.sql`, applied to
  local D1 ✅ (D1 is SQLite, so our schema ports directly).
- Static/auth/translator routes serve correctly on the Worker runtime ✅.

## The one blocker: Prisma's engine doesn't run on workerd
DB **queries** 500 on the real Workers runtime with
`[unenv] fs.readdir is not implemented`. Prisma's query engine touches the
filesystem at runtime, which exists in Node (so `next dev` / `next start` work)
but not in workerd. This is a known, currently-unfixed issue with
Prisma + `@prisma/adapter-d1` under OpenNext
(opennextjs-cloudflare#734). No DB choice fixes it — it's Prisma's engine, not D1.

### Options to unblock (pick one)
1. **Prisma Postgres / Accelerate** (keep 100% of the code): point `DATABASE_URL`
   at a `prisma://` Accelerate URL backed by a free Postgres. Accelerate runs the
   engine in Prisma's cloud, so the Worker only does HTTP — no engine, no `fs`.
   Fastest; deviates from D1.
2. **Drizzle ORM + D1** (your exact stack): Drizzle is pure JS, no engine — runs
   natively on Workers/D1. Requires rewriting the data layer (all queries +
   the Auth.js adapter). Larger change, but the clean Workers+D1 path.
3. **Keep Prisma + D1 on a Node host** behind Cloudflare (Tunnel/proxy): zero
   rewrite, but not Workers.

## Deploy steps (once the DB path above is chosen)
```bash
# 1. Auth (needs your Cloudflare account)
npx wrangler login            # or set CLOUDFLARE_API_TOKEN

# 2. Create resources
npx wrangler d1 create lingo-db          # paste database_id into wrangler.jsonc
npx wrangler r2 bucket create lingo-audio

# 3. Apply DB schema to remote D1 (Drizzle/D1 path)
npx wrangler d1 migrations apply lingo-db --remote

# 4. Secrets
npx wrangler secret put AUTH_SECRET
npx wrangler secret put AUTH_GOOGLE_ID
npx wrangler secret put AUTH_GOOGLE_SECRET
npx wrangler secret put RESEND_API_KEY
# EMAIL_FROM, APP_URL, NEXT_PUBLIC_GOOGLE_ENABLED -> [vars] in wrangler.jsonc
# (Twilio + REDIS_URL when ready)

# 5. Build & deploy
npm run cf:deploy
```

Google OAuth: add the prod redirect URI
`https://<your-worker-domain>/api/auth/callback/google`.
