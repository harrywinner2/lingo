import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { Logo } from "@/components/logo";
import { Markdown } from "@/components/markdown";
import { POSTS, getPost, formatDate, postsNewestFirst } from "@/content/blog";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Not found · Lingo" };
  return { title: `${post.title} · Lingo`, description: post.excerpt };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const all = postsNewestFirst();
  const idx = all.findIndex((p) => p.slug === post.slug);
  const older = all[idx + 1];

  return (
    <div className="bg-grain flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3.5">
          <Link href="/">
            <Logo />
          </Link>
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> All posts
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12">
        <article>
          <div className="mb-2 flex items-center gap-3 text-xs font-medium text-muted">
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {post.readingMinutes} min read
            </span>
            <span>· {post.author}</span>
          </div>
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight">{post.title}</h1>
          <p className="mt-3 text-lg text-muted">{post.excerpt}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {post.tags.map((t) => (
              <span key={t} className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-medium text-muted">
                {t}
              </span>
            ))}
          </div>
          <hr className="my-8 border-line" />
          <Markdown source={post.body} />
        </article>

        <nav className="mt-12 border-t border-line pt-6">
          {older ? (
            <Link href={`/blog/${older.slug}`} className="group block rounded-xl border border-line bg-card p-4 transition hover:border-accent/40">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">Earlier</span>
              <p className="mt-0.5 font-display text-lg font-semibold tracking-tight group-hover:text-accent-600">
                {older.title}
              </p>
            </Link>
          ) : (
            <Link href="/blog" className="text-sm font-semibold text-accent-600">
              ← Back to all posts
            </Link>
          )}
        </nav>
      </main>
    </div>
  );
}
