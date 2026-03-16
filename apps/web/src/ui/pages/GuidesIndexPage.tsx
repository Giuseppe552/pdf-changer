import React from "react";
import { NavLink } from "react-router-dom";
import { contentEntries, slugToTitle } from "../../content/contentIndex";

export function GuidesIndexPage() {
  const [query, setQuery] = React.useState("");
  const guides = contentEntries.filter((e) => e.section === "guides");

  const q = query.trim().toLowerCase();
  const filtered = q
    ? guides.filter((g) => {
        const title = slugToTitle(g.slug).toLowerCase();
        return g.slug.includes(q) || title.includes(q);
      })
    : guides;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Guides</h1>
          <div className="text-sm text-[var(--ui-text-muted)]">
            Short, practical notes on safer PDF sharing.
          </div>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search guides…"
          className="w-full max-w-xs rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-3 py-2 text-sm text-[var(--ui-text)] placeholder:text-[var(--ui-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ui-focus)]"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((g) => (
          <NavLink
            key={g.route}
            to={`/guides/${g.slug}`}
            className="group rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-5 shadow-sm transition hover:border-[var(--ui-border)] hover:shadow"
          >
            <div className="text-sm font-semibold text-[var(--ui-text)] group-hover:text-[var(--ui-text)]">
              {slugToTitle(g.slug)}
            </div>
            <div className="mt-1 text-sm text-[var(--ui-text-muted)]">
              Read guide →
            </div>
          </NavLink>
        ))}
      </div>

      {!filtered.length ? (
        <div className="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 text-sm text-[var(--ui-text-secondary)] shadow-sm">
          No guides found.
        </div>
      ) : null}
    </div>
  );
}

