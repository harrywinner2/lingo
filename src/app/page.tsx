import Link from "next/link";
import {
  Mic,
  CheckCircle2,
  Gift,
  ArrowRight,
  Globe2,
  Sparkles,
  Languages,
  Database,
  Download,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { TARGET_LANGUAGES } from "@/lib/languages";

export default function Home() {
  return (
    <div className="flex flex-col min-h-full">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Logo />
          <div className="flex items-center gap-2">
            <Link href="/translate" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                Translate
              </Button>
            </Link>
            <Link href="/signin">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/signin">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-grain relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-5 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="max-w-3xl animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-sm font-medium text-muted">
              <Globe2 className="h-4 w-4 text-accent" />
              Preserving spoken-first African languages
            </span>
            <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              Every voice keeps a<br />
              <span className="text-primary-600">language alive.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              Lingo turns spoken contributions into open voice data. Researchers
              launch a campaign, speakers record short phrases, the community
              verifies them — and everyone earns rewards. Together we build the
              corpora that train tomorrow&apos;s translation models.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signin">
                <Button size="lg">
                  Start contributing <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/signin">
                <Button size="lg" variant="outline">
                  I&apos;m a researcher
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-line bg-card">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            How it works
          </h2>
          <p className="mt-2 max-w-xl text-muted">
            A simple loop, designed for low bandwidth and people who speak a
            language but may never have written it.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {[
              {
                icon: Mic,
                tone: "text-primary-600 bg-primary/12",
                title: "1 · Record",
                body: "See a prompt in a language you read, then hold to speak it in your mother tongue. Re-record until it feels right.",
              },
              {
                icon: CheckCircle2,
                tone: "text-accent-600 bg-accent/12",
                title: "2 · Verify",
                body: "Listen to others' recordings and rate whether they match the prompt. Consensus decides what enters the corpus.",
              },
              {
                icon: Gift,
                tone: "text-success bg-success/12",
                title: "3 · Earn",
                body: "Quality contributions earn points from the campaign budget — redeemable for cash, mobile money, or goods.",
              },
            ].map((s) => (
              <div
                key={s.title}
                className="rounded-[var(--radius)] border border-line bg-paper p-6"
              >
                <span
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${s.tone}`}
                >
                  <s.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For researchers */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-accent-600">
              <Sparkles className="h-4 w-4" /> For researchers
            </span>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight">
              Launch a campaign in minutes
            </h2>
            <p className="mt-3 text-muted leading-relaxed">
              Pick a target language, set a points budget, and import your
              prompts from a CSV — or generate culturally-adapted ones with AI.
              Invite speakers and verifiers by role with a single link, then
              watch verified recordings flow into a clean, exportable dataset.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm">
              {[
                "CSV prompt import with live preview",
                "Roles: speaker, verifier, reviewer, manager",
                "Quality-weighted rewards & budget guardrails",
                "Works in the browser and as an installable app",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-accent" />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/signin" className="mt-7 inline-block">
              <Button>
                Create a campaign <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="rounded-[var(--radius)] border border-line bg-card p-6 shadow-lift">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="font-semibold">Languages in the corpus</span>
              <span className="text-sm text-muted">
                {TARGET_LANGUAGES.length} and growing
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {TARGET_LANGUAGES.map((l) => (
                <span
                  key={l.code}
                  className="rounded-full border border-line bg-paper px-3 py-1 text-sm font-medium"
                >
                  {l.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Heritage / our roots */}
      <section className="border-t border-line bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <Database className="h-4 w-4" /> Our roots
          </span>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight">
            We started with text. You can still use it.
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-paper/70">
            Lingo began as <strong className="text-paper">lingo.cm</strong> — a
            cost-efficient, French-pivot machine-translation service for
            Cameroonian languages, trained on a text corpus we compiled
            ourselves (including the open{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5">cameroon_bibles</code>{" "}
            dataset). Those models are open and live. The voice project is the
            next chapter — but the foundation is yours to use and download.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <HeritageCard
              href="/translate"
              icon={Languages}
              title="Use the translator"
              desc="Translate text now, while a worker is online."
              internal
            />
            <HeritageCard
              href="https://huggingface.co/flagship-ai"
              icon={Download}
              title="Models on Hugging Face"
              desc="Download & run our open Marian models."
            />
            <HeritageCard
              href="https://huggingface.co/datasets/flagship-ai/cameroon_bibles"
              icon={Database}
              title="The cameroon_bibles dataset"
              desc="The compiled corpus behind the models."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-line bg-card">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
          <Logo />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <Link href="/translate" className="font-medium text-muted hover:text-ink">
              Translator
            </Link>
            <a
              href="https://huggingface.co/flagship-ai"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-muted hover:text-ink"
            >
              Hugging Face <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <a
              href="https://wa.me/237675112818"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-muted hover:text-ink"
            >
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
          </div>
          <p className="text-sm text-muted">Lingo / NativeAI</p>
        </div>
      </footer>
    </div>
  );
}

function HeritageCard({
  href,
  icon: Icon,
  title,
  desc,
  internal = false,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  internal?: boolean;
}) {
  const inner = (
    <div className="group h-full rounded-[var(--radius)] border border-white/10 bg-white/5 p-5 transition hover:bg-white/10">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/20 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-3 flex items-center gap-1.5 font-semibold">
        {title}
        {!internal && <ExternalLink className="h-3.5 w-3.5 text-paper/50" />}
        {internal && (
          <ArrowRight className="h-4 w-4 text-paper/50 transition group-hover:translate-x-0.5" />
        )}
      </h3>
      <p className="mt-1 text-sm text-paper/60">{desc}</p>
    </div>
  );
  return internal ? (
    <Link href={href}>{inner}</Link>
  ) : (
    <a href={href} target="_blank" rel="noreferrer">
      {inner}
    </a>
  );
}
