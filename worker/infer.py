#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Compressed-serving worker: runs the French-pivot MarianMT models as int8
# CTranslate2 models (≈3.8x smaller, ≈6x faster on CPU than the fp32 originals).
# The fp32 safetensors stay archived; this serves the int8 conversions only.
# CTranslate2 takes thread counts explicitly, which also sidesteps Crostini's
# unparsable /proc that used to hang torch's threadpool.

from transformers import MarianTokenizer
import ctranslate2
import redis
import json
import time
import os
from concurrent.futures import ThreadPoolExecutor
import threading
import multiprocessing
import signal
import sys
import socket

# ---------- Config ----------
ROOT_PATH = os.path.dirname(os.path.abspath(__file__))   # resolves to the dir infer.py lives in

# Prefer REDIS_URL from the environment (so secrets aren't committed / can be
# rotated and the same code runs on any host, e.g. the Oracle worker). Falls
# back to the legacy literals if unset.
REDIS_URL = os.environ.get('REDIS_URL', '')
# Connection comes from REDIS_URL (set in the systemd unit / environment).
# Never hardcode secrets here — the legacy host/port/password also read from env.
REDIS_HOST = os.environ.get('REDIS_HOST', '')
REDIS_PORT = int(os.environ.get('REDIS_PORT', '0') or '0')
REDIS_PASSWORD = os.environ.get('REDIS_PASSWORD', '')
JOB_QUEUE_KEY = 'job_queue'
RESULTS_CHANNEL = 'results'

# int8 CTranslate2 model store + the two shared tokenizers. Override the store
# with MODELS_DIR (Oracle uses a plain dir; the laptop symlinks to the SD card).
MODELS_DIR = os.environ.get('MODELS_DIR', os.path.join(ROOT_PATH, 'models_int8'))
TOKENIZERS_DIR = os.environ.get('TOKENIZERS_DIR', os.path.join(ROOT_PATH, 'tokenizers'))

# CTranslate2 inference knobs. intra_threads = ops per translation (match cores);
# inter_threads = parallel translations. beam size mirrors the old generate().
INTRA_THREADS = int(os.environ.get('OMP_NUM_THREADS', '4'))
INTER_THREADS = int(os.environ.get('CT2_INTER_THREADS', '1'))
BEAM_SIZE = int(os.environ.get('CT2_BEAM_SIZE', '4'))
MAX_DECODING_LENGTH = 256

# ---------- Device / heartbeat / routing ----------
# Whether a real CUDA device is present (controls the CT2 compute device).
try:
    _has_cuda = ctranslate2.get_cuda_device_count() > 0
except Exception:
    _has_cuda = False
COMPUTE_DEVICE = 'cuda' if _has_cuda else 'cpu'
COMPUTE_TYPE = os.environ.get('CT2_COMPUTE_TYPE', 'int8')

# DEVICE_KIND is the *routing* label (which heartbeat key we own), independent of
# the compute device: a fast machine can declare itself the priority "gpu" node
# even without CUDA (LINGO_DEVICE=gpu|cpu), e.g. the maintainer's laptop.
_dev_override = os.environ.get('LINGO_DEVICE', '').strip().lower()
if _dev_override in ('gpu', 'cpu'):
    DEVICE_KIND = _dev_override
else:
    DEVICE_KIND = 'gpu' if _has_cuda else 'cpu'

WORKER_ID = f"{socket.gethostname()}-{os.getpid()}"
START_TIME = time.time()
STATS_FILE = os.environ.get('STATS_FILE', '/tmp/lingo_worker_stats.json')
GPU_ONLINE_KEY = 'lingo:gpu_online'   # set (with TTL) while a GPU worker is alive
CPU_ONLINE_KEY = 'lingo:cpu_online'   # set (with TTL) while a CPU worker is alive
MODELS_KEY = 'lingo:models'           # JSON list of available model dirs
HEARTBEAT_TTL = 15                    # seconds; refreshed every 5s
HEARTBEAT_INTERVAL = 5

