# Run the translation worker 24/7 on Oracle Cloud Always Free

This makes the translator on lingo.cm always-on, independent of the laptop. The
worker connects to the same Redis, so the website needs **zero changes**.

Steps marked **[you]** need your Oracle account; I can run the rest if you give
me SSH to the created instance.

## 1. [you] Create the VM
- Sign up / sign in at https://cloud.oracle.com (Always Free is genuinely free).
- Create a Compute instance:
  - Shape: **VM.Standard.A1.Flex** (Ampere ARM), e.g. **2 OCPU / 12 GB** (up to
    4/24 free). ARM capacity is often "out of capacity" — if so, switch the
    account to **Pay-As-You-Go** (keeps Always-Free resources) or retry/another
    region/AD.
  - Image: **Ubuntu 22.04/24.04**. Boot volume ~80–100 GB (models are ~31 GB).
  - Add your SSH public key.
- Networking: the default egress allows outbound to Redis (port 13000) — no
  ingress rule needed (the worker only makes outbound connections).

## 2. [you] Transfer the worker + models from the laptop
From the laptop (`~/lingo_v2`), copy code, tokenizers, and the 31 GB of models.
`-L` follows the `models` symlink so the actual files are copied:
```bash
rsync -aLz --progress \
  --exclude='.git' --exclude='lingo_log.txt' --exclude='*.db' \
  ~/lingo_v2/  ubuntu@<ORACLE_IP>:~/lingo_v2/
```
(Big one-time transfer. Alternatively tar the models, upload to R2, and pull on
the VM.)

## 3. Bootstrap (run on the VM)
```bash
scp scripts/oracle-bootstrap.sh ubuntu@<ORACLE_IP>:~/      # from this repo
ssh ubuntu@<ORACLE_IP>
export REDIS_URL='redis://default:<PASSWORD>@redis-13000.c82.us-east-1-2.ec2.redns.redis-cloud.com:13000'
bash ~/oracle-bootstrap.sh
```
This installs CPU PyTorch + transformers + ffmpeg, writes `/etc/lingo-worker.env`
(REDIS_URL + thread caps + model-idle TTL), installs the `lingo-worker` systemd
service, and starts it (auto-start on boot, restart on crash).

## 4. Verify
```bash
sudo systemctl status lingo-worker
sudo journalctl -u lingo-worker -f
curl -s https://lingo.cm/api/translate/status     # -> {"online":true,...}
```

## Notes
- **CPU-only** is fine — MarianMT models are small; the worker caps threads
  (Crostini's cpuinfo quirk doesn't apply on Oracle, but the cap is harmless) and
  unloads idle models after `MODEL_IDLE_TTL` to bound memory.
- Run the laptop worker **and** Oracle simultaneously if you like — both BLPOP the
  same queue; each job goes to one worker (free redundancy).
- **Rotate** the Redis password in Redis Cloud and update `REDIS_URL` here + the
  Cloudflare Worker secret, since the old value has been shared.
