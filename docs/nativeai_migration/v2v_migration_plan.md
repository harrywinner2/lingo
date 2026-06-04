# Lingo / NativeAI — v2 (Voice-to-Voice) Migration & Architecture Plan

*Status: proposed — for team review. Author: architecture pass, 2026-06-02.*

---

## 0. Why this document exists

v1 of Lingo (lingo.cm) proved we can fine-tune cheap MT models for low-resource
Cameroonian languages (MarianMT / OPUS, French↔10 languages + EN-FR) and serve
them cost-efficiently through a Redis job queue feeding GPU workers
(`runner.py` → `infer.py`).

v1's ceiling is structural: **its data pipeline is text-first, but the people who
still speak these dying languages are overwhelmingly oral-first and frequently
cannot write them.** We can only collect from the literate minority, which is
exactly the wrong tail of the population for language preservation.

v2 fixes this at the root: **collect voice, not text.** The product becomes a
collaborative *data-collection instrument* — a researcher creates a campaign,
invites participants by role, speakers record prompts in the target language,
verifiers rate whether a recording matches its prompt, contributors earn points
they redeem out-of-band (cash, food, …), and the resulting verified corpus feeds
a voice-model training pipeline. Text translation (v1) survives as one feature
inside the new platform, not the whole product.

**The north star:** get a rural elder on a cheap Android phone to speak one
sentence, get it verified and paid for, and land it in a clean training corpus —
at the lowest possible cost per verified utterance.

---

## 1. Decisions locked for this plan

| Area | Decision | Rationale |
|---|---|---|
| Client | **One web codebase shipped as a PWA, wrapped with Capacitor** for store binaries + native plugins where needed | Audience is Android-dominant (~80%+ in market); browser covers hold-to-record, offline queue (Background Sync on Android), push, install. Cheapest & fastest to iterate for a research budget. |
| Backend | **Lean managed services** (Supabase Postgres/Auth/Storage/Realtime + Cloudflare R2 for audio + managed Redis) | Minimal ops, pay-as-you-grow, reuses the proven Redis worker pattern. |
| ML / workers | Python worker fleet on Redis queue (extends existing `infer.py` pattern); burst GPU (Modal/RunPod/Colab) for training only | Keeps always-on cost low; GPU paid only when training. |
| AI authoring | Claude API for prompt generation (+ images + pivot-language TTS) | Rapidly generates culturally-adapted, short-sentence-eliciting prompts. |

### 1.1 The platform question, answered explicitly

A PWA delivers **every** feature in scope:

- **Hold-to-record + retries:** `getUserMedia` + `MediaRecorder` + pointer events.
- **ML-grade audio:** `AudioWorklet` / `OfflineAudioContext` capture & resample to
  16 kHz mono WAV/FLAC client-side; ship a small Opus copy for upload.
- **Offline (rural networks):** Service Worker + IndexedDB queue; **Background
  Sync** flushes on reconnect (Android Chrome).
- **Push:** Web Push on Android, and iOS 16.4+ for installed PWAs.
- **Install / store presence:** installable PWA + TWA/Capacitor shell.

The **only** genuine native edges for *this* app are (a) true background upload
on **iOS** while the app is closed (iOS has no Background Sync — uploads run
foregrounded only) and (b) marginal reliability on the very weakest devices.
Neither justifies separate Swift+Kotlin codebases. The Capacitor shell gives us a
native-recorder / secure-storage / background-upload escape hatch on the few
screens that benefit, with one codebase everywhere else. **Researcher console =
pure web/desktop** (no native need).

---

## 2. System architecture (lean target state)

