import React from "react";
import { NavLink, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card } from "../../components/Card";
import { blogPosts, getBlogPost, loadBlogPostRaw } from "../../../content/blog/blogIndex";
import { stripLeadingH1 } from "../../../content/contentIndex";

function titleCase(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function BlogPostPage() {
  const params = useParams();
  const category = (params.category ?? "").trim();
  const slug = (params.slug ?? "").trim();

  const meta = getBlogPost(category, slug);
  const [raw, setRaw] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<"loading" | "ok" | "missing">(
    "loading",
  );

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      setStatus("loading");
      const next = await loadBlogPostRaw(category, slug);
      if (cancelled) return;
      if (!next) {
        setRaw(null);
        setStatus("missing");
        return;
      }
      setRaw(next);
      setStatus("ok");
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [category, slug]);

  const title = meta?.title ?? "Post";
  React.useEffect(() => {
    document.title = `${title} · Blog · PDF Changer`;
  }, [title]);

  const stripped = React.useMemo(() => {
    if (!raw) return { title: null as string | null, body: "" };
    return stripLeadingH1(raw);
  }, [raw]);
  const body = stripped.body;
  const displayTitle = stripped.title ?? title;

  const related = React.useMemo(
    () =>
      meta
        ? blogPosts
            .filter((p) => p.category === meta.category && p.route !== meta.route)
            .slice(0, 4)
        : [],
    [meta],
  );

  const readingMinutes = React.useMemo(() => {
    const text = body
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`[^`]*`/g, " ")
      .replace(/\[[^\]]+\]\([^)]+\)/g, "$1")
      .replace(/[#>*_-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) return meta?.readingMinutes ?? 4;
    const words = text.split(" ").filter(Boolean).length;
    return Math.max(1, Math.round(words / 220));
  }, [body, meta?.readingMinutes]);

  const chronological = React.useMemo(() => {
    return [...blogPosts].sort((a, b) => {
      if (a.date === b.date) return a.title.localeCompare(b.title);
      return a.date < b.date ? 1 : -1;
    });
  }, []);
  const currentIndex = meta
    ? chronological.findIndex((p) => p.route === meta.route)
    : -1;
  const newer = currentIndex > 0 ? chronological[currentIndex - 1] : null;
  const older =
    currentIndex >= 0 && currentIndex < chronological.length - 1
      ? chronological[currentIndex + 1]
      : null;

  if (status === "loading") {
    return (
      <div className="space-y-4">
        <div className="h-7 w-56 animate-pulse rounded bg-neutral-200" />
        <div className="h-48 animate-pulse rounded-sm border border-neutral-200 bg-white" />
      </div>
    );
  }

  if (status === "missing" || !meta) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Not found</h1>
        <div className="rounded-sm border border-neutral-200 bg-white p-6 text-sm text-neutral-700 shadow-sm">
          This post doesn’t exist. Go back to{" "}
          <NavLink to="/blog" className="text-neutral-900 underline">
            Blog
          </NavLink>
          .
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-xs text-neutral-500">
          <NavLink to="/blog" className="hover:text-neutral-900">
            Blog
          </NavLink>{" "}
          /{" "}
          <NavLink
            to={`/blog/${meta.category}`}
            className="hover:text-neutral-900"
          >
            {titleCase(meta.category)}
          </NavLink>{" "}
          / {meta.date} · {readingMinutes} min read
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{displayTitle}</h1>
        <p className="max-w-3xl text-sm text-neutral-700">{meta.teaser}</p>
      </div>

      <Card title="Read this first">
        <p className="text-neutral-700">
          This guide is general information, not legal advice. If you may face
          retaliation or legal risk, consider speaking to a qualified lawyer or
          a trusted journalist organization before acting.
        </p>
      </Card>

      <div className="rounded-sm border border-neutral-200 bg-white p-6 shadow-sm">
        <article className="prose prose-neutral prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
        </article>
      </div>

      {related.length ? (
        <Card title="Related">
          <ul className="list-inside list-disc space-y-2 text-neutral-700">
            {related.map((p) => (
              <li key={p.route}>
                <NavLink to={p.route} className="underline">
                  {p.title}
                </NavLink>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card title="Continue reading">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Newer
            </div>
            {newer ? (
              <NavLink to={newer.route} className="text-sm text-neutral-900 underline">
                {newer.title}
              </NavLink>
            ) : (
              <div className="text-sm text-neutral-500">No newer post.</div>
            )}
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Older
            </div>
            {older ? (
              <NavLink to={older.route} className="text-sm text-neutral-900 underline">
                {older.title}
              </NavLink>
            ) : (
              <div className="text-sm text-neutral-500">No older post.</div>
            )}
          </div>
        </div>
      </Card>

      <div className="text-sm text-neutral-600">
        <NavLink to="/scrub" className="underline">
          Scrub a PDF locally
        </NavLink>{" "}
        or{" "}
        <NavLink to="/security" className="underline">
          read the threat model
        </NavLink>
        .
      </div>
    </div>
  );
}
