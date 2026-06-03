#!/usr/bin/env python3
"""
Lingo audio preprocessing worker.

Consumes `preprocess_queue` from Redis, normalizes each raw clip into a clean,
training-ready FLAC (16 kHz mono, silence-trimmed, loudness-normalized),
computes quality metrics, stores the clean clip in R2, and calls back the app's
internal API to mark the recording ready (and purge the raw upload).

Runs anywhere with network access to Redis + R2 + the app (NOT the home desktop,
which only serves the t2t models). Requires ffmpeg/ffprobe on PATH.

Env (see worker/.env.example):
  REDIS_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET,
  INTERNAL_API_URL, INTERNAL_API_SECRET
"""
import json
import os
import subprocess
import tempfile
import time

import boto3
import redis
import requests

REDIS_URL = os.environ["REDIS_URL"]
R2_ACCOUNT_ID = os.environ["R2_ACCOUNT_ID"]
R2_BUCKET = os.environ["R2_BUCKET"]
INTERNAL_API_URL = os.environ["INTERNAL_API_URL"].rstrip("/")
INTERNAL_API_SECRET = os.environ["INTERNAL_API_SECRET"]
QUEUE = "preprocess_queue"

MIN_DURATION = 0.4   # seconds
MAX_DURATION = 60.0
SILENCE_FLOOR = -45.0  # dBFS; quieter peak than this == effectively silent

s3 = boto3.client(
    "s3",
    endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
    aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
    region_name="auto",
)


def clean_key_for(raw_key: str) -> str:
    base = raw_key.split("/", 1)[1] if "/" in raw_key else raw_key
    base = base.rsplit(".", 1)[0]
    return f"clean/{base}.flac"


def ffprobe_duration(path: str) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path],
        capture_output=True, text=True,
    )
    try:
        return float(out.stdout.strip())
    except ValueError:
        return 0.0


def peak_dbfs(path: str) -> float:
    """Max volume in dBFS via ffmpeg volumedetect."""
    out = subprocess.run(
        ["ffmpeg", "-i", path, "-af", "volumedetect", "-f", "null", "-"],
        capture_output=True, text=True,
    )
    for line in out.stderr.splitlines():
        if "max_volume:" in line:
            try:
                return float(line.split("max_volume:")[1].strip().split(" ")[0])
            except (IndexError, ValueError):
                pass
    return -99.0


def normalize(src: str, dst: str) -> None:
    # trim leading + trailing silence, then loudness-normalize to broadcast target
    af = (
        "silenceremove=start_periods=1:start_silence=0.1:start_threshold=-50dB:detection=peak,"
        "areverse,"
        "silenceremove=start_periods=1:start_silence=0.1:start_threshold=-50dB:detection=peak,"
        "areverse,"
        "loudnorm=I=-23:TP=-2:LRA=11"
    )
    subprocess.run(
        ["ffmpeg", "-y", "-i", src, "-af", af, "-ar", "16000", "-ac", "1", dst],
        capture_output=True, check=True,
    )


def callback(payload: dict) -> None:
    requests.post(
        f"{INTERNAL_API_URL}/api/internal/recordings/processed",
        headers={"x-internal-secret": INTERNAL_API_SECRET},
        json=payload,
        timeout=20,
    )


def process(job: dict) -> None:
    rid = job["recordingId"]
    raw_key = job["rawKey"]
    clean_key = clean_key_for(raw_key)
    ext = raw_key.rsplit(".", 1)[-1] if "." in raw_key else "bin"

    with tempfile.TemporaryDirectory() as tmp:
        raw_path = os.path.join(tmp, f"raw.{ext}")
        clean_path = os.path.join(tmp, "clean.flac")
        s3.download_file(R2_BUCKET, raw_key, raw_path)

        try:
            normalize(raw_path, clean_path)
        except subprocess.CalledProcessError:
            callback({"recordingId": rid, "rejected": True, "reason": "decode_failed"})
            return

        duration = ffprobe_duration(clean_path)
        peak = peak_dbfs(clean_path)

        if duration < MIN_DURATION or peak <= SILENCE_FLOOR:
            callback({"recordingId": rid, "rejected": True,
                      "reason": "too_short" if duration < MIN_DURATION else "silent"})
            return
        if duration > MAX_DURATION:
            callback({"recordingId": rid, "rejected": True, "reason": "too_long"})
            return

        s3.upload_file(clean_path, R2_BUCKET, clean_key,
                       ExtraArgs={"ContentType": "audio/flac"})

        callback({
            "recordingId": rid,
            "cleanKey": clean_key,
            "cleanUrl": f"/api/media/{clean_key}",
            "durationMs": int(duration * 1000),
            "metrics": {
                "durationSec": round(duration, 2),
                "peakDbfs": round(peak, 1),
                "sampleRate": 16000,
                "channels": 1,
                "format": "flac",
            },
        })
        print(f"[OK] {rid} -> {clean_key} ({duration:.1f}s, peak {peak:.1f} dBFS)")


def main() -> None:
    r = redis.from_url(REDIS_URL, decode_responses=True)
    print(f"[READY] preprocessing worker listening on '{QUEUE}'")
    while True:
        try:
            item = r.blpop(QUEUE, timeout=5)
            if not item:
                continue
            _, raw = item
            job = json.loads(raw)
            print(f"[START] {job.get('recordingId')}")
            try:
                process(job)
            except Exception as e:  # noqa: BLE001 - keep the loop alive
                print(f"[ERROR] job failed: {type(e).__name__}: {e}")
        except (redis.exceptions.ConnectionError, redis.exceptions.TimeoutError) as e:
            print(f"[WARN] redis issue: {e}; retrying in 3s")
            time.sleep(3)
            r = redis.from_url(REDIS_URL, decode_responses=True)


if __name__ == "__main__":
    main()
