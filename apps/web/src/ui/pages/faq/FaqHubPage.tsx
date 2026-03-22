import React from "react";
import { NavLink } from "react-router-dom";
import { Card } from "../../components/Card";
import { Surface } from "../../components/Surface";
import { loadFaqMetaIndex, topicToTitle, type FaqMeta } from "../../../content/faq/faqIndex";

function topByTopic(entries: FaqMeta[]): Array<{ topic: string; items: FaqMeta[] }> {
  const grouped = new Map<string, FaqMeta[]>();
  for (const entry of entries) {
    const arr = grouped.get(entry.topic) ?? [];
    arr.push(entry);
    grouped.set(entry.topic, arr);
  }
  return Array.from(grouped.entries())
    .map(([topic, items]) => ({
      topic,
      items: [...items].sort((a, b) => a.question.localeCompare(b.question)),
    }))
    .sort((a, b) => a.topic.localeCompare(b.topic));
}

export function FaqHubPage() {
  const [status, setStatus] = React.useState<"loading" | "ok" | "missing">("loading");
  const [items, setItems] = React.useState<FaqMeta[]>([]);
  const [query, setQuery] = React.useState("");
  const [topic, setTopic] = React.useState("all");

  React.useEffect(() => {
    document.title = "PDF Privacy FAQ · PDF Changer";
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      setStatus("loading");
      const next = await loadFaqMetaIndex();
      if (cancelled) return;
      setItems(next);
      setStatus(next.length ? "ok" : "missing");
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = React.useMemo(() => topByTopic(items), [items]);
  const topics = React.useMemo(
    () => ["all", ...grouped.map((group) => group.topic)],
    [grouped],
  );
  const q = query.trim().toLowerCase();
  const filtered = React.useMemo(() => {
    return items.filter((entry) => {
      if (topic !== "all" && entry.topic !== topic) return false;
      if (!q) return true;
      return (
        entry.question.toLowerCase().includes(q) ||
        entry.summary.toLowerCase().includes(q) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [items, q, topic]);

  if (status === "loading") {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 animate-pulse rounded-sm bg-[var(--ui-bg-overlay)]" />
        <div className="h-48 animate-pulse rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)]" />
      </div>
    );
  }

  if (status === "missing") {
    return (
      <div className="space-y-4">
        <h1 className="ui-title">Frequently Asked Questions</h1>
        <div className="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 text-[15px] text-[var(--ui-text-secondary)] shadow-sm">
          No FAQ entries are published yet.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="ui-title">Frequently Asked Questions</h1>
        <p className="ui-subtitle max-w-3xl">
          Practical, plain-English answers on anonymity, document safety, and secure
          sharing. This is general information, not legal advice.
        </p>
      </div>

      <Surface variant="emphasis" compact>
        <div className="text-[15px] text-[var(--ui-text-secondary)]">
          Start with plain-language basics, then move into topic-specific pages.
        </div>
      </Surface>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Start here">
          <ul className="list-inside list-disc space-y-2 text-[15px] text-[var(--ui-text-secondary)]">
            <li>
              <NavLink className="underline" to="/faq/anonymity-basics/what-is-anonymous-document-sharing">
                What is anonymous document sharing?
              </NavLink>
            </li>
            <li>
              <NavLink className="underline" to="/faq/tool-usage/how-do-i-scrub-a-pdf-safely">
                How do I scrub a PDF safely?
              </NavLink>
            </li>
            <li>
              <NavLink className="underline" to="/faq/submission-safety/how-do-i-share-documents-with-journalists">
                How should I share files with journalists?
              </NavLink>
            </li>
          </ul>
        </Card>

        <Card title="Find answers">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-[var(--ui-text-muted)]">Topic</div>
              <select
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                className="ui-select"
              >
                {topics.map((value) => (
                  <option key={value} value={value}>
                    {value === "all" ? "All topics" : topicToTitle(value)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-[var(--ui-text-muted)]">Search</div>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search questions..."
                className="ui-input"
              />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {grouped.map((group) => (
          <Card
            key={group.topic}
            title={`${topicToTitle(group.topic)} (${group.items.length})`}
            footer={
              <NavLink className="text-[15px] underline" to={`/faq/${group.topic}`}>
                View all {topicToTitle(group.topic)} questions
              </NavLink>
            }
          >
            <ul className="list-inside list-disc space-y-2 text-[15px] text-[var(--ui-text-secondary)]">
              {group.items.slice(0, 5).map((entry) => (
                <li key={entry.route}>
                  <NavLink className="underline" to={entry.route}>
                    {entry.question}
                  </NavLink>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">All questions</h2>
        {filtered.map((entry) => (
          <NavLink
            key={entry.route}
            to={entry.route}
            className="group block rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm transition hover:border-[var(--ui-border-strong)] hover:shadow"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold uppercase tracking-wide text-[var(--ui-text-muted)]">
                {topicToTitle(entry.topic)}
              </div>
              {entry.lastReviewed ? (
                <div className="text-sm text-[var(--ui-text-muted)]">
                  Reviewed {entry.lastReviewed}
                </div>
              ) : null}
            </div>
            <h3 className="mt-2 text-base font-semibold text-[var(--ui-text)] group-hover:text-[var(--ui-text)]">
              {entry.question}
            </h3>
            <p className="mt-1 text-[15px] text-[var(--ui-text-muted)]">{entry.summary}</p>
          </NavLink>
        ))}
        {!filtered.length ? (
          <div className="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 text-[15px] text-[var(--ui-text-secondary)] shadow-sm">
            No questions match this search yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
