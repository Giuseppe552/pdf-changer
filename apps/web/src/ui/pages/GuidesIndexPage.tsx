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
          <div className="text-sm text-neutral-600">
            Short, practical notes on safer PDF sharing.
          </div>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search guides…"
          className="w-full max-w-xs rounded-sm border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((g) => (
          <NavLink
            key={g.route}
            to={`/guides/${g.slug}`}
            className="group rounded-sm border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-300 hover:shadow"
          >
            <div className="text-sm font-semibold text-neutral-900 group-hover:text-neutral-950">
              {slugToTitle(g.slug)}
            </div>
            <div className="mt-1 text-sm text-neutral-600">
              Read guide →
            </div>
          </NavLink>
        ))}
      </div>

      {!filtered.length ? (
        <div className="rounded-sm border border-neutral-200 bg-white p-6 text-sm text-neutral-700 shadow-sm">
          No guides found.
        </div>
      ) : null}
    </div>
  );
}

