import React from "react";
import { NavLink } from "react-router-dom";
import {
  loadResearchMetaIndex,
  type ResearchMeta,
  type ResearchStatus,
} from "../../../content/research/researchIndex";
import { Card } from "../../components/Card";
import { Surface } from "../../components/Surface";

const STATUS_LABELS: Record<ResearchStatus, string> = {
  published: "Published",
  "in-progress": "In progress",
  planned: "Planned",
};

const STATUS_COLORS: Record<ResearchStatus, string> = {
  published: "bg-green-100 text-green-300",
  "in-progress": "bg-amber-100 text-amber-300",
  planned: "bg-[var(--ui-bg-overlay)] text-[var(--ui-text-muted)]",
};

function ResearchCard({ article }: { article: ResearchMeta }) {
  return (
    <NavLink to={article.route} className="block">
      <Surface className="transition-colors hover:border-[var(--ui-border-strong)]">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block rounded-sm px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[article.status]}`}
            >
              {STATUS_LABELS[article.status]}
            </span>
            <span className="text-xs text-[var(--ui-text-muted)]">{article.date}</span>
            <span className="text-xs text-[var(--ui-text-muted)]">
              {article.estimatedMinutes} min read
            </span>
          </div>
          <h3 className="text-base font-semibold text-[var(--ui-text)]">
            {article.title}
          </h3>
          <p className="text-[15px] text-[var(--ui-text-secondary)]">{article.summary}</p>
          {article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="ui-tag"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Surface>
    </NavLink>
  );
}

export function ResearchHubPage() {
  const [status, setStatus] = React.useState<"loading" | "ok" | "empty">("loading");
  const [articles, setArticles] = React.useState<ResearchMeta[]>([]);

  React.useEffect(() => {
    document.title = "Research · PDF Changer";
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      setStatus("loading");
      const items = await loadResearchMetaIndex();
      if (cancelled) return;
      setArticles(items);
      setStatus(items.length ? "ok" : "empty");
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 animate-pulse rounded-sm bg-[var(--ui-bg-overlay)]" />
        <div className="h-48 animate-pulse rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)]" />
      </div>
    );
  }

  const published = articles.filter((a) => a.status === "published");
  const inProgress = articles.filter((a) => a.status === "in-progress");
  const planned = articles.filter((a) => a.status === "planned");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="ui-title">Research</h1>
        <p className="ui-subtitle max-w-3xl">
          Original security research from PDF Changer. Reproducible methodology,
          raw data, and findings that don't exist elsewhere.
        </p>
      </div>

      <Surface variant="emphasis" compact>
        <div className="text-[15px] text-[var(--ui-text-secondary)]">
          All research follows responsible disclosure. Findings are published
          only after affected parties have been notified and given time to
          respond. Methodology is documented so results can be independently
          verified.
        </div>
      </Surface>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Why we publish research">
          <div className="text-[15px] text-[var(--ui-text-secondary)]">
            PDF Changer exists to protect document privacy. Publishing original
            research holds the industry accountable and gives users evidence-based
            reasons to care about metadata hygiene.
          </div>
        </Card>
        <Card title="Scope">
          <div className="text-[15px] text-[var(--ui-text-secondary)]">
            Browser security, PDF metadata forensics, printer tracking
            technology, and competitive privacy audits. All defensive. No exploit
            code for offensive use.
          </div>
        </Card>
        <Card title="Methodology">
          <div className="text-[15px] text-[var(--ui-text-secondary)]">
            Every published finding includes reproducible steps, raw captured
            data, and exact tool versions. If you can't reproduce it, it's not
            research.
          </div>
        </Card>
      </div>

      {published.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Published</h2>
          {published.map((article) => (
            <ResearchCard key={article.slug} article={article} />
          ))}
        </div>
      )}

      {inProgress.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">In progress</h2>
          {inProgress.map((article) => (
            <ResearchCard key={article.slug} article={article} />
          ))}
        </div>
      )}

      {planned.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Planned</h2>
          {planned.map((article) => (
            <ResearchCard key={article.slug} article={article} />
          ))}
        </div>
      )}

      {status === "empty" && (
        <div className="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 text-[15px] text-[var(--ui-text-secondary)] shadow-sm">
          No research has been published yet.
        </div>
      )}

      <Card title="Related">
        <ul className="list-inside list-disc space-y-2 text-[var(--ui-text-secondary)]">
          <li>
            <NavLink className="underline" to="/security">
              Security Hub
            </NavLink>{" "}
            — defensive guidance for document workflows
          </li>
          <li>
            <NavLink className="underline" to="/blog">
              Blog
            </NavLink>{" "}
            — practical articles on metadata and privacy
          </li>
          <li>
            <NavLink className="underline" to="/scrub">
              Scrub a PDF
            </NavLink>{" "}
            — try the tools this research informs
          </li>
        </ul>
      </Card>
    </div>
  );
}
