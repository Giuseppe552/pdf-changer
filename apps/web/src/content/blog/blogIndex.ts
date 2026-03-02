export type BlogPostMeta = {
  date: string; // YYYY-MM-DD
  category: string; // single word (no hyphens)
  slug: string;
  title: string;
  teaser: string;
  readingMinutes: number;
  route: string;
  key: string;
};

type ContentLoader = () => Promise<string>;

const modules = import.meta.glob("./*.md", {
  query: "?raw",
  import: "default",
}) as Record<string, ContentLoader>;

const blogTeasers: Record<string, string> = {
  "anonymity-101":
    "A plain-English foundation for reducing linkability across device, network, and document layers.",
  "pgp-in-plain-english":
    "A realistic intro to PGP, when it helps, and where simpler channels are safer for beginners.",
  "using-pdf-changer-offline":
    "How to run scrubbing workflows offline after first load, and what this does and does not protect.",
  "what-metadata-is-and-why-it-matters":
    "The core metadata structures inside PDFs and why they can expose timeline and authorship clues.",
  "why-links-and-forms-are-removed":
    "Why strict defaults remove annotations, links, forms, and comments in high-risk sharing workflows.",
  "device-and-network-basics":
    "Non-technical OPSEC defaults to avoid common identity leaks before you even touch the document.",
  "printer-tracking-dots":
    "A hidden print-and-scan risk that metadata scrubbing cannot fix once dots are in the image.",
  "sharing-documents-to-journalists":
    "A calm workflow for source-to-newsroom sharing that protects credibility and reduces avoidable exposure.",
};

const blogReadingMinutes: Record<string, number> = {
  "anonymity-101": 7,
  "pgp-in-plain-english": 4,
  "using-pdf-changer-offline": 3,
  "what-metadata-is-and-why-it-matters": 5,
  "why-links-and-forms-are-removed": 4,
  "device-and-network-basics": 5,
  "printer-tracking-dots": 2,
  "sharing-documents-to-journalists": 4,
};

function parseFilename(key: string): BlogPostMeta | null {
  const m = key.match(/^\.\/(\d{4}-\d{2}-\d{2})-([a-z0-9]+)-(.+)\.md$/);
  if (!m) return null;
  const [, date, category, slug] = m;
  const ts = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(ts)) return null;
  const title = slugToTitle(slug);
  const route = `/blog/${category}/${slug}`;
  const teaser = blogTeasers[slug] ?? "Practical guidance for safer document sharing.";
  const readingMinutes = blogReadingMinutes[slug] ?? 4;
  return { date, category, slug, title, teaser, readingMinutes, route, key };
}

const parsed = Object.entries(modules)
  .map(([key, loader]) => {
    const meta = parseFilename(key);
    if (!meta) return null;
    return { meta, loader };
  })
  .filter((x): x is { meta: BlogPostMeta; loader: ContentLoader } => !!x);

const sorted = [...parsed].sort((a, b) => {
  const ad = a.meta.date;
  const bd = b.meta.date;
  if (ad !== bd) return ad < bd ? 1 : -1;
  if (a.meta.category !== b.meta.category) {
    return a.meta.category.localeCompare(b.meta.category);
  }
  return a.meta.slug.localeCompare(b.meta.slug);
});

export const blogPosts: BlogPostMeta[] = sorted.map((p) => p.meta);

const loaderByKey = new Map<string, ContentLoader>(
  parsed.map((p) => [`${p.meta.category}/${p.meta.slug}`, p.loader]),
);
const metaByKey = new Map<string, BlogPostMeta>(
  parsed.map((p) => [`${p.meta.category}/${p.meta.slug}`, p.meta]),
);

export function getBlogPost(category: string, slug: string): BlogPostMeta | null {
  return metaByKey.get(`${category}/${slug}`) ?? null;
}

export async function loadBlogPostRaw(
  category: string,
  slug: string,
): Promise<string | null> {
  const loader = loaderByKey.get(`${category}/${slug}`);
  if (!loader) return null;
  return await loader();
}

export function slugToTitle(slug: string): string {
  const parts = slug.split("-").filter(Boolean);
  const acronyms = new Map([
    ["pdf", "PDF"],
    ["xmp", "XMP"],
    ["exif", "EXIF"],
    ["pwa", "PWA"],
    ["webauthn", "WebAuthn"],
    ["pgp", "PGP"],
    ["tor", "Tor"],
    ["vpn", "VPN"],
  ]);
  return parts
    .map((p) => {
      const lower = p.toLowerCase();
      const a = acronyms.get(lower);
      if (a) return a;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}
