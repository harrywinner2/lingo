# Lingo — voices that keep a language alive

A collaborative platform for collecting, verifying and rewarding **spoken**
contributions in low-resource languages — and turning them into open voice
corpora that train preservation models. This is the **v2 (voice-to-voice)**
migration of [lingo.cm](https://lingo.cm), whose v1 was text-to-text translation
for ~10 Cameroonian languages.

> Most people who still speak these languages can't write them. So Lingo is
> voice-first: a speaker sees a prompt in a language they read, holds a button,
> and says it in their mother tongue. The community verifies it. Everyone earns.

## What's here

A single Next.js app that serves both audiences and installs as a PWA (wrap with
Capacitor for store binaries):

- **Landing + auth** — Google OAuth (Auth.js) plus a dev login for testing every
  role solo.
- **Researcher console** — create campaigns, **import prompts from CSV** (with
  live preview & auto column-mapping), invite people by role via share links,
  track progress & budget, **export the accepted dataset** as a JSON manifest.
- **Contributor app** — **hold-to-record** with retakes & playback, offline-aware
  shell, **verify** flow (correct / so-so / wrong), and a **wallet** with a
  points ledger and redemption requests.
- **Points economy** — quality-weighted rewards: a recording is decided by
  consensus once enough verifications arrive; the speaker is paid in proportion
  to the score. Append-only ledger; campaign budget guardrails.

## Tech

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Auth.js v5 ·
Prisma 6 · Zod · PapaParse. Dev DB is SQLite (zero-config); prod target is
Postgres (Supabase/Neon) + Cloudflare R2 for audio.

## Quickstart

```bash
npm install
npx prisma migrate dev      # create the SQLite dev database
npm run db:seed             # demo campaign + prompts + users
npm run dev                 # http://localhost:3000
```

Open the app and use **dev login** with any of:

- `researcher@lingo.dev` — owns the demo campaign (console)
- `speaker@lingo.dev` — records phrases
- `verifier@lingo.dev` — verifies recordings

(Or sign in with the same email in two browsers to play both sides.)

## Configuration

Copy `.env.example` → `.env`. Key vars:

| Var | Purpose |
|---|---|
| `DATABASE_URL` | SQLite file in dev; a Postgres URL in prod (also switch the `datasource` provider in `prisma/schema.prisma`). |
| `AUTH_SECRET` | Required. `npx auth secret` to generate. |
| `AUTH_DEV_LOGIN` | `true` enables passwordless dev login. Set `false` + `NEXT_PUBLIC_AUTH_DEV_LOGIN=false` in prod. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth. Redirect URI: `{APP_URL}/api/auth/callback/google`. |
| `STORAGE_DRIVER` | `local` (dev, writes to `./uploads`) or `r2` (implement in `src/lib/storage.ts`). |

## Project layout

```
src/
  app/
    page.tsx                 landing
    signin/                  auth
    join/[code]/             accept an invite
    app/                     authed shell (sidebar + bottom nav)
      campaigns/             researcher console (+ CSV import, members)
      contribute/            record & verify flows
      wallet/                points ledger & redemptions
    api/
      auth/                  Auth.js
      recordings/            audio upload
      media/                 serve stored audio
      tasks/{record,verify}/ next-task assignment
      campaigns/[id]/export/ dataset manifest
  lib/                       prisma, auth, points, storage, actions, languages
  components/                ui primitives + feature components
prisma/                      schema, migrations, seed
```

## Going to production (lean managed)

1. Switch `prisma/schema.prisma` datasource to `postgresql`, point `DATABASE_URL`
   at Supabase/Neon, run `prisma migrate deploy`.
2. Implement the `r2` branch in `src/lib/storage.ts` (S3-compatible) and set the
   `R2_*` vars.
3. Configure Google OAuth; set `AUTH_SECRET` and `AUTH_TRUST_HOST=true` (Vercel
   sets it automatically); disable dev login.
4. (Next) attach the Python worker fleet for audio post-processing, ASR
   back-check, dedup, and model training.