```
                       ┌──────────────────────────────────────────────┐
   Contributors        │  apps/contributor  (React+Vite PWA, Capacitor)│
   (speak / verify) ──►│  hold-to-record · offline queue · IPA kbd     │
                       └───────────────┬──────────────────────────────┘
                                       │ HTTPS (resumable upload, REST/RPC)
   Researchers         ┌───────────────┴──────────────┐
   (campaigns) ───────►│  apps/console (web, desktop)  │
                       └───────────────┬──────────────┘
                                       │
                  ┌────────────────────┴─────────────────────┐
                  │              API / BaaS layer             │
                  │  Supabase: Postgres (RLS) · Auth (phone   │
                  │  OTP) · Storage · Realtime · Edge fns      │
                  └───────┬───────────────────────┬───────────┘
                          │ enqueue jobs           │ audio blobs
                          ▼                        ▼
                  ┌───────────────┐        ┌─────────────────┐
                  │ Redis (queue, │        │ Object storage  │
                  │ cache, fanout)│        │ Cloudflare R2   │
                  └───────┬───────┘        └────────┬────────┘
                          │ BLPOP (proven pattern)  │
                  ┌───────┴──────────────────────────────────┐
                  │      Python worker fleet (always-on +      │
                  │      burst GPU)                            │
                  │  • audio ingest: transcode/VAD/normalize/QC│
                  │  • ASR back-check (Whisper) · embeddings   │
                  │  • dup detection · consensus aggregation   │
                  │  • payout calc · dataset export            │
                  │  • t2t inference (v1 models) · v2 training  │
                  └────────────────────────────────────────────┘
```

Why this shape over the architecture PDF (Kafka/K8s/GPU-cluster): same logical
pipeline, but we **defer Kafka and K8s** until volume demands them. Redis lists
already do reliable fan-out at our scale and the team has run them in production.
We can swap Redis→Kafka behind the worker interface later without touching clients.

---

## 3. Tech stack

**Monorepo** (pnpm + Turborepo):

```
apps/
  contributor/   React + Vite + TS + Tailwind, PWA (vite-plugin-pwa/Workbox), Capacitor
  console/       React (or Next.js) web app for researchers (desktop-first)
  worker/        Python: audio pipeline, ML inference/training, aggregation jobs
packages/
  shared/        TS types generated from DB schema, i18n strings, IPA keyboard maps
  contracts/     API/RPC + queue job schemas (single source of truth, TS + Python codegen)
infra/           Supabase migrations (SQL), R2 buckets, env, CI
```

- **DB / Auth / Storage / Realtime:** Supabase (Postgres + Row-Level Security).
  **Phone-number + SMS/WhatsApp OTP** auth — critical for low-literacy, low-email
  users. `pgvector` for prompt/audio embedding dedup.
- **Audio blobs:** Cloudflare R2 (zero egress fees — decisive, since verifiers
  stream lots of clips). Supabase Storage acceptable for MVP.
- **Queue / cache / realtime fan-out:** Redis (keep Redis Cloud; reuse pattern).
- **Workers:** Python (ffmpeg, faster-whisper, speechbrain/wav2vec2, torch).
- **AI authoring:** Claude API (prompt batches + scene images + pivot TTS).
- **Edge/region:** host close to Cameroon (eu-west or af-south); Cloudflare in front.

---

## 4. Data model (core entities)

Postgres, with RLS enforcing roles. Append-only where money/trust is involved.

- **users** — `id, phone, display_name, locale, created_at` (global identity only;
  roles are per-campaign, not global).
- **languages** — `code, name, region, family, ipa_layout, notes`.
- **campaigns** — `id, owner_id, title, description, target_lang, pivot_lang,
  status[draft|active|paused|closed], budget_points, spent_points, reward_rules
  jsonb, quality_policy jsonb (N verifiers, consensus rule, gold ratio),
  visibility, starts_at, ends_at`.
- **memberships** — `campaign_id, user_id, role[speaker|verifier|reviewer|manager],
  status[invited|active|suspended], invited_by`. (A user can hold several roles in
  one campaign and different roles across campaigns.)
- **prompts** — `id, campaign_id, pivot_text, pivot_lang, target_lang, domain,
  scene_description, image_ref?, pivot_tts_ref?, expected_len, difficulty,
  source[ai|manual|import], status[draft|approved|live|retired],
  target_n_recordings, embedding vector`.
- **recordings** — `id, prompt_id, campaign_id, speaker_id, raw_ref, canonical_ref,
  proxy_ref, duration, format, device_meta jsonb, consent_ref, dialect_tag,
  quality_metrics jsonb, asr_text?, embedding vector,
  status[uploaded|processing|ready|accepted|rejected|duplicate], created_at`.
- **verifications** — `id, recording_id, verifier_id, verdict[correct|average|
  incorrect], confidence?, comment?, is_gold bool, created_at` (many per recording;
  a verifier may not verify their own recording).
