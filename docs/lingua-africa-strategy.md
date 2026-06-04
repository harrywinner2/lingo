# LINGUA Africa Open Call — strategy for Lingo / NativeAI

*Deadline: **15 June 2026** · Apply via Submittable (masakhane.submittable.com).
Program: Microsoft AI for Good Lab + Gates Foundation + Masakhane African
Languages Hub + Google.org. ~$1M pool. (Verify exact form fields in Submittable.)*

## Award tiers (cash + compute credits)
| Track | Cash | Compute | Scope |
|---|---|---|---|
| Data creation | ≤ $50K | ≤ $50K | build/curate/document/validate/license datasets |
| Model / tool | ≤ $100K | ≤ $100K | models, benchmarks, tooling, infra |
| **Sectoral applications** | **≤ $250K** | **≤ $400K** | deploy language tech in a real sector with measurable impact |

Ranges are guidance, not ceilings. Support also includes **Azure + GCP credits**,
**AI for Good Lab** technical collaboration, and fellows/experts.

## De-facto rubric
1. **Community engagement / buy-in**
2. **Cross-institutional collaboration** (consortia encouraged; non-African orgs need a *named* African partnership)
3. **Credible pathway to measurable impact** in a priority sector: agriculture, education, health, financial inclusion, civic/government
4. **Clear beneficiaries + open licensing & governance** (text/speech/vision), documented for reuse

## Where Lingo is strong
- Targets **55 oral-first Cameroonian languages** — exactly the inclusion gap; voice-first by design (speakers can't write them).
- **Community is the architecture**: role-based campaigns, consensus verification, **quality-weighted points → cash/mobile-money (benefit-sharing)**, SMS/WhatsApp magic-link onboarding for non-literate users.
- **Open ethos already shipped**: open Marian models + `cameroon_bibles` dataset on Hugging Face; live translator (now on Cloudflare).
- **Responsible-AI scaffolding designed in**: consent, right-to-withdraw, audit log, anti-gaming.
- Existing funder pedigree (Klaus Tschira Foundation / Alumnode).

## Gaps to close (ranked)
1. **No named sector + pilot partner** → self-caps at $50–100K. Biggest lever.
2. **"Meaningful African partnership" under-evidenced** → need letters of support.
3. **Thin-looking open footprint** → no licenses/model cards/datasheets; no public audio yet.
4. **No public governance/consent/licensing artifacts** to cite.
5. **`cameroon_bibles` provenance/licensing + religious-register bias** → clarify + position as legacy seed.
6. **Voice product is mostly built-but-young** → be precise about live vs. roadmap.
7. **(Done)** plaintext Redis creds were in `infer.py` → moved to `REDIS_URL` env; rotate the Redis password too.

## Top 5 actions (next ~11 days)
1. **Pick ONE sector + a named pilot partner** (health: maternal/vaccine voice advisories, or agriculture: crop advisories — both align with Gates) and reframe the bid to the **Sectoral tier ($250K/$400K)**: collect voice → train ASR/TTS → deliver a voice service to N speakers, measured by a beneficiary outcome.
2. **Lock 2–3 letters of support** (Cameroonian university linguistics/CS dept + sector NGO + community/cultural org) and **engage a Masakhane-affiliated researcher**; frame as a consortium.
3. **Make openness visible**: add licenses (CC-BY/-SA data, Apache-2.0/MIT models) + **model/dataset cards + a datasheet** to the HF repos; publish & cite `DATA_GOVERNANCE.md` + consent policy (started in this repo).
4. **Lead with metrics**: # languages, **% non-literate/oral-first contributors** (our unique headline), verified hours, **cost per verified utterance**, ASR WER / TTS MOS, total community payouts, and the sector outcome.
5. **Record a 2–3 min honest demo** of the inclusion loop (create campaign → elder records on cheap Android → community verifies → points paid → dataset export). Be precise about live vs. roadmap.

## Use the in-kind offer explicitly
Budget **Azure GPU (NC/ND)** for ASR/TTS training, **Azure Blob** for the corpus,
**Azure AI Speech** as a baseline, **Azure OpenAI** for prompt authoring; request
**AI for Good Lab** help on extremely-low-resource modeling + an external
responsible-AI review of the consent/governance design.

## Draft 150-word summary (fill brackets)
> Cameroon has ~55 living languages, most oral-first and spoken by people who
> cannot write them — so they're invisible to AI. Lingo (flagship-ai) closes this
> gap voice-first. Our community platform lets a researcher launch a campaign and
> invite local speakers, verifiers and reviewers to record short prompts via
> hold-to-record on cheap Android phones — onboarded by SMS/WhatsApp so
> non-literate users fully participate. The community verifies recordings by
> consensus, and contributors earn quality-weighted points redeemable for
> mobile-money, sharing real value back. Verified audio becomes openly licensed
> datasets and open ASR/TTS models on Hugging Face, extending our live translator
> for ~55 languages. With LINGUA Africa we will pilot a **[health/agriculture]**
> voice service with **[partner]**, reaching **[N]** speakers in their own
> language. Built low-bandwidth and offline-first, governed by explicit consent,
> right-to-withdraw and open licenses — inclusive AI owned by the communities who
> speak these languages.
