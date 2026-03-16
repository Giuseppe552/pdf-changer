import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Plugin, ResolvedConfig } from "vite";

const Markdown = ReactMarkdown as unknown as React.FC<{ remarkPlugins: unknown[] }>;
import { parseFaqMarkdown } from "./src/content/faq/frontmatter";
import {
  parseSecurityMarkdown,
  trackToTitle,
  type SecurityTrack,
} from "./src/content/security/frontmatter";
import { donateAddresses } from "./src/content/donate/addresses";
import {
  toolDocPages,
  toolCollections,
  faqQuestion,
  getToolEditorial,
  getRelatedTools,
  FAQ_SLUGS,
  type ToolEditorial,
} from "./src/content/tools/toolDocs";
import {
  categoryLabel as toolCategoryLabel,
  toolCategories,
  toolRegistry,
  type ToolDefinition,
  type ToolCategory,
} from "./src/content/tools/toolRegistry";
import {
  homeIdentity,
  homeHeroTitle,
  homeHeroSummary,
  homeAudience,
  homeWhyUse,
  homeHowItWorks,
  homeProofMetrics,
  homeAccountantOutcomes,
  homeLimits,
} from "./src/content/landing/homeContent";

type BlogPost = {
  date: string; // YYYY-MM-DD
  category: string;
  slug: string;
  title: string;
  description: string;
  readingMinutes: number;
  route: string; // /blog/<category>/<slug>
  bodyMd: string;
  bodyHtml: string;
};

type FaqQuestion = {
  topic: string;
  slug: string;
  title: string;
  question: string;
  description: string;
  tags: string[];
  lastReviewed: string | null;
  route: string; // /faq/<topic>/<slug>
  bodyMd: string;
  bodyHtml: string;
};

type SecurityArticle = {
  section: "non-technical" | "technical" | "policy";
  track: SecurityTrack | null;
  slug: string;
  title: string;
  description: string;
  audience: string[];
  riskLevel: "low" | "medium" | "high";
  difficulty: "beginner" | "intermediate" | "advanced";
  lastReviewed: string | null;
  tags: string[];
  estimatedMinutes: number;
  route: string;
  bodyMd: string;
  bodyHtml: string;
};

type DonateProofManifest = {
  version: "v1";
  proofId: string;
  publishedAt: string;
  validFrom: string;
  key: {
    fingerprint: string;
    keyId: string;
    algorithm: string;
    firstSeenAt: string;
  };
  files: Array<{
    path: string;
    sha256: string;
    sizeBytes: number;
  }>;
  addresses: Array<{
    network: string;
    symbol: string;
    address: string;
    note?: string;
  }>;
  supersedesProofId?: string;
  revoked?: boolean;
  revocationReason?: string;
};

type DonateProofArchive = {
  version: "v1";
  updatedAt: string;
  proofs: Array<{
    proofId: string;
    manifestPath: string;
    publishedAt: string;
    revoked?: boolean;
    revocationReason?: string;
  }>;
  keys: Array<{
    fingerprint: string;
    keyId: string;
    path: string;
    firstSeenAt: string;
    status: "active" | "retired" | "revoked";
    retiredAt?: string;
  }>;
};

function cleanOrigin(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeXml(s: string): string {
  return escapeHtml(s);
}

function stripLeadingH1(raw: string): { title: string | null; body: string } {
  const m = raw.match(/^#\s+(.+)\s*\n+/);
  if (!m) return { title: null, body: raw };
  return { title: m[1].trim(), body: raw.slice(m[0].length) };
}

function firstParagraph(md: string): string {
  const lines = md.split("\n");
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
  const raw = buf.join(" ").trim();
  // Strip common markdown formatting for meta descriptions.
  return raw
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const idx = cut.lastIndexOf(" ");
  return `${(idx > 80 ? cut.slice(0, idx) : cut).trim()}…`;
}

function titleCaseWord(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function titleCasePhrase(s: string): string {
  return s
    .split("-")
    .filter(Boolean)
    .map((part) => titleCaseWord(part.toLowerCase()))
    .join(" ");
}

function slugToReadableTitle(slug: string): string {
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

function parseBlogFilename(filename: string): { date: string; category: string; slug: string } | null {
  const m = filename.match(/^(\d{4}-\d{2}-\d{2})-([a-z0-9]+)-(.+)\.md$/);
  if (!m) return null;
  const [, date, category, slug] = m;
  const ts = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(ts)) return null;
  return { date, category, slug };
}

function readBlogPosts(rootDir: string): BlogPost[] {
  const blogDir = path.join(rootDir, "src", "content", "blog");
  const files = fs
    .readdirSync(blogDir)
    .filter((f) => f.endsWith(".md"))
    .sort();

  const posts: BlogPost[] = [];
  for (const file of files) {
    const parsed = parseBlogFilename(file);
    if (!parsed) continue;
    const raw = fs.readFileSync(path.join(blogDir, file), "utf8");
    const { title: h1, body } = stripLeadingH1(raw);
    const title = h1 ?? `${parsed.slug}`;
    const desc = truncate(firstParagraph(body) || "PDF Changer blog post.", 160);
    const bodyHtml = renderToStaticMarkup(
      React.createElement(Markdown, { remarkPlugins: [remarkGfm] }, body),
    );
    posts.push({
      date: parsed.date,
      category: parsed.category,
      slug: parsed.slug,
      title,
      description: desc,
      readingMinutes: estimateReadingMinutes(body),
      route: `/blog/${parsed.category}/${parsed.slug}`,
      bodyMd: body,
      bodyHtml,
    });
  }

  posts.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.slug.localeCompare(b.slug);
  });

  return posts;
}

function listMarkdownFilesRecursively(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listMarkdownFilesRecursively(full));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

function readFaqQuestions(rootDir: string): FaqQuestion[] {
  const faqDir = path.join(rootDir, "src", "content", "faq");
  const files = listMarkdownFilesRecursively(faqDir).sort();
  const questions: FaqQuestion[] = [];

  for (const filePath of files) {
    const rel = path.relative(faqDir, filePath).replace(/\\/g, "/");
    const m = rel.match(/^([a-z0-9-]+)\/([a-z0-9-]+)\.md$/);
    if (!m) continue;
    const [, topic, slug] = m;

    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = parseFaqMarkdown(raw);
    const baseTitle = slugToReadableTitle(slug);
    const question =
      parsed.frontmatter.question ??
      parsed.frontmatter.title ??
      parsed.titleFromBody ??
      baseTitle;
    const title = parsed.frontmatter.title ?? parsed.titleFromBody ?? question;
    const description = truncate(
      parsed.frontmatter.summary || firstParagraph(parsed.body) || `Answer to: ${question}.`,
      160,
    );
    const bodyHtml = renderToStaticMarkup(
      React.createElement(Markdown, { remarkPlugins: [remarkGfm] }, parsed.body),
    );

    questions.push({
      topic,
      slug,
      title,
      question,
      description,
      tags: parsed.frontmatter.tags,
      lastReviewed: parsed.frontmatter.lastReviewed ?? null,
      route: `/faq/${topic}/${slug}`,
      bodyMd: parsed.body,
      bodyHtml,
    });
  }

  questions.sort((a, b) => {
    if (a.topic !== b.topic) return a.topic.localeCompare(b.topic);
    return a.question.localeCompare(b.question);
  });

  return questions;
}

function readSecurityArticles(rootDir: string): SecurityArticle[] {
  const securityDir = path.join(rootDir, "src", "content", "security");
  const files = listMarkdownFilesRecursively(securityDir).sort();
  const articles: SecurityArticle[] = [];

  for (const filePath of files) {
    const rel = path.relative(securityDir, filePath).replace(/\\/g, "/");
    const m = rel.match(/^(non-technical|technical|policy)\/([a-z0-9-]+)\.md$/);
    if (!m) continue;
    const [, section, slug] = m;
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = parseSecurityMarkdown(raw);
    const title =
      parsed.frontmatter.title ?? parsed.titleFromBody ?? slugToReadableTitle(slug);
    const description = truncate(
      parsed.frontmatter.summary ||
        firstParagraph(parsed.body) ||
        "Defensive security guidance for safer document workflows.",
      160,
    );
    const risk =
      parsed.frontmatter.riskLevel === "low" ||
      parsed.frontmatter.riskLevel === "high"
        ? parsed.frontmatter.riskLevel
        : "medium";
    const difficulty =
      parsed.frontmatter.difficulty === "beginner" ||
      parsed.frontmatter.difficulty === "advanced"
        ? parsed.frontmatter.difficulty
        : "intermediate";
    const route =
      section === "policy" ? "/security/policy" : `/security/${section}/${slug}`;
    const bodyHtml = renderToStaticMarkup(
      React.createElement(Markdown, { remarkPlugins: [remarkGfm] }, parsed.body),
    );

    articles.push({
      section: section as SecurityArticle["section"],
      track:
        section === "non-technical" || section === "technical"
          ? (section as SecurityTrack)
          : null,
      slug,
      title,
      description,
      audience: parsed.frontmatter.audience,
      riskLevel: risk,
      difficulty,
      lastReviewed: parsed.frontmatter.lastReviewed ?? null,
      tags: parsed.frontmatter.tags,
      estimatedMinutes: parsed.frontmatter.estimatedMinutes ?? estimateReadingMinutes(parsed.body),
      route,
      bodyMd: parsed.body,
      bodyHtml,
    });
  }

  articles.sort((a, b) => {
    if (a.section !== b.section) return a.section.localeCompare(b.section);
    return a.title.localeCompare(b.title);
  });
  return articles;
}

function cssLinksFromIndexHtml(indexHtml: string): string[] {
  const out: string[] = [];
  const re = /<link\s+[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g;
  for (const m of indexHtml.matchAll(re)) {
    out.push(m[1]);
  }
  return out;
}

function rfc822Date(date: string): string {
  const ts = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(ts)) return new Date().toUTCString();
  return new Date(ts).toUTCString();
}

function estimateReadingMinutes(markdown: string): number {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return 1;
  const words = plain.split(" ").filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

function readJsonFile<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function readDonateProofManifest(rootDir: string): DonateProofManifest | null {
  const filePath = path.join(rootDir, "public", "donate-proof", "v1", "manifest.v1.json");
  const parsed = readJsonFile<DonateProofManifest>(filePath);
  if (!parsed || parsed.version !== "v1") return null;
  if (!parsed.proofId || !parsed.publishedAt || !parsed.validFrom) return null;
  if (!parsed.key?.fingerprint || !parsed.key?.keyId) return null;
  if (!Array.isArray(parsed.files) || parsed.files.length === 0) return null;
  return parsed;
}

function readDonateProofArchive(rootDir: string): DonateProofArchive | null {
  const filePath = path.join(rootDir, "public", "donate-proof", "archive", "index.json");
  const parsed = readJsonFile<DonateProofArchive>(filePath);
  if (!parsed || parsed.version !== "v1") return null;
  if (!Array.isArray(parsed.proofs) || !Array.isArray(parsed.keys)) return null;
  return parsed;
}

function formatIsoUtc(value: string | null | undefined): string {
  if (!value) return "Not available";
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return value;
  return new Date(ts).toISOString().replace("T", " ").replace(".000Z", " UTC");
}

function htmlLayout(opts: {
  title: string;
  description: string;
  canonicalHref: string;
  ogUrl?: string;
  ogType: "website" | "article";
  publishedDate?: string;
  articleSection?: string;
  articleTags?: string[];
  cssHrefs: string[];
  bodyHtml: string;
  rssHref?: string;
  headExtra?: string;
  jsTags?: string[];
  preloadTags?: string[];
  activeNav?:
    | "scrub"
    | "tools"
    | "guides"
    | "faq"
    | "blog"
    | "donate"
    | "pricing"
    | "account"
    | "security";
}): string {
  const {
    title,
    description,
    canonicalHref,
    ogUrl,
    ogType,
    publishedDate,
    articleSection,
    articleTags,
    cssHrefs, jsTags, preloadTags,
    bodyHtml,
    rssHref,
    headExtra,
    activeNav,
  } = opts;

  const cssTags = cssHrefs
    .map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}">`)
    .join("\n    ");

  const canonicalTag = canonicalHref
    ? `<link rel="canonical" href="${escapeHtml(canonicalHref)}">`
    : "";

  const ogUrlTag = ogUrl ? `<meta property="og:url" content="${escapeHtml(ogUrl)}">` : "";

  const articleMeta =
    ogType === "article" && publishedDate
      ? `<meta property="article:published_time" content="${escapeHtml(`${publishedDate}T00:00:00Z`)}">`
      : "";

  const articleSectionMeta =
    ogType === "article" && articleSection
      ? `<meta property="article:section" content="${escapeHtml(articleSection)}">`
      : "";

  const articleTagMeta =
    ogType === "article" && articleTags?.length
      ? articleTags
          .map((t) => `<meta property="article:tag" content="${escapeHtml(t)}">`)
          .join("\n    ")
      : "";

  const rssTag = rssHref
    ? `<link rel="alternate" type="application/rss+xml" title="PDF Changer Blog" href="${escapeHtml(rssHref)}" />`
    : "";

  function navClass(
    key:
      | "scrub"
      | "tools"
      | "guides"
      | "faq"
      | "blog"
      | "donate"
      | "pricing"
      | "account"
      | "security",
  ): string {
    if (activeNav === key) {
      return "rounded-sm bg-blue-700 px-3 py-1.5 text-xs font-medium text-white";
    }
    return "rounded-sm px-3 py-1.5 text-xs font-medium text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-overlay)] hover:text-[var(--ui-text)]";
  }

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0e1117" />
    <meta name="color-scheme" content="dark" />
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index,follow" />
    <meta property="og:site_name" content="PDF Changer" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="${ogType}" />
    <meta property="og:image" content="${ogUrl ? new URL("/og.png", ogUrl).href : "/og.png"}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="PDF Changer — free, private PDF tools that run in your browser" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${ogUrl ? new URL("/og.png", ogUrl).href : "/og.png"}" />
    ${ogUrlTag}
    ${articleMeta}
    ${articleSectionMeta}
    ${articleTagMeta}
    ${canonicalTag}
    <link rel="icon" href="/icon.svg" type="image/svg+xml" />
    <link rel="manifest" href="/manifest.webmanifest" />
    ${rssTag}
    <title>${escapeHtml(title)} · PDF Changer</title>
    ${headExtra ?? ""}
    ${cssTags}
    ${(opts.preloadTags ?? []).join("\n    ")}
  </head>
  <body style="background:#0e1117;color:#e6edf3">
    <div id="root"></div>
    <div class="min-h-screen">
      <header class="sticky top-0 z-10 border-b border-[var(--ui-border)] bg-[var(--ui-bg-raised)]/80 backdrop-blur">
        <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <a href="/" class="text-sm font-semibold tracking-wide text-[var(--ui-text)]">PDF Changer</a>
          <nav class="flex flex-wrap items-center justify-end gap-2">
            <a href="/scrub" class="${navClass("scrub")}">Scrub</a>
            <a href="/tools" class="${navClass("tools")}">Tools</a>
            <a href="/guides" class="${navClass("guides")}">Guides</a>
            <a href="/faq" class="${navClass("faq")}">FAQ</a>
            <a href="/blog" class="${navClass("blog")}">Blog</a>
            <a href="/donate" class="${navClass("donate")}">Donate</a>
            <a href="/pricing" class="${navClass("pricing")}">Pricing</a>
            <a href="/account" class="${navClass("account")}">Account</a>
            <a href="/security" class="${navClass("security")}">Security</a>
          </nav>
        </div>
      </header>
      <main class="mx-auto max-w-5xl px-4 py-10">
${bodyHtml}
      </main>
      <footer class="border-t border-[var(--ui-border)] bg-[var(--ui-bg-raised)]">
        <div class="mx-auto max-w-5xl px-4 py-10">
          <div class="grid gap-8 md:grid-cols-4">
            <div class="space-y-3">
              <div class="text-sm font-semibold text-[var(--ui-text)]">PDF Changer</div>
              <div class="text-sm text-[var(--ui-text-muted)]">Free PDF tools that run entirely in your browser. No uploads, no trackers.</div>
            </div>
            <div class="space-y-2">
              <div class="text-xs font-semibold uppercase tracking-wide text-[var(--ui-text-muted)]">Legal</div>
              <div class="flex flex-col gap-2">
                <a class="text-sm text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]" href="/privacy-policy">Privacy policy</a>
                <a class="text-sm text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]" href="/terms">Terms</a>
                <a class="text-sm text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]" href="/refund-policy">Refund policy</a>
              </div>
            </div>
            <div class="space-y-2">
              <div class="text-xs font-semibold uppercase tracking-wide text-[var(--ui-text-muted)]">Resources</div>
              <div class="flex flex-col gap-2">
                <a class="text-sm text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]" href="/security">Security</a>
                <a class="text-sm text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]" href="/privacy">Privacy summary</a>
                <a class="text-sm text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]" href="/faq">FAQ</a>
                <a class="text-sm text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]" href="/sitemap">Sitemap</a>
                <a class="text-sm text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]" href="/donate">Donate</a>
              </div>
            </div>
            <div class="space-y-2">
              <div class="text-xs font-semibold uppercase tracking-wide text-[var(--ui-text-muted)]">Updates</div>
              <div class="text-sm text-[var(--ui-text-muted)]">
                Want product updates? Use the <a class="underline hover:text-[var(--ui-text)]" href="/newsletter">newsletter page</a>.
              </div>
            </div>
          </div>
          <div class="mt-6 text-xs text-[var(--ui-text-muted)]">© ${new Date().getFullYear()} PDF Changer. Built by Giuseppe Giona.</div>
        </div>
      </footer>
    </div>
    ${(opts.jsTags ?? []).join("\n    ")}
  </body>
</html>`;
}

function buildBlogIndexBody(posts: BlogPost[]): string {
  const categories = Array.from(new Set(posts.map((p) => p.category))).sort();
  const categoryLinks = categories
    .map(
      (category) => {
        const count = posts.filter((p) => p.category === category).length;
        return `<a href="/blog/${escapeHtml(category)}" class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-3 py-1 text-xs font-medium text-[var(--ui-text-secondary)] hover:border-[var(--ui-border)] hover:text-[var(--ui-text)]">${escapeHtml(titleCaseWord(category))} (${count})</a>`;
      },
    )
    .join("\n          ");

  const topicCards = categories
    .map((category) => {
      const featured = posts.filter((p) => p.category === category).slice(0, 3);
      const list = featured
        .map(
          (p) =>
            `<li><a class="underline" href="${escapeHtml(p.route)}">${escapeHtml(p.title)}</a></li>`,
        )
        .join("\n            ");
      return `
        <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
          <div class="text-sm font-semibold text-[var(--ui-text)]">${escapeHtml(titleCaseWord(category))}</div>
          <ul class="mt-3 list-inside list-disc space-y-2 text-sm text-[var(--ui-text-secondary)]">
            ${list}
          </ul>
          <div class="mt-4 text-sm text-[var(--ui-text-muted)]"><a class="underline" href="/blog/${escapeHtml(category)}">Open ${escapeHtml(titleCaseWord(category))} archive</a></div>
        </div>
      `.trim();
    })
    .join("\n");

  const items = posts
    .map((p) => {
      return `
        <a href="${escapeHtml(p.route)}" class="group block rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-5 shadow-sm transition hover:border-[var(--ui-border)] hover:shadow">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="text-xs font-semibold uppercase tracking-wide text-[var(--ui-text-muted)]">${escapeHtml(titleCaseWord(p.category))}</div>
            <div class="text-xs text-[var(--ui-text-muted)]">${escapeHtml(p.date)} · ${escapeHtml(String(p.readingMinutes))} min read</div>
          </div>
          <h2 class="mt-2 text-sm font-semibold text-[var(--ui-text)] group-hover:text-[var(--ui-text)]">${escapeHtml(p.title)}</h2>
          <p class="mt-1 text-sm text-[var(--ui-text-muted)]">${escapeHtml(p.description)}</p>
        </a>
      `.trim();
    })
    .join("\n");

  return `
        <div class="space-y-2">
          <h1 class="text-2xl font-semibold tracking-tight">Blog Hub</h1>
          <p class="max-w-3xl text-sm text-[var(--ui-text-secondary)]">
            Daily-read security guidance focused on anonymity, document risk, and safer submissions. Calm language, strict defaults, practical steps.
          </p>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          ${categoryLinks}
        </div>
        <div class="mt-6 grid gap-4 md:grid-cols-2">
          <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
            <div class="text-sm font-semibold text-[var(--ui-text)]">Start here</div>
            <ul class="mt-3 list-inside list-disc space-y-2 text-sm text-[var(--ui-text-secondary)]">
              <li><a class="underline" href="/blog/basics/anonymity-101">Anonymity 101</a></li>
              <li><a class="underline" href="/blog/opsec/device-and-network-basics">Device and network basics</a></li>
              <li><a class="underline" href="/scrub">Use the scrubber (on-device)</a></li>
            </ul>
          </div>
          <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
            <div class="text-sm font-semibold text-[var(--ui-text)]">Scale snapshot</div>
            <div class="mt-2 text-sm text-[var(--ui-text-secondary)]">${posts.length} published posts across ${categories.length} core topics.</div>
            <div class="mt-3 text-sm text-[var(--ui-text-secondary)]">Start with practical defaults, then expand to topic archives for deeper workflows.</div>
          </div>
        </div>
        <div class="mt-6 grid gap-4 md:grid-cols-2">
          ${topicCards}
        </div>
        <div class="mt-8 space-y-3">
          <h2 class="text-lg font-semibold tracking-tight">All posts</h2>
${items}
        </div>
  `.trim();
}