# ---------- Caches ----------
model_cache = {}       # model_name -> ctranslate2.Translator
tokenizer_cache = {}   # tokenizer_name -> MarianTokenizer
last_used = {}         # model_name -> wall-clock timestamp of last use

# Unload models idle longer than this so a long-running server doesn't grow
# unbounded across 60 languages. Tokenizers (only 2) are kept.
MODEL_IDLE_TTL = int(os.environ.get("MODEL_IDLE_TTL", "900"))  # seconds
JANITOR_INTERVAL = 120  # seconds

# ---------- Concurrency / Lifecycle ----------
active_jobs = set()
lock = threading.Lock()
shutdown_event = threading.Event()
max_workers = max(3, multiprocessing.cpu_count() // 2)
executor = ThreadPoolExecutor(max_workers=max_workers)

# ---------- Metrics ----------
translation_count = 0
avg_translation_time = None


# ---------- Helpers ----------
def _models_dir():
    return MODELS_DIR


def _tokenizers_dir():
    return TOKENIZERS_DIR


def make_redis_client() -> redis.Redis:
    # decode_responses=True => returns str (not bytes)
    if REDIS_URL:
        return redis.from_url(
            REDIS_URL,
            decode_responses=True,
            socket_keepalive=True,
            socket_timeout=30,
        )
    return redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        password=REDIS_PASSWORD,
        decode_responses=True,
        socket_keepalive=True,
        socket_timeout=30,
    )


def _tokenizer_name_for(model_name: str) -> str:
    # francais-source models share one tokenizer, X->francais the other.
    return 'fr-en_tokenizer' if model_name.startswith('fr') else 'en-fr_tokenizer'


# ---------- Core ----------
def load_model_and_tokenizer(model_name: str) -> bool:
    """Load the int8 CTranslate2 model + its tokenizer if not already cached."""
    if model_name in model_cache:
        return True

    model_path = os.path.join(_models_dir(), model_name)
    if not os.path.exists(os.path.join(model_path, 'model.bin')):
        print(f'[WARN] int8 model not found: {model_path}')
        return False

    tokenizer_name = _tokenizer_name_for(model_name)
    if tokenizer_name not in tokenizer_cache:
        tokenizer_path = os.path.join(_tokenizers_dir(), tokenizer_name)
        if not os.path.exists(tokenizer_path):
            print(f'[WARN] Tokenizer path does not exist: {tokenizer_path}')
            return False
        print(f'Loading {tokenizer_name} tokenizer into memory...')
        tokenizer_cache[tokenizer_name] = MarianTokenizer.from_pretrained(
            tokenizer_path, use_fast=True
        )

    print(f'Loading int8 model {model_name} ({COMPUTE_DEVICE}/{COMPUTE_TYPE})...')
    try:
        model_cache[model_name] = ctranslate2.Translator(
            model_path,
            device=COMPUTE_DEVICE,
            compute_type=COMPUTE_TYPE,
            inter_threads=INTER_THREADS,
            intra_threads=INTRA_THREADS,
        )
    except Exception as e:
        print(f'[ERROR] Failed to load {model_name}: {type(e).__name__}: {e}')
        return False
    return True


def translate_text(model_name: str, input_text: str) -> str:
    global translation_count, avg_translation_time

    if not load_model_and_tokenizer(model_name):
        return ''

    translator = model_cache[model_name]
    tokenizer = tokenizer_cache[_tokenizer_name_for(model_name)]
    with lock:
        last_used[model_name] = time.time()

    start_time = time.time()

    source = tokenizer.convert_ids_to_tokens(
        tokenizer.encode(input_text, truncation=True, max_length=MAX_DECODING_LENGTH)
    )
    results = translator.translate_batch(
        [source],
        beam_size=BEAM_SIZE,
        max_decoding_length=MAX_DECODING_LENGTH,
    )
    target_tokens = results[0].hypotheses[0]
    translated_text = tokenizer.decode(
        tokenizer.convert_tokens_to_ids(target_tokens), skip_special_tokens=True
    )

    execution_time = time.time() - start_time
    translation_count += 1
    if translation_count == 1:
        avg_translation_time = execution_time
    else:
        avg_translation_time = (avg_translation_time * (translation_count - 1) + execution_time) / translation_count

    print(f"[OK] Last translation: {execution_time:.3f}s | avg {avg_translation_time:.3f}s over {translation_count} runs")

    return translated_text


