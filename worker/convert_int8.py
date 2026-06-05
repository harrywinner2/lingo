#!/usr/bin/env python3
"""Convert all fp32 MarianMT model dirs to int8 CTranslate2, for compressed
serving. fp32 originals are left untouched (archive). Resumable: skips dirs that
already have a valid model.bin. Each output dir is self-contained (CT2 model +
the shared tokenizer files) so it can be uploaded to HF and served directly.

Run:  python3 convert_int8.py
"""
import os, sys, shutil, time, traceback

FP32 = os.environ.get("FP32_DIR", "/home/kamdemharry/lingo/worker/models_fp32")
INT8 = os.environ.get("INT8_DIR", "/home/kamdemharry/lingo/worker/models_int8")
TOKS = os.environ.get("TOKENIZERS_DIR", "/home/kamdemharry/lingo/worker/tokenizers")
STAGE = "/tmp/ct2_convert_stage"

# infer.py heuristic: francais-source models use fr-en_tokenizer, the rest en-fr.
def tok_for(name: str) -> str:
    return "fr-en_tokenizer" if name.startswith("fr") else "en-fr_tokenizer"

def main():
    import ctranslate2  # noqa
    from ctranslate2.converters import TransformersConverter

    os.makedirs(INT8, exist_ok=True)
    pairs = sorted(
        d for d in os.listdir(FP32)
        if os.path.isdir(os.path.join(FP32, d))
        and os.path.exists(os.path.join(FP32, d, "model.safetensors"))
    )
    total = len(pairs)
    print(f"[convert] {total} fp32 models -> int8", flush=True)

    done = skipped = failed = 0
    t_start = time.time()
    for i, name in enumerate(pairs, 1):
        out = os.path.join(INT8, name)
        if os.path.exists(os.path.join(out, "model.bin")):
            skipped += 1
            continue

        src = os.path.join(FP32, name)
        tok = os.path.join(TOKS, tok_for(name))
        stage = os.path.join(STAGE, name)
        shutil.rmtree(stage, ignore_errors=True)
        os.makedirs(stage, exist_ok=True)
        try:
            # Stage model + tokenizer together (converter needs both).
            for f in os.listdir(src):
                if f.endswith((".json", ".safetensors", ".bin")):
                    shutil.copy2(os.path.join(src, f), stage)
            for f in os.listdir(tok):
                shutil.copy2(os.path.join(tok, f), stage)

            tmp_out = out + ".tmp"
            shutil.rmtree(tmp_out, ignore_errors=True)
            TransformersConverter(stage).convert(tmp_out, quantization="int8", force=True)

            if not os.path.exists(os.path.join(tmp_out, "model.bin")):
                raise RuntimeError("no model.bin produced")
            # Bundle the tokenizer into the output so the repo is self-contained.
            for f in os.listdir(tok):
                shutil.copy2(os.path.join(tok, f), tmp_out)
            os.replace(tmp_out, out)
            done += 1
            mb = os.path.getsize(os.path.join(out, "model.bin")) / 1e6
            rate = (time.time() - t_start) / (done + 0.0001)
            eta = rate * (total - i) / 60
            print(f"[{i}/{total}] {name}  {mb:.0f}MB  (eta ~{eta:.0f}m)", flush=True)
        except Exception as e:
            failed += 1
            print(f"[{i}/{total}] FAIL {name}: {type(e).__name__}: {e}", flush=True)
            traceback.print_exc()
        finally:
            shutil.rmtree(stage, ignore_errors=True)

    shutil.rmtree(STAGE, ignore_errors=True)
    print(f"[convert] done={done} skipped={skipped} failed={failed} of {total}", flush=True)
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