- **assignments** — `id, user_id, task_type[record|verify], ref_id, status,
  expires_at` (hands out work, prevents collisions/dupes; backed by per-user Redis
  task queues for O(1) fetch).
- **recording_consensus** — materialized: `recording_id, n_ratings, score,
  accepted, agreement, decided_at`.
- **point_ledger** — append-only: `id, user_id, campaign_id, amount, reason
  [contribution|verification|quality_bonus|gold_bonus|redemption|adjustment],
  ref_id, balance_after, created_at`.
- **redemptions** — `id, user_id, campaign_id, points, method, status[requested|
  approved|paid|rejected], handled_by, notes` (fulfilled out-of-band, tracked here).
- **verifier_reliability** — `user_id, campaign_id, gold_accuracy,
  consensus_agreement, weight, updated_at`.
- **datasets** — versioned, immutable export snapshots for training.
- **audit_log / consent_records** — governance & ethics trail.

---

## 5. The audio pipeline (the heart of v2)

### 5.1 Client capture (UX-critical)
- **Warm the mic** on the first user gesture to kill first-record latency.
- **Hold-to-record** (`pointerdown`→start, `pointerup`→stop) with a live waveform +
  input-level meter; min/max duration guards; real-time **silence/clipping warnings**.
- **Multiple retakes**, side-by-side playback, pick-best-take before submit.
- Capture raw PCM via `AudioWorklet` → normalize → encode **Opus** (small upload)
  while retaining a 16 kHz mono WAV/FLAC where lossless is wanted.
- **Resumable, chunked upload** (tus or multipart + retry) → **IndexedDB offline
  queue** → Service Worker **Background Sync** flush on reconnect (Android).
- Record **device metadata + explicit consent** with each submission.
- **Inclusivity:** the prompt is shown as *pivot text + scene image + pivot-language
  TTS audio*, so a speaker who can't read the pivot language can still understand
  what to say. This is a first-class requirement, not a nice-to-have.

### 5.2 Server / worker ingestion (Redis job → Python worker)
1. Store **raw blob immutably** in R2.
2. Validate → transcode to canonical **16 kHz mono FLAC**; **VAD-trim** silence;
   **loudness-normalize** (EBU R128); generate a low-bitrate **Opus proxy** for
   verifier playback.
3. Compute **quality metrics** (SNR, clipping %, speech ratio, duration);
   auto-reject obviously bad clips (silent / too short / clipped).
4. Optional **ASR back-check** (Whisper) for spoken-language ID and a cheap
   automatic pre-filter that flags likely mismatches before humans rate.
5. Compute **audio embedding** → near-duplicate / resubmission detection
   (anti-gaming) + speaker clustering.
6. Mark `ready` → enqueue for verification assignment.

### 5.3 Verification & consensus
- Each `ready` recording is assigned to **N verifiers** (from `quality_policy`),
  speaker identity hidden, never the speaker themselves.
- Aggregate verdicts → consensus weighted by **verifier reliability**; mark
  `accepted`/`rejected`. Accepted recordings enter the corpus.

---

## 6. Points economy & anti-gaming

- **Quality-weighted speaker reward:** `base + quality_bonus` tied to consensus
  (correct > average > incorrect→0/penalty). Points only finalize after consensus.
- **Verifier pay + reliability:** seed **gold/honeypot tasks** with known answers;
  track gold accuracy + agreement with consensus → a per-campaign **weight** that
  both scales their vote and their bonus. Lazy/colluding raters surface fast.
- **Append-only ledger:** every point movement is a `point_ledger` row with
  `balance_after`; balances are derived, never mutated in place.
- **Budget guardrails:** campaign `budget_points` caps spend; `spent_points`
  updated transactionally; campaign auto-pauses at budget exhaustion.
- **Redemptions:** requested in-app, approved by researcher, **fulfilled
  out-of-band** (cash/food), status tracked end-to-end.
- **Defenses:** dup-detection embeddings, rate limits, device/consent checks,
  manual review gate on redemptions, audit log.

---

## 7. AI-assisted campaign authoring

