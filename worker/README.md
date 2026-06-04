# Lingo translation worker (v2)

The model-serving side of [Lingo / NativeAI](https://lingo.cm) — the French-pivot
machine translation for ~60 Cameroonian languages. This is the `worker/` subtree of
the monorepo; the web app is the rest of the repo. The worker runs as a standalone
Python service (laptop + Oracle) and talks to the site over Redis.

## What's here

| File | Purpose |
|---|---|
| `infer.py` | The worker. Pulls jobs from Redis, serves **int8 CTranslate2** models, heartbeats liveness/device to Redis for the website's status + GPU-takeover routing. |
| `convert_int8.py` | Convert the fp32 MarianMT models → int8 CTranslate2 (`models_int8/`). |
| `hf_upload_int8.py` | Upload int8 models to Hugging Face. |
| `lctl` | Control + visibility CLI for the worker (`lctl on/off/restart/status/watch/logs`). |
| `runner.py` | Legacy loop wrapper. |
| `preprocess.py` | Audio preprocessing pipeline (ffmpeg 16k-mono/trim/loudnorm → R2). |
| `tokenizers/` | The two shared Marian tokenizers (fr-en, en-fr). |

Model weights are **not** in git (tens of GB) — they live on local storage and on
Hugging Face (`flagship-ai/cameroon-int8` for the int8 serving bundle; the original
fp32 demo models remain under `flagship-ai/<pair>`).

## Running

The worker runs as a systemd service (`lingo-worker`). Configuration is via environment
(never hardcode secrets):

- `REDIS_URL` — Redis connection (job queue + pub/sub + heartbeats). **Required.**
- `MODELS_DIR` — int8 model store (default `./models_int8`).
- `TOKENIZERS_DIR` — default `./tokenizers`.
- `LINGO_DEVICE` — `gpu` to mark this host the priority node, else auto.
- `OMP_NUM_THREADS` — CT2 intra-op threads (match cores).

```bash
REDIS_URL=redis://… MODELS_DIR=./models_int8 python3 infer.py
```

## Architecture

A small fleet of workers pulls from one Redis job queue. A CPU node stands down while
a GPU/priority node is alive (heartbeat keys `lingo:gpu_online` / `lingo:cpu_online`),
so a fast machine transparently takes over. The website reads those keys to show its
online/server-type indicator and a slow-response banner on CPU. See the
[research log](https://lingo.cm/blog) for the int8 migration write-up.