function buildCategoryIndexBody(category: string, posts: BlogPost[]): string {
  const categories = Array.from(new Set(posts.map((p) => p.category))).sort();
  const categoryLinks = categories
    .filter((c) => c !== category)
    .map(
      (c) =>
        `<a href="/blog/${escapeHtml(c)}" class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-3 py-1 text-xs font-medium text-[var(--ui-text-secondary)] hover:border-[var(--ui-border)] hover:text-[var(--ui-text)]">${escapeHtml(titleCaseWord(c))}</a>`,
    )
    .join("\n          ");

  const items = posts
    .filter((p) => p.category === category)
    .map((p) => {
      return `
        <a href="${escapeHtml(p.route)}" class="group block rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-5 shadow-sm transition hover:border-[var(--ui-border)] hover:shadow">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="text-xs font-semibold uppercase tracking-wide text-[var(--ui-text-muted)]">${escapeHtml(titleCaseWord(p.category))}</div>
            <div class="text-xs text-[var(--ui-text-muted)]">${escapeHtml(p.date)} · ${escapeHtml(String(p.readingMinutes))} min read</div>
          </div>
          <h2 class="mt-2 text-sm font-semibold text-[var(--ui-text)] group-hover:text-[var(--ui-text)]">${escapeHtml(p.title)}</h2>
          <p class="mt-1 text-sm text-[var(--ui-text-muted)]">${escapeHtml(p.description)}</p>
        </a>
      `.trim();
    })
    .join("\n");

  return `
        <div class="space-y-2">
          <nav aria-label="Breadcrumb" class="text-xs text-[var(--ui-text-muted)]"><a class="hover:text-[var(--ui-text)]" href="/blog">Blog</a> / ${escapeHtml(titleCaseWord(category))}</nav>
          <h1 class="text-2xl font-semibold tracking-tight">${escapeHtml(titleCaseWord(category))}</h1>
          <p class="max-w-3xl text-sm text-[var(--ui-text-secondary)]">Posts tagged ${escapeHtml(titleCaseWord(category))}. Practical security guidance you can apply without advanced tooling.</p>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          ${categoryLinks}
        </div>
        <div class="mt-6 space-y-3">
${items}
        </div>
  `.trim();
}

function buildPostBody(
  post: BlogPost,
  related: BlogPost[],
  newer: BlogPost | null,
  older: BlogPost | null,
): string {
  const relatedHtml = related.length
    ? `
        <div class="mt-8 rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
          <div class="text-sm font-semibold text-[var(--ui-text)]">More in ${escapeHtml(post.category)}</div>
          <ul class="mt-3 list-inside list-disc space-y-2 text-sm text-[var(--ui-text-secondary)]">
            ${related
              .map(
                (p) =>
                  `<li><a class="underline" href="${escapeHtml(p.route)}">${escapeHtml(p.title)}</a></li>`,
              )
              .join("\n            ")}
          </ul>
        </div>
      `
    : "";

  const continueReadingHtml = `
        <div class="mt-8 rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
          <div class="text-sm font-semibold text-[var(--ui-text)]">Continue reading</div>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <div class="space-y-1">
              <div class="text-xs font-semibold uppercase tracking-wide text-[var(--ui-text-muted)]">Newer</div>
              ${
                newer
                  ? `<a class="text-sm underline" href="${escapeHtml(newer.route)}">${escapeHtml(newer.title)}</a>`
                  : `<div class="text-sm text-[var(--ui-text-muted)]">No newer post.</div>`
              }
            </div>
            <div class="space-y-1">
              <div class="text-xs font-semibold uppercase tracking-wide text-[var(--ui-text-muted)]">Older</div>
              ${
                older
                  ? `<a class="text-sm underline" href="${escapeHtml(older.route)}">${escapeHtml(older.title)}</a>`
                  : `<div class="text-sm text-[var(--ui-text-muted)]">No older post.</div>`
              }
            </div>
          </div>
        </div>
      `;

  return `
        <article itemscope itemtype="https://schema.org/Article" class="space-y-4">
          <link itemprop="mainEntityOfPage" href="${escapeHtml(post.route)}" />
          <meta itemprop="datePublished" content="${escapeHtml(post.date)}" />
          <meta itemprop="dateModified" content="${escapeHtml(post.date)}" />
          <meta itemprop="description" content="${escapeHtml(post.description)}" />
          <nav aria-label="Breadcrumb" class="text-xs text-[var(--ui-text-muted)]"><a class="hover:text-[var(--ui-text)]" href="/blog">Blog</a> / <a class="hover:text-[var(--ui-text)]" href="/blog/${escapeHtml(post.category)}">${escapeHtml(titleCaseWord(post.category))}</a> / <time datetime="${escapeHtml(post.date)}">${escapeHtml(post.date)}</time> · ${escapeHtml(String(post.readingMinutes))} min read</nav>
          <h1 itemprop="headline" class="text-2xl font-semibold tracking-tight">${escapeHtml(post.title)}</h1>
          <p class="max-w-3xl text-sm text-[var(--ui-text-secondary)]">${escapeHtml(post.description)}</p>
          <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 text-sm text-[var(--ui-text-secondary)] shadow-sm">
            This post is general information, not legal advice. If you may face retaliation or legal risk, consider speaking to a qualified lawyer or a trusted journalist organization before acting.
          </div>
          <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
            <div itemprop="articleBody" class="prose prose-neutral prose-sm max-w-none">
              ${post.bodyHtml}
            </div>
          </div>
          <div class="text-sm text-[var(--ui-text-muted)]">
            Next step: <a class="underline" href="/scrub">scrub a PDF locally</a>.
          </div>
        </article>
${continueReadingHtml}
${relatedHtml}
  `.trim();
}

function buildFaqIndexBody(questions: FaqQuestion[]): string {
  const topics = Array.from(new Set(questions.map((q) => q.topic))).sort();
  const topicLinks = topics
    .map((topic) => {
      const count = questions.filter((q) => q.topic === topic).length;
      return `<a href="/faq/${escapeHtml(topic)}" class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-3 py-1 text-xs font-medium text-[var(--ui-text-secondary)] hover:border-[var(--ui-border)] hover:text-[var(--ui-text)]">${escapeHtml(titleCasePhrase(topic))} (${count})</a>`;
    })
    .join("\n          ");

  const topicCards = topics
    .map((topic) => {
      const items = questions
        .filter((q) => q.topic === topic)
        .slice(0, 5)
        .map(
          (q) =>
            `<li><a class="underline" href="${escapeHtml(q.route)}">${escapeHtml(q.question)}</a></li>`,
        )
        .join("\n            ");
      return `
        <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
          <div class="text-sm font-semibold text-[var(--ui-text)]">${escapeHtml(titleCasePhrase(topic))}</div>
          <ul class="mt-3 list-inside list-disc space-y-2 text-sm text-[var(--ui-text-secondary)]">
            ${items}
          </ul>
          <div class="mt-4 text-sm text-[var(--ui-text-muted)]"><a class="underline" href="/faq/${escapeHtml(topic)}">View all ${escapeHtml(titleCasePhrase(topic))} questions</a></div>
        </div>
      `.trim();
    })
    .join("\n");

  const allItems = questions
    .map(
      (q) => `
        <a href="${escapeHtml(q.route)}" class="group block rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-5 shadow-sm transition hover:border-[var(--ui-border)] hover:shadow">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="text-xs font-semibold uppercase tracking-wide text-[var(--ui-text-muted)]">${escapeHtml(titleCasePhrase(q.topic))}</div>
            ${
              q.lastReviewed
                ? `<div class="text-xs text-[var(--ui-text-muted)]">Reviewed ${escapeHtml(q.lastReviewed)}</div>`
                : ""
            }
          </div>
          <h2 class="mt-2 text-sm font-semibold text-[var(--ui-text)] group-hover:text-[var(--ui-text)]">${escapeHtml(q.question)}</h2>
          <p class="mt-1 text-sm text-[var(--ui-text-muted)]">${escapeHtml(q.description)}</p>
        </a>
      `.trim(),
    )
    .join("\n");

  return `
        <div class="space-y-2">
          <h1 class="text-2xl font-semibold tracking-tight">FAQ Hub</h1>
          <p class="max-w-3xl text-sm text-[var(--ui-text-secondary)]">
            Practical, plain-English answers on anonymity, document safety, and secure sharing. This is general information, not legal advice.
          </p>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          ${topicLinks}
        </div>
        <div class="mt-6 grid gap-4 md:grid-cols-2">
          ${topicCards}
        </div>
        <div class="mt-8 space-y-3">
          <h2 class="text-lg font-semibold tracking-tight">All questions</h2>
          ${allItems}
        </div>
  `.trim();
}

function buildFaqTopicBody(topic: string, questions: FaqQuestion[]): string {
  const topicTitle = titleCasePhrase(topic);
  const otherTopics = Array.from(new Set(questions.map((q) => q.topic)))
    .filter((item) => item !== topic)
    .sort();
  const otherLinks = otherTopics
    .map(
      (item) =>
        `<a href="/faq/${escapeHtml(item)}" class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-3 py-1 text-xs font-medium text-[var(--ui-text-secondary)] hover:border-[var(--ui-border)] hover:text-[var(--ui-text)]">${escapeHtml(titleCasePhrase(item))}</a>`,
    )
    .join("\n          ");

  const entries = questions
    .filter((q) => q.topic === topic)
    .map(
      (q) => `
        <a href="${escapeHtml(q.route)}" class="group block rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-5 shadow-sm transition hover:border-[var(--ui-border)] hover:shadow">
          <h2 class="text-sm font-semibold text-[var(--ui-text)] group-hover:text-[var(--ui-text)]">${escapeHtml(q.question)}</h2>
          <p class="mt-1 text-sm text-[var(--ui-text-muted)]">${escapeHtml(q.description)}</p>
          <div class="mt-2 text-xs text-[var(--ui-text-muted)]">
            ${q.lastReviewed ? `Reviewed ${escapeHtml(q.lastReviewed)}` : "Review date pending"}
          </div>
        </a>
      `.trim(),
    )
    .join("\n");

  return `
        <div class="space-y-2">
          <nav aria-label="Breadcrumb" class="text-xs text-[var(--ui-text-muted)]"><a class="hover:text-[var(--ui-text)]" href="/faq">FAQ Hub</a> / ${escapeHtml(topicTitle)}</nav>
          <h1 class="text-2xl font-semibold tracking-tight">${escapeHtml(topicTitle)}</h1>
          <p class="max-w-2xl text-sm text-[var(--ui-text-secondary)]">Frequently asked questions for ${escapeHtml(topicTitle.toLowerCase())}.</p>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          ${otherLinks}
        </div>
        <div class="mt-6 space-y-3">
          ${entries}
        </div>
  `.trim();
}

