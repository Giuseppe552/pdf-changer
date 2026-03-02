import {
  extractFirstParagraph,
  parseFaqMarkdown,
  truncateText,
} from "./frontmatter";

type ContentLoader = () => Promise<string>;

const modules = import.meta.glob("./**/*.md", {
  query: "?raw",
  import: "default",
}) as Record<string, ContentLoader>;

export type FaqRouteEntry = {
  topic: string;
  slug: string;
  route: string;
  key: string;
};

export type FaqMeta = {
  topic: string;
  slug: string;
  route: string;
  key: string;
  title: string;
  question: string;
  summary: string;
  tags: string[];
  lastReviewed: string | null;
};

export type FaqEntry = {
  meta: FaqMeta;
  body: string;
};

function parseKey(key: string): { topic: string; slug: string } | null {
  const m = key.match(/^\.\/([a-z0-9-]+)\/([a-z0-9-]+)\.md$/);
  if (!m) return null;
  return { topic: m[1], slug: m[2] };
}

function titleCaseWord(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function topicToTitle(topic: string): string {
  return topic
    .split("-")
    .filter(Boolean)
    .map((part) => titleCaseWord(part.toLowerCase()))
    .join(" ");
}

export function slugToFaqTitle(slug: string): string {
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

const parsed = Object.entries(modules)
  .map(([key, loader]) => {
    const shape = parseKey(key);
    if (!shape) return null;
    return {
      key,
      loader,
      ...shape,
      route: `/faq/${shape.topic}/${shape.slug}`,
    };
  })
  .filter(
    (
      entry,
    ): entry is {
      key: string;
      loader: ContentLoader;
      topic: string;
      slug: string;
      route: string;
    } => !!entry,
  )
  .sort((a, b) => {
    if (a.topic !== b.topic) return a.topic.localeCompare(b.topic);
    return a.slug.localeCompare(b.slug);
  });

const loaderByKey = new Map<string, ContentLoader>(
  parsed.map((entry) => [`${entry.topic}/${entry.slug}`, entry.loader]),
);

const routeEntries = parsed.map((entry) => ({
  topic: entry.topic,
  slug: entry.slug,
  route: entry.route,
  key: entry.key,
}));

export const faqEntries: FaqRouteEntry[] = routeEntries;

export const faqTopics: string[] = Array.from(
  new Set(parsed.map((entry) => entry.topic)),
).sort();

async function buildMetaFromRaw(
  routeEntry: FaqRouteEntry,
  raw: string,
): Promise<FaqMeta> {
  const parsedMarkdown = parseFaqMarkdown(raw);
  const baseTitle = slugToFaqTitle(routeEntry.slug);
  const question =
    parsedMarkdown.frontmatter.question ??
    parsedMarkdown.frontmatter.title ??
    parsedMarkdown.titleFromBody ??
    baseTitle;
  const title =
    parsedMarkdown.frontmatter.title ??
    parsedMarkdown.titleFromBody ??
    question;
  const summary =
    parsedMarkdown.frontmatter.summary ??
    truncateText(
      extractFirstParagraph(parsedMarkdown.body) || `Answer to: ${question}.`,
      160,
    );

  return {
    ...routeEntry,
    title,
    question,
    summary,
    tags: parsedMarkdown.frontmatter.tags,
    lastReviewed: parsedMarkdown.frontmatter.lastReviewed ?? null,
  };
}

let faqMetaPromise: Promise<FaqMeta[]> | null = null;

export async function loadFaqMetaIndex(): Promise<FaqMeta[]> {
  if (!faqMetaPromise) {
    faqMetaPromise = Promise.all(
      routeEntries.map(async (entry) => {
        const loader = loaderByKey.get(`${entry.topic}/${entry.slug}`);
        if (!loader) return null;
        const raw = await loader();
        return await buildMetaFromRaw(entry, raw);
      }),
    ).then((items) =>
      items
        .filter((item): item is FaqMeta => !!item)
        .sort((a, b) => {
          if (a.topic !== b.topic) return a.topic.localeCompare(b.topic);
          return a.question.localeCompare(b.question);
        }),
    );
  }
  return await faqMetaPromise;
}

export async function getFaqMeta(
  topic: string,
  slug: string,
): Promise<FaqMeta | null> {
  const index = await loadFaqMetaIndex();
  return index.find((entry) => entry.topic === topic && entry.slug === slug) ?? null;
}

export async function loadFaqRaw(
  topic: string,
  slug: string,
): Promise<string | null> {
  const loader = loaderByKey.get(`${topic}/${slug}`);
  if (!loader) return null;
  return await loader();
}

export async function loadFaqEntry(
  topic: string,
  slug: string,
): Promise<FaqEntry | null> {
  const raw = await loadFaqRaw(topic, slug);
  if (!raw) return null;

  const routeEntry = routeEntries.find(
    (entry) => entry.topic === topic && entry.slug === slug,
  );
  if (!routeEntry) return null;

  const parsedMarkdown = parseFaqMarkdown(raw);
  const meta = await buildMetaFromRaw(routeEntry, raw);
  return {
    meta,
    body: parsedMarkdown.body,
  };
}
