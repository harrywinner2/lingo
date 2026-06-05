import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { Markdown } from "@/components/markdown";

export const metadata = {
  title: "Governance & privacy · Lingo",
  description:
    "Who runs Lingo, how we handle contributor consent and data, our open-release policy, and how to reach us.",
};

const CONTENT = `# Governance & privacy

How Lingo / NativeAI is run, how we treat the people who contribute their voices,
and what we open to the world. This page exists so anyone doing due diligence finds
real answers, not a blank.

## Who we are

Lingo is built by a small consortium working on open language technology for
Cameroon's oral-first languages:

- **Flagship** — research, models, and the platform.
- **KIAMA** — community engagement and field deployment (agriculture/extension and health pathways).
- **Sense Africa** — partnership and on-the-ground reach.

The project grew out of lingo.cm, an open French-pivot machine-translation service for
Cameroonian languages, and is supported by the **Klaus Tschira Foundation** via the
**Alumnode** programme.

## Contributor consent

People who contribute recordings do so knowingly and are rewarded for it:

- Contributors join a campaign and **consent** to their recordings being used to build
  open voice data for language preservation and model training.
- Quality contributions earn points redeemable for cash, mobile money, or goods — work
  is compensated, not extracted.
- Participation is by invitation/role (speaker, verifier, reviewer, manager) and can be
  declined or stopped at any time.

## Data governance

- **Personal data is minimised.** We store a contributor's name and a contact (phone or
  email) only to administer consent, roles, and reward redemption — never published.
- **Raw audio is not released.** It is processed (trimmed, normalised, quality-gated),
  and only **cleaned, consented clips** enter the open corpus.
- **Metadata is kept; raw audio is purged** shortly after preprocessing.
- Access to personal data is restricted to project administration.

## Open-release policy

Public goods stay public. Our models (fp32 originals + int8 serving) and documentation
are open on [Hugging Face](https://huggingface.co/flagship-ai) under CC-BY-4.0; cleaned
voice data is released in versioned drops as it accumulates; contributor personal data
and raw audio are never released; and any underlying third-party text (e.g. copyrighted
Bible translations) is shared only where licensing permits. A hosted convenience service
may exist, but the underlying public goods remain open and self-hostable. Full detail in
our open-release policy and the [research log](/blog).

## Privacy summary

- **What we collect:** account info (via sign-in), contributor contact details, the
  recordings you submit, and basic usage needed to run campaigns and rewards.
- **Why:** to operate the contribution → verification → reward loop and to build open
  language data with consent.
- **Retention:** personal data only as long as needed to administer your participation
  and rewards; raw audio purged after processing.
- **Your control:** you can stop contributing and request removal of your personal data.

## Contact

Reach us via [WhatsApp](https://wa.me/237675112818) or through
[lingo.cm](https://lingo.cm). For data or privacy requests, contact the project team
through the same channels.
`;

export default function GovernancePage() {
  return (
    <div className="bg-grain flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3.5">
          <Link href="/">
            <Logo />
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12">
        <Markdown source={CONTENT} />
      </main>
    </div>
  );
}