def process_job(job_data: str, redis_client: redis.Redis):
    """Process a single translation job."""
    try:
        data = json.loads(job_data)
    except json.JSONDecodeError as e:
        print(f'[ERROR] Bad job JSON: {e} | payload={job_data!r}')
        return

    job_id = data.get('jobId')
    if not job_id:
        print('[ERROR] Missing jobId; skipping job.')
        return

    # Deduplicate
    with lock:
        if job_id in active_jobs:
            print(f"[SKIP] Job {job_id} already in progress.")
            return
        print(f"[START] Job {job_id}")
        active_jobs.add(job_id)

    output = None
    error = None
    try:
        if 'input' in data and 'models' in data:
            output = data['input']
            for model_name in data['models']:
                print(f'  -> Translating with model "{model_name}"')
                output = translate_text(model_name, output)
        else:
            # List available models/languages
            output = [
                d for d in os.listdir(_models_dir())
                if os.path.isdir(os.path.join(_models_dir(), d))
            ]
    except Exception as e:
        error = f'{type(e).__name__}: {e}'
        print(f"[ERROR] Job {job_id} failed: {error}")
    finally:
        # Always publish a result, even on error or no input
        response = {
            'jobId': job_id,
            'output': output,
            'server': 'colab'
        }
        if error:
            response['error'] = error
        if 'input' not in data:
            response['no_input'] = True

        try:
            redis_client.publish(RESULTS_CHANNEL, json.dumps(response))
        except Exception as pub_e:
            print(f"[ERROR] Failed to publish result for {job_id}: {pub_e}")

        with lock:
            active_jobs.discard(job_id)
        print(f"[END] Job {job_id} finished. Removed from active jobs.")


def job_listener():
    """Listen for incoming jobs from the Redis List (job queue) and process them."""
    redis_client = make_redis_client()
    print(f"[READY] Listening on Redis list '{JOB_QUEUE_KEY}' with up to {max_workers} workers...")

    while not shutdown_event.is_set():
        try:
            # GPU takes over: a CPU worker stands down (doesn't pull jobs) while
            # any GPU worker is alive. It resumes when the GPU heartbeat expires.
            if DEVICE_KIND == 'cpu':
                try:
                    if redis_client.exists(GPU_ONLINE_KEY):
                        time.sleep(2)
                        continue
                except Exception:
                    pass

            # Short timeout so we can react to shutdown_event quickly
            job = redis_client.blpop(JOB_QUEUE_KEY, timeout=2)
            if not job:
                continue
            if shutdown_event.is_set():
                break

            _, job_data = job  # both are str (decode_responses=True)
            try:
                executor.submit(process_job, job_data, redis_client)
            except RuntimeError as e:
                # Happens if executor was shut down; exit cleanly
                print(f"[WARN] Executor unavailable: {e}. Stopping listener.")
                break

        except (redis.exceptions.ConnectionError, redis.exceptions.TimeoutError) as e:
            if shutdown_event.is_set():
                break
            print(f"[WARN] Redis connection issue: {e}. Reconnecting in 2s...")
            time.sleep(2)
            try:
                redis_client = make_redis_client()
            except Exception as re_e:
                print(f"[ERROR] Redis reconnection failed: {re_e}")
                time.sleep(2)
        except Exception as e:
            if shutdown_event.is_set():
                break
            print(f"[ERROR] job_listener loop exception: {e}")


# ---------- Entrypoint / Shutdown ----------
def _graceful_shutdown(signum=None, frame=None):
    print(f"\n[SHUTDOWN] Signal {signum} received. Shutting down translation worker...")
    shutdown_event.set()
    # Allow main to proceed to orderly shutdown
    # Avoid calling executor.shutdown() here inside a signal handler on some runtimes.


