import fs from "node:fs";
import path from "node:path";

const UI_PAGE_ROUTE_MAP = new Map([
  ["src/ui/pages/LandingPage.tsx", "/"],
  ["src/ui/pages/ScrubberPage.tsx", "/scrub"],
  ["src/ui/pages/PricingPage.tsx", "/pricing"],
  ["src/ui/pages/AccountPage.tsx", "/account"],
  ["src/ui/pages/PrivacyPage.tsx", "/privacy"],
  ["src/ui/pages/SecurityPage.tsx", "/security"],
  ["src/ui/pages/SitemapPage.tsx", "/sitemap"],
  ["src/ui/pages/StatusPage.tsx", "/status"],
  ["src/ui/pages/NewsletterPage.tsx", "/newsletter"],
  ["src/ui/pages/ContactPage.tsx", "/contact"],
  ["src/ui/pages/DonatePage.tsx", "/donate"],
  ["src/ui/pages/DonateProofPage.tsx", "/donate/proof"],
  ["src/ui/pages/DonateProofArchivePage.tsx", "/donate/proof/archive"],
  ["src/ui/pages/DonateTransparencyPage.tsx", "/donate/transparency"],
  ["src/ui/pages/GuidesIndexPage.tsx", "/guides"],
  ["src/ui/pages/GuidePage.tsx", "/guides/:slug"],
  ["src/ui/pages/NotFoundPage.tsx", "/__system__/not-found"],
  ["src/ui/pages/RouteErrorPage.tsx", "/__system__/route-error"],
  ["src/ui/pages/content/MarkdownContentPage.tsx", "/content/:section/:slug"],
  ["src/ui/pages/blog/BlogIndexPage.tsx", "/blog"],
  ["src/ui/pages/blog/BlogPostPage.tsx", "/blog/:category/:slug"],
  ["src/ui/pages/faq/FaqHubPage.tsx", "/faq"],
  ["src/ui/pages/faq/FaqTopicPage.tsx", "/faq/:topic"],
  ["src/ui/pages/faq/FaqQuestionPage.tsx", "/faq/:topic/:slug"],
  ["src/ui/pages/security/SecurityTrackPage.tsx", "/security/:track"],
  ["src/ui/pages/security/SecurityArticlePage.tsx", "/security/:track/:slug"],
  ["src/ui/pages/security/components/SecurityArticleCard.tsx", "/security"],
  ["src/ui/pages/security/components/RiskBox.tsx", "/security"],
  ["src/ui/pages/security/components/LimitationsBox.tsx", "/security"],
  ["src/ui/pages/tools/ToolsLayout.tsx", "/tools"],
  ["src/ui/pages/tools/ToolsHubPage.tsx", "/tools"],
  ["src/ui/pages/tools/ToolDocPage.tsx", "/__shared__/tools-doc-page"],
  ["src/ui/pages/tools/ToolRunnerPage.tsx", "/__shared__/tool-runner"],
  ["src/ui/pages/tools/MergeToolPage.tsx", "/tools/merge"],
  ["src/ui/pages/tools/SplitToolPage.tsx", "/tools/split"],
  ["src/ui/pages/tools/PageEditorToolPage.tsx", "/tools/editor"],
  ["src/ui/pages/tools/CompressToolPage.tsx", "/tools/compress"],
  ["src/ui/pages/tools/ImageToPdfToolPage.tsx", "/tools/image-to-pdf"],
  ["src/ui/pages/tools/PdfToImageToolPage.tsx", "/tools/pdf-to-image"],
  ["src/ui/pages/tools/WatermarkToolPage.tsx", "/tools/watermark"],
  ["src/ui/pages/tools/PageNumbersToolPage.tsx", "/tools/page-numbers"],
  ["src/ui/pages/tools/ProtectToolPage.tsx", "/tools/protect"],
  ["src/ui/pages/tools/UnlockToolPage.tsx", "/tools/unlock"],
  ["src/ui/pages/tools/RemovePagesToolPage.tsx", "/tools/remove-pages"],
  ["src/ui/pages/tools/components/ToolCard.tsx", "/tools"],
  ["src/ui/pages/tools/components/ToolCategorySection.tsx", "/tools"],
  ["src/ui/pages/tools/components/ToolLimitNotice.tsx", "/tools"],
  ["src/ui/pages/tools/components/UsageMeter.tsx", "/tools"],
  ["src/ui/pages/tools/components/ResultDownloadPanel.tsx", "/tools"],
  ["src/ui/pages/donate/components/AdvancedCommandsTabs.tsx", "/donate/proof"],
  ["src/ui/pages/donate/components/FailureActionsBox.tsx", "/donate/proof"],
  ["src/ui/pages/donate/components/KeyIdentityCard.tsx", "/donate/proof"],
  ["src/ui/pages/donate/components/ProofFileTable.tsx", "/donate/proof"],
  ["src/ui/pages/donate/components/VerifyChecklist.tsx", "/donate/proof"],
]);

