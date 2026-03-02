type ContentLoader = () => Promise<string>;

const modules = import.meta.glob("./**/*.md", {
  query: "?raw",
  import: "default",
}) as Record<string, ContentLoader>;

export type ContentEntry = {
  section: string;
  slug: string;
  route: string;
  key: string;
};

function parseKey(key: string): { section: string; slug: string } | null {
  const m = key.match(/^\.\/([^/]+)\/([^/]+)\.md$/);
  if (!m) return null;
  return { section: m[1], slug: m[2] };
}

export const contentEntries: ContentEntry[] = Object.keys(modules)
  .map((key) => {
    const parsed = parseKey(key);
    if (!parsed) return null;
    const { section, slug } = parsed;
    return {
      section,
      slug,
      route: `/content/${section}/${slug}`,
      key,
    };
  })
  .filter((x): x is ContentEntry => !!x)
  .sort((a, b) => a.route.localeCompare(b.route));

export async function loadContentRaw(
  section: string,
  slug: string,
): Promise<string | null> {
  const key = `./${section}/${slug}.md`;
  const loader = modules[key];
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

export function stripLeadingH1(raw: string): { title: string | null; body: string } {
  const m = raw.match(/^#\s+(.+)\s*\n+/);
  if (!m) return { title: null, body: raw };
  return { title: m[1].trim(), body: raw.slice(m[0].length) };
}

