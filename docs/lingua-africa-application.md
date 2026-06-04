# LINGUA Africa — Lingo / NativeAI application (working doc)

*One place for everything about the application. Deadline **15 June 2026**.
Status: draft to refine. Fill **[brackets]** before submitting.*

---

## 1. Program snapshot
- **Who:** Microsoft AI for Good Lab + Gates Foundation + Masakhane African Languages Hub + Google.org. ~$1M pool.
- **Apply:** Submittable — **masakhane.submittable.com** (linked from the Microsoft Research / Masakhane pages). *Confirm exact form fields/word limits there.*
- **Deadline:** 15 June 2026.
- **Tiers (cash + compute credits):**
  | Track | Cash | Compute | Scope |
  |---|---|---|---|
  | Data creation | ≤ $50K | ≤ $50K | build/curate/document/validate/license datasets |
  | Model / tool | ≤ $100K | ≤ $100K | models, benchmarks, tooling, infra |
  | **Sectoral applications** | **≤ $250K** | **≤ $400K** | deploy language tech in a real sector, measurable impact |
  Ranges are guidance, not ceilings. Also includes **Azure + GCP credits** and **AI for Good Lab** technical collaboration + fellows.
- **Rubric (de-facto):** (1) community engagement/buy-in; (2) cross-institutional collaboration (named African partner; consortia encouraged); (3) credible pathway to **measurable impact** in a priority sector (agriculture, education, **health**, financial inclusion, civic); (4) clear beneficiaries + **open licensing & governance** across text/speech/vision.

## 2. Our bid: Health (Sectoral), designed to fund at multiple levels
We bid the **Sectoral / health** track. To de-risk the larger ask, the proposal is
layered so reviewers can fund it anywhere:
- **Base (solid on its own, ~$100K-equivalent):** community-collected, consensus-verified **open voice corpus** for Cameroonian languages + first **open ASR/TTS** models + the live collection platform.
- **Upside (justifies $250K / $400K compute):** a **Ministry-of-Health pilot** deploying voice health communication, with measured outcomes.

Why not just aim small: a data-only bid is the most crowded, least-differentiated
pile and wastes our unique assets (live platform, community + benefit-sharing, a
government channel). Safety comes from **execution** (signed MoH letter + a
carefully-scoped, non-diagnostic pilot), not from asking for less.

## 3. Fit & differentiators
- **55 oral-first Cameroonian languages** — exactly the inclusion gap; voice-first because speakers can't write them.
- **Community is the architecture:** role-based campaigns, consensus verification, **quality-weighted points → cash/mobile-money (benefit-sharing)**, SMS/WhatsApp magic-link onboarding for non-literate users.
- **Open ethos already shipped:** open Marian models + `cameroon_bibles` dataset on Hugging Face; live translator on Cloudflare.
- **Responsible-AI built in:** consent, right-to-withdraw, audit log, anti-gaming (see `DATA_GOVERNANCE.md`).
- **Pedigree:** Klaus Tschira Foundation / Alumnode.

## 4. Gaps → how we close them (next 11 days)
1. **Named sector + partner** → MoH letter of support (§8) + university + community org; engage a Masakhane researcher.
2. **Visible openness** → add licenses + model/dataset cards + a datasheet to the HF repos; publish & cite `DATA_GOVERNANCE.md`.
3. **`cameroon_bibles` provenance/register** → document licensing; position as legacy seed; community everyday-speech corpus is the flagship.
4. **Be precise** about what's live (text MT, collection platform, translator on Cloudflare) vs. roadmap (ASR/TTS, pilot).
5. **Security:** Redis creds moved to `REDIS_URL` env — **rotate the password**.

## 5. The health pilot
**Problem.** Few physicians per capita, concentrated in cities; health workers are
posted to regions whose languages they don't speak; many patients (rural, elderly,
women) have limited French/English → miscommunication, lower uptake, worse
outcomes. No model trained only on French/English fixes this.

**Solution (voice-first language bridge):**
1. **Localized health voice advisories** — maternal/child-health & vaccination messages as **audio (TTS)** over phone/WhatsApp/health posts in N languages.
2. **Clinician communication support** — common **intake/triage phrases** between a non-local-language worker and patient.
Powered by community-collected, **consensus-verified** voice data → **open ASR/TTS**.

**Partner.** Ministry of Health (sites, clinical validation, reach) + Cameroonian
university (linguistics/CS) + community/cultural org; align with Masakhane.

**Deliverables (open).** Verified voice corpus (N languages, target hours) + open
ASR/TTS checkpoints on HF + the localized health-message set; the platform; the
pilot deployment. CC/open-licensed with datasheets.

**Metrics.** # languages; **% non-literate/oral-first patients reached** (headline);
# messages localized & verified; # patients/caregivers reached; **comprehension
uplift vs French-only baseline**; health-worker usability; cost per verified
utterance; ASR WER / TTS MOS.

**Safety / responsible AI.** Health **education & communication support only — no
autonomous diagnosis/treatment**; message content **clinically reviewed &
Ministry-approved**; human-in-the-loop; consent, right-to-withdraw, audit, open
governance; clear model limitations.