function buildFaqQuestionBody(question: FaqQuestion, related: FaqQuestion[]): string {
  const relatedHtml = related.length
    ? `
        <div class="mt-8 rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
          <div class="text-sm font-semibold text-[var(--ui-text)]">Related questions</div>
          <ul class="mt-3 list-inside list-disc space-y-2 text-sm text-[var(--ui-text-secondary)]">
            ${related
              .map(
                (item) =>
                  `<li><a class="underline" href="${escapeHtml(item.route)}">${escapeHtml(item.question)}</a></li>`,
              )
              .join("\n            ")}
          </ul>
        </div>
      `
    : "";

  const tagsHtml = question.tags.length
    ? `
        <div class="mt-3 flex flex-wrap gap-2">
          ${question.tags
            .map(
              (tag) =>
                `<span class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg)] px-2 py-0.5 text-xs text-[var(--ui-text-muted)]">${escapeHtml(tag)}</span>`,
            )
            .join("\n          ")}
        </div>
      `
    : "";

  return `
        <article itemscope itemtype="https://schema.org/FAQPage" class="space-y-4">
          <div itemprop="mainEntity" itemscope itemtype="https://schema.org/Question" class="space-y-4">
            <nav aria-label="Breadcrumb" class="text-xs text-[var(--ui-text-muted)]"><a class="hover:text-[var(--ui-text)]" href="/faq">FAQ Hub</a> / <a class="hover:text-[var(--ui-text)]" href="/faq/${escapeHtml(question.topic)}">${escapeHtml(titleCasePhrase(question.topic))}</a></nav>
            <h1 itemprop="name" class="text-2xl font-semibold tracking-tight">${escapeHtml(question.question)}</h1>
            <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 text-sm text-[var(--ui-text-secondary)] shadow-sm">
              <div class="font-semibold text-[var(--ui-text)]">Short answer</div>
              <p class="mt-2">${escapeHtml(question.description)}</p>
              ${
                question.lastReviewed
                  ? `<div class="mt-3 text-xs text-[var(--ui-text-muted)]">Last reviewed: ${escapeHtml(question.lastReviewed)}</div>`
                  : ""
              }
              ${tagsHtml}
            </div>
            <div itemprop="acceptedAnswer" itemscope itemtype="https://schema.org/Answer" class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
              <div itemprop="text" class="prose prose-neutral prose-sm max-w-none">
                ${question.bodyHtml}
              </div>
            </div>
          </div>
          <div class="text-sm text-[var(--ui-text-muted)]">
            Next safe step: <a class="underline" href="/scrub">scrub a PDF locally</a> and review <a class="underline" href="/security">threat model limits</a>.
          </div>
        </article>
${relatedHtml}
  `.trim();
}

function buildSecurityHubBody(articles: SecurityArticle[]): string {
  const trackArticles = articles.filter((item) => item.track);
  const nonTechnical = trackArticles.filter((item) => item.track === "non-technical");
  const technical = trackArticles.filter((item) => item.track === "technical");
  const latest = [...trackArticles]
    .filter((item) => !!item.lastReviewed)
    .sort((a, b) => (b.lastReviewed ?? "").localeCompare(a.lastReviewed ?? ""))
    .slice(0, 3);

  const cards = trackArticles
    .map(
      (article) => `
        <a href="${escapeHtml(article.route)}" class="group block rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-5 shadow-sm transition hover:border-[var(--ui-border)] hover:shadow">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="text-xs font-semibold uppercase tracking-wide text-[var(--ui-text-muted)]">${escapeHtml(article.track ? trackToTitle(article.track) : "Policy")} · ${escapeHtml(article.riskLevel)} · ${escapeHtml(article.difficulty)}</div>
            <div class="text-xs text-[var(--ui-text-muted)]">${escapeHtml(article.lastReviewed ?? "Review pending")} · ${escapeHtml(String(article.estimatedMinutes))} min</div>
          </div>
          <h2 class="mt-2 text-sm font-semibold text-[var(--ui-text)] group-hover:text-[var(--ui-text)]">${escapeHtml(article.title)}</h2>
          <p class="mt-1 text-sm text-[var(--ui-text-muted)]">${escapeHtml(article.description)}</p>
        </a>
      `.trim(),
    )
    .join("\n");

  return `
        <div class="space-y-2">
          <h1 class="text-2xl font-semibold tracking-tight">Security Hub</h1>
          <p class="max-w-3xl text-sm text-[var(--ui-text-secondary)]">
            Defensive security guidance for document workflows. Plain-English for non-technical readers, deep technical references for advanced users.
          </p>
        </div>

        <div class="mt-6 grid gap-4 md:grid-cols-2">
          <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
            <div class="text-sm font-semibold text-[var(--ui-text)]">Who this is for</div>
            <ul class="mt-3 list-inside list-disc space-y-2 text-sm text-[var(--ui-text-secondary)]">
              <li>Office workers</li>
              <li>Whistleblowers</li>
              <li>General PDF users</li>
              <li>Journalists and support teams</li>
            </ul>
          </div>
          <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
            <div class="text-sm font-semibold text-[var(--ui-text)]">Start here</div>
            <ul class="mt-3 list-inside list-disc space-y-2 text-sm text-[var(--ui-text-secondary)]">
              <li><a class="underline" href="/security/non-technical/whistleblower-quickstart">Whistleblower quickstart</a></li>
              <li><a class="underline" href="/security/non-technical/safe-pdf-handling-basics">Safe PDF handling basics</a></li>
              <li><a class="underline" href="/security/technical/threat-modeling-workflow">Threat modeling workflow</a></li>
            </ul>
          </div>
        </div>

        <div class="mt-6 grid gap-4 md:grid-cols-3">
          <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
            <div class="text-sm font-semibold text-[var(--ui-text)]">Non-Technical (${nonTechnical.length})</div>
            <p class="mt-2 text-sm text-[var(--ui-text-secondary)]">Practical guidance with minimum jargon.</p>
            <div class="mt-3 text-sm"><a class="underline" href="/security/non-technical">Open non-technical track</a></div>
          </div>
          <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
            <div class="text-sm font-semibold text-[var(--ui-text)]">Technical (${technical.length})</div>
            <p class="mt-2 text-sm text-[var(--ui-text-secondary)]">Deep risk models and systems-level controls.</p>
            <div class="mt-3 text-sm"><a class="underline" href="/security/technical">Open technical track</a></div>
          </div>
          <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
            <div class="text-sm font-semibold text-[var(--ui-text)]">Policy</div>
            <p class="mt-2 text-sm text-[var(--ui-text-secondary)]">Defensive-only boundary for all security content.</p>
            <div class="mt-3 text-sm"><a class="underline" href="/security/policy">Read policy</a></div>
          </div>
        </div>

        <div class="mt-6 rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
          <div class="text-sm font-semibold text-[var(--ui-text)]">Latest reviewed</div>
          <ul class="mt-3 list-inside list-disc space-y-2 text-sm text-[var(--ui-text-secondary)]">
            ${latest
              .map(
                (item) =>
                  `<li><a class="underline" href="${escapeHtml(item.route)}">${escapeHtml(item.title)}</a> (${escapeHtml(item.lastReviewed ?? "pending")})</li>`,
              )
              .join("\n            ")}
          </ul>
        </div>

        <div class="mt-8 space-y-3">
          <h2 class="text-lg font-semibold tracking-tight">All security articles</h2>
          ${cards}
        </div>
  `.trim();
}

function buildSecurityTrackBody(track: SecurityTrack, articles: SecurityArticle[]): string {
  const entries = articles.filter((item) => item.track === track);
  const otherTrack: SecurityTrack = track === "non-technical" ? "technical" : "non-technical";
  const cards = entries
    .map(
      (article) => `
        <a href="${escapeHtml(article.route)}" class="group block rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-5 shadow-sm transition hover:border-[var(--ui-border)] hover:shadow">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="text-xs font-semibold uppercase tracking-wide text-[var(--ui-text-muted)]">${escapeHtml(article.riskLevel)} · ${escapeHtml(article.difficulty)}</div>
            <div class="text-xs text-[var(--ui-text-muted)]">${escapeHtml(article.lastReviewed ?? "Review pending")} · ${escapeHtml(String(article.estimatedMinutes))} min</div>
          </div>
          <h2 class="mt-2 text-sm font-semibold text-[var(--ui-text)] group-hover:text-[var(--ui-text)]">${escapeHtml(article.title)}</h2>
          <p class="mt-1 text-sm text-[var(--ui-text-muted)]">${escapeHtml(article.description)}</p>
        </a>
      `.trim(),
    )
    .join("\n");

  return `
        <div class="space-y-2">
          <nav aria-label="Breadcrumb" class="text-xs text-[var(--ui-text-muted)]"><a class="hover:text-[var(--ui-text)]" href="/security">Security Hub</a> / ${escapeHtml(trackToTitle(track))}</nav>
          <h1 class="text-2xl font-semibold tracking-tight">${escapeHtml(trackToTitle(track))} Security Track</h1>
          <p class="max-w-3xl text-sm text-[var(--ui-text-secondary)]">
            ${track === "non-technical" ? "Practical behavior and low-friction safety defaults." : "Technical notes for deeper threat-modeling and exposure review."}
          </p>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <a href="/security/${escapeHtml(otherTrack)}" class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-3 py-1 text-xs font-medium text-[var(--ui-text-secondary)] hover:border-[var(--ui-border)] hover:text-[var(--ui-text)]">Switch to ${escapeHtml(trackToTitle(otherTrack))}</a>
          <a href="/security/policy" class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-3 py-1 text-xs font-medium text-[var(--ui-text-secondary)] hover:border-[var(--ui-border)] hover:text-[var(--ui-text)]">Defensive-only policy</a>
        </div>
        <div class="mt-6 space-y-3">
          ${cards}
        </div>
  `.trim();
}

function buildSecurityArticleBody(
  article: SecurityArticle,
  related: SecurityArticle[],
): string {
  const breadcrumb =
    article.section === "policy"
      ? `<a class="hover:text-[var(--ui-text)]" href="/security">Security Hub</a> / Policy`
      : `<a class="hover:text-[var(--ui-text)]" href="/security">Security Hub</a> / <a class="hover:text-[var(--ui-text)]" href="/security/${escapeHtml(article.section)}">${escapeHtml(trackToTitle(article.section as SecurityTrack))}</a>`;

  const relatedHtml = related.length
    ? `
        <div class="mt-8 rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
          <div class="text-sm font-semibold text-[var(--ui-text)]">Related security articles</div>
          <ul class="mt-3 list-inside list-disc space-y-2 text-sm text-[var(--ui-text-secondary)]">
            ${related
              .map(
                (item) =>
                  `<li><a class="underline" href="${escapeHtml(item.route)}">${escapeHtml(item.title)}</a></li>`,
              )
              .join("\n            ")}
          </ul>
        </div>
      `
    : "";

  return `
        <article itemscope itemtype="https://schema.org/Article" class="space-y-4">
          <meta itemprop="dateModified" content="${escapeHtml(article.lastReviewed ?? "2026-02-20")}" />
          <meta itemprop="description" content="${escapeHtml(article.description)}" />
          <nav aria-label="Breadcrumb" class="text-xs text-[var(--ui-text-muted)]">${breadcrumb}</nav>
          <h1 itemprop="headline" class="text-2xl font-semibold tracking-tight">${escapeHtml(article.title)}</h1>
          <p class="max-w-3xl text-sm text-[var(--ui-text-secondary)]">${escapeHtml(article.description)}</p>

          <div class="rounded-sm border border-amber-300 bg-amber-50 p-4">
            <div class="text-sm font-semibold text-amber-900">Risk profile</div>
            <div class="mt-2 text-xs text-amber-900">Risk: ${escapeHtml(article.riskLevel)} · Difficulty: ${escapeHtml(article.difficulty)} · ${escapeHtml(String(article.estimatedMinutes))} min</div>
          </div>
          <div class="rounded-sm border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            No tool guarantees anonymity. Review the “What this does not protect” section before acting.
          </div>

          <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
            <div itemprop="articleBody" class="prose prose-neutral prose-sm max-w-none">${article.bodyHtml}</div>
          </div>
          <div class="text-sm text-[var(--ui-text-muted)]">
            Next safe step: <a class="underline" href="/scrub">scrub a PDF locally</a>, open <a class="underline" href="/faq">FAQ Hub</a>, and review <a class="underline" href="/security/policy">defensive-only policy</a>.
          </div>
        </article>