1. Researcher states intent in natural language ("everyday greetings & market
   scenes for Bafia, 8–12 word sentences, north-region cultural context").
2. **Claude** returns a structured batch: `{pivot_text, domain, scene_description,
   expected_len, difficulty}` per prompt, plus an optional **generated scene image**
   and **pivot-language TTS** clip so non-readers can use it.
3. **Dedup** new prompts against existing ones via `pgvector` embeddings.
4. Researcher **reviews / edits / approves** before prompts go `live`.

This is what lets a researcher stand up a rich, culturally-adapted campaign in
minutes instead of hand-writing prompts.

---

## 8. Training pipeline (future, but designed-for now)

The corpus is pivot-text ↔ target-audio pairs with rich metadata. Realistically
it first unlocks **target-language ASR** and **TTS** components, and **pivot↔target
speech translation** via cascade (ASR→MT→TTS), with direct speech-to-speech later.

- **Dataset versioning:** immutable export snapshots in R2 + a `datasets` table
  (DVC optional). Reproducible, licensable, withdrawable.
- **Training:** burst GPU (Modal/RunPod/Colab); experiment tracking (W&B or simple).
- **Eval:** WER/CER (ASR), MOS + human review (TTS), BLEU/chrF (MT); human-in-the-
  loop sign-off before promotion.
- **Serving:** quantized models served through the **same Redis worker pattern**
  (`infer.py` generalized from t2t to ASR/TTS/MT/S2S handlers).
- **Active learning:** the model prioritizes which prompts/domains to collect next
  (low-confidence, under-covered), closing the loop the architecture PDF describes.

---

## 9. Performance posture

- Audio served from **R2 + CDN** with range requests; verifiers stream the small
  **Opus proxy**, not the lossless master.
- **Per-user task queues precomputed in Redis** → O(1) task fetch, no contention.
- **Realtime** dashboards via Supabase/Redis fan-out.
- Region close to users; Cloudflare edge in front; small Opus uploads to survive
  2G/3G.

---

## 10. Roadmap (phased)

**Phase 0 — Foundations (wk 1–2):** monorepo, Supabase project, schema + RLS,
phone-OTP auth, R2 buckets, CI, contracts package.

**Phase 1 — Contributor MVP (wk 2–5):** campaign membership; **record task**
(hold-to-record PWA); ingest worker (transcode/normalize/QC); **verify task**;
point ledger; basic console (create campaign, manual prompts, invite, view
submissions). Reuse Redis worker.

**Phase 2 — Quality & economy (wk 5–8):** consensus aggregation; verifier
reliability + gold tasks; quality-weighted payouts; redemptions workflow; dup
detection; offline queue + Background Sync; push; **Capacitor store builds**.

**Phase 3 — AI authoring & scale (wk 8–11):** Claude prompt generation + scene
images + pivot TTS; dedup; WhatsApp ingestion; analytics dashboards; perf hardening.

**Phase 4 — Training loop (wk 11+):** dataset versioning/export; ASR/TTS/MT training
on burst GPU; eval + HITL; serve via worker fleet; active-learning prioritization.

**Throughout:** keep v1 t2t alive — fold the existing models/Redis worker into the
fleet; lingo.cm text translation becomes one feature of the new app/console.

---

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Gaming points (junk audio, collusion, resubmits) | gold tasks, dup-detection embeddings, reliability weighting, rate limits, manual redemption review |
| Poor rural connectivity | offline-first IndexedDB queue, small Opus uploads, resumable transfers, Background Sync (Android) |
| iOS background-upload gap | documented; foreground flush acceptable; Capacitor native plugin fallback |
| Ethics: research on vulnerable communities | explicit consent + licensing, right to withdraw, community-benefit framing, data-governance/IRB-style review, audit trail |
| Cost creep | managed lean stack, R2 zero-egress, GPU only on burst, defer Kafka/K8s |
| Non-readers of the *pivot* language | prompt = text + image + pivot TTS (designed in from day one) |

---

## 12. Open questions for the team

1. **Pivot language(s):** English, French, or per-campaign choice? (Affects TTS +
   prompt-gen defaults.)
2. **First target language & pilot community** for Phase 1 dogfooding.
3. **Redemption fulfillment**: who approves and how is payout reconciled out-of-band?
4. **Data licensing**: open corpus vs restricted; consent wording.
5. **SMS/WhatsApp OTP provider** for phone auth in Cameroon (deliverability/cost).
```
