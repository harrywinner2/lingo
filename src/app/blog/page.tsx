import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import { Logo } from "@/components/logo";
import { postsNewestFirst, formatDate } from "@/content/blog";

export const metadata = {
  title: "Research log · Lingo",
  description:
    "How we're preserving Cameroon's oral-first languages — corpus, models, voice, funding, and the engineering behind it.",
};

export default function BlogIndex() {
  const posts = postsNewestFirst();
  return (
    <div className="bg-grain flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <Link href="/">
            <Logo />
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent-600">Research log</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
            Notes from the work
          </h1>
          <p className="mt-3 max-w-xl text-muted">
            The choices, the dead ends, the data we had to compile by hand, and the
            engineering that keeps dozens of languages online for almost nothing.
          </p>
        </div>

        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/blog/${p.slug}`}
                className="block rounded-2xl border border-line bg-card p-5 transition hover:border-accent/40 hover:shadow-soft"
              >
                <div className="flex items-center gap-3 text-xs font-medium text-muted">
                  <time dateTime={p.date}>{formatDate(p.date)}</time>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {p.readingMinutes} min
                  </span>
                </div>
                <h2 className="mt-1.5 font-display text-xl font-semibold tracking-tight">{p.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{p.excerpt}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.tags.map((t) => (
                    <span key={t} className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-medium text-muted">
                      {t}
                    </span>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