${relatedHtml}
  `.trim();
}

function renderMarkdownToHtml(markdown: string): string {
  return renderToStaticMarkup(
    React.createElement(Markdown, { remarkPlugins: [remarkGfm] }, markdown),
  );
}

function buildToolsHubBody(): string {
  const featured = toolRegistry.filter((tool) => tool.featured);

  const featuredHtml = featured
    .map(
      (tool) => `
        <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-4 shadow-sm">
          <div class="text-base font-semibold text-[var(--ui-text)]">${escapeHtml(tool.name)}</div>
          <div class="mt-1 text-sm text-[var(--ui-text-secondary)]">${escapeHtml(tool.description)}</div>
          <div class="mt-2 text-xs text-[var(--ui-text-muted)]">${escapeHtml(tool.processingMode === "local" ? "On-device" : "Cloud Optional")} · ${escapeHtml(tool.bucket === "heavy" ? "Heavy quota" : "Core quota")}</div>
          <div class="mt-2 text-sm text-[var(--ui-text-secondary)]">
            <a class="underline" href="/tools/${escapeHtml(tool.slug)}">Open</a> ·
            <a class="underline" href="/tools/${escapeHtml(tool.slug)}/how-to"> How-to</a> ·
            <a class="underline" href="/tools/${escapeHtml(tool.slug)}/privacy"> Privacy</a>
          </div>
        </div>
      `.trim(),
    )
    .join("\n");

  const categoryHtml = toolCategories
    .map((category) => {
      const tools = toolRegistry.filter((tool) => tool.category === category);
      const toolsHtml = tools
        .map(
          (tool) => `
            <li><a class="underline" href="/tools/${escapeHtml(tool.slug)}">${escapeHtml(tool.name)}</a></li>
          `.trim(),
        )
        .join("\n");
      return `
        <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-4 shadow-sm">
          <div class="text-sm font-semibold text-[var(--ui-text)]">${escapeHtml(toolCategoryLabel(category as ToolCategory))}</div>
          <ul class="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--ui-text-secondary)]">
            ${toolsHtml}
          </ul>
        </div>
      `.trim();
    })
    .join("\n");

  const collectionsHtml = toolCollections
    .map(
      (collection) => `
        <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-4 shadow-sm">
          <div class="text-sm font-semibold text-[var(--ui-text)]">${escapeHtml(collection.title)}</div>
          <div class="mt-1 text-sm text-[var(--ui-text-secondary)]">${escapeHtml(collection.description)}</div>
          <a class="mt-2 inline-block underline text-sm text-[var(--ui-text-secondary)]" href="/tools/collections/${escapeHtml(collection.slug)}">Open collection</a>
        </div>
      `.trim(),
    )
    .join("\n");

  return `
        <div class="space-y-2">
          <h1 class="text-2xl font-semibold tracking-tight">Tools Hub</h1>
          <p class="max-w-3xl text-sm text-[var(--ui-text-secondary)]">
            Privacy-first PDF productivity tools for daily work. On-device by default, no trackers.
          </p>
        </div>
        <div class="mt-4 rounded-sm border border-blue-300 bg-blue-50 p-4 text-sm text-blue-900">
          Free-first model: generous local quotas with optional paid workflow unlock.
        </div>
        <section class="mt-6 space-y-3">
          <h2 class="text-lg font-semibold text-[var(--ui-text)]">Quick actions</h2>
          <div class="grid gap-4 md:grid-cols-2">
            ${featuredHtml}
          </div>
        </section>
        <section class="mt-6 space-y-3">
          <h2 class="text-lg font-semibold text-[var(--ui-text)]">Browse by category</h2>
          <div class="grid gap-4 md:grid-cols-2">
            ${categoryHtml}
          </div>
        </section>
        <section class="mt-6 space-y-3">
          <h2 class="text-lg font-semibold text-[var(--ui-text)]">Daily workflows</h2>
          <div class="grid gap-4 md:grid-cols-3">
            ${collectionsHtml}
          </div>
        </section>
        <div class="mt-6 rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm text-sm text-[var(--ui-text-secondary)]">
          Next step: open a tool, read how-to guidance, and review security limits before sharing outputs.
        </div>
  `.trim();
}

function buildToolPageBody(tool: ToolDefinition): string {
  const editorial = getToolEditorial(tool.slug);
  const related = getRelatedTools(tool.slug, 4);

  const howToStepsHtml = editorial.howToSteps
    .map((step) => `<li>${escapeHtml(step)}</li>`)
    .join("\n              ");

  const tipsHtml = editorial.tips
    .map((tip) => `<li>${escapeHtml(tip)}</li>`)
    .join("\n              ");

  const limitationsHtml = editorial.limitations
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("\n              ");

  const faqHtml = FAQ_SLUGS.map(
    (faqSlug) => `
            <details class="border-b border-[var(--ui-border)] pb-3 mb-3 last:border-0">
              <summary class="cursor-pointer text-[15px] font-medium text-[var(--ui-text)]">${escapeHtml(faqQuestion(faqSlug, tool.name))}</summary>
              <p class="mt-2 text-[15px] text-[var(--ui-text-muted)]">${escapeHtml(editorial.faq[faqSlug])}</p>
            </details>`,
  ).join("\n");

  const privacyStatement =
    tool.processingMode === "local"
      ? "Your files never leave your browser. All processing runs on-device."
      : "Hybrid processing — cloud opt-in required for some operations.";

  const relatedToolsHtml =
    related.length > 0
      ? `
          <div class="mt-6">
            <h3 class="text-sm font-semibold text-[var(--ui-text)] mb-3">Related tools</h3>
            <div class="grid gap-3 sm:grid-cols-2">
              ${related
                .map(
                  (r) => `
              <a href="/tools/${escapeHtml(r.slug)}" class="block rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-4 hover:border-[var(--ui-border)]">
                <div class="text-sm font-medium text-[var(--ui-text)]">${escapeHtml(r.name)}</div>
                <div class="mt-1 text-xs text-[var(--ui-text-muted)]">${escapeHtml(r.description)}</div>
              </a>`,
                )
                .join("\n")}
            </div>
          </div>`
      : "";

  const docLinks = [
    `/tools/${tool.slug}/how-to`,
    `/tools/${tool.slug}/privacy`,
    `/tools/${tool.slug}/troubleshooting`,
  ];
  const docLinksHtml = docLinks
    .map((route) => `<li><a class="underline" href="${escapeHtml(route)}">${escapeHtml(route)}</a></li>`)
    .join("\n              ");

  return `
        <article itemscope itemtype="https://schema.org/SoftwareApplication" class="space-y-6">
          <h1 itemprop="name" class="text-2xl font-semibold tracking-tight">${escapeHtml(tool.name)}</h1>
          <p itemprop="description" class="max-w-3xl text-sm text-[var(--ui-text-secondary)]">${escapeHtml(tool.description)}</p>
          <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm text-sm text-[var(--ui-text-secondary)]">
            <div><strong>Category:</strong> ${escapeHtml(toolCategoryLabel(tool.category))}</div>
            <div><strong>Processing:</strong> ${escapeHtml(tool.processingMode === "local" ? "On-device" : "Cloud Optional")}</div>
            <div><strong>Quota bucket:</strong> ${escapeHtml(tool.bucket === "heavy" ? "Heavy" : "Core")}</div>
          </div>
          <div class="rounded-sm border border-blue-300 bg-blue-50 p-4 text-sm text-blue-900">
            Open interactive tool: <a class="underline" href="/tools/${escapeHtml(tool.slug)}">/tools/${escapeHtml(tool.slug)}</a>
          </div>

          <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
            <h2 class="text-base font-semibold text-[var(--ui-text)] mb-3">How to use ${escapeHtml(tool.name)}</h2>
            <ol class="list-decimal list-inside space-y-2 text-[15px] text-[var(--ui-text-secondary)]">
              ${howToStepsHtml}
            </ol>
          </div>

          <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
            <h2 class="text-base font-semibold text-[var(--ui-text)] mb-3">Tips</h2>
            <ul class="list-disc list-inside space-y-1 text-[15px] text-[var(--ui-text-secondary)]">
              ${tipsHtml}
            </ul>
          </div>

          <div class="rounded-sm border border-green-200 bg-green-50 p-4 text-sm text-green-900">
            <strong>Privacy:</strong> ${escapeHtml(privacyStatement)}
            <a class="underline ml-1" href="/tools/${escapeHtml(tool.slug)}/privacy">Full privacy model</a>
          </div>

          <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
            <h2 class="text-base font-semibold text-[var(--ui-text)] mb-3">Frequently asked questions</h2>
            ${faqHtml}
          </div>

          <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
            <h2 class="text-base font-semibold text-[var(--ui-text)] mb-3">Limitations</h2>
            <ul class="list-disc list-inside space-y-1 text-[15px] text-[var(--ui-text-secondary)]">
              ${limitationsHtml}
            </ul>
          </div>

          ${relatedToolsHtml}

          <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
            <h2 class="text-sm font-semibold text-[var(--ui-text)] mb-2">Documentation</h2>
            <ul class="list-inside list-disc space-y-1 text-sm text-[var(--ui-text-secondary)]">
              ${docLinksHtml}
            </ul>
          </div>
        </article>
  `.trim();
}

function buildToolPageJsonLd(
  tool: ToolDefinition,
  editorial: ToolEditorial,
  siteOrigin: string | null,
): string {
  const origin = siteOrigin ?? "";

  const softwareApp = {
    "@type": "SoftwareApplication",
    name: tool.name,
    description: tool.description,
    applicationCategory: "BrowserApplication",
    operatingSystem: "Web browser",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    url: `${origin}/tools/${tool.slug}`,
  };

  const howTo = {
    "@type": "HowTo",
    name: `How to use ${tool.name}`,
    step: editorial.howToSteps.map((text, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      text,
    })),
  };

  const faqPage = {
    "@type": "FAQPage",
    mainEntity: FAQ_SLUGS.map((faqSlug) => ({
      "@type": "Question",
      name: faqQuestion(faqSlug, tool.name),
      acceptedAnswer: {
        "@type": "Answer",
        text: editorial.faq[faqSlug],
      },
    })),
  };

  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
      { "@type": "ListItem", position: 2, name: "Tools", item: `${origin}/tools` },
      { "@type": "ListItem", position: 3, name: tool.name, item: `${origin}/tools/${tool.slug}` },
    ],
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [softwareApp, howTo, faqPage, breadcrumb],
  };

  return `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
}

function buildToolDocBody(
  title: string,
  description: string,
  markdown: string,
  toolSlug?: string,
): string {
  const bodyHtml = renderMarkdownToHtml(markdown);
  const links = toolSlug
    ? `
      <div class="text-sm text-[var(--ui-text-secondary)]">
        <a class="underline" href="/tools/${escapeHtml(toolSlug)}">Open tool</a> ·
        <a class="underline" href="/tools/${escapeHtml(toolSlug)}/how-to"> How-to</a> ·
        <a class="underline" href="/tools/${escapeHtml(toolSlug)}/privacy"> Privacy</a>
      </div>
    `
    : `<div class="text-sm text-[var(--ui-text-secondary)]"><a class="underline" href="/tools">Back to Tools Hub</a></div>`;

  return `
        <article itemscope itemtype="https://schema.org/Article" class="space-y-4">
          <h1 itemprop="headline" class="text-2xl font-semibold tracking-tight">${escapeHtml(title)}</h1>
          <p class="max-w-3xl text-sm text-[var(--ui-text-secondary)]">${escapeHtml(description)}</p>
          ${links}
          <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
            <div itemprop="articleBody" class="prose prose-neutral prose-sm max-w-none">${bodyHtml}</div>
          </div>
        </article>
  `.trim();
}

