import React from "react";
import { NavLink } from "react-router-dom";
import {
  audienceToTitle,
  type Difficulty,
  type RiskLevel,
  type SecurityAudience,
} from "../../content/security/frontmatter";
import {
  loadSecurityMetaIndex,
  type SecurityMeta,
} from "../../content/security/securityIndex";
import { Card } from "../components/Card";
import { Surface } from "../components/Surface";
import { SecurityArticleCard } from "./security/components/SecurityArticleCard";

const audienceFilters: SecurityAudience[] = [
  "office-workers",
  "whistleblowers",
  "general-users",
  "journalists",
  "teams",
];
const riskFilters: Array<RiskLevel | "all"> = ["all", "low", "medium", "high"];
const difficultyFilters: Array<Difficulty | "all"> = [
  "all",
  "beginner",
  "intermediate",
  "advanced",
];

function isUpdatedThisMonth(lastReviewed: string | null): boolean {
  if (!lastReviewed) return false;
  const reviewed = new Date(`${lastReviewed}T00:00:00Z`);
  if (!Number.isFinite(reviewed.getTime())) return false;
  const now = new Date();
  return (
    reviewed.getUTCFullYear() === now.getUTCFullYear() &&
    reviewed.getUTCMonth() === now.getUTCMonth()
  );
}

