#!/usr/bin/env bash
# Bootstrap the Lingo translation worker on a fresh Oracle Always-Free ARM VM
# (Ubuntu 22.04/24.04). Run AFTER you've transferred the worker to ~/lingo_v2
# (code + tokenizers/ + models/ — see docs/oracle-worker-setup.md) and exported
# REDIS_URL. Idempotent.
#
#   export REDIS_URL='redis://default:PASSWORD@HOST:PORT'
#   bash oracle-bootstrap.sh
set -euo pipefail

: "${REDIS_URL:?Set REDIS_URL=redis://default:PASSWORD@HOST:PORT first}"
WORKER_DIR="${WORKER_DIR:-$HOME/lingo_v2}"

[ -f "$WORKER_DIR/infer.py" ] || { echo "infer.py not found in $WORKER_DIR — transfer the worker first"; exit 1; }
[ -d "$WORKER_DIR/models" ]   || { echo "models/ not found in $WORKER_DIR — transfer the models first"; exit 1; }

echo "==> Installing system deps"
sudo apt-get update -y
sudo apt-get install -y python3-pip python3-venv ffmpeg

echo "==> Installing Python deps (CPU torch, ARM wheels from PyPI)"
python3 -m pip install --break-system-packages --upgrade pip
python3 -m pip install --break-system-packages \
  torch transformers==4.44.2 sentencepiece sacremoses "redis>=5"

echo "==> Writing env file (root-only)"
sudo tee /etc/lingo-worker.env >/dev/null <<ENV
REDIS_URL=$REDIS_URL
OMP_NUM_THREADS=4
MKL_NUM_THREADS=4
MODEL_IDLE_TTL=900
PYTHONUNBUFFERED=1
ENV
sudo chmod 600 /etc/lingo-worker.env

echo "==> Installing systemd service"
sudo tee /etc/systemd/system/lingo-worker.service >/dev/null <<UNIT
[Unit]
Description=Lingo translation worker (t2t models bridged via Redis)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$WORKER_DIR
EnvironmentFile=/etc/lingo-worker.env
ExecStart=/usr/bin/python3 $WORKER_DIR/infer.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable --now lingo-worker
sleep 5
echo "==> Status"
systemctl is-active lingo-worker && echo "worker active ✅" \
  || sudo journalctl -u lingo-worker -n 25 --no-pager