function buildDonateBody(
  oneTimeUrl: string | null,
  monthlyUrl: string | null,
): string {
  const addressBlocks = donateAddresses
    .map(
      (item) => `
        <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg)] p-3">
          <div class="text-sm font-semibold text-[var(--ui-text)]">${escapeHtml(item.network)} (${escapeHtml(item.symbol)})</div>
          <div class="mt-2 break-all rounded bg-[var(--ui-bg-raised)] p-2 font-mono text-xs text-[var(--ui-text)]">${escapeHtml(item.address)}</div>
          ${item.note ? `<div class="mt-2 text-xs text-[var(--ui-text-muted)]">${escapeHtml(item.note)}</div>` : ""}
        </div>
      `.trim(),
    )
    .join("\n");

  return `
        <div class="space-y-2">
          <h1 class="text-2xl font-semibold tracking-tight">Donate</h1>
          <p class="max-w-3xl text-sm text-[var(--ui-text-secondary)]">
            Donations keep security guidance free and tracker-free. Funding supports documentation, audits, and maintenance.
          </p>
        </div>
        <div class="mt-6 grid gap-4 md:grid-cols-2">
          <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
            <div class="text-sm font-semibold text-[var(--ui-text)]">Card donation (Stripe)</div>
            <div class="mt-3 flex flex-wrap gap-2">
              ${
                oneTimeUrl
                  ? `<a class="rounded-sm bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600" href="${escapeHtml(oneTimeUrl)}" target="_blank" rel="noopener noreferrer">One-time donation</a>`
                  : `<a class="rounded-sm bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600" href="/pricing">One-time donation</a>`
              }
              ${
                monthlyUrl
                  ? `<a class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-4 py-2 text-sm font-medium text-[var(--ui-text)] hover:bg-[var(--ui-bg)]" href="${escapeHtml(monthlyUrl)}" target="_blank" rel="noopener noreferrer">Monthly donation</a>`
                  : ""
              }
            </div>
            <div class="mt-3 text-xs text-[var(--ui-text-muted)]">No analytics scripts or wallet scripts are loaded on donation pages.</div>
          </div>
          <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
            <div class="text-sm font-semibold text-[var(--ui-text)]">Crypto donation</div>
            <div class="mt-3 space-y-3">
              ${addressBlocks}
            </div>
            <div class="mt-3 text-xs text-[var(--ui-text-muted)]">Verify addresses at <a class="underline" href="/donate/proof">signed proof page</a>.</div>
          </div>
        </div>
        <div class="mt-6 rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
          <div class="text-sm font-semibold text-[var(--ui-text)]">Trust links</div>
          <div class="mt-2 text-sm text-[var(--ui-text-secondary)]">
            <a class="underline" href="/donate/proof">Address proof</a> ·
            <a class="underline" href="/donate/proof/archive"> Proof archive</a> ·
            <a class="underline" href="/donate/transparency"> Transparency</a> ·
            <a class="underline" href="/security/policy"> Defensive-only policy</a>
          </div>
        </div>
  `.trim();
}

function buildDonateProofBody({
  manifest,
  archive,
  fallbackFingerprint,
}: {
  manifest: DonateProofManifest | null;
  archive: DonateProofArchive | null;
  fallbackFingerprint: string | null;
}): string {
  const proofId = manifest?.proofId ?? "Unavailable";
  const publishedAt = formatIsoUtc(manifest?.publishedAt);
  const validFrom = formatIsoUtc(manifest?.validFrom);
  const lastVerifiedAt = formatIsoUtc(archive?.updatedAt ?? manifest?.publishedAt);
  const fingerprint =
    manifest?.key.fingerprint ??
    fallbackFingerprint ??
    "NOT_CONFIGURED_SET_VITE_DONATE_PGP_FINGERPRINT";
  const keyId = manifest?.key.keyId ?? "Unavailable";
  const algorithm = manifest?.key.algorithm ?? "Unavailable";
  const firstSeenAt = formatIsoUtc(manifest?.key.firstSeenAt);
  const files = manifest?.files ?? [
    { path: "/donate-proof/v1/addresses.txt", sha256: "Unavailable", sizeBytes: 0 },
    { path: "/donate-proof/v1/addresses.txt.asc", sha256: "Unavailable", sizeBytes: 0 },
    { path: "/donate-proof/v1/signing-key.asc", sha256: "Unavailable", sizeBytes: 0 },
    { path: "/donate-proof/v1/manifest.v1.json", sha256: "Unavailable", sizeBytes: 0 },
  ];
  const statementPath =
    files.find((item) => item.path.endsWith("addresses.txt"))?.path ??
    "/donate-proof/v1/addresses.txt";
  const signaturePath =
    files.find((item) => item.path.endsWith("addresses.txt.asc"))?.path ??
    "/donate-proof/v1/addresses.txt.asc";
  const keyPath =
    files.find((item) => item.path.endsWith("signing-key.asc"))?.path ??
    "/donate-proof/v1/signing-key.asc";
  const manifestPath = "/donate-proof/v1/manifest.v1.json";
  const readmePath = "/donate-proof/v1/README.txt";

  const verifyCmd = `gpg --verify ${signaturePath.replace(/^\//, "")} ${statementPath.replace(/^\//, "")}`;
  const importCmd = `gpg --import ${keyPath.replace(/^\//, "")}`;
  const linuxCmd = [
    `curl -O ${statementPath}`,
    `curl -O ${signaturePath}`,
    `curl -O ${keyPath}`,
    importCmd,
    verifyCmd,
  ].join("\n");
  const windowsCmd = [
    `curl.exe -O ${statementPath}`,
    `curl.exe -O ${signaturePath}`,
    `curl.exe -O ${keyPath}`,
    importCmd,
    verifyCmd,
  ].join("\n");

  const fileRows = files
    .map(
      (file) => `
            <tr class="border-b border-[var(--ui-border)]">
              <td class="px-2 py-2 font-mono text-xs text-[var(--ui-text)]">${escapeHtml(file.path)}</td>
              <td class="px-2 py-2 font-mono text-xs text-[var(--ui-text-secondary)]">${escapeHtml(file.sha256)}</td>
              <td class="px-2 py-2 text-sm text-[var(--ui-text-secondary)]">${escapeHtml(String(file.sizeBytes))}</td>
            </tr>
      `.trim(),
    )
    .join("\n");

  const addressRows = (manifest?.addresses ?? donateAddresses)
    .map(
      (item) => `
            <tr class="border-b border-[var(--ui-border)]">
              <td class="px-2 py-2 text-sm text-[var(--ui-text)]">${escapeHtml(item.network)} (${escapeHtml(item.symbol)})</td>
              <td class="px-2 py-2 font-mono text-xs text-[var(--ui-text-secondary)]">${escapeHtml(item.address)}</td>
            </tr>
      `.trim(),
    )
    .join("\n");

  return `
        <article itemscope itemtype="https://schema.org/TechArticle" class="space-y-4">
          <meta itemprop="dateModified" content="${escapeHtml(manifest?.publishedAt ?? "2026-02-20T00:00:00Z")}" />
          <nav aria-label="Breadcrumb" class="text-xs text-[var(--ui-text-muted)]"><a class="hover:text-[var(--ui-text)]" href="/donate">Donate</a> / Proof</nav>
          <h1 itemprop="headline" class="text-2xl font-semibold tracking-tight">Donation trust center</h1>
          <p itemprop="description" class="max-w-3xl text-sm text-[var(--ui-text-secondary)]">Beginner-first and technical verification flow for donation addresses.</p>

          <div class="rounded-sm border border-blue-300 bg-blue-50 p-4">
            <div class="text-sm font-semibold text-blue-900">Trust status</div>
            <div class="mt-2 grid gap-2 text-sm text-blue-900 md:grid-cols-2">
              <div><span class="font-semibold">Proof ID:</span> ${escapeHtml(proofId)}</div>
              <div><span class="font-semibold">Published:</span> ${escapeHtml(publishedAt)}</div>
              <div><span class="font-semibold">Valid from:</span> ${escapeHtml(validFrom)}</div>
              <div><span class="font-semibold">Last verified:</span> ${escapeHtml(lastVerifiedAt)}</div>
            </div>
          </div>

          <section class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
            <h2 class="text-base font-semibold text-[var(--ui-text)]">Quick verify (beginner path)</h2>
            <ol class="mt-3 list-inside list-decimal space-y-2 text-sm text-[var(--ui-text-secondary)]">
              <li>Download the statement, signature, and signing key files.</li>
              <li>Import key, then run verify command shown below.</li>
              <li>Confirm the fingerprint exactly matches the pinned value.</li>
            </ol>
            <div class="mt-3 rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-overlay)] p-3 font-mono text-xs text-[var(--ui-text)]">${escapeHtml(importCmd)}</div>
            <div class="mt-2 rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-overlay)] p-3 font-mono text-xs text-[var(--ui-text)]">${escapeHtml(verifyCmd)}</div>
            <div class="mt-2 text-sm text-[var(--ui-text-secondary)]">Expected pass outcome: <strong>Good signature</strong> and exact fingerprint match. If either fails, do not donate.</div>
          </section>

          <section class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
            <h2 class="text-base font-semibold text-[var(--ui-text)]">Verification files</h2>
            <div class="mt-3 overflow-x-auto">
              <table class="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr class="border-b border-[var(--ui-border)] text-[var(--ui-text-secondary)]">
                    <th class="px-2 py-2 font-semibold">File</th>
                    <th class="px-2 py-2 font-semibold">SHA-256</th>
                    <th class="px-2 py-2 font-semibold">Size</th>
                  </tr>
                </thead>
                <tbody>
                  ${fileRows}
                </tbody>
              </table>
            </div>
            <div class="mt-3 text-sm text-[var(--ui-text-secondary)]">
              <a class="underline" href="${escapeHtml(statementPath)}">Statement</a> ·
              <a class="underline" href="${escapeHtml(signaturePath)}"> Signature</a> ·
              <a class="underline" href="${escapeHtml(manifestPath)}"> Manifest</a> ·
              <a class="underline" href="${escapeHtml(keyPath)}"> Signing key</a> ·
              <a class="underline" href="${escapeHtml(readmePath)}"> README</a>
            </div>
          </section>

          <section class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
            <h2 class="text-base font-semibold text-[var(--ui-text)]">Key identity</h2>
            <div class="mt-3 grid gap-2 text-sm text-[var(--ui-text-secondary)] md:grid-cols-2">
              <div><span class="font-semibold">Fingerprint:</span> <span class="font-mono">${escapeHtml(fingerprint)}</span></div>
              <div><span class="font-semibold">Key ID:</span> <span class="font-mono">${escapeHtml(keyId)}</span></div>
              <div><span class="font-semibold">Algorithm:</span> ${escapeHtml(algorithm)}</div>
              <div><span class="font-semibold">First seen:</span> ${escapeHtml(firstSeenAt)}</div>
            </div>
            <div class="mt-2 text-sm text-[var(--ui-text-muted)]">Rotation policy: old keys remain available in archive with retirement or revocation notes.</div>
          </section>

          <section class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
            <h2 class="text-base font-semibold text-[var(--ui-text)]">Advanced verification</h2>
            <details class="mt-3 rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg)] p-3" open>
              <summary class="cursor-pointer text-sm font-semibold text-[var(--ui-text)]">Linux/macOS commands</summary>
              <pre class="mt-2 overflow-x-auto rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-3 text-xs text-[var(--ui-text)]">${escapeHtml(linuxCmd)}</pre>
            </details>
            <details class="mt-3 rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg)] p-3">
              <summary class="cursor-pointer text-sm font-semibold text-[var(--ui-text)]">Windows commands</summary>
              <pre class="mt-2 overflow-x-auto rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-3 text-xs text-[var(--ui-text)]">${escapeHtml(windowsCmd)}</pre>
            </details>
            <div class="mt-2 text-sm text-[var(--ui-text-muted)]">Offline workflow: download files, disconnect network, run GPG verification locally.</div>
          </section>

          <section class="rounded-sm border border-red-300 bg-red-50 p-6">
            <h2 class="text-base font-semibold text-red-900">If verification fails</h2>
            <ul class="mt-2 list-inside list-disc space-y-1 text-sm text-red-800">
              <li>Stop. Do not send funds.</li>
              <li>Do not trust screenshots or copied social-media addresses.</li>
              <li>Reload the official domain and repeat verification.</li>
              <li>Check <a class="underline" href="/status">status page</a> for key rotation notes.</li>
            </ul>
          </section>

          <section class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
            <h2 class="text-base font-semibold text-[var(--ui-text)]">Common scam patterns</h2>
            <ul class="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--ui-text-secondary)]">
              <li>Screenshot address replacement or edited chat screenshots.</li>
              <li>Mirror domains serving stale proof bundles from old cache.</li>
              <li>Clipboard malware replacing pasted wallet addresses.</li>
              <li>Lookalike domain names with fake "verified" badges.</li>
            </ul>
          </section>

          <section class="rounded-sm border border-amber-300 bg-amber-50 p-6">
            <h2 class="text-base font-semibold text-amber-900">Threat model and limits</h2>
            <div class="mt-2 text-sm text-amber-900">
              This proof model protects against silent address replacement and stale artifact confusion. It does not protect against compromised devices, malicious extensions, or phishing domains that users trust manually.
            </div>
          </section>

          <section class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
            <h2 class="text-base font-semibold text-[var(--ui-text)]">Address list in current proof</h2>
            <div class="mt-3 overflow-x-auto">
              <table class="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr class="border-b border-[var(--ui-border)] text-[var(--ui-text-secondary)]">
                    <th class="px-2 py-2 font-semibold">Network</th>
                    <th class="px-2 py-2 font-semibold">Address</th>
                  </tr>
                </thead>
                <tbody>
                  ${addressRows}
                </tbody>
              </table>
            </div>
          </section>

          <section class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
            <h2 class="text-base font-semibold text-[var(--ui-text)]">Archive links</h2>
            <div class="mt-2 text-sm text-[var(--ui-text-secondary)]">
              <a class="underline" href="/donate/proof/archive">Open proof archive</a> for prior proofs, old keys, and revocation history.
            </div>
          </section>
        </article>
  `.trim();
}

function buildDonateProofArchiveBody(archive: DonateProofArchive | null): string {
  if (!archive) {
    return `
        <div class="space-y-2">
          <nav aria-label="Breadcrumb" class="text-xs text-[var(--ui-text-muted)]"><a class="hover:text-[var(--ui-text)]" href="/donate">Donate</a> / <a class="hover:text-[var(--ui-text)]" href="/donate/proof">Proof</a> / Archive</nav>
          <h1 class="text-2xl font-semibold tracking-tight">Proof archive unavailable</h1>
          <p class="max-w-3xl text-sm text-[var(--ui-text-secondary)]">Archive index is missing or invalid.</p>
        </div>
        <div class="mt-4 rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm text-sm text-[var(--ui-text-secondary)]">
          Restore <code>/donate-proof/archive/index.json</code> and rebuild static pages.
        </div>
    `.trim();
  }

  const proofRows = archive.proofs
    .map(
      (proof) => `
            <tr class="border-b border-[var(--ui-border)]">
              <td class="px-2 py-2 font-mono text-xs text-[var(--ui-text)]">${escapeHtml(proof.proofId)}</td>
              <td class="px-2 py-2 text-sm text-[var(--ui-text-secondary)]">${escapeHtml(formatIsoUtc(proof.publishedAt))}</td>
              <td class="px-2 py-2 text-sm text-[var(--ui-text-secondary)]">${proof.revoked ? "Revoked" : "Valid at publish"}</td>
              <td class="px-2 py-2 text-sm text-[var(--ui-text-secondary)]"><a class="underline" href="${escapeHtml(proof.manifestPath)}">Open manifest</a></td>
            </tr>
      `.trim(),
    )
    .join("\n");

  const keyRows = archive.keys
    .map(
      (key) => `
            <tr class="border-b border-[var(--ui-border)]">
              <td class="px-2 py-2 font-mono text-xs text-[var(--ui-text)]">${escapeHtml(key.fingerprint)}</td>
              <td class="px-2 py-2 text-sm text-[var(--ui-text-secondary)]">${escapeHtml(key.status)}</td>
              <td class="px-2 py-2 text-sm text-[var(--ui-text-secondary)]">${escapeHtml(formatIsoUtc(key.firstSeenAt))}</td>
              <td class="px-2 py-2 text-sm text-[var(--ui-text-secondary)]"><a class="underline" href="${escapeHtml(key.path)}">Download key</a></td>
            </tr>
      `.trim(),
    )
    .join("\n");

  return `
        <article itemscope itemtype="https://schema.org/CollectionPage" class="space-y-4">
          <nav aria-label="Breadcrumb" class="text-xs text-[var(--ui-text-muted)]"><a class="hover:text-[var(--ui-text)]" href="/donate">Donate</a> / <a class="hover:text-[var(--ui-text)]" href="/donate/proof">Proof</a> / Archive</nav>
          <h1 class="text-2xl font-semibold tracking-tight">Proof archive</h1>
          <p class="max-w-3xl text-sm text-[var(--ui-text-secondary)]">Historical proof bundles, retired keys, and revocation notes.</p>
          <div class="rounded-sm border border-blue-300 bg-blue-50 p-4 text-sm text-blue-900">
            Last updated: ${escapeHtml(formatIsoUtc(archive.updatedAt))}
          </div>
          <section class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
            <h2 class="text-base font-semibold text-[var(--ui-text)]">Proof history</h2>
            <div class="mt-3 overflow-x-auto">
              <table class="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr class="border-b border-[var(--ui-border)] text-[var(--ui-text-secondary)]">
                    <th class="px-2 py-2 font-semibold">Proof ID</th>
                    <th class="px-2 py-2 font-semibold">Published</th>
                    <th class="px-2 py-2 font-semibold">Status</th>
                    <th class="px-2 py-2 font-semibold">Manifest</th>
                  </tr>
                </thead>
                <tbody>
                  ${proofRows}
                </tbody>
              </table>
            </div>
          </section>
          <section class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
            <h2 class="text-base font-semibold text-[var(--ui-text)]">Key history</h2>
            <div class="mt-3 overflow-x-auto">
              <table class="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr class="border-b border-[var(--ui-border)] text-[var(--ui-text-secondary)]">
                    <th class="px-2 py-2 font-semibold">Fingerprint</th>
                    <th class="px-2 py-2 font-semibold">Status</th>
                    <th class="px-2 py-2 font-semibold">First seen</th>
                    <th class="px-2 py-2 font-semibold">File</th>
                  </tr>
                </thead>
                <tbody>
                  ${keyRows}
                </tbody>
              </table>
            </div>
          </section>
        </article>
  `.trim();
}

function buildDonateTransparencyBody(): string {
  return `
        <div class="space-y-2">
          <nav aria-label="Breadcrumb" class="text-xs text-[var(--ui-text-muted)]"><a class="hover:text-[var(--ui-text)]" href="/donate">Donate</a> / Transparency</nav>
          <h1 class="text-2xl font-semibold tracking-tight">Minimal monthly transparency</h1>
          <p class="max-w-3xl text-sm text-[var(--ui-text-secondary)]">High-level totals and spend categories without donor-identifying details.</p>
        </div>
        <div class="mt-6 rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
          <div class="text-sm font-semibold text-[var(--ui-text)]">Reporting model</div>
          <ul class="mt-3 list-inside list-disc space-y-2 text-sm text-[var(--ui-text-secondary)]">
            <li>Total donations received (month)</li>
            <li>Total operational spend (month)</li>
            <li>Spend categories: hosting, security review, docs, operations</li>
            <li>Closing reserve balance</li>
          </ul>
        </div>
        <div class="mt-4 rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
          <div class="text-sm font-semibold text-[var(--ui-text)]">Current status</div>
          <p class="mt-2 text-sm text-[var(--ui-text-secondary)]">Report publishing starts at launch. Donor identities are never published.</p>
          <p class="mt-2 text-sm text-[var(--ui-text-secondary)]">
            Verify addresses in the <a class="underline" href="/donate/proof">trust center</a> and review prior proofs in the
            <a class="underline" href="/donate/proof/archive"> archive</a>.
          </p>
        </div>
  `.trim();
}

function buildAboutBody(): string {
  return `
        <h1 class="text-2xl font-semibold tracking-tight">About</h1>
        <div class="mt-6 rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
          <div class="text-sm font-semibold text-[var(--ui-text)]">Why this exists</div>
          <p class="mt-2 text-sm text-[var(--ui-text-secondary)]">Privacy is a human right recognized in most legal systems. Existing PDF tools upload your files to servers you can't audit. We built something different: every operation happens in your browser, on your device, under your control.</p>
        </div>
        <div class="mt-4 rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
          <div class="text-sm font-semibold text-[var(--ui-text)]">How it works</div>
          <p class="mt-2 text-sm text-[var(--ui-text-secondary)]">Every tool processes files using JavaScript in your browser tab. No bytes leave your device. The API exists only for account sessions and billing — it never sees your PDFs.</p>
        </div>
        <div class="mt-4 rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
          <div class="text-sm font-semibold text-[var(--ui-text)]">What we don't do</div>
          <ul class="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--ui-text-secondary)]">
            <li>No analytics or usage tracking.</li>
            <li>No tracking pixels or third-party CDNs.</li>
            <li>No browser fingerprinting.</li>
            <li>No selling or sharing data with anyone.</li>
          </ul>
        </div>
        <div class="mt-4 rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
          <div class="text-sm font-semibold text-[var(--ui-text)]">Our principles</div>
          <ul class="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--ui-text-secondary)]">
            <li>Free tier forever.</li>
            <li>Honest about limitations.</li>
            <li>Open security documentation.</li>
            <li>No dark patterns.</li>
          </ul>
        </div>
        <div class="mt-4 rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
          <div class="text-sm font-semibold text-[var(--ui-text)]">Verify it yourself</div>
          <p class="mt-2 text-sm text-[var(--ui-text-secondary)]">Don't take our word for it.</p>
          <ul class="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--ui-text-secondary)]">
            <li><a class="underline" href="/verify">Verify</a> — run a live network monitor test.</li>
            <li><a class="underline" href="/status">Status</a> — check system health.</li>
            <li><a class="underline" href="/security">Security</a> — read our threat models and guides.</li>
            <li><a class="underline" href="/privacy-policy">Privacy policy</a> — the legal version.</li>
          </ul>
        </div>
  `.trim();
}

function buildVerifyBody(): string {
  return `
        <h1 class="text-2xl font-semibold tracking-tight">Verify</h1>
        <div class="mt-6 rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
          <div class="text-sm font-semibold text-[var(--ui-text)]">Don't trust us. Verify.</div>
          <p class="mt-2 text-sm text-[var(--ui-text-secondary)]">This page lets you prove our privacy claims yourself. Load the interactive page to create a sample PDF in memory, scrub it with our engine, and monitor every network request during processing.</p>
        </div>
        <div class="mt-4 rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
          <div class="text-sm font-semibold text-[var(--ui-text)]">Network monitor test</div>
          <p class="mt-2 text-sm text-[var(--ui-text-secondary)]">Load the interactive page to run the verification test. The test uses your browser's PerformanceObserver API to capture all network activity during PDF processing.</p>
        </div>
        <div class="mt-4 rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
          <div class="text-sm font-semibold text-[var(--ui-text)]">DIY verification</div>
          <ol class="mt-2 list-inside list-decimal space-y-1 text-sm text-[var(--ui-text-secondary)]">
            <li>Open your browser DevTools (F12).</li>
            <li>Go to the Network tab.</li>
            <li>Run any PDF tool on a file.</li>
            <li>See for yourself: zero requests to external servers.</li>
          </ol>
        </div>
        <div class="mt-4 rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
          <div class="text-sm font-semibold text-[var(--ui-text)]">Technical transparency</div>
          <ul class="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--ui-text-secondary)]">
            <li>No third-party scripts loaded on any page.</li>
            <li>Service worker enables full offline operation.</li>
            <li>Content Security Policy restricts all external connections.</li>
          </ul>
        </div>
  `.trim();
}

function buildStatusBody(): string {
  return `
        <h1 class="text-2xl font-semibold tracking-tight">Status</h1>
        <div class="mt-6 rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
          <div class="text-sm font-semibold text-[var(--ui-text)]">All systems operational (v1)</div>
          <ul class="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--ui-text-secondary)]">
            <li>PDF processing runs locally in your browser.</li>
            <li>The API is used only for account sessions and billing.</li>
            <li>No analytics or tracking scripts are used.</li>
          </ul>
        </div>
        <div class="mt-4 rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
          <div class="text-sm font-semibold text-[var(--ui-text)]">Offline mode</div>
          <p class="mt-2 text-sm text-[var(--ui-text-secondary)]">The scrubber works offline after the first load (within local usage caps).</p>
        </div>
        <div class="mt-4 rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
          <div class="text-sm font-semibold text-[var(--ui-text)]">Live health checks</div>
          <p class="mt-2 text-sm text-[var(--ui-text-secondary)]">Load the interactive page to run live health checks for: API reachability, Service Worker status, local storage, and PDF engine loading.</p>
        </div>
        <div class="mt-4 rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 shadow-sm">
          <div class="text-sm font-semibold text-[var(--ui-text)]">Uptime</div>
          <p class="mt-2 text-sm text-[var(--ui-text-secondary)]">All PDF tools run in your browser. There is no server to go down. The API handles only authentication and billing.</p>
        </div>
  `.trim();
}

function writeFileEnsured(filePath: string, contents: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function listGuideSlugs(rootDir: string): string[] {
  const guidesDir = path.join(rootDir, "src", "content", "guides");
  if (!fs.existsSync(guidesDir)) return [];
  return fs
    .readdirSync(guidesDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.slice(0, -3))
    .sort();
}

export function seoStaticBlogPlugin(): Plugin {
  let cfg: ResolvedConfig | null = null;

  return {
    name: "pdf-changer-seo-static-blog",
    enforce: "post",
    apply: "build",
    configResolved(resolved) {
      cfg = resolved;
    },
    async closeBundle() {
      if (!cfg) return;

      const outDir = path.resolve(cfg.root, cfg.build.outDir);
      const indexPath = path.join(outDir, "index.html");
      if (!fs.existsSync(indexPath)) return;

      const originRaw =
        process.env.SITE_ORIGIN ??
        process.env.CF_PAGES_URL ??
        process.env.VITE_SITE_ORIGIN ??
        "https://pdf-changer.pages.dev";
      const siteOrigin = originRaw ? cleanOrigin(originRaw) : null;
      const rssHref = siteOrigin ? "/rss.xml" : undefined;

      const posts = readBlogPosts(cfg.root);
      const indexHtml = fs.readFileSync(indexPath, "utf8");
      const cssHrefs = cssLinksFromIndexHtml(indexHtml);

      // Extract JS entry scripts from Vite's index.html before we overwrite it
      const jsTagsRe = /<script[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g;
      const jsTags: string[] = [];
      for (const m of indexHtml.matchAll(jsTagsRe)) {
        jsTags.push(m[0]);
      }
      // Also grab modulepreload links
      const preloadRe = /<link[^>]*rel="modulepreload"[^>]*>/g;
      const preloadTags: string[] = [];
      for (const m of indexHtml.matchAll(preloadRe)) {
        preloadTags.push(m[0]);
      }

      // Static blog index
      const blogIndexPath = "/blog";
      writeFileEnsured(
        path.join(outDir, "blog", "index.html"),
        htmlLayout({
          title: "Blog Hub",
          description:
            "Daily-read security guidance on anonymity, document risk, and safer submissions.",
          canonicalHref: siteOrigin ? `${siteOrigin}${blogIndexPath}` : blogIndexPath,
          ogUrl: siteOrigin ? `${siteOrigin}${blogIndexPath}` : undefined,
          ogType: "website",
          cssHrefs, jsTags, preloadTags,
          bodyHtml: buildBlogIndexBody(posts),
          rssHref,
          activeNav: "blog",
        }),
      );

      // Category index pages
      const categories = Array.from(new Set(posts.map((p) => p.category))).sort();
      for (const category of categories) {
        const categoryPath = `/blog/${category}`;
        writeFileEnsured(
          path.join(outDir, "blog", category, "index.html"),
          htmlLayout({
            title: `Blog Hub · ${titleCaseWord(category)}`,
            description: `Posts tagged ${titleCaseWord(category)}.`,
            canonicalHref: siteOrigin ? `${siteOrigin}${categoryPath}` : categoryPath,
            ogUrl: siteOrigin ? `${siteOrigin}${categoryPath}` : undefined,
            ogType: "website",
            cssHrefs, jsTags, preloadTags,
            bodyHtml: buildCategoryIndexBody(category, posts),
            rssHref,
            activeNav: "blog",
          }),
        );
      }

      // Individual posts
      const chronologicalPosts = [...posts].sort((a, b) => {
        if (a.date === b.date) return a.title.localeCompare(b.title);
        return a.date < b.date ? 1 : -1;
      });
      for (const post of posts) {
        const related = posts
          .filter((p) => p.category === post.category && p.route !== post.route)
          .slice(0, 4);
        const index = chronologicalPosts.findIndex((p) => p.route === post.route);
        const newer = index > 0 ? chronologicalPosts[index - 1] : null;
        const older =
          index >= 0 && index < chronologicalPosts.length - 1
            ? chronologicalPosts[index + 1]
            : null;
        const postPath = post.route;
        const section = titleCaseWord(post.category);
        writeFileEnsured(
          path.join(outDir, "blog", post.category, post.slug, "index.html"),
          htmlLayout({
            title: post.title,
            description: post.description,
            canonicalHref: siteOrigin ? `${siteOrigin}${postPath}` : postPath,
            ogUrl: siteOrigin ? `${siteOrigin}${postPath}` : undefined,
            ogType: "article",
            publishedDate: post.date,
            articleSection: section,
            articleTags: [section, "whistleblowing", "security", "privacy"],
            cssHrefs, jsTags, preloadTags,
            bodyHtml: buildPostBody(post, related, newer, older),
            rssHref,
            activeNav: "blog",
          }),
        );
      }

      // Static FAQ hub, topics, and questions
      const faqQuestions = readFaqQuestions(cfg.root);
      const faqTopics = Array.from(new Set(faqQuestions.map((q) => q.topic))).sort();

      const faqIndexPath = "/faq";
      writeFileEnsured(
        path.join(outDir, "faq", "index.html"),
        htmlLayout({
          title: "FAQ Hub",
          description:
            "Practical, plain-English answers on anonymity, document safety, and secure sharing.",
          canonicalHref: siteOrigin ? `${siteOrigin}${faqIndexPath}` : faqIndexPath,
          ogUrl: siteOrigin ? `${siteOrigin}${faqIndexPath}` : undefined,
          ogType: "website",
          cssHrefs, jsTags, preloadTags,
          bodyHtml: buildFaqIndexBody(faqQuestions),
          rssHref,
          activeNav: "faq",
        }),
      );

      for (const topic of faqTopics) {
        const topicPath = `/faq/${topic}`;
        writeFileEnsured(
          path.join(outDir, "faq", topic, "index.html"),
          htmlLayout({
            title: `${titleCasePhrase(topic)} FAQ`,
            description: `Frequently asked questions about ${titleCasePhrase(topic).toLowerCase()}.`,
            canonicalHref: siteOrigin ? `${siteOrigin}${topicPath}` : topicPath,
            ogUrl: siteOrigin ? `${siteOrigin}${topicPath}` : undefined,
            ogType: "website",
            cssHrefs, jsTags, preloadTags,
            bodyHtml: buildFaqTopicBody(topic, faqQuestions),
            rssHref,
            activeNav: "faq",
          }),
        );
      }

      for (const question of faqQuestions) {
        const related = faqQuestions
          .filter(
            (item) => item.topic === question.topic && item.route !== question.route,
          )
          .slice(0, 6);
        writeFileEnsured(
          path.join(outDir, "faq", question.topic, question.slug, "index.html"),
          htmlLayout({
            title: question.question,
            description: question.description,
            canonicalHref: siteOrigin
              ? `${siteOrigin}${question.route}`
              : question.route,
            ogUrl: siteOrigin ? `${siteOrigin}${question.route}` : undefined,
            ogType: "article",
            publishedDate: question.lastReviewed ?? undefined,
            articleSection: titleCasePhrase(question.topic),
            articleTags: [
              titleCasePhrase(question.topic),
              ...question.tags.slice(0, 5),
            ],
            cssHrefs, jsTags, preloadTags,
            bodyHtml: buildFaqQuestionBody(question, related),
            rssHref,
            activeNav: "faq",
          }),
        );
      }

      const securityArticles = readSecurityArticles(cfg.root);
      const securityPolicy =
        securityArticles.find((item) => item.section === "policy") ?? null;
      const securityNonTechnical = securityArticles.filter(
        (item) => item.track === "non-technical",
      );
      const securityTechnical = securityArticles.filter(
        (item) => item.track === "technical",
      );

      const securityHubPath = "/security";
      writeFileEnsured(
        path.join(outDir, "security", "index.html"),
        htmlLayout({
          title: "Security Hub",
          description:
            "Defensive security guidance for office workers, whistleblowers, and technical teams handling documents.",
          canonicalHref: siteOrigin ? `${siteOrigin}${securityHubPath}` : securityHubPath,
          ogUrl: siteOrigin ? `${siteOrigin}${securityHubPath}` : undefined,
          ogType: "website",
          cssHrefs, jsTags, preloadTags,
          bodyHtml: buildSecurityHubBody(securityArticles),
          rssHref,
          activeNav: "security",
        }),
      );

      for (const track of ["non-technical", "technical"] as const) {
        const trackPath = `/security/${track}`;
        writeFileEnsured(
          path.join(outDir, "security", track, "index.html"),
          htmlLayout({
            title: `${trackToTitle(track)} Security`,
            description:
              track === "non-technical"
                ? "Plain-language defensive security workflows."
                : "Technical defensive security references and threat-model notes.",
            canonicalHref: siteOrigin ? `${siteOrigin}${trackPath}` : trackPath,
            ogUrl: siteOrigin ? `${siteOrigin}${trackPath}` : undefined,
            ogType: "website",
            cssHrefs, jsTags, preloadTags,
            bodyHtml: buildSecurityTrackBody(track, securityArticles),
            rssHref,
            activeNav: "security",
          }),
        );
      }

      for (const article of [...securityNonTechnical, ...securityTechnical]) {
        const related = securityArticles
          .filter(
            (item) => item.track === article.track && item.route !== article.route,
          )
          .slice(0, 5);
        writeFileEnsured(
          path.join(outDir, "security", article.section, article.slug, "index.html"),
          htmlLayout({
            title: article.title,
            description: article.description,
            canonicalHref: siteOrigin
              ? `${siteOrigin}${article.route}`
              : article.route,
            ogUrl: siteOrigin ? `${siteOrigin}${article.route}` : undefined,
            ogType: "article",
            publishedDate: article.lastReviewed ?? undefined,
            articleSection:
              article.track === "non-technical"
                ? "Non-Technical Security"
                : "Technical Security",
            articleTags: article.tags.slice(0, 6),
            cssHrefs, jsTags, preloadTags,
            bodyHtml: buildSecurityArticleBody(article, related),
            rssHref,
            activeNav: "security",
          }),
        );
      }

      if (securityPolicy) {
        writeFileEnsured(
          path.join(outDir, "security", "policy", "index.html"),
          htmlLayout({
            title: securityPolicy.title,
            description: securityPolicy.description,
            canonicalHref: siteOrigin
              ? `${siteOrigin}${securityPolicy.route}`
              : securityPolicy.route,
            ogUrl: siteOrigin ? `${siteOrigin}${securityPolicy.route}` : undefined,
            ogType: "article",
            publishedDate: securityPolicy.lastReviewed ?? undefined,
            articleSection: "Security Policy",
            articleTags: securityPolicy.tags.slice(0, 6),
            cssHrefs, jsTags, preloadTags,
            bodyHtml: buildSecurityArticleBody(securityPolicy, []),
            rssHref,
            activeNav: "security",
          }),
        );
      }

      const toolsHubPath = "/tools";
      writeFileEnsured(
        path.join(outDir, "tools", "index.html"),
        htmlLayout({
          title: "Tools Hub",
          description:
            "Free-first privacy PDF tools for daily productivity with local processing defaults.",
          canonicalHref: siteOrigin ? `${siteOrigin}${toolsHubPath}` : toolsHubPath,
          ogUrl: siteOrigin ? `${siteOrigin}${toolsHubPath}` : undefined,
          ogType: "website",
          cssHrefs, jsTags, preloadTags,
          bodyHtml: buildToolsHubBody(),
          rssHref,
          activeNav: "tools",
        }),
      );

      for (const tool of toolRegistry) {
        const route = `/tools/${tool.slug}`;
        const routePath = path.join(
          outDir,
          ...route.split("/").filter(Boolean),
          "index.html",
        );
        const editorial = getToolEditorial(tool.slug);
        writeFileEnsured(
          routePath,
          htmlLayout({
            title: tool.seo.title,
            description: tool.seo.description,
            canonicalHref: siteOrigin ? `${siteOrigin}${route}` : route,
            ogUrl: siteOrigin ? `${siteOrigin}${route}` : undefined,
            ogType: "website",
            cssHrefs, jsTags, preloadTags,
            bodyHtml: buildToolPageBody(tool),
            headExtra: buildToolPageJsonLd(tool, editorial, siteOrigin),
            rssHref,
            activeNav: "tools",
          }),
        );
      }

      for (const page of toolDocPages.filter((item) => item.kind !== "tool")) {
        const routePath = path.join(
          outDir,
          ...page.route.split("/").filter(Boolean),
          "index.html",
        );
        writeFileEnsured(
          routePath,
          htmlLayout({
            title: page.title,
            description: page.description,
            canonicalHref: siteOrigin ? `${siteOrigin}${page.route}` : page.route,
            ogUrl: siteOrigin ? `${siteOrigin}${page.route}` : undefined,
            ogType: "article",
            cssHrefs, jsTags, preloadTags,
            bodyHtml: buildToolDocBody(
              page.title,
              page.description,
              page.markdown,
              page.tool?.slug,
            ),
            rssHref,
            activeNav: "tools",
          }),
        );
      }

      const donatePath = "/donate";
      const donateProofPath = "/donate/proof";
      const donateProofArchivePath = "/donate/proof/archive";
      const donateTransparencyPath = "/donate/transparency";
      const donatePgpFingerprint = process.env.VITE_DONATE_PGP_FINGERPRINT ?? null;
      const donateStripeOneTime = process.env.VITE_DONATE_STRIPE_ONE_TIME_URL ?? null;
      const donateStripeMonthly = process.env.VITE_DONATE_STRIPE_MONTHLY_URL ?? null;
      const donateProofManifest = readDonateProofManifest(cfg.root);
      const donateProofArchive = readDonateProofArchive(cfg.root);

      writeFileEnsured(
        path.join(outDir, "donate", "index.html"),
        htmlLayout({
          title: "Donate",
          description:
            "Support free privacy-first security guidance and on-device PDF tools.",
          canonicalHref: siteOrigin ? `${siteOrigin}${donatePath}` : donatePath,
          ogUrl: siteOrigin ? `${siteOrigin}${donatePath}` : undefined,
          ogType: "website",
          cssHrefs, jsTags, preloadTags,
          bodyHtml: buildDonateBody(donateStripeOneTime, donateStripeMonthly),
          rssHref,
          activeNav: "donate",
        }),
      );

      writeFileEnsured(
        path.join(outDir, "donate", "proof", "index.html"),
        htmlLayout({
          title: "Donate Proof Trust Center",
          description:
            "Beginner and technical verification for donation addresses with signed proof artifacts and archive continuity.",
          canonicalHref: siteOrigin ? `${siteOrigin}${donateProofPath}` : donateProofPath,
          ogUrl: siteOrigin ? `${siteOrigin}${donateProofPath}` : undefined,
          ogType: "website",
          cssHrefs, jsTags, preloadTags,
          bodyHtml: buildDonateProofBody({
            manifest: donateProofManifest,
            archive: donateProofArchive,
            fallbackFingerprint: donatePgpFingerprint,
          }),
          rssHref,
          activeNav: "donate",
        }),
      );

      writeFileEnsured(
        path.join(outDir, "donate", "proof", "archive", "index.html"),
        htmlLayout({
          title: "Donate Proof Archive",
          description:
            "Historical donation proof manifests, key rotations, and revocation history for independent auditing.",
          canonicalHref: siteOrigin
            ? `${siteOrigin}${donateProofArchivePath}`
            : donateProofArchivePath,
          ogUrl: siteOrigin ? `${siteOrigin}${donateProofArchivePath}` : undefined,
          ogType: "website",
          cssHrefs, jsTags, preloadTags,
          bodyHtml: buildDonateProofArchiveBody(donateProofArchive),
          rssHref,
          activeNav: "donate",
        }),
      );

      writeFileEnsured(
        path.join(outDir, "donate", "transparency", "index.html"),
        htmlLayout({
          title: "Donate Transparency",
          description: "Minimal monthly transparency model for PDF Changer donations.",
          canonicalHref: siteOrigin
            ? `${siteOrigin}${donateTransparencyPath}`
            : donateTransparencyPath,
          ogUrl: siteOrigin ? `${siteOrigin}${donateTransparencyPath}` : undefined,
          ogType: "website",
          cssHrefs, jsTags, preloadTags,
          bodyHtml: buildDonateTransparencyBody(),
          rssHref,
          activeNav: "donate",
        }),
      );

      // About page
      const aboutPath = "/about";
      writeFileEnsured(
        path.join(outDir, "about", "index.html"),
        htmlLayout({
          title: "About",
          description:
            "Why PDF Changer exists, how it works, and why every operation stays on your device.",
          canonicalHref: siteOrigin ? `${siteOrigin}${aboutPath}` : aboutPath,
          ogUrl: siteOrigin ? `${siteOrigin}${aboutPath}` : undefined,
          ogType: "website",
          cssHrefs, jsTags, preloadTags,
          bodyHtml: buildAboutBody(),
          rssHref,
        }),
      );

      // Colophon (how it's built) page
      const colophonPath = "/colophon";
      writeFileEnsured(
        path.join(outDir, "colophon", "index.html"),
        htmlLayout({
          title: "How it's built",
          description:
            "The engineering behind PDF Changer: 19k lines of TypeScript, sandboxed processing, steganography detection, and a 2,900-line build plugin. Built by Giuseppe Giona.",
          canonicalHref: siteOrigin ? `${siteOrigin}${colophonPath}` : colophonPath,
          ogUrl: siteOrigin ? `${siteOrigin}${colophonPath}` : undefined,
          ogType: "article",
          cssHrefs, jsTags, preloadTags,
          rssHref,
          bodyHtml: `
        <div class="space-y-8">
          <div class="space-y-3">
            <h1 class="text-2xl font-bold tracking-tight text-[var(--ui-text)] md:text-3xl">How it's built</h1>
            <p class="text-lg text-[var(--ui-text-secondary)] max-w-3xl">PDF Changer is a solo project. I built it to learn, to solve my own problem, and to see how far I could push browser-based document processing. This page is the honest breakdown of what's under the hood.</p>
          </div>

          <div class="grid gap-3 grid-cols-2 md:grid-cols-4">
            <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-4">
              <div class="text-2xl font-semibold text-[var(--ui-text)]">~19k</div>
              <div class="mt-1 text-sm text-[var(--ui-text-muted)]">lines of TypeScript</div>
            </div>
            <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-4">
              <div class="text-2xl font-semibold text-[var(--ui-text)]">125</div>
              <div class="mt-1 text-sm text-[var(--ui-text-muted)]">automated tests</div>
            </div>
            <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-4">
              <div class="text-2xl font-semibold text-[var(--ui-text)]">500+</div>
              <div class="mt-1 text-sm text-[var(--ui-text-muted)]">pre-rendered pages</div>
            </div>
            <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-4">
              <div class="text-2xl font-semibold text-[var(--ui-text)]">14</div>
              <div class="mt-1 text-sm text-[var(--ui-text-muted)]">bundle size budgets</div>
            </div>
          </div>

          <div class="space-y-3">
            <h2 class="text-lg font-semibold text-[var(--ui-text)]">The stack</h2>
            <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-5">
              <div class="grid gap-4 md:grid-cols-2 text-[15px] text-[var(--ui-text-secondary)]">
                <div class="space-y-2">
                  <div class="font-semibold text-[var(--ui-text)]">Frontend</div>
                  <ul class="list-inside list-disc space-y-1"><li>React 19 + React Router (SPA)</li><li>Tailwind CSS (utility-first, no component library)</li><li>Vite (build tooling + dev server)</li><li>Workbox (service worker for offline use)</li></ul>
                </div>
                <div class="space-y-2">
                  <div class="font-semibold text-[var(--ui-text)]">PDF processing</div>
                  <ul class="list-inside list-disc space-y-1"><li>pdf-lib (create, modify, merge, split)</li><li>PDF.js (rendering for redact, flatten, export)</li><li>Tesseract.js (OCR text extraction)</li><li>Web Crypto API (SHA-256, HMAC, ECDSA)</li></ul>
                </div>
                <div class="space-y-2">
                  <div class="font-semibold text-[var(--ui-text)]">Infrastructure</div>
                  <ul class="list-inside list-disc space-y-1"><li>Cloudflare Pages (hosting, headers, CDN)</li><li>Stripe (payments, no custom billing)</li><li>WebAuthn passkeys (no passwords stored)</li></ul>
                </div>
                <div class="space-y-2">
                  <div class="font-semibold text-[var(--ui-text)]">Quality</div>
                  <ul class="list-inside list-disc space-y-1"><li>Vitest (125 tests across 31 files)</li><li>TypeScript strict mode throughout</li><li>Bundle budget enforcement (14 limits)</li><li>Content validation pipeline (5 scripts)</li></ul>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <h2 class="text-lg font-semibold text-[var(--ui-text)]">The interesting problems</h2>
            <div class="space-y-4">
              <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-5">
                <h3 class="text-base font-semibold text-[var(--ui-text)]">Verified Processing Environment</h3>
                <div class="mt-3 space-y-3 text-[15px] text-[var(--ui-text-secondary)]">
                  <p>"We don't upload your files" is easy to say. Proving it is harder. I built a system that wraps every PDF operation in three concurrent monitors: a PerformanceObserver watching all network requests, a CSP violation listener catching blocked exfiltration attempts, and a MutationObserver detecting injected scripts or tracking pixels.</p>
                  <p>WebRTC is monkey-patched during processing to prevent IP leaks via ICE candidates. The sandbox iframe runs with an opaque origin and a CSP that blocks all outbound connections. After processing, the system produces a tamper-evident audit report with HMAC-chained entries and SHA-256 hashes of input and output.</p>
                  <p class="text-sm text-[var(--ui-text-muted)]">Threat model based on analysis of 45+ browser exfiltration vectors. <a class="underline" href="/security/technical/verified-processing-environment">Full architecture doc</a> · <a class="underline" href="/security/technical/csp-exfiltration-analysis">Vector analysis</a></p>
                </div>
              </div>
              <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-5">
                <h3 class="text-base font-semibold text-[var(--ui-text)]">Steganography detection</h3>
                <div class="mt-3 space-y-3 text-[15px] text-[var(--ui-text-secondary)]">
                  <p>Most printers embed invisible yellow tracking dots (Machine Identification Code) that encode the printer serial number, date, and time. If you scan a printed document back to PDF, those dots survive. The scrubber includes a heuristic detector that renders pages at high resolution and scans margin areas for yellow pixel patterns matching known MIC grids.</p>
                </div>
              </div>
              <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-5">
                <h3 class="text-base font-semibold text-[var(--ui-text)]">Structure randomization</h3>
                <div class="mt-3 text-[15px] text-[var(--ui-text-secondary)]">
                  <p>PDFs have internal object ordering. If every output from this tool had identical structure, that structure itself becomes a fingerprint. The paranoid scrub mode shuffles internal object insertion order using Fisher-Yates. Two identical inputs produce visually identical but structurally different outputs.</p>
                </div>
              </div>
              <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-5">
                <h3 class="text-base font-semibold text-[var(--ui-text)]">2,900-line build plugin</h3>
                <div class="mt-3 text-[15px] text-[var(--ui-text-secondary)]">
                  <p>The static site generation is a custom Vite plugin that pre-renders 500+ pages at build time. It parses markdown, generates JSON-LD structured data, builds the sitemap, generates RSS, creates the sandboxed processing iframe, and enforces CSP headers. The build also runs five content validation scripts including prohibited-phrase detection.</p>
                </div>
              </div>
              <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-5">
                <h3 class="text-base font-semibold text-[var(--ui-text)]">Font fingerprinting</h3>
                <div class="mt-3 text-[15px] text-[var(--ui-text-secondary)]">
                  <p>When you create a PDF with a custom font, the authoring tool embeds a font subset with a randomly generated prefix unique to that export. The scrubber detects these subsets and warns you, with a link to the flatten tool which destroys all font data by converting pages to images.</p>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <h2 class="text-lg font-semibold text-[var(--ui-text)]">How competitors do it</h2>
            <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-5 text-[15px] text-[var(--ui-text-secondary)] space-y-3">
              <p>Every major free PDF tool uploads your document to their servers for processing. Some claim to delete files after an hour; some don't say. Either way, your document leaves your device, crosses the network, and sits on someone else's infrastructure.</p>
              <p>PDF Changer processes everything in a sandboxed iframe inside your browser tab. The iframe's Content Security Policy blocks all outbound connections. Three monitors verify that nothing leaked. The difference isn't just a privacy policy — it's a fundamentally different architecture.</p>
            </div>
          </div>

          <div class="space-y-3">
            <h2 class="text-lg font-semibold text-[var(--ui-text)]">Try it</h2>
            <div class="grid gap-3 md:grid-cols-3">
              <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-4">
                <a href="/verify" class="underline text-[15px] font-semibold text-[var(--ui-text)]">Run the live audit</a>
                <p class="mt-1 text-sm text-[var(--ui-text-muted)]">Process a sample PDF and watch three monitors prove zero data left your browser.</p>
              </div>
              <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-4">
                <a href="/scrub" class="underline text-[15px] font-semibold text-[var(--ui-text)]">Scrub a real file</a>
                <p class="mt-1 text-sm text-[var(--ui-text-muted)]">Drop in a PDF and see the full report — metadata stripped, hashes computed, audit badge attached.</p>
              </div>
              <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-4">
                <a href="/security" class="underline text-[15px] font-semibold text-[var(--ui-text)]">Read the security docs</a>
                <p class="mt-1 text-sm text-[var(--ui-text-muted)]">Threat models, exfiltration analysis, and residual risk disclosures.</p>
              </div>
            </div>
          </div>

          <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-5">
            <div class="text-sm text-[var(--ui-text-muted)]">Built by <span class="font-semibold text-[var(--ui-text)]">Giuseppe Giona</span>. <a class="underline hover:text-[var(--ui-text)]" href="https://github.com/Giuseppe552/pdf-changer" target="_blank" rel="noopener noreferrer">Source on GitHub</a> — MIT licensed.</div>
          </div>
        </div>`.trim(),
        }),
      );

      // Verify page
      const verifyPath = "/verify";
      writeFileEnsured(
        path.join(outDir, "verify", "index.html"),
        htmlLayout({
          title: "Verify",
          description:
            "Prove that PDF Changer makes zero network requests during file processing.",
          canonicalHref: siteOrigin ? `${siteOrigin}${verifyPath}` : verifyPath,
          ogUrl: siteOrigin ? `${siteOrigin}${verifyPath}` : undefined,
          ogType: "website",
          cssHrefs, jsTags, preloadTags,
          bodyHtml: buildVerifyBody(),
          rssHref,
        }),
      );

      // Status page
      const statusPath = "/status";
      writeFileEnsured(
        path.join(outDir, "status", "index.html"),
        htmlLayout({
          title: "Status",
          description:
            "Live health checks and system status for PDF Changer.",
          canonicalHref: siteOrigin ? `${siteOrigin}${statusPath}` : statusPath,
          ogUrl: siteOrigin ? `${siteOrigin}${statusPath}` : undefined,
          ogType: "website",
          cssHrefs, jsTags, preloadTags,
          bodyHtml: buildStatusBody(),
          rssHref,
        }),
      );

      // Static homepage
      const homePath = "/";
      const homeDescription =
        "Free PDF tools that run entirely in your browser. Merge, split, compress, redact, scrub metadata, and more — no uploads, no subscriptions, no tracking. Built by Giuseppe Giona.";
      const enabledToolsList = toolRegistry
        .filter((t) => t.enabled)
        .map((t) => `<li><a class="underline" href="/tools/${escapeHtml(t.slug)}">${escapeHtml(t.name)}</a> — ${escapeHtml(t.description)}</li>`)
        .join("\n              ");
      const homeJsonLd = JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebApplication",
            name: "PDF Changer",
            url: siteOrigin ?? "https://pdf-changer.pages.dev",
            description: homeDescription,
            applicationCategory: "UtilitiesApplication",
            operatingSystem: "Any",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "GBP",
            },
            browserRequirements: "Requires a modern browser with JavaScript enabled",
          },
          {
            "@type": "Organization",
            name: "PDF Changer",
            url: siteOrigin ?? "https://pdf-changer.pages.dev",
            logo: `${siteOrigin ?? "https://pdf-changer.pages.dev"}/icon.svg`,
          },
        ],
      });
      writeFileEnsured(
        path.join(outDir, "index.html"),
        htmlLayout({
          title: "Free Private PDF Tools, No Uploads",
          description: homeDescription,
          canonicalHref: siteOrigin ? `${siteOrigin}${homePath}` : homePath,
          ogUrl: siteOrigin ? `${siteOrigin}${homePath}` : undefined,
          ogType: "website",
          cssHrefs, jsTags, preloadTags,
          headExtra: `<script type="application/ld+json">${homeJsonLd}</script>`,
          rssHref,
          bodyHtml: `
        <div class="space-y-7">
          <div class="rounded-sm border border-blue-200 bg-blue-50 px-4 py-3">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="text-[15px] font-semibold text-[var(--ui-text)]">${escapeHtml(homeIdentity)}</div>
              <a href="/privacy-policy" class="text-[15px] underline">Read privacy policy</a>
            </div>
          </div>

          <div class="space-y-4">
            <h1 class="text-2xl font-bold tracking-tight text-[var(--ui-text)] md:text-3xl max-w-4xl">${escapeHtml(homeHeroTitle)}</h1>
            <p class="text-lg text-[var(--ui-text-secondary)] max-w-3xl">${escapeHtml(homeHeroSummary)}</p>
            <div class="flex flex-wrap gap-3">
              <a href="/scrub" class="inline-flex items-center rounded-sm bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">Start scrubber</a>
              <a href="/security" class="inline-flex items-center rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-4 py-2 text-sm font-medium text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg)]">See security model</a>
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-5">
              <h2 class="mb-3 text-base font-semibold text-[var(--ui-text)]">Why people use this</h2>
              <ul class="list-inside list-disc space-y-2 text-[15px] text-[var(--ui-text-secondary)]">
                ${homeWhyUse.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n                ")}
              </ul>
            </div>
            <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-5">
              <h2 class="mb-3 text-base font-semibold text-[var(--ui-text)]">Who this is for</h2>
              <ul class="list-inside list-disc space-y-2 text-[15px] text-[var(--ui-text-secondary)]">
                ${homeAudience.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n                ")}
              </ul>
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-4">
            ${homeProofMetrics.map((m) => `
            <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-4">
              <div class="text-xs font-semibold uppercase tracking-wide text-[var(--ui-text-muted)]">${escapeHtml(m.label)}</div>
              <div class="mt-1 text-2xl font-semibold text-[var(--ui-text)]">${escapeHtml(String(m.value))}</div>
              <div class="mt-1 text-sm text-[var(--ui-text-muted)]">${escapeHtml(m.note)}</div>
            </div>`).join("")}
          </div>

          <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-5">
            <h2 class="mb-3 text-base font-semibold text-[var(--ui-text)]">How it works</h2>
            <ol class="list-inside list-decimal space-y-2 text-[15px] text-[var(--ui-text-secondary)]">
              ${homeHowItWorks.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n              ")}
            </ol>
          </div>

          <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-5">
            <h2 class="mb-3 text-base font-semibold text-[var(--ui-text)]">For accountants and office workflows</h2>
            <div class="grid gap-3 md:grid-cols-3">
              ${homeAccountantOutcomes.map((o) => `
              <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg)] p-4">
                <div class="text-base font-semibold text-[var(--ui-text)]">${escapeHtml(o.title)}</div>
                <p class="mt-2 text-[15px] text-[var(--ui-text-secondary)]">${escapeHtml(o.detail)}</p>
              </div>`).join("")}
            </div>
          </div>

          <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-5">
            <h2 class="mb-3 text-base font-semibold text-[var(--ui-text)]">All tools</h2>
            <ul class="list-inside list-disc space-y-1 text-[15px] text-[var(--ui-text-secondary)]">
              ${enabledToolsList}
            </ul>
          </div>

          <div class="rounded-sm border border-amber-200 bg-amber-50 p-5">
            <h2 class="mb-3 text-base font-semibold text-[var(--ui-text)]">What this does not protect</h2>
            <ul class="list-inside list-disc space-y-2 text-[15px] text-[var(--ui-text-secondary)]">
              ${homeLimits.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n              ")}
            </ul>
          </div>

          <div class="rounded-sm border border-blue-200 bg-blue-50 px-4 py-3">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="text-base font-semibold text-[var(--ui-text)]">Start with one PDF safely.</div>
              <a href="/scrub" class="inline-flex items-center rounded-sm bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">Open scrubber</a>
            </div>
          </div>

          <nav class="flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px] text-[var(--ui-text-secondary)]">
            <a class="underline" href="/security">Security Hub</a>
            <a class="underline" href="/faq">FAQ Hub</a>
            <a class="underline" href="/privacy-policy">Privacy Policy</a>
            <a class="underline" href="/donate">Donate</a>
            <a class="underline" href="/tools">All Tools</a>
            <a class="underline" href="/blog">Blog</a>
          </nav>
        </div>`.trim(),
        }),
      );

      // Static guide pages
      const guideSlugs = listGuideSlugs(cfg.root);
      const guidesDir = path.join(cfg.root, "src", "content", "guides");

      // Guide hub
      const guidesHubPath = "/guides";
      const guideLinks = guideSlugs
        .map((slug) => {
          const raw = fs.readFileSync(path.join(guidesDir, `${slug}.md`), "utf8");
          const { title: h1 } = stripLeadingH1(raw);
          const guideTitle = h1 ?? slugToReadableTitle(slug);
          return `<li><a class="underline text-blue-700" href="/guides/${escapeHtml(slug)}">${escapeHtml(guideTitle)}</a></li>`;
        })
        .join("\n              ");
      writeFileEnsured(
        path.join(outDir, "guides", "index.html"),
        htmlLayout({
          title: "Guides",
          description:
            "Step-by-step PDF workflow guides for anonymization, metadata removal, safe sharing, and high-risk document handling.",
          canonicalHref: siteOrigin ? `${siteOrigin}${guidesHubPath}` : guidesHubPath,
          ogUrl: siteOrigin ? `${siteOrigin}${guidesHubPath}` : undefined,
          ogType: "website",
          cssHrefs, jsTags, preloadTags,
          rssHref,
          activeNav: "guides",
          bodyHtml: `
        <div class="space-y-6">
          <h1 class="text-2xl font-bold tracking-tight text-[var(--ui-text)] md:text-3xl">Guides</h1>
          <p class="text-lg text-[var(--ui-text-secondary)] max-w-3xl">Step-by-step PDF workflow guides covering anonymization, metadata, safe sharing, and operational security.</p>
          <ul class="list-inside list-disc space-y-2 text-[15px] text-[var(--ui-text-secondary)]">
              ${guideLinks}
          </ul>
        </div>`.trim(),
        }),
      );

      // Individual guide pages
      for (const slug of guideSlugs) {
        const raw = fs.readFileSync(path.join(guidesDir, `${slug}.md`), "utf8");
        const { title: h1, body } = stripLeadingH1(raw);
        const guideTitle = h1 ?? slugToReadableTitle(slug);
        const desc = truncate(firstParagraph(body) || `Guide: ${guideTitle}.`, 160);
        const guideBodyHtml = renderToStaticMarkup(
          React.createElement(Markdown, { remarkPlugins: [remarkGfm] }, body),
        );
        const guidePath = `/guides/${slug}`;
        const otherGuides = guideSlugs
          .filter((s) => s !== slug)
          .map((s) => {
            const otherRaw = fs.readFileSync(path.join(guidesDir, `${s}.md`), "utf8");
            const { title: otherH1 } = stripLeadingH1(otherRaw);
            return `<li><a class="underline text-blue-700" href="/guides/${escapeHtml(s)}">${escapeHtml(otherH1 ?? slugToReadableTitle(s))}</a></li>`;
          })
          .join("\n                ");

        writeFileEnsured(
          path.join(outDir, "guides", slug, "index.html"),
          htmlLayout({
            title: guideTitle,
            description: desc,
            canonicalHref: siteOrigin ? `${siteOrigin}${guidePath}` : guidePath,
            ogUrl: siteOrigin ? `${siteOrigin}${guidePath}` : undefined,
            ogType: "article",
            cssHrefs, jsTags, preloadTags,
            rssHref,
            activeNav: "guides",
            bodyHtml: `
        <article class="space-y-6">
          <nav class="text-sm text-[var(--ui-text-muted)]"><a class="underline" href="/guides">Guides</a> / ${escapeHtml(guideTitle)}</nav>
          <h1 class="text-2xl font-bold tracking-tight text-[var(--ui-text)] md:text-3xl">${escapeHtml(guideTitle)}</h1>
          <div class="prose prose-neutral max-w-none text-[15px] leading-relaxed">${guideBodyHtml}</div>
          <hr class="border-[var(--ui-border)]" />
          <div class="space-y-2">
            <h2 class="text-base font-semibold text-[var(--ui-text)]">More guides</h2>
            <ul class="list-inside list-disc space-y-1 text-[15px] text-[var(--ui-text-secondary)]">
                ${otherGuides}
            </ul>
          </div>
        </article>`.trim(),
          }),
        );
      }

      // Static pricing page
      const pricingPath = "/pricing";
      writeFileEnsured(
        path.join(outDir, "pricing", "index.html"),
        htmlLayout({
          title: "Pricing",
          description:
            "All core PDF tools are free with generous local quotas. Upgrade to the paid plan for unlimited workflow scale at £10/month.",
          canonicalHref: siteOrigin ? `${siteOrigin}${pricingPath}` : pricingPath,
          ogUrl: siteOrigin ? `${siteOrigin}${pricingPath}` : undefined,
          ogType: "website",
          cssHrefs, jsTags, preloadTags,
          rssHref,
          activeNav: "pricing",
          bodyHtml: `
        <div class="space-y-6">
          <div class="space-y-2">
            <h1 class="text-2xl font-bold tracking-tight text-[var(--ui-text)] md:text-3xl">Pricing</h1>
            <p class="text-lg text-[var(--ui-text-secondary)] max-w-3xl">All core tools are free with generous local quotas. Upgrade for unlimited workflow scale.</p>
          </div>

          <div class="rounded-sm border border-blue-200 bg-blue-50 px-4 py-3 text-[15px] text-[var(--ui-text-secondary)]">
            Payments are handled by Stripe. Core privacy stance remains the same: no analytics trackers and no PDF upload processing.
          </div>

          <div class="grid gap-4 md:grid-cols-3">
            <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-5 h-full">
              <h2 class="mb-3 text-base font-semibold text-[var(--ui-text)]">Guest</h2>
              <ul class="list-inside list-disc space-y-2 text-[15px] text-[var(--ui-text-secondary)]">
                <li>All core tools enabled</li>
                <li>40 actions/month (device-local)</li>
              </ul>
              <div class="mt-3 text-sm text-[var(--ui-text-muted)]">No account needed.</div>
            </div>
            <div class="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-5 h-full">
              <h2 class="mb-3 text-base font-semibold text-[var(--ui-text)]">Free (Passkey)</h2>
              <ul class="list-inside list-disc space-y-2 text-[15px] text-[var(--ui-text-secondary)]">
                <li>All core tools enabled</li>
                <li>600 actions/month (device-local)</li>
                <li>Heavy-bucket cap: 150/month</li>
              </ul>
              <div class="mt-3 text-sm text-[var(--ui-text-muted)]">Create a passkey in <a class="underline" href="/account">/account</a>.</div>
            </div>
            <div class="rounded-sm border border-blue-200 bg-blue-50 p-5 h-full">
              <h2 class="mb-3 text-base font-semibold text-[var(--ui-text)]">Paid — £10/month</h2>
              <div class="mb-3 text-[15px] text-[var(--ui-text-secondary)]">Workflow unlock plan for higher-volume and repeat workloads.</div>
              <ul class="list-inside list-disc space-y-2 text-[15px] text-[var(--ui-text-secondary)]">
                <li>Unlimited actions on all GA tools</li>
                <li>Offline paid use until entitlement expiry</li>
                <li>Batch queue and pipelines (planned)</li>
                <li>Saved presets and profile defaults (planned)</li>
              </ul>
              <div class="mt-3"><a href="/account" class="inline-flex items-center rounded-sm bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">Create account to upgrade</a></div>
            </div>
          </div>
        </div>`.trim(),
        }),
      );

      // robots.txt (always)
      const robots = [
        "User-agent: *",
        "Allow: /",
        siteOrigin ? `Sitemap: ${siteOrigin}/sitemap.xml` : "",
        "",
      ]
        .filter(Boolean)
        .join("\n");
      writeFileEnsured(path.join(outDir, "robots.txt"), robots);

      // Generate _headers with pinned CSP connect-src (no *.workers.dev wildcard)
      const apiBaseUrl = process.env.VITE_API_BASE_URL ?? "";
      const cspConnectSrc = apiBaseUrl
        ? `'self' https://api.stripe.com https://*.stripe.com ${apiBaseUrl}`
        : "'self' https://api.stripe.com https://*.stripe.com";
      const headers = `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-DNS-Prefetch-Control: off
  Content-Security-Policy: default-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; manifest-src 'self'; worker-src 'self' blob:; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; font-src 'self'; connect-src ${cspConnectSrc};
`;
      writeFileEnsured(path.join(outDir, "_headers"), headers);

      const originPrefix = siteOrigin ?? "";
      if (!siteOrigin) {
        globalThis.console.warn(
          "[seo-static-blog] SITE_ORIGIN missing; sitemap.xml will use relative URLs.",
        );
      }

      const urls: Array<{ loc: string; lastmod?: string }> = [];
      const corePaths = [
        "/",
        "/scrub",
        "/tools",
        "/pricing",
        "/account",
        "/security",
        "/security/non-technical",
        "/security/technical",
        "/security/policy",
        "/donate",
        "/donate/proof",
        "/donate/proof/archive",
        "/donate/transparency",
        "/privacy",
        "/privacy-policy",
        "/terms",
        "/refund-policy",
        "/faq",
        "/guides",
        "/blog",
        "/about",
        "/colophon",
        "/verify",
        "/status",
      ];
      for (const p of corePaths) urls.push({ loc: `${originPrefix}${p}` });
      for (const tool of toolRegistry) {
        urls.push({ loc: `${originPrefix}/tools/${tool.slug}` });
      }
      for (const page of toolDocPages.filter((item) => item.kind !== "tool")) {
        urls.push({ loc: `${originPrefix}${page.route}` });
      }
      for (const slug of listGuideSlugs(cfg.root)) {
        urls.push({ loc: `${originPrefix}/guides/${slug}` });
      }
      for (const category of categories) {
        urls.push({ loc: `${originPrefix}/blog/${category}` });
      }
      for (const post of posts) {
        urls.push({ loc: `${originPrefix}${post.route}`, lastmod: post.date });
      }
      for (const topic of faqTopics) {
        urls.push({ loc: `${originPrefix}/faq/${topic}` });
      }
      for (const question of faqQuestions) {
        urls.push({
          loc: `${originPrefix}${question.route}`,
          lastmod: question.lastReviewed ?? undefined,
        });
      }
      for (const article of securityArticles) {
        urls.push({
          loc: `${originPrefix}${article.route}`,
          lastmod: article.lastReviewed ?? undefined,
        });
      }

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => {
    const lastmod = u.lastmod ? `    <lastmod>${escapeXml(u.lastmod)}</lastmod>\n` : "";
    return `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n${lastmod}  </url>`;
  })
  .join("\n")}
