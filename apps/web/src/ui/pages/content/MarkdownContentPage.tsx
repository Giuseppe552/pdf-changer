import React from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  loadContentRaw,
  slugToTitle,
  stripLeadingH1,
} from "../../../content/contentIndex";

export function MarkdownRoutePage() {
  const params = useParams();
  const section = (params.section ?? "").trim();
  const slug = (params.slug ?? "").trim();
  return <MarkdownContentPage section={section} slug={slug} />;
}

export function MarkdownContentPage({
  section,
  slug,
}: {
  section: string;
  slug: string;
}) {
  const [raw, setRaw] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<"loading" | "ok" | "missing">(
    "loading",
  );

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      setStatus("loading");
      const next = await loadContentRaw(section, slug);
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
  }, [section, slug]);

  const fallbackTitle = slug ? slugToTitle(slug) : "Document";
  const { title: h1, body } = raw ? stripLeadingH1(raw) : { title: null, body: "" };
  const title = h1 ?? fallbackTitle;

  React.useEffect(() => {
    document.title = `${title} · PDF Changer`;
  }, [title]);

  if (status === "loading") {
    return (
      <div className="space-y-4">
        <div className="h-7 w-56 animate-pulse rounded bg-neutral-200" />
        <div className="h-48 animate-pulse rounded-sm border border-neutral-200 bg-white" />
      </div>
    );
  }

  if (status === "missing") {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Not found</h1>
        <div className="rounded-sm border border-neutral-200 bg-white p-6 text-sm text-neutral-700 shadow-sm">
          This page doesn’t exist.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="rounded-sm border border-neutral-200 bg-white p-6 shadow-sm">
        <article className="prose prose-neutral prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
        </article>
      </div>
    </div>
  );
}

