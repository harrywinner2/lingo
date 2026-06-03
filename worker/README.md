# Lingo preprocessing worker

Turns raw uploaded clips into clean, training-ready audio. It is **separate from
the t2t model worker** (`infer.py`) — the home desktop only serves translation
models; this runs in the cloud next to R2.

## Flow

```
app /api/recordings ──(rawKey)──> Redis preprocess_queue ──> this worker
   raw clip in R2  ─download→ ffmpeg (16kHz mono, trim silence, loudnorm)
                              ├─ quality gate (reject silent/too short/long)
                              ├─ upload clean FLAC to R2 (clean/…)
                              └─ POST /api/internal/recordings/processed
                                    → app: status "ready", metrics, purge raw
```

The metadata/CSV stays in the app DB forever; raw audio is purged once a clean
copy exists; clean clips stay in R2 for voting/training. (OneDrive delivery to
the researcher is layered on top of this and configured separately.)

## Run

Requires `ffmpeg` + `ffprobe` on PATH.

```bash
cd worker
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in REDIS_URL, R2_*, INTERNAL_API_*
set -a; source .env; set +a
python preprocess.py
```

On the app side, enable the pipeline with:

```
PREPROCESS_ENABLED="true"
INTERNAL_API_SECRET="<same value as the worker>"
STORAGE_DRIVER="r2"   # + R2_* vars
```

When `PREPROCESS_ENABLED` is off (the default), uploads are marked ready
immediately and stored via the local driver — handy for dev.

Scale by running multiple copies; Redis hands each job to one worker.
```
