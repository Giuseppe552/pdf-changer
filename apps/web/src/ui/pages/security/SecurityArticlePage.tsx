import React from "react";
import { NavLink, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { stripLeadingH1, trackToTitle, type SecuritySection, type SecurityTrack } from "../../../content/security/frontmatter";
import {
  loadSecurityEntry,
  loadSecurityMetaIndex,
  loadSecurityPolicyEntry,
  type SecurityEntry,
} from "../../../content/security/securityIndex";
import { Card } from "../../components/Card";
import { LimitationsBox } from "./components/LimitationsBox";
import { RiskBox } from "./components/RiskBox";

const TRACKS = new Set<SecurityTrack>(["non-technical", "technical"]);

function isTrack(value: string): value is SecurityTrack {
  return TRACKS.has(value as SecurityTrack);
}

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
      const text = h2[1].trim();
      out.push({ id: headingId(text), text, level: 2 });
      continue;
    }
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      const text = h3[1].trim();
      out.push({ id: headingId(text), text, level: 3 });
    }
  }
  return out;
}

function SecurityArticleView({
  entry,
  section,
  related,
}: {
  entry: SecurityEntry;
  section: SecuritySection;
  related: SecurityEntry["meta"][];
}) {
  const { title: bodyTitle, body } = stripLeadingH1(entry.body);
  const title = bodyTitle ?? entry.meta.title;
  const headings = React.useMemo(() => collectHeadings(body), [body]);

  React.useEffect(() => {
    document.title = `${title} · Security · PDF Changer`;
  }, [title]);

  const breadcrumb =
    section === "policy" ? (
      <>
        <NavLink className="hover:text-[var(--ui-text)]" to="/security">
          Security Hub
        </NavLink>{" "}
        / Policy
      </>
    ) : (
      <>
        <NavLink className="hover:text-[var(--ui-text)]" to="/security">
          Security Hub
        </NavLink>{" "}
        /{" "}
        <NavLink
          className="hover:text-[var(--ui-text)]"
          to={`/security/${section}`}
        >
          {trackToTitle(section)}
        </NavLink>
      </>
    );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-sm text-[var(--ui-text-muted)]">{breadcrumb}</div>
        <h1 className="ui-title">{title}</h1>
        <p className="ui-subtitle max-w-3xl">{entry.meta.summary}</p>
      </div>

      <RiskBox article={entry.meta} />
      <LimitationsBox />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),240px]">
        <div className="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
          <article className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children }) => {
                  const text = nodeText(children);
                  const id = headingId(text);
                  return <h2 id={id}>{children}</h2>;
                },
                h3: ({ children }) => {
                  const text = nodeText(children);
                  const id = headingId(text);
                  return <h3 id={id}>{children}</h3>;
                },
              }}
            >
              {body}
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
            <Card title="Next safe step">
            <div className="text-[15px] text-[var(--ui-text-secondary)]">
              <NavLink className="underline" to="/scrub">
                Scrub a PDF locally
              </NavLink>
              {" · "}
              <NavLink className="underline" to="/faq">
                FAQ Hub
              </NavLink>
              {" · "}
              <NavLink className="underline" to="/security/policy">
                Defensive-only policy
              </NavLink>
            </div>
          </Card>
        </aside>
      </div>

      {related.length ? (
        <Card title="Related security articles">
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
      ) : null}
    </div>
  );
}

export function SecurityArticlePage() {
  const params = useParams();
  const trackRaw = (params.track ?? "").trim();
  const slug = (params.slug ?? "").trim();
  const track = isTrack(trackRaw) ? trackRaw : null;
  const [status, setStatus] = React.useState<"loading" | "ok" | "missing">("loading");
  const [entry, setEntry] = React.useState<SecurityEntry | null>(null);
  const [related, setRelated] = React.useState<SecurityEntry["meta"][]>([]);

  React.useEffect(() => {
    if (!track || !slug) {
      setStatus("missing");
      return;
    }
    const section: SecurityTrack = track;
    let cancelled = false;
    async function run() {
      setStatus("loading");
      const [nextEntry, index] = await Promise.all([
        loadSecurityEntry(section, slug),
        loadSecurityMetaIndex(),
      ]);
      if (cancelled) return;
      if (!nextEntry) {
        setEntry(null);
        setRelated([]);
        setStatus("missing");
        return;
      }
      const nextRelated = index
        .filter((item) => item.track === section && item.route !== nextEntry.meta.route)
        .slice(0, 5);
      setEntry(nextEntry);
      setRelated(nextRelated);
      setStatus("ok");
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [slug, track]);

  if (status === "loading") {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 animate-pulse rounded-sm bg-[var(--ui-bg-overlay)]" />
        <div className="h-48 animate-pulse rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)]" />
      </div>
    );
  }

  if (status === "missing" || !entry || !track) {
    return (
      <div className="space-y-4">
        <h1 className="ui-title">Security article not found</h1>
        <div className="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 text-[15px] text-[var(--ui-text-secondary)] shadow-sm">
          This article does not exist. Go back to{" "}
          <NavLink className="underline" to="/security">
            Security Hub
          </NavLink>
          .
        </div>
      </div>
    );
  }

  return <SecurityArticleView entry={entry} section={track} related={related} />;
}

export function SecurityPolicyPage() {
  const [status, setStatus] = React.useState<"loading" | "ok" | "missing">("loading");
  const [entry, setEntry] = React.useState<SecurityEntry | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      setStatus("loading");
      const next = await loadSecurityPolicyEntry();
      if (cancelled) return;
      if (!next) {
        setEntry(null);
        setStatus("missing");
        return;
      }
      setEntry(next);
      setStatus("ok");
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

  if (status === "missing" || !entry) {
    return (
      <div className="space-y-4">
        <h1 className="ui-title">Policy not found</h1>
        <div className="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 text-[15px] text-[var(--ui-text-secondary)] shadow-sm">
          The policy page is unavailable.
        </div>
      </div>
    );
  }

  return <SecurityArticleView entry={entry} section="policy" related={[]} />;
}
