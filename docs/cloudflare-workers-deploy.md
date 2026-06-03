# Deploying Lingo to Cloudflare Workers (OpenNext + D1 + R2)

The app runs fully on **Cloudflare Workers** with **D1** (database, via Drizzle —
no engine, runs natively on workerd) and **R2** (audio, via the native binding).
Validated end-to-end on the local Workers runtime (Miniflare): D1 reads+writes,
R2 upload+serve, auth, record/verify, all green.

## Local dev
```bash
npm install
npm run db:push        # create/sync dev.db (local SQLite via Drizzle)
npm run db:seed        # demo campaign + users
npm run dev            # http://localhost:3000  (uses dev.db)
```

## Local Workers preview (Miniflare, local D1 + R2)
```bash
npm run cf:build
npm run d1:local       # apply drizzle/ migrations to the local D1
npm run cf:preview     # http://localhost:8787
```

## Production deploy (needs your Cloudflare account)
```bash
# 1. Auth
npx wrangler login                 # or export CLOUDFLARE_API_TOKEN=...

# 2. Create resources
npx wrangler d1 create lingo-db    # paste the database_id into wrangler.jsonc
npx wrangler r2 bucket create lingo-audio

# 3. Apply DB schema to the remote D1
npm run d1:remote                  # wrangler d1 migrations apply lingo-db --remote

# 4. Secrets (vars that aren't sensitive can go in wrangler.jsonc [vars])
npx wrangler secret put AUTH_SECRET
npx wrangler secret put AUTH_GOOGLE_ID
npx wrangler secret put AUTH_GOOGLE_SECRET
npx wrangler secret put RESEND_API_KEY
#   EMAIL_FROM, APP_URL, AUTH_DEV_LOGIN=false, NEXT_PUBLIC_GOOGLE_ENABLED=true
#   (Twilio + REDIS_URL when ready)

# 5. Deploy
npm run cf:deploy
```

After first deploy:
- Add the prod Google redirect URI `https://<domain>/api/auth/callback/google`.
- Point the `lingo.cm` domain at the Worker (Workers route / custom domain).
- Seed prod data through the app (create a campaign), or run a one-off
  `wrangler d1 execute lingo-db --remote --file=...` with seed SQL.

## Schema changes
```bash
# edit src/db/schema.ts, then:
npm run db:generate    # new SQL migration in drizzle/
npm run db:push        # update local dev.db
npm run d1:local       # update local D1 (preview)
npm run d1:remote      # update prod D1 (deploy)
```

## Notes
- **Storage**: R2 via the `BUCKET` binding on Workers; local filesystem in dev.
- **Translator (t2t)**: uses a TCP Redis client which doesn't run on Workers — it
  degrades to "offline" there. To enable on Workers, point it at an
  HTTP-reachable Redis (e.g. Upstash) — only `src/lib/translate.ts` changes.
