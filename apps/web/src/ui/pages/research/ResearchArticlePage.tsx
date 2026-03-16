import React from "react";
import { NavLink, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  loadResearchEntry,
  loadResearchMetaIndex,
  type ResearchEntry,
  type ResearchMeta,
} from "../../../content/research/researchIndex";
import { Card } from "../../components/Card";

function headingId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function nodeText(value: React.ReactNode): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (!value) return "";
  if (Array.isArray(value)) return value.map((item) => nodeText(item)).join("");
  if (React.isValidElement(value)) return nodeText(value.props.children);
  return "";
}

function collectHeadings(markdown: string): Array<{ id: string; text: string; level: 2 | 3 }> {
  const out: Array<{ id: string; text: string; level: 2 | 3 }> = [];
  for (const line of markdown.split("\n")) {
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      out.push({ id: headingId(h2[1].trim()), text: h2[1].trim(), level: 2 });
      continue;
    }
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      out.push({ id: headingId(h3[1].trim()), text: h3[1].trim(), level: 3 });
    }
  }
  return out;
}

const STATUS_LABELS: Record<string, string> = {
  published: "Published",
  "in-progress": "In progress",
  planned: "Planned",
};

const STATUS_COLORS: Record<string, string> = {
  published: "bg-green-100 text-green-300",
  "in-progress": "bg-amber-100 text-amber-300",
  planned: "bg-[var(--ui-bg-overlay)] text-[var(--ui-text-muted)]",
};

function ArticleView({
  entry,
  related,
}: {
  entry: ResearchEntry;
  related: ResearchMeta[];
}) {
  const headings = React.useMemo(() => collectHeadings(entry.body), [entry.body]);

  React.useEffect(() => {
    document.title = `${entry.meta.title} · Research · PDF Changer`;
  }, [entry.meta.title]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-sm text-[var(--ui-text-muted)]">
          <NavLink className="hover:text-[var(--ui-text)]" to="/research">
            Research
          </NavLink>{" "}
          / {entry.meta.date} · {entry.meta.estimatedMinutes} min read
        </div>
        <h1 className="ui-title">{entry.meta.title}</h1>
        <p className="ui-subtitle max-w-3xl">{entry.meta.summary}</p>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block rounded-sm px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[entry.meta.status] ?? ""}`}
          >
            {STATUS_LABELS[entry.meta.status] ?? entry.meta.status}
          </span>
          {entry.meta.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {entry.meta.tags.map((tag) => (
                <span key={tag} className="ui-tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),240px]">
        <div className="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
          <article className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children }) => {
                  const text = nodeText(children);
                  return <h2 id={headingId(text)}>{children}</h2>;
                },
                h3: ({ children }) => {
                  const text = nodeText(children);
                  return <h3 id={headingId(text)}>{children}</h3>;
                },
              }}
            >
              {entry.body}
            </ReactMarkdown>
          </article>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <Card title="Contents">
            {headings.length ? (
              <ul className="space-y-1 text-sm text-[var(--ui-text-secondary)]">
                {headings.map((heading) => (
                  <li
                    key={`${heading.level}:${heading.id}`}
                    className={heading.level === 3 ? "pl-3" : ""}
                  >
                    <a className="underline" href={`#${heading.id}`}>
                      {heading.text}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-[15px] text-[var(--ui-text-muted)]">No section headings.</div>
            )}
          </Card>
          <Card title="Reproduce this">
            <div className="text-[15px] text-[var(--ui-text-secondary)]">
              All methodology is documented inline. If you find an error or want
              to extend this research,{" "}
              <NavLink className="underline" to="/contact">
                get in touch
              </NavLink>
              .
            </div>
          </Card>
        </aside>
      </div>

      {related.length > 0 && (
        <Card title="More research">
          <ul className="list-inside list-disc space-y-2 text-[var(--ui-text-secondary)]">
            {related.map((item) => (
              <li key={item.route}>
                <NavLink className="underline" to={item.route}>
                  {item.title}
                </NavLink>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

export function ResearchArticlePage() {
  const params = useParams();
  const slug = (params.slug ?? "").trim();
  const [status, setStatus] = React.useState<"loading" | "ok" | "missing">("loading");
  const [entry, setEntry] = React.useState<ResearchEntry | null>(null);
  const [related, setRelated] = React.useState<ResearchMeta[]>([]);

  React.useEffect(() => {
    if (!slug) {
      setStatus("missing");
      return;
    }
    let cancelled = false;
    async function run() {
      setStatus("loading");
      const [nextEntry, index] = await Promise.all([
        loadResearchEntry(slug),
        loadResearchMetaIndex(),
      ]);
      if (cancelled) return;
      if (!nextEntry) {
        setEntry(null);
        setRelated([]);
        setStatus("missing");
        return;
      }
      const nextRelated = index
        .filter((item) => item.slug !== slug)
        .slice(0, 5);
      setEntry(nextEntry);
      setRelated(nextRelated);
      setStatus("ok");
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (status === "loading") {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 animate-pulse rounded-sm bg-[var(--ui-bg-overlay)]" />
        <div className="h-48 animate-pulse rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)]" />
      </div>
    );
  }

  if (status === "missing" || !entry) {
    return (
      <div className="space-y-4">
        <h1 className="ui-title">Research not found</h1>
        <div className="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 text-[15px] text-[var(--ui-text-secondary)] shadow-sm">
          This research page does not exist. Go back to{" "}
          <NavLink className="underline" to="/research">
            Research
          </NavLink>
          .
        </div>
      </div>
    );
  }

  return <ArticleView entry={entry} related={related} />;
}
