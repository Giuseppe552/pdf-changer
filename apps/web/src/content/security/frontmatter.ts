export type SecurityTrack = "non-technical" | "technical";
export type SecuritySection = SecurityTrack | "policy";

export type SecurityAudience =
  | "office-workers"
  | "whistleblowers"
  | "general-users"
  | "journalists"
  | "teams";

export type RiskLevel = "low" | "medium" | "high";
export type Difficulty = "beginner" | "intermediate" | "advanced";

export type SecurityFrontmatter = {
  title?: string;
  summary?: string;
  audience: string[];
  riskLevel?: string;
  difficulty?: string;
  lastReviewed?: string;
  tags: string[];
  estimatedMinutes?: number;
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

function parseList(value: string): string[] {
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

export function parseSecurityMarkdown(raw: string): {
  frontmatter: SecurityFrontmatter;
  titleFromBody: string | null;
  body: string;
} {
  let body = raw;
  const frontmatter: SecurityFrontmatter = { audience: [], tags: [] };

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
        if (key === "audience") frontmatter.audience = parseList(value);
        if (key === "risklevel") frontmatter.riskLevel = unquote(value).toLowerCase();
        if (key === "difficulty") frontmatter.difficulty = unquote(value).toLowerCase();
        if (key === "tags") frontmatter.tags = parseList(value);
        if (key === "lastreviewed") {
          const normalized = unquote(value);
          if (DATE_RE.test(normalized)) frontmatter.lastReviewed = normalized;
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

function titleCaseWord(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function slugToSecurityTitle(slug: string): string {
  const acronyms = new Map([
    ["pdf", "PDF"],
    ["xmp", "XMP"],
    ["exif", "EXIF"],
    ["ip", "IP"],
    ["vpn", "VPN"],
    ["tor", "Tor"],
    ["pgp", "PGP"],
    ["2fa", "2FA"],
    ["opsec", "OPSEC"],
  ]);

  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      return acronyms.get(lower) ?? titleCaseWord(lower);
    })
    .join(" ");
}

export function trackToTitle(track: SecurityTrack): string {
  return track === "non-technical" ? "Non-Technical" : "Technical";
}

export function audienceToTitle(audience: SecurityAudience): string {
  if (audience === "office-workers") return "Office workers";
  if (audience === "general-users") return "General users";
  return titleCaseWord(audience.replace(/-/g, " "));
}

