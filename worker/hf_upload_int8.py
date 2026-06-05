#!/usr/bin/env python3
"""Upload int8 CTranslate2 models to the flagship-ai org on Hugging Face.

- Leaves the 8 original fp32 repos (ghomala/bulu/fufulde/pinyin, both directions)
  untouched: their 2024 upload dates are the project's provenance.
- Creates one repo per compressed pair, with a model card.
- Resumable: re-running re-uploads only what changed (HF dedups by hash).

Needs a token with WRITE access to the flagship-ai org:
    huggingface-cli login   (paste an org-scoped fine-grained or write token)
Run:
    python3 hf_upload_int8.py            # all pairs
    python3 hf_upload_int8.py aghem-francais francais-aghem   # specific pairs
"""
import os, sys

INT8 = os.environ.get("INT8_DIR", "/home/kamdemharry/lingo/worker/models_int8")
ORG = "flagship-ai"

# Original fp32 repos to preserve (do not overwrite with int8).
PRESERVE = {
    "francais-ghomala", "ghomala-francais",
    "francais-bulu", "bulu-francais",
    "francais-fufulde", "fufulde-francais",
    "francais-pinyin", "pinyin-francais",
}

CARD = """---
license: cc-by-4.0
library_name: ctranslate2
tags:
  - translation
  - ctranslate2
  - int8
  - marian
  - cameroon
  - low-resource
language:
  - fr
---

# {name} — int8 (CTranslate2)

Compressed French-pivot translation model for Cameroonian languages, part of the
[Lingo / NativeAI](https://lingo.cm) language-preservation project.

This is an **int8 [CTranslate2](https://github.com/OpenNMT/CTranslate2) conversion**
of our fp32 MarianMT model — about **3.8× smaller** (~285 MB → ~75 MB) and
**~6× faster on CPU**, so dozens of languages can be served on free-tier
hardware. The quality difference from fp32 is below the noise floor of these
narrow-domain, low-resource models (see the
[research log](https://lingo.cm/blog)). The fp32 originals are archived.

## Usage

```python
import ctranslate2
from transformers import MarianTokenizer

translator = ctranslate2.Translator("{name}", device="cpu", compute_type="int8")
tok = MarianTokenizer.from_pretrained("{name}")

src = tok.convert_ids_to_tokens(tok.encode("Bonjour, comment vas-tu ?"))
out = translator.translate_batch([src], beam_size=4)
print(tok.decode(tok.convert_tokens_to_ids(out[0].hypotheses[0]), skip_special_tokens=True))
```

Translations chain through French (the pivot): e.g. Ghomálá' → français → Ewondo.
"""


def main():
    from huggingface_hub import HfApi
    from huggingface_hub.utils import HfHubHTTPError

    api = HfApi()
    pairs = sys.argv[1:] or sorted(
        d for d in os.listdir(INT8)
        if os.path.isdir(os.path.join(INT8, d))
        and os.path.exists(os.path.join(INT8, d, "model.bin"))
    )

    up = skip = fail = 0
    for name in pairs:
        if name in PRESERVE:
            print(f"[skip preserve] {name}")
            skip += 1
            continue
        local = os.path.join(INT8, name)
        if not os.path.exists(os.path.join(local, "model.bin")):
            print(f"[skip no-model] {name}")
            skip += 1
            continue
        repo = f"{ORG}/{name}"
        try:
            api.create_repo(repo, repo_type="model", exist_ok=True)
            # Write the model card into the local dir so it uploads with the rest.
            with open(os.path.join(local, "README.md"), "w") as f:
                f.write(CARD.format(name=name))
            api.upload_folder(
                repo_id=repo, folder_path=local, repo_type="model",
                commit_message="Add int8 CTranslate2 compressed model",
            )
            print(f"[ok] {repo}")
            up += 1
        except HfHubHTTPError as e:
            code = getattr(e.response, "status_code", "?")
            print(f"[FAIL {code}] {repo}: {str(e)[:160]}")
            fail += 1
            if code == 403:
                print("  -> token lacks write access to the flagship-ai org. Stopping.")
                break
        except Exception as e:
            print(f"[FAIL] {repo}: {type(e).__name__}: {e}")
            fail += 1

    print(f"\nuploaded={up} skipped={skip} failed={fail}")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
