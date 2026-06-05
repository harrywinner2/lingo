import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { Markdown } from "@/components/markdown";

export const metadata = {
  title: "Privacy Policy · Lingo",
  description: "How Lingo collects, uses, stores, and shares data.",
};

const CONTENT = `# Privacy Policy

_Last updated: 5 June 2026_

Lingo / NativeAI ("Lingo", "we") builds open language technology for Cameroon's
oral-first languages. This policy explains what we collect, why, how long we keep it,
and your rights. Questions: reach us via [lingo.cm](https://lingo.cm) or
[WhatsApp](https://wa.me/237675112818).

## What we collect

- **Account information** — when you sign in (Google, Microsoft, Apple, or a magic
  link), we receive your name, email, and a provider account identifier.
- **Contributor details** — if a researcher invites you to a campaign, we may hold your
  name and a contact (phone or email) to administer participation and rewards.
- **Voice recordings** — the audio you submit, plus the prompt it answers and basic
  metadata (duration, timestamps).
- **Verification & rewards data** — your ratings of recordings, points earned, and
  redemption requests.
- **Minimal technical data** — needed to operate the service (e.g. session cookies, a
  language-preference cookie).

We do **not** sell personal data, and we do not run third-party advertising trackers.

## How we use it

- To run the contribute → verify → reward loop.
- To build **open voice and text datasets** for language preservation and model
  training — with your consent, and only from cleaned, consented recordings.
- To administer rewards and prevent abuse.

## How we store and retain it

- **Raw audio is processed and then purged** shortly after; only **cleaned, consented
  clips** are retained for the corpus.
- **Personal data is minimised** and kept only as long as needed to administer your
  participation and rewards; you can request deletion at any time.
- Data is stored on reputable cloud infrastructure (Cloudflare; object storage for
  audio).

## What is shared, and what is never shared

- **Open datasets:** cleaned, consented voice clips and open text may be published under
  an open licence (e.g. on Hugging Face). **Your name, contact details, and raw audio
  are never published.**
- **Service providers** that process data on our behalf: authentication providers you
  choose (Google / Microsoft / Apple), hosting (Cloudflare), and email delivery (for
  magic links). They process data only to provide their service.
- **Export to your own cloud (Google Drive / OneDrive):** if *you* connect Drive or
  OneDrive, we upload **dataset exports you request to your own account**. We use the
  least-privilege scope (Google \`drive.file\`), so Lingo can only see files it creates —
  not the rest of your Drive.

## Cookies

We use strictly necessary cookies for sign-in/session and a cookie to remember your
language preference. No advertising or cross-site tracking cookies.

## Your rights

- Access, correct, or delete your personal data.
- Withdraw consent and stop contributing at any time.
- Request that we remove recordings you contributed where feasible.

To exercise any of these, contact us via [lingo.cm](https://lingo.cm) or
[WhatsApp](https://wa.me/237675112818).

## Children

Lingo is not directed at children. Contributors should be adults, or have guardian
consent where required by local law.

## Changes

We may update this policy; material changes will be reflected by the "Last updated"
date above.

> This policy is provided in good faith for transparency; it is not legal advice. The
> operating entity should have it reviewed against applicable law before relying on it.
`;

export default function PrivacyPage() {
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
          See also our <Link href="/terms" className="font-semibold text-accent-600">Terms of Service</Link> and{" "}
          <Link href="/governance" className="font-semibold text-accent-600">Governance</Link> page.
        </p>
      </main>
    </div>
  );
}
