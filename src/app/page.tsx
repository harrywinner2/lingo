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
  Heart,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { CORPUS_LANGUAGES } from "@/lib/languages";
import { getDict } from "@/i18n/server";

export default async function Home() {
  const t = await getDict();
  const d = t.landing;

  return (
    <div className="flex flex-col min-h-full">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Logo />
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <Link href="/translate" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                {t.nav.translate}
              </Button>
            </Link>
            <Link href="/blog" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                {t.nav.blog}
              </Button>
            </Link>
            <Link href="/signin">
              <Button variant="ghost" size="sm">
                {t.nav.signin}
              </Button>
            </Link>
            <Link href="/signin">
              <Button size="sm">{t.nav.getStarted}</Button>
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
              {d.badge}
            </span>
            <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              {d.title1}
              <br />
              <span className="text-primary-600">{d.title2}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              {d.subtitle}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signin">
                <Button size="lg">
                  {d.startContributing} <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/signin">
                <Button size="lg" variant="outline">
                  {d.imResearcher}
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
            {d.howTitle}
          </h2>
          <p className="mt-2 max-w-xl text-muted">{d.howSubtitle}</p>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {[
              { icon: Mic, tone: "text-primary-600 bg-primary/12", title: d.recordTitle, body: d.recordBody },
              { icon: CheckCircle2, tone: "text-accent-600 bg-accent/12", title: d.verifyTitle, body: d.verifyBody },
              { icon: Gift, tone: "text-success bg-success/12", title: d.earnTitle, body: d.earnBody },
            ].map((s) => (
              <div key={s.title} className="rounded-[var(--radius)] border border-line bg-paper p-6">
                <span className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${s.tone}`}>
                  <s.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.body}</p>
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
              <Sparkles className="h-4 w-4" /> {d.forResearchers}
            </span>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight">
              {d.launchTitle}
            </h2>
            <p className="mt-3 text-muted leading-relaxed">{d.launchBody}</p>
            <ul className="mt-5 space-y-2.5 text-sm">
              {[d.feat1, d.feat2, d.feat3, d.feat4].map((f) => (
                <li key={f} className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-accent" />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/signin" className="mt-7 inline-block">
              <Button>
                {d.createCampaign} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="rounded-[var(--radius)] border border-line bg-card p-6 shadow-lift">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="font-semibold">{d.corpusTitle}</span>
              <span className="text-sm text-muted">
                {CORPUS_LANGUAGES.length} {d.corpusGrowing}
              </span>
            </div>
            <div className="mt-4 flex max-h-56 flex-wrap gap-1.5 overflow-auto">
              {CORPUS_LANGUAGES.map((l) => (
                <span key={l} className="rounded-full border border-line bg-paper px-2.5 py-1 text-xs font-medium">
                  {l}
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
            <Database className="h-4 w-4" /> {d.rootsBadge}
          </span>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight">
            {d.rootsTitle}
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-paper/70">{d.rootsBody}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <HeritageCard href="/translate" icon={Languages} title={d.useTranslator} desc={d.useTranslatorDesc} internal />
            <HeritageCard href="https://huggingface.co/flagship-ai" icon={Download} title={d.modelsCard} desc={d.modelsCardDesc} />
            <HeritageCard href="https://huggingface.co/datasets/flagship-ai/cameroon_bibles" icon={Database} title={d.datasetCard} desc={d.datasetCardDesc} />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-line bg-card">
        <div className="mx-auto max-w-6xl px-5 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <Logo />
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <Link href="/translate" className="font-medium text-muted hover:text-ink">
                {t.nav.translate}
              </Link>
              <a href="https://huggingface.co/flagship-ai" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-muted hover:text-ink">
                Hugging Face <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a href="https://wa.me/237675112818" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-muted hover:text-ink">
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            </div>
            <p className="text-sm text-muted">{d.footerTagline}</p>
          </div>
          <p className="mt-5 flex items-center justify-center gap-1.5 border-t border-line pt-5 text-center text-xs text-muted">
            <Heart className="h-3.5 w-3.5 text-primary-600" /> {d.funding}
          </p>
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
        {internal && <ArrowRight className="h-4 w-4 text-paper/50 transition group-hover:translate-x-0.5" />}
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