export function SecurityPage() {
  const [status, setStatus] = React.useState<"loading" | "ok" | "missing">("loading");
  const [articles, setArticles] = React.useState<SecurityMeta[]>([]);
  const [query, setQuery] = React.useState("");
  const [audience, setAudience] = React.useState<SecurityAudience | "all">("all");
  const [risk, setRisk] = React.useState<RiskLevel | "all">("all");
  const [difficulty, setDifficulty] = React.useState<Difficulty | "all">("all");

  React.useEffect(() => {
    document.title = "PDF Security Model · PDF Changer";
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      setStatus("loading");
      const next = await loadSecurityMetaIndex();
      if (cancelled) return;
      setArticles(next);
      setStatus(next.length ? "ok" : "missing");
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const policy = articles.find((item) => item.section === "policy");
  const trackArticles = articles.filter((item) => item.track);
  const nonTechnicalCount = trackArticles.filter(
    (item) => item.track === "non-technical",
  ).length;
  const technicalCount = trackArticles.filter(
    (item) => item.track === "technical",
  ).length;

  const q = query.trim().toLowerCase();
  const filtered = trackArticles.filter((article) => {
    if (audience !== "all" && !article.audience.includes(audience)) return false;
    if (risk !== "all" && article.riskLevel !== risk) return false;
    if (difficulty !== "all" && article.difficulty !== difficulty) return false;
    if (!q) return true;
    return (
      article.title.toLowerCase().includes(q) ||
      article.summary.toLowerCase().includes(q) ||
      article.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  });

  const latestReviewed = [...trackArticles]
    .filter((item) => !!item.lastReviewed)
    .sort((a, b) =>
      (b.lastReviewed ?? "").localeCompare(a.lastReviewed ?? ""),
    )
    .slice(0, 3);
  const updatedThisMonth = trackArticles.filter((item) =>
    isUpdatedThisMonth(item.lastReviewed),
  ).length;

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
        <h1 className="ui-title">Security Model</h1>
        <div className="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 text-[15px] text-[var(--ui-text-secondary)] shadow-sm">
          No security entries are published yet.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="ui-title">Security Model</h1>
        <p className="ui-subtitle max-w-3xl">
          Defensive security guidance for document workflows. Plain-English for
          non-technical readers, deep technical references for advanced users.
        </p>
      </div>

      <Surface variant="emphasis" compact>
        <div className="text-[15px] text-[var(--ui-text-secondary)]">
          Use this hub to understand limits before action. It provides defensive
          guidance only.
        </div>
      </Surface>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Who this is for">
          <div className="grid gap-2 text-[15px] text-[var(--ui-text-secondary)]">
            <div>Office workers handling legal, HR, and finance PDFs.</div>
            <div>Whistleblowers managing high-risk submissions.</div>
            <div>General users sharing applications and personal documents.</div>
            <div>Journalists and support teams protecting source workflows.</div>
          </div>
        </Card>
        <Card title="Start here">
          <ul className="list-inside list-disc space-y-2 text-[15px] text-[var(--ui-text-secondary)]">
            <li>
              <NavLink className="underline" to="/security/non-technical/whistleblower-quickstart">
                Whistleblower quickstart
              </NavLink>
            </li>
            <li>
              <NavLink className="underline" to="/security/non-technical/safe-pdf-handling-basics">
                Safe PDF handling basics
              </NavLink>
            </li>
            <li>
              <NavLink className="underline" to="/security/technical/threat-modeling-workflow">
                Threat modeling workflow
              </NavLink>
            </li>
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card
          title={`Non-Technical (${nonTechnicalCount})`}
          footer={
            <NavLink className="text-sm underline" to="/security/non-technical">
              Open non-technical track
            </NavLink>
          }
        >
          Clear defensive workflows with minimum jargon.
        </Card>
        <Card
          title={`Technical (${technicalCount})`}
          footer={
            <NavLink className="text-sm underline" to="/security/technical">
              Open technical track
            </NavLink>
          }
        >
          Threat-model and systems-level risk notes.
        </Card>
        <Card
          title="Policy"
          footer={
            <NavLink className="text-sm underline" to="/security/policy">
              Read defensive-only policy
            </NavLink>
          }
        >
          Explicit boundary: privacy and safety only, no abuse guidance.
        </Card>
      </div>

      <Card
        title="Original research"
        footer={
          <NavLink className="text-sm underline" to="/research">
            View all research
          </NavLink>
        }
      >
        <div className="text-[15px] text-[var(--ui-text-secondary)] space-y-2">
          <div>
            The security claims on this site are backed by original research, not just spec
            reading.{" "}
            <NavLink className="underline" to="/research/csp-exfiltration-tests">
              CSP exfiltration testing
            </NavLink>
            {" "}validates browser security boundaries.{" "}
            <NavLink className="underline" to="/research/printer-tracking-decoder">
              MIC decoding
            </NavLink>
            {" "}identifies printer tracking dots.{" "}
            <NavLink className="underline" to="/research/competitor-data-audit">
              Competitor audits
            </NavLink>
            {" "}verify what online tools actually do with your files.
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Find guidance">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <div className="text-sm font-semibold text-[var(--ui-text-muted)]">Search</div>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search security articles..."
                className="ui-input"
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-[var(--ui-text-muted)]">Audience</div>
              <select
                value={audience}
                onChange={(event) =>
                  setAudience(event.target.value as SecurityAudience | "all")
                }
                className="ui-select"
              >
                <option value="all">All audiences</option>
                {audienceFilters.map((value) => (
                  <option key={value} value={value}>
                    {audienceToTitle(value)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-[var(--ui-text-muted)]">Risk</div>
              <select
                value={risk}
                onChange={(event) => setRisk(event.target.value as RiskLevel | "all")}
                className="ui-select"
              >
                {riskFilters.map((value) => (
                  <option key={value} value={value}>
                    {value === "all" ? "All risk levels" : value}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <div className="text-sm font-semibold text-[var(--ui-text-muted)]">
                Difficulty
              </div>
              <select
                value={difficulty}
                onChange={(event) =>
                  setDifficulty(event.target.value as Difficulty | "all")
                }
                className="ui-select"
              >
                {difficultyFilters.map((value) => (
                  <option key={value} value={value}>
                    {value === "all" ? "All difficulty levels" : value}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <Card title="Freshness">
          <div className="space-y-3 text-[15px] text-[var(--ui-text-secondary)]">
            <div>
              Updated this month:{" "}
              <span className="font-semibold text-[var(--ui-text)]">{updatedThisMonth}</span>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-semibold uppercase tracking-wide text-[var(--ui-text-muted)]">
                Latest reviewed
              </div>
              {latestReviewed.map((item) => (
                <div key={item.route}>
                  <NavLink className="underline" to={item.route}>
                    {item.title}
                  </NavLink>{" "}
                  <span className="text-sm text-[var(--ui-text-muted)]">
                    ({item.lastReviewed})
                  </span>
                </div>
              ))}
            </div>
            {policy ? (
              <div className="text-sm text-[var(--ui-text-muted)]">
                Boundary policy:{" "}
                <NavLink className="underline" to={policy.route}>
                  {policy.title}
                </NavLink>
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">All security articles</h2>
        {filtered.map((article) => (
          <SecurityArticleCard key={article.route} article={article} />
        ))}
        {!filtered.length ? (
          <div className="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 text-[15px] text-[var(--ui-text-secondary)] shadow-sm">
            No security articles match these filters.
          </div>
        ) : null}
      </div>
    </div>
  );
}
