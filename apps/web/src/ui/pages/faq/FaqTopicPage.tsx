import React from "react";
import { NavLink, useParams } from "react-router-dom";
import { loadFaqMetaIndex, topicToTitle, type FaqMeta } from "../../../content/faq/faqIndex";

function topicIntro(topic: string): string {
  const byTopic = new Map<string, string>([
    [
      "anonymity-basics",
      "Foundational answers for people who are new to privacy and secure document sharing.",
    ],
    [
      "metadata",
      "What metadata is, what scrubbing removes, and where limits still exist.",
    ],
    [
      "tool-usage",
      "How to use PDF Changer safely in day-to-day and higher-risk workflows.",
    ],
    [
      "device-opsec",
      "Practical device-level habits that reduce the chance of accidental exposure.",
    ],
    [
      "network-opsec",
      "Network basics for reducing traceability and avoidable exposure.",
    ],
    [
      "submission-safety",
      "Safer defaults when sharing documents with journalists or legal contacts.",
    ],
    [
      "legal-and-risk",
      "Limits, legal boundaries, and how to think clearly when risk is high.",
    ],
    [
      "account-and-privacy",
      "What account data exists, how passkeys work, and how recovery codes are handled.",
    ],
  ]);
  return byTopic.get(topic) ?? "Frequently asked questions for this topic.";
}

export function FaqTopicPage() {
  const params = useParams();
  const topic = (params.topic ?? "").trim();

  const [status, setStatus] = React.useState<"loading" | "ok" | "missing">("loading");
  const [items, setItems] = React.useState<FaqMeta[]>([]);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      setStatus("loading");
      const all = await loadFaqMetaIndex();
      if (cancelled) return;
      const filtered = all.filter((entry) => entry.topic === topic);
      setItems(filtered);
      setStatus(filtered.length ? "ok" : "missing");
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [topic]);

  const title = topic ? `${topicToTitle(topic)} FAQ` : "FAQ Topic";
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
        <h1 className="text-2xl font-semibold tracking-tight">Topic not found</h1>
        <div className="rounded-sm border border-neutral-200 bg-white p-6 text-sm text-neutral-700 shadow-sm">
          This FAQ topic does not exist. Open the{" "}
          <NavLink to="/faq" className="underline">
            FAQ hub
          </NavLink>
          .
        </div>
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const filtered = items.filter((entry) => {
    if (!q) return true;
    return (
      entry.question.toLowerCase().includes(q) ||
      entry.summary.toLowerCase().includes(q) ||
      entry.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-xs text-neutral-500">
          <NavLink to="/faq" className="hover:text-neutral-900">
            FAQ Hub
          </NavLink>{" "}
          / {topicToTitle(topic)}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{topicToTitle(topic)}</h1>
        <p className="max-w-3xl text-sm text-neutral-700">{topicIntro(topic)}</p>
      </div>

      <div className="max-w-sm space-y-1">
        <div className="text-xs font-semibold text-neutral-600">Search this topic</div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search questions..."
          className="w-full rounded-sm border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((entry) => (
          <NavLink
            key={entry.route}
            to={entry.route}
            className="group block rounded-sm border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-300 hover:shadow"
          >
            <h2 className="text-sm font-semibold text-neutral-900 group-hover:text-neutral-950">
              {entry.question}
            </h2>
            <p className="mt-1 text-sm text-neutral-600">{entry.summary}</p>
            <div className="mt-2 text-xs text-neutral-500">
              {entry.lastReviewed ? `Reviewed ${entry.lastReviewed}` : "Review date pending"}
            </div>
          </NavLink>
        ))}
        {!filtered.length ? (
          <div className="rounded-sm border border-neutral-200 bg-white p-6 text-sm text-neutral-700 shadow-sm">
            No questions match this search in this topic.
          </div>
        ) : null}
      </div>
    </div>
  );
}
