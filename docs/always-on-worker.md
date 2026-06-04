# Keeping the translation worker always-on

The t2t translator on lingo.cm bridges (browser → Worker → Redis) to a Python
worker (`~/lingo_v2/infer.py`, looped by `runner.py`) that loads the MarianMT
models and answers jobs on Redis. The page shows "server asleep" whenever that
worker isn't running. To keep it up:

## On the laptop (Crostini) — systemd service (installed)

Installed at `/etc/systemd/system/lingo-worker.service`:

```ini
[Unit]
Description=Lingo translation worker (t2t models bridged via Redis)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=kamdemharry
WorkingDirectory=/home/kamdemharry/lingo_v2
Environment=PYTHONUNBUFFERED=1
Environment=OMP_NUM_THREADS=4
Environment=MKL_NUM_THREADS=4
ExecStart=/usr/bin/python3 /home/kamdemharry/lingo_v2/infer.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Manage it:
```bash
sudo systemctl status lingo-worker      # state
sudo journalctl -u lingo-worker -f      # live logs
sudo systemctl restart lingo-worker     # restart
```

It **auto-starts on boot, restarts on crash, and survives terminal/SSH close**.
Note the boundary: it only runs while the Chromebook is powered and Crostini is
up. ChromeOS may stop the Linux VM when the device sleeps/shuts down.

### Two fixes baked in
- **Thread cap** (`OMP_NUM_THREADS=4` + `torch.set_num_threads`): Crostini's
  `/proc/cpuinfo` isn't parseable by torch's cpuinfo, which otherwise leaves the
  threadpool misconfigured and makes `generate()` hang. (The `cpuinfo: failed to
  parse` log line is harmless once threads are capped.)
- `pip install sacremoses` — better Marian tokenization, removes the warning.

## For true 24/7 (independent of the laptop)

Run the same worker on an always-on host so it never sleeps:
- **Oracle Cloud Always Free** (4 ARM cores, 24 GB RAM, free) is the best free
  option. Copy `~/lingo_v2` (incl. `models/`, ~31 GB → fits the 200 GB free
  block) and the unit above; it connects to the same Redis, so the website needs
  no change.
- Any small VPS works too.

The models are lazy-loaded and cached per process; for heavy multi-language use,
consider adding LRU eviction to `infer.py`'s `model_cache` to bound memory.