## 6. Draft application narrative (sections → bullets)
1. **Problem** — 55 oral-first Cameroonian languages, largely non-literate speakers, invisible to AI; health language barrier costs lives/uptake.
2. **Who we are** — flagship-ai / lingo.cm: live French-pivot MT, open models + dataset, Cloudflare deployment, Klaus Tschira/Alumnode backing.
3. **What we'll build** — open voice corpus → open ASR/TTS → MoH-piloted voice health service for [beneficiary group].
4. **Community & partnership** — co-designed with MoH + [university] + [community org]; Masakhane alignment; SMS/WhatsApp + image/TTS prompts for non-readers.
5. **Sectoral impact & metrics** — pilot in [region(s)]; baseline; measured outcome; metric dashboard (§5).
6. **Openness & responsible AI** — CC-licensed corpora + datasheets; open ASR/TTS on HF; public governance + consent; right-to-withdraw; integrity controls.
7. **Technical plan & use of Azure / AI for Good Lab** — architecture; audio QC; training loop; Azure GPU/Blob/Speech/OpenAI; request AI for Good Lab collaboration + responsible-AI review.
8. **Budget, timeline, sustainability** — cash/compute by workstream; phased roadmap (collect → models → pilot); path beyond the grant.

## 7. 150-word summary (submittable; fill brackets)
> Cameroon has ~55 living languages, most oral-first and spoken by people who
> cannot write them — so they're invisible to AI, and patients can't get health
> information in their own tongue. Lingo (flagship-ai) closes this gap voice-first.
> Our community platform lets a researcher launch a campaign and invite local
> speakers, verifiers and reviewers to record short prompts via hold-to-record on
> cheap Android phones — onboarded by SMS/WhatsApp so non-literate users fully
> participate. The community verifies recordings by consensus, and contributors
> earn quality-weighted points redeemable for mobile-money, sharing real value
> back. Verified audio becomes openly licensed datasets and open ASR/TTS models on
> Hugging Face, extending our live translator for ~55 languages. With LINGUA Africa
> and the Ministry of Health we will pilot voice health communication — maternal,
> child-health and vaccination advisories — reaching **[N]** patients in their own
> language. Built low-bandwidth, offline-first, and governed by consent and open
> licenses.

## 8. Ministry of Health — Letter of Support template
*Short and signable beats long. MoH letterhead; adapt; sign. Even "intent to
collaborate" suffices.*

> [MoH letterhead — date]
>
> **Re: Letter of Support — Lingo / NativeAI voice-language health pilot (LINGUA Africa)**
>
> The Ministry of Health of Cameroon supports the application by Lingo / NativeAI
> (flagship-ai) to the LINGUA Africa Open Call for Inclusive AI Language Projects.
>
> Access to health information and care in Cameroon is constrained by the gap
> between the languages spoken by health workers and those spoken by many
> patients, particularly in rural and underserved communities. Lingo's proposal to
> build community-sourced voice datasets and open speech models, and to pilot
> voice-based health communication (e.g. maternal/child-health and vaccination
> advisories, and clinician–patient communication support) in [region(s)/
> facility(ies)], addresses a real need in our health system.
>
> Should the project be funded, the Ministry intends to collaborate by
> [identifying pilot sites; reviewing/approving health-message content for clinical
> accuracy; facilitating engagement with health workers and communities; advising
> on evaluation]. This collaboration is non-financial and subject to appropriate
> agreements and approvals.
>
> We welcome inclusive, community-owned technology that helps deliver health
> services to Cameroonians in their own languages.
>
> Sincerely, [Name, title, department, contact]

## 9. Use of Azure / AI for Good Lab (write into budget)
Azure **GPU (NC/ND)** for ASR/TTS training; **Azure Blob** for corpus; **Azure AI
Speech** as a baseline; **Azure OpenAI** for prompt authoring. Request **AI for
Good Lab** help on extremely-low-resource modeling + an external **responsible-AI
review** of consent/governance. (Asking for the in-kind help, not just cash,
scores well.)

## 10. Action checklist (critical path)
- [ ] Send MoH contact the pilot one-pager (§5) + signable letter (§8) — **now**.
- [ ] Secure 1-2 more partners (university + community org).
- [ ] Engage a Masakhane-affiliated Cameroonian researcher.
- [ ] HF: add licenses + model/dataset cards + datasheet; publish/cite governance.
- [ ] Decide pilot region(s), N beneficiaries, baseline + outcome metric.
- [ ] Record a 2-3 min honest demo of the inclusion loop.
- [ ] Rotate Redis password; confirm Azure utilization plan.
- [ ] Fill brackets, finalize narrative, **submit before 15 June**.

## 11. Open questions to resolve
- Exact Submittable fields/word limits and any numeric rubric.
- Pilot region(s) + concrete beneficiary outcome to measure.
- Which languages for the health pilot (start with the most-spoken in the pilot region).
- Consortium legal/MoU shape; who is lead applicant.
