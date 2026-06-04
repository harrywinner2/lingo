# Health sectoral pilot + Ministry of Health partnership (LINGUA Africa)

## Why health-sectoral is the right bid
LINGUA Africa rewards sectoral impact + community + named cross-institutional
partnership. A Cameroon doctor-shortage + language-barrier health case with a
**Ministry of Health** partner is the best-aligned, highest-EV option — stronger
than a generic small data grant. The risk isn't the size; it's execution:
(1) get the partnership **on paper** by 15 June, (2) scope a **safe, measurable,
non-diagnostic** pilot. Design the base deliverable (open voice corpus + first
ASR/TTS + platform) to stand alone, with the MoH pilot as the upside that
justifies the Sectoral tier.

## The pilot — one-pager

**Problem.** Cameroon has very few physicians per capita, concentrated in cities;
health workers are routinely posted to regions whose languages they don't speak,
while many patients (rural, elderly, women) have limited French/English. The
result is miscommunication, lower uptake of care, and worse outcomes — an
inclusion failure no model trained only on French/English can fix.

**Solution (voice-first language bridge for frontline health):**
1. **Localized health voice advisories** — maternal/child-health and vaccination
   messages delivered as **audio (TTS)** over phone/WhatsApp/health posts in N
   target languages, so non-literate patients understand in their mother tongue.
2. **Clinician communication support** — common **intake/triage phrases**
   between a non-local-language health worker and patient (text+voice), reducing
   the language gap at the point of care.
Both are powered by **community-collected, consensus-verified voice data** →
**open ASR/TTS** models, extending our live translator.

**Partner.** Ministry of Health (deployment sites, clinical validation of message
content, reach), plus a Cameroonian university (linguistics/CS) and a community/
cultural organization. Align with a Masakhane-affiliated researcher.

**Deliverables (open).** Verified voice corpus (N languages, target hours) + open
ASR/TTS checkpoints on Hugging Face + the localized health-message set, all
CC/open-licensed with datasheets; the collection platform; the pilot deployment.

**Metrics.** # languages; **% non-literate / oral-first patients reached** (our
headline differentiator); # health messages localized & verified; # patients/
caregivers reached; **comprehension uplift vs. a French-only baseline**;
health-worker usability; cost per verified utterance; ASR WER / TTS MOS.

**Safety & responsible AI.** Health **education & communication support only — no
autonomous diagnosis or treatment advice**; message content **clinically reviewed
and Ministry-approved**; human-in-the-loop; explicit consent, right-to-withdraw,
audit trail, and open governance (see `DATA_GOVERNANCE.md`). Clear statement of
limitations for low-resource models.

**Why it wins.** It turns a horizontal data tool into a measurable health
intervention for underserved language communities, with a government partner, a
working platform, open deliverables, and benefit-sharing built in.

---

## Ministry of Health — Letter of Support template

*Short and signable beats long. Put on MoH letterhead, adapt, sign. Even an
"intent to collaborate" is enough for the application.*

> [Ministry of Health letterhead — date]
>
> **Re: Letter of Support — Lingo / NativeAI voice-language health pilot
> (LINGUA Africa Open Call)**
>
> The Ministry of Health of Cameroon supports the application by Lingo /
> NativeAI (flagship-ai) to the LINGUA Africa Open Call for Inclusive AI Language
> Projects.
>
> Access to health information and care in Cameroon is constrained by the gap
> between the languages spoken by health workers and those spoken by many
> patients, particularly in rural and underserved communities. Lingo's proposal
> to build community-sourced voice datasets and open speech models, and to pilot
> voice-based health communication (e.g. maternal/child-health and vaccination
> advisories, and clinician–patient communication support) in [region(s) /
> facility(ies)], addresses a real need in our health system.
>
> Should the project be funded, the Ministry intends to collaborate by
> [e.g. identifying pilot sites; reviewing and approving health-message content
> for clinical accuracy; facilitating engagement with health workers and
> communities; advising on evaluation]. This collaboration is non-financial and
> subject to the appropriate agreements and approvals.
>
> We welcome inclusive, community-owned technology that helps deliver health
> services to Cameroonians in their own languages.
>
> Sincerely,
> [Name, title, department, contact]

---

## Critical path (11 days)
1. Send the MoH contact the one-pager + the signable letter **now** (warm ask).
2. Confirm 1-2 more partners (university + community org).
3. Finalize the Sectoral narrative (base deliverables solid; pilot as upside).
4. Add licenses/model-cards/datasheets on Hugging Face; cite `DATA_GOVERNANCE.md`.
5. Record the 2-3 min demo. Submit before 15 June.
