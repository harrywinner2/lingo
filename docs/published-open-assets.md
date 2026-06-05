# Lingo / NativeAI — published open models & data

Everything Lingo has released openly on Hugging Face, under the
[**flagship-ai**](https://huggingface.co/flagship-ai) organization. All artifacts are
**CC-BY-4.0**. Figures verified 2026-06-05.

## Headline

- **11 open repositories** on Hugging Face — 9 models + 2 datasets.
- **119 open translation models** covering **59 Cameroonian languages** (both directions)
  plus a French↔English pair — French-pivot, served as compressed int8.
- **~20 hours** of open, aligned **Ghomálá' speech** — a rare spoken corpus for an
  oral-first language.
- **Verse-aligned multilingual text** corpus, compiled across 60 Cameroonian languages.
- Open since **September 2024**; actively maintained.

---

## Translation models

### `flagship-ai/cameroon-int8` — the compressed serving bundle
[huggingface.co/flagship-ai/cameroon-int8](https://huggingface.co/flagship-ai/cameroon-int8)
- **119 translation models** in one bundle (one subfolder per language pair).
- Covers **59 Cameroonian languages** in both directions (`X→français`, `français→X`),
  plus a **French↔English** pair, all pivoting through French.
- Architecture: **MarianMT** (Helsinki OPUS) converted to **int8 CTranslate2** —
  ~3.8× smaller and ~6× faster on CPU than the fp32 originals, so the whole fleet runs
  on free-tier hardware.
- Size: **9.0 GB** · 1,065 files · created 2026-06-04.

### 8 original fp32 models (Sept 2024 — provenance)
Compact MarianMT models, the project's first public release. ONNX variants included for
Ghomálá'. ~285 MB each (Ghomálá' repos ~687 MB with ONNX).

| Repo | Direction | Size | Created |
|---|---|---|---|
| [`francais-ghomala`](https://huggingface.co/flagship-ai/francais-ghomala) | French → Ghomálá' | 687 MB | 2024-09-26 |
| [`ghomala-francais`](https://huggingface.co/flagship-ai/ghomala-francais) | Ghomálá' → French | 687 MB | 2024-09-26 |
| [`francais-bulu`](https://huggingface.co/flagship-ai/francais-bulu) | French → Bulu | 285 MB | 2024-09-26 |
| [`bulu-francais`](https://huggingface.co/flagship-ai/bulu-francais) | Bulu → French | 285 MB | 2024-09-26 |
| [`francais-fufulde`](https://huggingface.co/flagship-ai/francais-fufulde) | French → Fulfulde | 285 MB | 2024-09-26 |
| [`fufulde-francais`](https://huggingface.co/flagship-ai/fufulde-francais) | Fulfulde → French | 285 MB | 2024-09-26 |
| [`francais-pinyin`](https://huggingface.co/flagship-ai/francais-pinyin) | French → Pinyin | 285 MB | 2024-09-26 |
| [`pinyin-francais`](https://huggingface.co/flagship-ai/pinyin-francais) | Pinyin → French | 285 MB | 2024-09-26 |

> The 4 fp32 languages (Ghomálá', Bulu, Fulfulde, Pinyin) are also inside the int8
> bundle; the standalone repos are kept as the dated, citable originals.

---

## Datasets

### `flagship-ai/ghomala-spoken-bible` — open speech (the flagship voice asset)
[huggingface.co/datasets/flagship-ai/ghomala-spoken-bible](https://huggingface.co/datasets/flagship-ai/ghomala-spoken-bible)
- **~19 h 49 m of spoken Ghomálá'** (ISO `bbj`, a Grassfields Bantu language of West Cameroon).
- **260 chapter recordings** across **27 New Testament books**, as MP3.
- **Aligned chapter-by-chapter** with parallel text in **Ghomálá', French, and English**
  (260 chapters × 3 languages = 780 text files), plus a `manifest.csv` mapping
  audio ↔ book ↔ chapter ↔ duration ↔ text.
- Size: **275 MB** · 1,043 files · created 2026-06-05.
- Use: ASR, TTS, and speech-translation for a low-resource, oral-first language.

### `flagship-ai/cameroon_bibles` — verse-aligned text
[huggingface.co/datasets/flagship-ai/cameroon_bibles](https://huggingface.co/datasets/flagship-ai/cameroon_bibles)
- Verse-aligned scripture — the *aligned backbone* of the training corpus, where each
  verse carries a book/chapter/verse reference for cross-language alignment.
- Public release: a **sample of 2 languages** (Bulu, Guidar; 384 verse files); the full
  compiled corpus spans **60 Cameroonian languages**, released as each source
  translation's licensing is cleared.
- Size: 1.5 MB · 386 files · created 2024-09-26.

---

## At a glance

| Category | Open count | Scale |
|---|---|---|
| Translation models | 119 (+ 8 fp32 originals) | 59 Cameroonian languages, both directions |
| Open speech | 1 dataset | ~20 hours, 260 recordings, trilingual-aligned |
| Open text | 1 dataset (+ broader corpus) | verse-aligned; 60-language compiled corpus |
| License | — | CC-BY-4.0 throughout |
| Home | — | [huggingface.co/flagship-ai](https://huggingface.co/flagship-ai) · [lingo.cm](https://lingo.cm) |
