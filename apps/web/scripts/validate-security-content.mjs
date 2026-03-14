#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const AUDIENCE_SET = new Set([
  "office-workers",
  "whistleblowers",
  "general-users",
  "journalists",
  "teams",
]);
const RISK_SET = new Set(["low", "medium", "high"]);
const DIFFICULTY_SET = new Set(["beginner", "intermediate", "advanced"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PROHIBITED_PATTERNS = [
  {
    label: "fraud-instruction",
    pattern: /\bhow to (?:commit|do) fraud\b/i,
  },
  {
    label: "evasion-instruction",
    pattern: /\bavoid getting caught\b/i,
  },
  {
    label: "law-enforcement-evasion",
    pattern: /\bevade law enforcement\b/i,
  },
  {
    label: "forgery-instruction",
    pattern: /\bforge (?:a|an)?\s*document\b/i,
  },
  {
    label: "identity-theft-instruction",
    pattern: /\bsteal identity\b/i,
  },
];

const ROOT = process.cwd();
const SECURITY_ROOT = path.join(ROOT, "src", "content", "security");
const TRACK_DIRS = ["non-technical", "technical"];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    if (entry.isFile() && entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function parseList(value) {
  const unwrapped = value.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (!unwrapped) return [];
  return unwrapped
    .split(",")
    .map((token) => unquote(token))
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
}

function parseFrontmatter(raw) {
  const frontmatter = {};
  if (!raw.startsWith("---\n")) return frontmatter;
  const end = raw.indexOf("\n---\n", 4);
  if (end === -1) return frontmatter;
  const block = raw.slice(4, end);
  const lines = block.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf(":");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim().toLowerCase();
    const value = trimmed.slice(idx + 1).trim();
    if (!value) continue;
    if (key === "title" || key === "summary" || key === "risklevel" || key === "difficulty") {
      frontmatter[key] = unquote(value);
    }
    if (key === "audience" || key === "tags") {
      frontmatter[key] = parseList(value);
    }
    if (key === "lastreviewed") {
      frontmatter[key] = unquote(value);
    }
    if (key === "estimatedminutes") {
      frontmatter[key] = Number.parseInt(unquote(value), 10);
    }
  }
  return frontmatter;
}

function normalizeRouteFromFile(filePath) {
  const rel = path.relative(SECURITY_ROOT, filePath).replace(/\\/g, "/");
  const m = rel.match(/^(non-technical|technical|policy)\/([a-z0-9-]+)\.md$/);
  if (!m) return null;
  const [, section, slug] = m;
  if (section === "policy") return "/security/policy";
  return `/security/${section}/${slug}`;
}

function knownRoutes(files) {
  const routes = new Set([
    "/",
    "/scrub",
    "/tools",
    "/pricing",
    "/account",
    "/privacy",
    "/privacy-policy",
    "/terms",
    "/refund-policy",
    "/security",
    "/security/non-technical",
    "/security/technical",
    "/security/policy",
    "/faq",
    "/blog",
    "/guides",
    "/sitemap",
    "/status",
    "/newsletter",
    "/contact",
    "/donate",
    "/donate/proof",
    "/donate/proof/archive",
    "/donate/transparency",
    "/verify",
    "/about",
  ]);
  for (const file of files) {
    const route = normalizeRouteFromFile(file);
    if (route) routes.add(route);
  }
  return routes;
}

function validateRequiredFields(filePath, frontmatter, errors) {
  const reqKeys = [
    "title",
    "summary",
    "audience",
    "risklevel",
    "difficulty",
    "lastreviewed",
    "tags",
    "estimatedminutes",
  ];
  for (const key of reqKeys) {
    if (
      !(key in frontmatter) ||
      frontmatter[key] == null ||
      (Array.isArray(frontmatter[key]) && frontmatter[key].length === 0)
    ) {
      errors.push(`${filePath}: missing required frontmatter "${key}"`);
    }
  }
}

function validateEnums(filePath, frontmatter, errors) {
  if (frontmatter.risklevel && !RISK_SET.has(String(frontmatter.risklevel).toLowerCase())) {
    errors.push(`${filePath}: invalid riskLevel "${frontmatter.risklevel}"`);
  }
  if (
    frontmatter.difficulty &&
    !DIFFICULTY_SET.has(String(frontmatter.difficulty).toLowerCase())
  ) {
    errors.push(`${filePath}: invalid difficulty "${frontmatter.difficulty}"`);
  }
  if (Array.isArray(frontmatter.audience)) {
    for (const value of frontmatter.audience) {
      if (!AUDIENCE_SET.has(value)) {
        errors.push(`${filePath}: invalid audience "${value}"`);
      }
    }
  }
}

function validateDate(filePath, frontmatter, errors) {
  const value = String(frontmatter.lastreviewed ?? "");
  if (!DATE_RE.test(value)) {
    errors.push(`${filePath}: lastReviewed must be YYYY-MM-DD`);
    return;
  }
  const ts = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(ts)) {
    errors.push(`${filePath}: invalid lastReviewed date "${value}"`);
  }
}

function validateEstimatedMinutes(filePath, frontmatter, errors) {
  const n = Number(frontmatter.estimatedminutes);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    errors.push(`${filePath}: estimatedMinutes must be a positive integer`);
  }
}

