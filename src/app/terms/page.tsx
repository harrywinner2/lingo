import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { Markdown } from "@/components/markdown";

export const metadata = {
  title: "Terms of Service · Lingo",
  description: "The terms governing use of Lingo.",
};

const CONTENT = `# Terms of Service

_Last updated: 5 June 2026_

These terms govern your use of Lingo / NativeAI ("Lingo", "we"), the language-
preservation platform at [lingo.cm](https://lingo.cm). By using Lingo you agree to them.

## The service

Lingo lets researchers run campaigns to collect voice data for Cameroonian languages,
lets contributors record and verify recordings and earn rewards, and offers an open
text translator. Features may change as the project evolves.

## Accounts & eligibility

You are responsible for your account and for the accuracy of the information you
provide. You should be an adult, or have guardian consent where required by local law.
Don't misuse the service, attempt to disrupt it, upload content you have no right to
share, or submit recordings that are abusive, unlawful, or not your own voice (unless
you have the speaker's consent).

## Contributions & licence

When you contribute a recording, you confirm that **you have the right to do so** and
you grant Lingo permission to process it and to include **cleaned, consented clips** in
open language datasets that advance language preservation and model training. We do not
publish your name, contact details, or raw audio. You may withdraw and request removal
of your contributions where feasible (see the [Privacy Policy](/privacy)).

## Rewards & points

Some campaigns award points for quality contributions, funded from a campaign's budget
and redeemable as that campaign defines (e.g. cash, mobile money, or goods). Points have
no independent cash value, are not transferable, and redemptions are administered by the
campaign's organisers. We are not responsible for a researcher's failure to honour
campaign-specific reward terms.

## Open models & data

Our models and open datasets are released under their stated licences (e.g. CC-BY-4.0)
on [Hugging Face](https://huggingface.co/flagship-ai). Those licences govern reuse of
those artifacts.

## Third-party connections

If you connect a third-party account (e.g. Google Drive or OneDrive) to export your
data, that connection is subject to that provider's terms; we access only what is needed
to perform the export you request.

## Disclaimers

Lingo is provided "as is". Machine translations and model outputs are imperfect and
should not be relied on for high-stakes use (legal, medical, safety) without human
review. We do not warrant uninterrupted or error-free service.

## Limitation of liability

To the maximum extent permitted by law, Lingo and its partners are not liable for
indirect, incidental, or consequential damages arising from use of the service.

## Changes & contact

We may update these terms; material changes will be reflected by the "Last updated"
date. Questions: [lingo.cm](https://lingo.cm) or [WhatsApp](https://wa.me/237675112818).

> These terms are provided in good faith for transparency; they are not legal advice and
> should be reviewed against applicable law (including the governing jurisdiction of the
> operating entity) before being relied upon.
`;

export default function TermsPage() {
  return (
    <div className="bg-grain flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3.5">
          <Link href="/"><Logo /></Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12">
        <Markdown source={CONTENT} />
        <p className="mt-10 text-sm text-muted">
          See also our <Link href="/privacy" className="font-semibold text-accent-600">Privacy Policy</Link> and{" "}
          <Link href="/governance" className="font-semibold text-accent-600">Governance</Link> page.
        </p>
      </main>
    </div>
  );
}