const CONTENT_ROUTE_MAP = new Map([
  ["src/content/landing/homeContent.ts", "/"],
  ["src/content/blog/blogIndex.ts", "/blog"],
  ["src/content/faq/faqIndex.ts", "/faq"],
  ["src/content/security/securityIndex.ts", "/security"],
  ["src/content/security/frontmatter.ts", "/security"],
  ["src/content/tools/toolRegistry.ts", "/tools"],
  ["src/content/tools/toolDocs.ts", "/__shared__/tools-docs-content"],
  ["src/content/tools/toolEditorial.json", "/__shared__/tools-docs-content"],
  ["src/content/donate/proofLoader.ts", "/donate/proof"],
  ["src/content/donate/proofManifest.ts", "/donate/proof"],
  ["src/content/donate/addresses.ts", "/donate"],
]);

const LEGAL_ROUTES = {
  "privacy-policy.md": "/privacy-policy",
  "terms.md": "/terms",
  "refund-policy.md": "/refund-policy",
};

const CORE_ROUTES = new Set([
  "/",
  "/tools",
  "/scrub",
  "/pricing",
  "/security",
  "/donate",
  "/account",
]);

function toPosix(value) {
  return value.replace(/\\/g, "/");
}

function fileNameFromPath(relPath) {
  const normalized = toPosix(relPath);
  const parts = normalized.split("/");
  return parts[parts.length - 1] ?? normalized;
}

function parseToolRegistry(root) {
  const registryPath = path.join(root, "src", "content", "tools", "toolRegistry.ts");
  if (!fs.existsSync(registryPath)) {
    return { slugs: [], statusBySlug: {} };
  }

  const raw = fs.readFileSync(registryPath, "utf8");
  const blocks = raw
    .split("\n  },\n  {")
    .map((block, index, array) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (index === 0) return `${trimmed}\n  }`;
      if (index === array.length - 1) return `{${trimmed}`;
      return `{${trimmed}\n  }`;
    })
    .filter(Boolean);

  const slugs = [];
  const statusBySlug = {};

  for (const block of blocks) {
    const slug = block.match(/slug:\s*"([^"]+)"/)?.[1];
    const status = block.match(/status:\s*"([^"]+)"/)?.[1];
    if (!slug) continue;
    slugs.push(slug);
    statusBySlug[slug] = status ?? "ga";
  }

  return { slugs, statusBySlug };
}

function routeFromMarkdown(relPath) {
  const normalized = toPosix(relPath);

  const blogMatch = normalized.match(/^src\/content\/blog\/(\d{4}-\d{2}-\d{2})-([a-z0-9-]+)\.md$/);
  if (blogMatch) {
    const [category, ...slugParts] = blogMatch[2].split("-");
    const slug = slugParts.join("-");
    if (category && slug) {
      return `/blog/${category}/${slug}`;
    }
  }

  const faqMatch = normalized.match(/^src\/content\/faq\/([a-z0-9-]+)\/([a-z0-9-]+)\.md$/);
  if (faqMatch) {
    return `/faq/${faqMatch[1]}/${faqMatch[2]}`;
  }

  const guidesMatch = normalized.match(/^src\/content\/guides\/([a-z0-9-]+)\.md$/);
  if (guidesMatch) {
    return `/guides/${guidesMatch[1]}`;
  }

  const securityMatch = normalized.match(
    /^src\/content\/security\/(non-technical|technical|policy)\/([a-z0-9-]+)\.md$/,
  );
  if (securityMatch) {
    if (securityMatch[1] === "policy") return "/security/policy";
    return `/security/${securityMatch[1]}/${securityMatch[2]}`;
  }

  const legalMatch = normalized.match(/^src\/content\/legal\/([a-z0-9-]+)\.md$/);
  if (legalMatch) {
    return LEGAL_ROUTES[`${legalMatch[1]}.md`] ?? null;
  }

  return null;
}