function validateLimitationsHeading(filePath, raw, errors) {
  if (!/^##\s+What this does not protect\s*$/im.test(raw)) {
    errors.push(`${filePath}: missing required section heading "## What this does not protect"`);
  }
}

function validateDefensiveBoundaries(filePath, raw, errors) {
  for (const rule of PROHIBITED_PATTERNS) {
    if (rule.pattern.test(raw)) {
      errors.push(`${filePath}: prohibited misuse phrase matched (${rule.label})`);
    }
  }
}

function validateLinks(filePath, raw, routes, errors) {
  const linkPattern = /\[[^\]]*]\(([^)]+)\)/g;
  for (const match of raw.matchAll(linkPattern)) {
    const target = match[1].trim();
    if (!target || target.startsWith("#")) continue;
    if (
      target.startsWith("http://") ||
      target.startsWith("https://") ||
      target.startsWith("mailto:") ||
      target.startsWith("tel:")
    ) {
      continue;
    }

    const cleaned = target.split("#")[0].split("?")[0];
    if (cleaned.startsWith("/")) {
      const allowedPrefix =
        cleaned.startsWith("/faq/") ||
        cleaned.startsWith("/blog/") ||
        cleaned.startsWith("/guides/") ||
        cleaned.startsWith("/tools/");
      if (!allowedPrefix && !routes.has(cleaned)) {
        errors.push(`${filePath}: unresolved internal route "${cleaned}"`);
      }
      continue;
    }

    const base = path.dirname(filePath);
    const candidate = cleaned.endsWith(".md") ? cleaned : `${cleaned}.md`;
    const resolved = path.resolve(base, candidate);
    if (!resolved.startsWith(SECURITY_ROOT)) {
      errors.push(`${filePath}: relative link escapes security content "${target}"`);
      continue;
    }
    if (!fs.existsSync(resolved)) {
      errors.push(`${filePath}: unresolved relative link "${target}"`);
    }
  }
}

function main() {
  const files = [...TRACK_DIRS, "policy"]
    .flatMap((dir) => walk(path.join(SECURITY_ROOT, dir)))
    .sort();
  const routes = knownRoutes(files);
  const errors = [];
  const routeSet = new Set();

  for (const file of files) {
    const raw = fs.readFileSync(file, "utf8");
    const frontmatter = parseFrontmatter(raw);
    const route = normalizeRouteFromFile(file);

    if (route) {
      if (routeSet.has(route)) {
        errors.push(`${file}: duplicate route "${route}"`);
      } else {
        routeSet.add(route);
      }
    }

    validateRequiredFields(file, frontmatter, errors);
    validateEnums(file, frontmatter, errors);
    validateDate(file, frontmatter, errors);
    validateEstimatedMinutes(file, frontmatter, errors);
    validateLimitationsHeading(file, raw, errors);
    validateDefensiveBoundaries(file, raw, errors);
    validateLinks(file, raw, routes, errors);
  }

  if (errors.length) {
    globalThis.console.error("Security content validation failed:");
    for (const error of errors) {
      globalThis.console.error(`- ${error}`);
    }
    process.exit(1);
  }

  globalThis.console.log(`Security content validation passed (${files.length} files).`);
}

main();
