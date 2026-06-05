# Open-release policy — by artifact

How Lingo / NativeAI decides what is open, what is restricted, and on what timeline.
Companion to [`DATA_GOVERNANCE.md`](../DATA_GOVERNANCE.md). Written for the LINGUA
Africa application (open-by-default is the funder's core value) and for public
due-diligence on lingo.cm.

Principle: **the public goods funded as open stay open** — permanently, and
independently of any future convenience/hosted service.

## What is open by default

| Artifact | Status | License / where |
|---|---|---|
| **Translation models** (fp32 originals + int8 serving) | **Open** | CC-BY-4.0 on Hugging Face `flagship-ai` |
| **Model cards & documentation** | **Open** | Hugging Face + lingo.cm/blog |
| **Verse-aligned text corpus** (`cameroon_bibles`) | **Open, where licensing permits** | CC-BY-4.0 on HF — see restriction below |
| **Cleaned, consented voice clips** | **Open, in versioned drops** | Released as the corpus accumulates and passes QA |
| **Research write-ups / methodology** | **Open** | lingo.cm/blog |
| **Application/platform code** | **Open-intended** | Core to be released under a permissive licence; secrets never published |

## What is restricted (and why)

| Artifact | Restriction | Reason |
|---|---|---|
| **Raw, unprocessed audio** | Not released | May contain incidental personal/identifying speech; only cleaned clips are published |
| **Contributor personal data** (names, phone, email) | Never released | Privacy; stored only to administer consent + rewards, minimised and access-controlled |
| **Underlying Bible source translations** | Only translations we may redistribute | Many Bible translations are copyrighted by their publishers; we publish only languages we can share openly (today: a sample) |
| **Health-domain content with patient data** | Out of scope unless ethics-approved | No live patient-intake data without a named content owner + ethics path |
| **Credentials / API keys / model-serving secrets** | Never in any repo | Standard security hygiene |

## Timeline

- **Models & dataset cards:** published on release / on validation (done for the current set).
- **Voice corpus:** released in **versioned drops** as clips are collected, consented, cleaned, and consensus-verified — not held back to a single big-bang release.
- **Code:** core opened progressively; nothing blocking secrets removal first.
- **Additional `cameroon_bibles` languages:** released as each source translation's
  licensing is cleared.

## Separation of public goods from any commercial service

Anything produced with grant funding — models, datasets, code, documentation — is
released open under the licences above and remains **self-hostable** (the worker runs
on a free-tier CPU node; see the research log). Lingo may additionally operate a
hosted convenience service (e.g. the always-on translator at lingo.cm), but that
service is a *convenience layer*, never a gate: the underlying public goods stay open,
downloadable, and runnable by anyone, independently of it. No grant-funded artifact is
moved behind a paywall.
