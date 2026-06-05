# LINGUA Africa — verified facts & metrics (Claude-gathered)

Compiled 2026-06-04 from the live models, the Hugging Face org, and the corpus.
Use these for Q2 / Q6 / Q16, and to settle the factual-accuracy checklist items
(#40). **Bold = a correction or caveat to apply in the draft.**

## Models & dataset metrics (Q6 / Q16)

| Metric | Verified value |
|---|---|
| Trained translation models (int8 serving) | **119 directions** |
| Cameroonian languages with a model | **59** (both directions, except akoose) |
| Plus | a French↔English pair |
| fp32 originals archived | 119 (matches int8) |
| Architecture | MarianMT (Helsinki OPUS), French-pivot; served as int8 CTranslate2 |
| Compression vs fp32 | ~3.8× smaller, ~6× faster on CPU (pilot: 285 MB→75 MB, 532 ms→86 ms) |
| Hugging Face org | `flagship-ai` — 1 int8 bundle (`cameroon-int8`) + 8 fp32 demo repos, all now carry model cards |
| HF downloads | ~11 / 30 days (low-traffic research models — state honestly, don't inflate) |
| Open text dataset | `flagship-ai/cameroon_bibles` (verse-aligned scripture; 2 langs public) |
| Open **voice** dataset | `flagship-ai/ghomala-spoken-bible` — **~19h 49m** of Ghomálá' speech, **260** chapter recordings, aligned with Ghomala/French/English text (strong evidence of real spoken-data collection) |
| Formal benchmark scores | **None yet** — no held-out BLEU/chrF eval has been run; say "evaluation in progress," do not quote a score |

## Corpus

- Compiled scripture spans **60 Cameroonian languages** (verse-aligned), plus gathered
  books/pamphlets/other written material, normalised under the **AGLC** alphabet.
- The corpus (60) is one more language than the models (59): **Guge** has corpus data
  but no trained model yet. "60 languages in the corpus" is accurate; "models for 59" is
  the matching model figure — keep the two numbers distinct in the application.
- **`cameroon_bibles` public release currently contains only 2 languages** (Bulu, Guidar),
  not the full 60 — public release of the rest is gated on each Bible translation's
  copyright. The claim "we compiled and open-sourced cameroon_bibles" is true but the
  *public* artifact is small; describe it as a sample/growing release, or decide what
  more can be shared (see open-release policy).

## Factual-accuracy checks (#40)

- ✅ **Pinyin is correct** — a Grassfields Bantu language (a.k.a. Pelimpo), NW Cameroon,
  Boyo division. It is **not** a typo for "Pidgin" (Cameroonian Pidgin English is a
  different thing we do not model). Keep "Pinyin" in the list.
- ⚠️ **"Televised launch" (2024)** — could NOT be verified from here. Describe as a
  *public launch event* unless you can evidence an actual broadcast. **Owner: you.**
- ⚠️ **Dataset name/size** — name `cameroon_bibles` ✅; public size = 2 languages (see above).
- ✅ Languages/model counts above are exact (counted from the live model store).

## Q2 problem-statement — sourced figures (#47)

All verified against official sources; **check the date on each before quoting** (the
90%-rural figure is from 2014 and should be flagged as such or refreshed).

**Poverty (World Bank, ECAM-5 household survey 2021/22, released April 2024):**
- ~**4 in 10** Cameroonians live below the national poverty line.
- **23%** live below the international poverty line ($2.15/person/day).
- **Multidimensional poverty 41%** (2021/22).
- Poverty is concentrated in rural and northern regions; **~90% of the poor lived in
  rural areas** (2014 data — older; flag or update).
- Sources: [Cameroon Poverty Assessment 2024](https://openknowledge.worldbank.org/entities/publication/6657fb98-ee85-4c09-ae9f-b08916511824) · [Poverty & Equity Brief, Oct 2024](https://documents.worldbank.org/en/publication/documents-reports/documentdetail/099659201032551617) · [World Bank poverty data, Cameroon](https://data.worldbank.org/indicator/SI.POV.NAHC?locations=CM)

**Digital divide:**
- Africa (2024): rural internet use **23%** vs urban **57%** — the **largest urban–rural
  gap of any ITU region**; ~**25% of rural Africa** has no mobile-broadband coverage.
  Source: [ITU, Measuring Digital Development — Facts and Figures 2024](https://www.itu.int/itu-d/reports/statistics/2024/11/10/ff24-internet-use-in-urban-and-rural-areas/)
- Cameroon: internet penetration **~41.9%** (end 2025); **~39%** of the population is
  rural. Source: [DataReportal — Digital 2026: Cameroon](https://datareportal.com/reports/digital-2026-cameroon)

**Framing for Q2:** a largely rural, lower-income, low-connectivity population whose
languages are oral-first and digitally near-absent — so tools must be voice-first,
low-bandwidth, and runnable offline/on cheap hardware (which the project is built for).

## Suggested phrasing (safe)

> "We have released open French-pivot machine-translation models covering **59
> Cameroonian languages** (119 translation directions), built on a corpus we compiled
> across **60 languages** — scripture as the aligned backbone plus gathered written
> sources, unified under the AGLC alphabet — and open-sourced on Hugging Face
> (`flagship-ai`). Formal benchmark evaluation is in progress."