function routeFromContentFile(relPath, { toolSlugs }) {
  const normalized = toPosix(relPath);
  if (CONTENT_ROUTE_MAP.has(normalized)) {
    return CONTENT_ROUTE_MAP.get(normalized) ?? null;
  }
  if (normalized === "src/content/contentIndex.ts") {
    return "/sitemap";
  }
  if (normalized === "src/content/tools/toolEditorial.json") {
    const slug = toolSlugs[0];
    return slug ? `/tools/${slug}/how-to` : "/tools/:slug/how-to";
  }
  return null;
}

function routeFromUiFile(relPath) {
  const normalized = toPosix(relPath);
  if (UI_PAGE_ROUTE_MAP.has(normalized)) {
    return UI_PAGE_ROUTE_MAP.get(normalized) ?? null;
  }
  if (normalized.startsWith("src/ui/components/")) {
    return "/__shared__/ui";
  }
  return null;
}

export function inferRouteFromFile(root, relPath, options = {}) {
  const normalized = toPosix(relPath);
  const { toolSlugs = [] } = options;

  if (normalized.endsWith(".md")) {
    const markdownRoute = routeFromMarkdown(normalized);
    if (markdownRoute) return markdownRoute;
  }

  if (normalized.startsWith("src/ui/")) {
    const uiRoute = routeFromUiFile(normalized);
    if (uiRoute) return uiRoute;
  }

  if (normalized.startsWith("src/content/")) {
    const contentRoute = routeFromContentFile(normalized, { toolSlugs });
    if (contentRoute) return contentRoute;
  }

  if (normalized.startsWith("src/content/tools/")) {
    return "/tools";
  }

  if (normalized.startsWith("src/content/donate/")) {
    return "/donate/proof";
  }

  if (normalized.startsWith("src/content/security/")) {
    return "/security";
  }

  if (normalized.startsWith("src/content/faq/")) {
    return "/faq";
  }

  if (normalized.startsWith("src/content/blog/")) {
    return "/blog";
  }

  if (normalized.startsWith("src/content/guides/")) {
    return "/guides";
  }

  const name = fileNameFromPath(normalized);
  if (name === "router.tsx") return "/__shared__/routing";
  return "/__unmapped__";
}

export function routeTypeFor(route) {
  if (!route || route.startsWith("/__")) return "shared";
  if (route === "/" || route === "/security" || route === "/faq" || route === "/blog" || route === "/guides") {
    return "hub";
  }
  if (route === "/scrub" || route === "/pricing" || route === "/account") {
    return "transactional";
  }
  if (route.startsWith("/tools")) {
    const segments = route.split("/").filter(Boolean);
    if (segments.length <= 2) return "transactional";
    return "article";
  }
  if (
    route.startsWith("/blog/") ||
    route.startsWith("/faq/") ||
    route.startsWith("/guides/") ||
    route.startsWith("/security/")
  ) {
    return "article";
  }
  if (
    route === "/privacy" ||
    route === "/privacy-policy" ||
    route === "/terms" ||
    route === "/refund-policy" ||
    route === "/security/policy"
  ) {
    return "policy";
  }
  return "support";
}

export function clusterForRoute(route) {
  if (!route) return "unknown";
  if (route.startsWith("/__")) return "shared";
  if (route.startsWith("/tools")) {
    const segments = route.split("/").filter(Boolean);
    return segments.length <= 2 ? "tools-app" : "tools-docs";
  }
  if (route.startsWith("/faq")) return "faq";
  if (route.startsWith("/blog")) return "blog";
  if (route.startsWith("/security")) return "security";
  if (route.startsWith("/guides")) return "guides";
  if (route.startsWith("/donate")) return "donate";
  if (
    route === "/" ||
    route === "/scrub" ||
    route === "/pricing" ||
    route === "/account" ||
    route === "/privacy" ||
    route === "/privacy-policy" ||
    route === "/terms" ||
    route === "/refund-policy"
  ) {
    return "core";
  }
  return "support";
}

export function isCoreRoute(route) {
  return CORE_ROUTES.has(route);
}

export function isConcreteRoute(route) {
  return Boolean(route) && !route.includes(":") && !route.startsWith("/__");
}

export function resolveRouteContext(root, filePath, options = {}) {
  const relPath = toPosix(path.relative(root, filePath));
  const route = inferRouteFromFile(root, relPath, options);
  return {
    file: relPath,
    route,
    routeType: routeTypeFor(route),
    cluster: clusterForRoute(route),
  };
}

export function loadRouteContext(root) {
  const { slugs, statusBySlug } = parseToolRegistry(root);
  return { toolSlugs: slugs, toolStatusBySlug: statusBySlug };
}
