export type FaqFrontmatter = {
  title?: string;
  question?: string;
  summary?: string;
  tags: string[];
  lastReviewed?: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

function parseTags(value: string): string[] {
  const unwrapped = value.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (!unwrapped) return [];
  return unwrapped
    .split(",")
    .map((token) => unquote(token))
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
}

export function stripLeadingH1(raw: string): { title: string | null; body: string } {
  const m = raw.match(/^#\s+(.+)\s*\n+/);
  if (!m) return { title: null, body: raw };
  return { title: m[1].trim(), body: raw.slice(m[0].length) };
}

export function extractFirstParagraph(markdown: string): string {
  const lines = markdown.split("\n");
  const buf: string[] = [];
  let started = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!started) {
      if (!trimmed) continue;
      if (trimmed.startsWith("#")) continue;
      started = true;
      buf.push(trimmed);
      continue;
    }
    if (!trimmed) break;
    if (trimmed.startsWith("#")) break;
    buf.push(trimmed);
  }
  return buf
    .join(" ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateText(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const idx = cut.lastIndexOf(" ");
  return `${(idx > 80 ? cut.slice(0, idx) : cut).trim()}...`;
}

export function parseFaqMarkdown(raw: string): {
  frontmatter: FaqFrontmatter;
  titleFromBody: string | null;
  body: string;
} {
  let body = raw;
  const frontmatter: FaqFrontmatter = { tags: [] };

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
        if (key === "question") frontmatter.question = unquote(value);
        if (key === "summary") frontmatter.summary = unquote(value);
        if (key === "tags") frontmatter.tags = parseTags(value);
        if (key === "lastreviewed") {
          const normalized = unquote(value);
          if (DATE_RE.test(normalized)) frontmatter.lastReviewed = normalized;
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
