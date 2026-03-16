import React from "react";
import { NavLink, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card } from "../../components/Card";
import { loadFaqEntry, loadFaqMetaIndex, topicToTitle, type FaqMeta } from "../../../content/faq/faqIndex";

export function FaqQuestionPage() {
  const params = useParams();
  const topic = (params.topic ?? "").trim();
  const slug = (params.slug ?? "").trim();

  const [status, setStatus] = React.useState<"loading" | "ok" | "missing">("loading");
  const [entry, setEntry] = React.useState<Awaited<ReturnType<typeof loadFaqEntry>>>(null);
  const [related, setRelated] = React.useState<FaqMeta[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      setStatus("loading");
      const [nextEntry, all] = await Promise.all([
        loadFaqEntry(topic, slug),
        loadFaqMetaIndex(),
      ]);
      if (cancelled) return;
      if (!nextEntry) {
        setEntry(null);
        setRelated([]);
        setStatus("missing");
        return;
      }
      setEntry(nextEntry);
      const relatedItems = all
        .filter((item) => item.topic === topic && item.route !== nextEntry.meta.route)
        .slice(0, 6);
      setRelated(relatedItems);
      setStatus("ok");
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [topic, slug]);

  const title = entry?.meta.question ?? "FAQ";
  React.useEffect(() => {
    document.title = `${title} · FAQ · PDF Changer`;
  }, [title]);

  if (status === "loading") {
    return (
      <div className="space-y-4">
        <div className="h-7 w-56 animate-pulse rounded bg-[var(--ui-bg-overlay)]" />
        <div className="h-48 animate-pulse rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)]" />
      </div>
    );
  }

  if (status === "missing" || !entry) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Question not found</h1>
        <div className="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 text-sm text-[var(--ui-text-secondary)] shadow-sm">
          This FAQ page does not exist. Open the{" "}
          <NavLink to="/faq" className="underline">
            FAQ hub
          </NavLink>
          .
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-xs text-[var(--ui-text-muted)]">
          <NavLink to="/faq" className="hover:text-[var(--ui-text)]">
            FAQ Hub
          </NavLink>{" "}
          /{" "}
          <NavLink to={`/faq/${entry.meta.topic}`} className="hover:text-[var(--ui-text)]">
            {topicToTitle(entry.meta.topic)}
          </NavLink>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{entry.meta.question}</h1>
      </div>

      <Card title="Short answer">
        <p className="text-[var(--ui-text-secondary)]">{entry.meta.summary}</p>
        <div className="mt-3 text-xs text-[var(--ui-text-muted)]">
          {entry.meta.lastReviewed
            ? `Last reviewed: ${entry.meta.lastReviewed}`
            : "Last reviewed date will be added soon."}
        </div>
      </Card>

      <div className="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
        <article className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.body}</ReactMarkdown>
        </article>
      </div>

      {related.length ? (
        <Card title="Related questions">
          <ul className="list-inside list-disc space-y-2 text-[var(--ui-text-secondary)]">
            {related.map((item) => (
              <li key={item.route}>
                <NavLink to={item.route} className="underline">
                  {item.question}
                </NavLink>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="text-sm text-[var(--ui-text-muted)]">
        Next safe step:{" "}
        <NavLink to="/scrub" className="underline">
          scrub a PDF locally
        </NavLink>{" "}
        and review{" "}
        <NavLink to="/security" className="underline">
          threat model limits
        </NavLink>
        .
      </div>
    </div>
  );
}