def _model_janitor():
    """Periodically unload models idle longer than MODEL_IDLE_TTL."""
    while not shutdown_event.is_set():
        shutdown_event.wait(JANITOR_INTERVAL)
        if shutdown_event.is_set():
            break
        now = time.time()
        with lock:
            # In-flight jobs keep their own reference to the Translator, so
            # removing it from the cache here is safe even mid-translation.
            stale = [
                m for m in list(model_cache.keys())
                if now - last_used.get(m, 0) > MODEL_IDLE_TTL
            ]
            for m in stale:
                model_cache.pop(m, None)
                last_used.pop(m, None)
        if stale:
            try:
                import gc
                gc.collect()
            except Exception:
                pass
            print(f"[JANITOR] Unloaded {len(stale)} idle model(s): {', '.join(stale)}")


def _write_stats():
    """Write a local stats snapshot for the control CLI / UI."""
    with lock:
        loaded = sorted(model_cache.keys())
    stats = {
        'worker_id': WORKER_ID,
        'device': DEVICE_KIND,
        'compute': f'{COMPUTE_DEVICE}/{COMPUTE_TYPE}',
        'host': socket.gethostname(),
        'started_at': START_TIME,
        'uptime_sec': round(time.time() - START_TIME),
        'jobs_done': translation_count,
        'avg_inference_ms': round((avg_translation_time or 0) * 1000),
        'loaded_models': loaded,
        'loaded_count': len(loaded),
        'updated_at': time.time(),
    }
    try:
        tmp = STATS_FILE + '.tmp'
        with open(tmp, 'w') as f:
            json.dump(stats, f)
        os.replace(tmp, STATS_FILE)
    except Exception:
        pass


def _heartbeat():
    """Advertise liveness + device + model list to Redis (for routing + the
    website status/banner), and refresh the local stats file."""
    hb = make_redis_client()
    # Publish the model list once on startup (cheap; refreshed periodically).
    while not shutdown_event.is_set():
        try:
            key = GPU_ONLINE_KEY if DEVICE_KIND == 'gpu' else CPU_ONLINE_KEY
            hb.set(key, WORKER_ID, ex=HEARTBEAT_TTL)
            try:
                models = [
                    d for d in os.listdir(_models_dir())
                    if os.path.isdir(os.path.join(_models_dir(), d))
                ]
                hb.set(MODELS_KEY, json.dumps(models), ex=60)
            except Exception:
                pass
            _write_stats()
        except Exception as e:
            print(f"[HEARTBEAT] {type(e).__name__}: {e}")
            try:
                hb = make_redis_client()
            except Exception:
                pass
        shutdown_event.wait(HEARTBEAT_INTERVAL)


def main():
    # Handle SIGINT/SIGTERM for clean shutdown
    signal.signal(signal.SIGINT, _graceful_shutdown)
    signal.signal(signal.SIGTERM, _graceful_shutdown)

    listener = threading.Thread(target=job_listener, name="job-listener", daemon=True)
    listener.start()
    threading.Thread(target=_model_janitor, name="model-janitor", daemon=True).start()
    threading.Thread(target=_heartbeat, name="heartbeat", daemon=True).start()
    print(f"Translation worker started ({DEVICE_KIND.upper()} routing, {COMPUTE_DEVICE}/{COMPUTE_TYPE} compute), listening for jobs...")

    # Keep the main thread alive until shutdown_event is set
    try:
        while not shutdown_event.is_set():
            time.sleep(0.5)
    finally:
        # Orderly shutdown: stop listener, then drain executor
        print("[SHUTDOWN] Waiting for listener to exit...")
        listener.join(timeout=5)
        print("[SHUTDOWN] Draining executor (wait for running jobs to finish)...")
        executor.shutdown(wait=True)
        print("[SHUTDOWN] Done. Bye!")
        sys.exit(0)


if __name__ == "__main__":
    main()
