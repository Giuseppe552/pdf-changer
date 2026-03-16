import React from "react";
import { NavLink, useParams } from "react-router-dom";
import { trackToTitle, type SecurityTrack } from "../../../content/security/frontmatter";
import {
  loadSecurityMetaIndex,
  type SecurityMeta,
} from "../../../content/security/securityIndex";
import { Card } from "../../components/Card";
import { SecurityArticleCard } from "./components/SecurityArticleCard";

const TRACKS = new Set<SecurityTrack>(["non-technical", "technical"]);

function isTrack(value: string): value is SecurityTrack {
  return TRACKS.has(value as SecurityTrack);
}

export function SecurityTrackPage() {
  const params = useParams();
  const trackRaw = (params.track ?? "").trim();
  const track = isTrack(trackRaw) ? trackRaw : null;
  const [status, setStatus] = React.useState<"loading" | "ok" | "missing">("loading");
  const [query, setQuery] = React.useState("");
  const [items, setItems] = React.useState<SecurityMeta[]>([]);

  React.useEffect(() => {
    if (!track) {
      document.title = "Security Track Not Found · PDF Changer";
      return;
    }
    document.title = `${trackToTitle(track)} Security · PDF Changer`;
  }, [track]);

  React.useEffect(() => {
    if (!track) {
      setStatus("missing");
      return;
    }
    let cancelled = false;
    async function run() {
      setStatus("loading");
      const index = await loadSecurityMetaIndex();
      if (cancelled) return;
      const next = index.filter((item) => item.track === track);
      setItems(next);
      setStatus(next.length ? "ok" : "missing");
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [track]);

  if (!track || status === "missing") {
    return (
      <div className="space-y-4">
        <h1 className="ui-title">Security track not found</h1>
        <div className="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 text-[15px] text-[var(--ui-text-secondary)] shadow-sm">
          This security track does not exist. Go back to{" "}
          <NavLink className="underline" to="/security">
            Security Hub
          </NavLink>
          .
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 animate-pulse rounded-sm bg-[var(--ui-bg-overlay)]" />
        <div className="h-48 animate-pulse rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)]" />
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.tags.some((tag) => tag.toLowerCase().includes(q)),
      )
    : items;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-xs text-[var(--ui-text-muted)]">
          <NavLink className="hover:text-[var(--ui-text)]" to="/security">
            Security Hub
          </NavLink>{" "}
          / {trackToTitle(track)}
        </div>
        <h1 className="ui-title">
          {trackToTitle(track)} Security Track
        </h1>
        <p className="ui-subtitle max-w-3xl">
          {track === "non-technical"
            ? "Plain-language guidance focused on practical behavior and low-friction safety defaults."
            : "Technical notes for deeper threat-modeling, integrity handling, and systems-level exposure review."}
        </p>
      </div>

      <Card title="Search this track">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${trackToTitle(track).toLowerCase()} articles...`}
          className="ui-input"
        />
      </Card>

      <div className="space-y-3">
        {filtered.map((item) => (
          <SecurityArticleCard key={item.route} article={item} />
        ))}
        {!filtered.length ? (
          <div className="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 text-[15px] text-[var(--ui-text-secondary)] shadow-sm">
            No articles match this search.
          </div>
        ) : null}
      </div>
    </div>
  );
}
