import {
  parseSecurityMarkdown,
  slugToSecurityTitle,
  type Difficulty,
  type RiskLevel,
  type SecurityAudience,
  type SecuritySection,
  type SecurityTrack,
} from "./frontmatter";

type ContentLoader = () => Promise<string>;

const modules = import.meta.glob("./**/*.md", {
  query: "?raw",
  import: "default",
}) as Record<string, ContentLoader>;

export type SecurityRouteEntry = {
  section: SecuritySection;
  slug: string;
  route: string;
  key: string;
};

export type SecurityMeta = {
  section: SecuritySection;
  track: SecurityTrack | null;
  slug: string;
  route: string;
  key: string;
  title: string;
  summary: string;
  audience: SecurityAudience[];
  riskLevel: RiskLevel;
  difficulty: Difficulty;
  lastReviewed: string | null;
  tags: string[];
  estimatedMinutes: number;
};

export type SecurityEntry = {
  meta: SecurityMeta;
  body: string;
};

export type SecurityParsedKey = {
  section: SecuritySection;
  slug: string;
};

const SECURITY_TRACKS = new Set<SecurityTrack>(["non-technical", "technical"]);
const SECURITY_AUDIENCE_SET = new Set<SecurityAudience>([
  "office-workers",
  "whistleblowers",
  "general-users",
  "journalists",
  "teams",
]);
const RISK_SET = new Set<RiskLevel>(["low", "medium", "high"]);
const DIFFICULTY_SET = new Set<Difficulty>([
  "beginner",
  "intermediate",
  "advanced",
]);

export function parseSecurityKey(key: string): SecurityParsedKey | null {
  const m = key.match(/^\.\/(non-technical|technical|policy)\/([a-z0-9-]+)\.md$/);
  if (!m) return null;
  return { section: m[1] as SecuritySection, slug: m[2] };
}

function toRoute(section: SecuritySection, slug: string): string {
  if (section === "policy") return "/security/policy";
  return `/security/${section}/${slug}`;
}

function normalizeAudience(input: string[]): SecurityAudience[] {
  const out: SecurityAudience[] = [];
  for (const value of input) {
    if (SECURITY_AUDIENCE_SET.has(value as SecurityAudience)) {
      out.push(value as SecurityAudience);
    }
  }
  return out;
}

function normalizeRiskLevel(value: string | undefined): RiskLevel {
  if (value && RISK_SET.has(value as RiskLevel)) return value as RiskLevel;
  return "medium";
}

function normalizeDifficulty(value: string | undefined): Difficulty {
  if (value && DIFFICULTY_SET.has(value as Difficulty)) return value as Difficulty;
  return "intermediate";
}

export function buildSecurityMetaFromRaw(
  routeEntry: SecurityRouteEntry,
  raw: string,
): SecurityMeta {
  const parsed = parseSecurityMarkdown(raw);
  const title =
    parsed.frontmatter.title ?? parsed.titleFromBody ?? slugToSecurityTitle(routeEntry.slug);
  const summary =
    parsed.frontmatter.summary ??
    "Defensive security guidance for safer document handling and sharing.";
  const audience = normalizeAudience(parsed.frontmatter.audience);
  const track = SECURITY_TRACKS.has(routeEntry.section as SecurityTrack)
    ? (routeEntry.section as SecurityTrack)
    : null;

  return {
    section: routeEntry.section,
    track,
    slug: routeEntry.slug,
    route: routeEntry.route,
    key: routeEntry.key,
    title,
    summary,
    audience,
    riskLevel: normalizeRiskLevel(parsed.frontmatter.riskLevel),
    difficulty: normalizeDifficulty(parsed.frontmatter.difficulty),
    lastReviewed: parsed.frontmatter.lastReviewed ?? null,
    tags: parsed.frontmatter.tags,
    estimatedMinutes: parsed.frontmatter.estimatedMinutes ?? 6,
  };
}

const parsedEntries = Object.entries(modules)
  .map(([key, loader]) => {
    const shape = parseSecurityKey(key);
    if (!shape) return null;
    return {
      key,
      loader,
      section: shape.section,
      slug: shape.slug,
      route: toRoute(shape.section, shape.slug),
    };
  })
  .filter(
    (
      entry,
    ): entry is {
      key: string;
      loader: ContentLoader;
      section: SecuritySection;
      slug: string;
      route: string;
    } => !!entry,
  )
  .sort((a, b) => {
    if (a.section !== b.section) return a.section.localeCompare(b.section);
    return a.slug.localeCompare(b.slug);
  });

const loaderByKey = new Map<string, ContentLoader>(
  parsedEntries.map((entry) => [`${entry.section}/${entry.slug}`, entry.loader]),
);

export const securityRouteEntries: SecurityRouteEntry[] = parsedEntries.map((entry) => ({
  section: entry.section,
  slug: entry.slug,
  route: entry.route,
  key: entry.key,
}));

let securityMetaPromise: Promise<SecurityMeta[]> | null = null;

export async function loadSecurityMetaIndex(): Promise<SecurityMeta[]> {
  if (!securityMetaPromise) {
    securityMetaPromise = Promise.all(
      securityRouteEntries.map(async (entry) => {
        const loader = loaderByKey.get(`${entry.section}/${entry.slug}`);
        if (!loader) return null;
        const raw = await loader();
        return buildSecurityMetaFromRaw(entry, raw);
      }),
    ).then((items) =>
      items
        .filter((item): item is SecurityMeta => !!item)
        .sort((a, b) => {
          if (a.section !== b.section) return a.section.localeCompare(b.section);
          return a.title.localeCompare(b.title);
        }),
    );
  }
  return await securityMetaPromise;
}

export async function getSecurityMeta(
  section: SecuritySection,
  slug: string,
): Promise<SecurityMeta | null> {
  const index = await loadSecurityMetaIndex();
  return index.find((entry) => entry.section === section && entry.slug === slug) ?? null;
}

export async function loadSecurityRaw(
  section: SecuritySection,
  slug: string,
): Promise<string | null> {
  const loader = loaderByKey.get(`${section}/${slug}`);
  if (!loader) return null;
  return await loader();
}

export async function loadSecurityEntry(
  section: SecuritySection,
  slug: string,
): Promise<SecurityEntry | null> {
  const raw = await loadSecurityRaw(section, slug);
  if (!raw) return null;
  const routeEntry = securityRouteEntries.find(
    (entry) => entry.section === section && entry.slug === slug,
  );
  if (!routeEntry) return null;
  const meta = buildSecurityMetaFromRaw(routeEntry, raw);
  const parsed = parseSecurityMarkdown(raw);
  return {
    meta,
    body: parsed.body,
  };
}

export async function loadSecurityPolicyEntry(): Promise<SecurityEntry | null> {
  const policy = securityRouteEntries.find((entry) => entry.section === "policy");
  if (!policy) return null;
  return await loadSecurityEntry(policy.section, policy.slug);
}