</urlset>
`;
      writeFileEnsured(path.join(outDir, "sitemap.xml"), sitemap);

      // llms.txt for AI discoverability
      const enabledTools = toolRegistry.filter((t) => t.enabled);
      const llmsTxt = [
        "# PDF Changer",
        "",
        "> Free, privacy-first PDF tools that run entirely in your browser. No uploads, no trackers, no accounts required.",
        "",
        "## Tools",
        "",
        ...enabledTools.map((t) => `- [${t.name}](/tools/${t.slug}): ${t.description}`),
        "",
        "## Documentation",
        "",
        "- [Security Hub](/security): Threat models and privacy guidance",
        "- [FAQ](/faq): Frequently asked questions",
        "- [Guides](/guides): Step-by-step PDF workflow guides",
        "",
        "## Legal",
        "",
        "- [Privacy Policy](/privacy-policy)",
        "- [Terms](/terms)",
        "",
      ].join("\n");
      writeFileEnsured(path.join(outDir, "llms.txt"), llmsTxt);

      if (siteOrigin) {
        const rssItems = posts
          .slice(0, 30)
          .map((p) => {
            const link = `${siteOrigin}${p.route}`;
            return `
  <item>
    <title>${escapeXml(p.title)}</title>
    <link>${escapeXml(link)}</link>
    <guid>${escapeXml(link)}</guid>
    <pubDate>${escapeXml(rfc822Date(p.date))}</pubDate>
    <category>${escapeXml(p.category)}</category>
    <description>${escapeXml(p.description)}</description>
  </item>`.trim();
          })
          .join("\n");

        const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>PDF Changer Blog</title>
  <link>${escapeXml(`${siteOrigin}/blog`)}</link>
  <description>Calm, plain‑English guidance for safer document sharing.</description>
  <language>en</language>
${rssItems}
</channel>
</rss>
`;
        writeFileEnsured(path.join(outDir, "rss.xml"), rss);
      }

      // Build sandboxed processing iframe with inlined script
      const sandboxEntryPath = path.join(
        cfg.root,
        "src",
        "utils",
        "vpe",
        "sandbox",
        "sandboxEntry.ts",
      );
      if (fs.existsSync(sandboxEntryPath)) {
        const esbuild = await import("esbuild");
        const bundled = await esbuild.build({
          entryPoints: [sandboxEntryPath],
          bundle: true,
          format: "iife",
          write: false,
          platform: "browser",
          target: "es2022",
          minify: true,
        });
        const sandboxJs = new TextDecoder().decode(
          bundled.outputFiles[0].contents,
        );

        const sandboxHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'wasm-unsafe-eval'; worker-src blob:; connect-src 'none'; form-action 'none'; img-src 'none'; font-src 'none'; style-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none';">
</head>
<body>
  <script>${sandboxJs}</script>
</body>
</html>`;
        writeFileEnsured(path.join(outDir, "sandbox.html"), sandboxHtml);
      }
    },
  };
}
