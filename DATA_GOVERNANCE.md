# Data Governance, Consent & Licensing — Lingo / NativeAI

Lingo collects spoken language data from communities whose languages are
endangered and largely oral. We treat that data — and the people who give it —
with care. This document is the public statement of how.

## Consent
- Every contributor explicitly agrees, at sign-up and before recording, that
  their voice recordings are collected for **language-preservation research and
  the training of open language models**.
- Onboarding works without literacy or email: contributors can join via an
  SMS/WhatsApp/email **magic link**, and prompts are presented with text **and**
  (where available) an image and audio, so people who can't read the prompt
  language can still participate with informed understanding.
- Consent metadata is recorded with each submission.

## Right to withdraw
- A contributor may request removal of their contributions at any time. We delete
  their raw and cleaned recordings and exclude them from future dataset exports.
- Per-contributor data is keyed to their account, so withdrawal is actionable.

## Benefit-sharing
- Contributions are rewarded with **points** drawn from a campaign budget,
  **quality-weighted** by community verification, and **redeemable for cash,
  mobile money, or goods**. Value flows back to the communities providing the
  data — this is benefit-sharing by design, tracked in an append-only ledger.

## Data lifecycle & minimization
- **Metadata** (prompt, language, quality metrics, consent) is retained.
- **Raw audio** is purged shortly after preprocessing; only **cleaned,
  normalized** clips are retained for verification and training.
- Researchers may opt to receive a copy of their campaign's audio in their own
  storage (e.g. OneDrive); otherwise audio stays in the project's R2 bucket only
  as long as needed.

## Integrity & anti-abuse
- Recordings are verified by **multiple community members**; consensus decides
  what enters the corpus.
- Verifier reliability is tracked (incl. seeded gold tasks); near-duplicate
  detection and rate limits guard against gaming. An audit log records changes.

## Open licensing
- Verified datasets are released under **open licenses** (e.g. CC-BY / CC-BY-SA)
  with **datasheets** (provenance, consent basis, intended use, limitations).
- Models are released **open** (e.g. Apache-2.0 / MIT) with model cards on
  Hugging Face: https://huggingface.co/flagship-ai
- Legacy seed data (e.g. the compiled `cameroon_bibles` text corpus) is
  documented separately; the flagship resource going forward is the
  community-recorded, everyday-speech voice corpus.

## Scope & limitations
- Religious-register text (Bibles) under-represents everyday speech; the voice
  program exists specifically to collect natural, contemporary language.
- Models for extremely low-resource languages are early; outputs should be
  human-reviewed for sensitive use.

*Questions or withdrawal requests: via the WhatsApp/contact channel on
lingo.cm. This policy evolves with the project and community input.*
