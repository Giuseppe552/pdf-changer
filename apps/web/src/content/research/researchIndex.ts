export type ResearchStatus = "published" | "in-progress" | "planned";

export type ResearchMeta = {
  slug: string;
  title: string;
  summary: string;
  date: string;
  status: ResearchStatus;
  tags: string[];
  estimatedMinutes: number;
  route: string;
  key: string;
};

export type ResearchEntry = {
  meta: ResearchMeta;
  body: string;
};

export type ResearchFrontmatter = {
  title?: string;
  summary?: string;
  date?: string;
  status?: string;
  tags: string[];
  estimatedMinutes?: number;
};

type ContentLoader = () => Promise<string>;

const modules = import.meta.glob("./*.md", {
  query: "?raw",
  import: "default",
}) as Record<string, ContentLoader>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STATUS_SET = new Set<ResearchStatus>(["published", "in-progress", "planned"]);

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function parseList(value: string): string[] {
  const unwrapped = value.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (!unwrapped) return [];
  return unwrapped
    .split(",")
    .map((token) => unquote(token))
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
}

function stripLeadingH1(raw: string): { title: string | null; body: string } {
  const m = raw.match(/^#\s+(.+)\s*\n+/);
  if (!m) return { title: null, body: raw };
  return { title: m[1].trim(), body: raw.slice(m[0].length) };
}

export function parseResearchMarkdown(raw: string): {
  frontmatter: ResearchFrontmatter;
  titleFromBody: string | null;
  body: string;
} {
  let body = raw;
  const frontmatter: ResearchFrontmatter = { tags: [] };

  if (raw.startsWith("---\n")) {
    const endMarker = "\n---\n";
    const end = raw.indexOf(endMarker, 4);
    if (end !== -1) {
      const block = raw.slice(4, end);
      body = raw.slice(end + endMarker.length);
      const lines = block.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const idx = trimmed.indexOf(":");
        if (idx <= 0) continue;
        const key = trimmed.slice(0, idx).trim().toLowerCase();
        const value = trimmed.slice(idx + 1).trim();
        if (!value) continue;

        if (key === "title") frontmatter.title = unquote(value);
        if (key === "summary") frontmatter.summary = unquote(value);
        if (key === "tags") frontmatter.tags = parseList(value);
        if (key === "status") {
          const normalized = unquote(value).toLowerCase();
          if (STATUS_SET.has(normalized as ResearchStatus)) {
            frontmatter.status = normalized;
          }
        }
        if (key === "date") {
          const normalized = unquote(value);
          if (DATE_RE.test(normalized)) frontmatter.date = normalized;
        }
        if (key === "estimatedminutes") {
          const parsed = Number.parseInt(unquote(value), 10);
          if (Number.isFinite(parsed) && parsed > 0) {
            frontmatter.estimatedMinutes = parsed;
          }
        }
      }
    }
  }

  const { title, body: strippedBody } = stripLeadingH1(body);
  return {
    frontmatter,
    titleFromBody: title,
    body: strippedBody.trim(),
  };
}

function slugToTitle(slug: string): string {
  const acronyms = new Map([
    ["pdf", "PDF"],
    ["csp", "CSP"],
    ["mic", "MIC"],
    ["cve", "CVE"],
    ["xss", "XSS"],
    ["dns", "DNS"],
    ["ip", "IP"],
  ]);
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      return acronyms.get(lower) ?? (lower.charAt(0).toUpperCase() + lower.slice(1));
    })
    .join(" ");
}

type ParsedEntry = {
  key: string;
  slug: string;
  loader: ContentLoader;
};

const parsedEntries: ParsedEntry[] = Object.entries(modules)
  .map(([key, loader]) => {
    const m = key.match(/^\.\/([a-z0-9-]+)\.md$/);
    if (!m) return null;
    return { key, slug: m[1], loader };
  })
  .filter((x): x is ParsedEntry => !!x)
  .sort((a, b) => a.slug.localeCompare(b.slug));

const loaderBySlug = new Map<string, ContentLoader>(
  parsedEntries.map((entry) => [entry.slug, entry.loader]),
);

function buildMeta(slug: string, raw: string, key: string): ResearchMeta {
  const parsed = parseResearchMarkdown(raw);
  const title = parsed.frontmatter.title ?? parsed.titleFromBody ?? slugToTitle(slug);
  const summary = parsed.frontmatter.summary ?? "Original security research from PDF Changer.";
  const status: ResearchStatus = (parsed.frontmatter.status as ResearchStatus) ?? "published";

  return {
    slug,
    title,
    summary,
    date: parsed.frontmatter.date ?? "2026-03-14",
    status,
    tags: parsed.frontmatter.tags,
    estimatedMinutes: parsed.frontmatter.estimatedMinutes ?? 10,
    route: `/research/${slug}`,
    key,
  };
}

let metaPromise: Promise<ResearchMeta[]> | null = null;

export async function loadResearchMetaIndex(): Promise<ResearchMeta[]> {
  if (!metaPromise) {
    metaPromise = Promise.all(
      parsedEntries.map(async (entry) => {
        const raw = await entry.loader();
        return buildMeta(entry.slug, raw, entry.key);
      }),
    ).then((items) =>
      items.sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return a.title.localeCompare(b.title);
      }),
    );
  }
  return await metaPromise;
}

export async function loadResearchEntry(slug: string): Promise<ResearchEntry | null> {
  const loader = loaderBySlug.get(slug);
  if (!loader) return null;
  const raw = await loader();
  const entry = parsedEntries.find((e) => e.slug === slug);
  if (!entry) return null;
  const meta = buildMeta(slug, raw, entry.key);
  const parsed = parseResearchMarkdown(raw);
  return { meta, body: parsed.body };
}

export { stripLeadingH1 };
