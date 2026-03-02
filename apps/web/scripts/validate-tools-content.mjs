#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const TOOL_REGISTRY_PATH = path.join(ROOT, "src", "content", "tools", "toolRegistry.ts");

const PROHIBITED_PATTERNS = [
  /\bhow to (?:commit|do) fraud\b/i,
  /\bavoid getting caught\b/i,
  /\bevade law enforcement\b/i,
  /\bforge (?:a|an)?\s*document\b/i,
  /\bsteal identity\b/i,
];

const BASE_ROUTES = new Set([
  "/",
  "/scrub",
  "/tools",
  "/pricing",
  "/account",
  "/security",
  "/security/non-technical",
  "/security/technical",
  "/security/policy",
  "/privacy",
  "/privacy-policy",
  "/terms",
  "/refund-policy",
  "/faq",
  "/blog",
  "/guides",
  "/donate",
  "/donate/proof",
  "/donate/proof/archive",
  "/donate/transparency",
  "/sitemap",
  "/status",
  "/newsletter",
  "/contact",
]);

function parseRegistryBlocks(raw) {
  const start = raw.indexOf("export const toolRegistry");
  if (start === -1) return [];
  const arrayStart = raw.indexOf("[", start);
  const arrayEnd = raw.indexOf("];", arrayStart);
  if (arrayStart === -1 || arrayEnd === -1) return [];
  const body = raw.slice(arrayStart + 1, arrayEnd);
  return body
    .split("\n  },\n  {")
    .map((item, index, array) => {
      const trimmed = item.trim();
      if (!trimmed) return "";
      if (index === 0) return `${trimmed}\n  }`;
      if (index === array.length - 1) return `{${trimmed}`;
      return `{${trimmed}\n  }`;
    })
    .filter(Boolean);
}

function getField(block, key) {
  const m = block.match(new RegExp(`${key}:\\s*"([^"]+)"`));
  return m ? m[1] : null;
}

function listRoutes(block) {
  return [...block.matchAll(/"\/[^"]*"/g)].map((m) => m[0].slice(1, -1));
}

function validateRoute(route) {
  if (BASE_ROUTES.has(route)) return true;
  return (
    route.startsWith("/faq/") ||
    route.startsWith("/blog/") ||
    route.startsWith("/guides/") ||
    route.startsWith("/security/") ||
    route.startsWith("/tools/")
  );
}

function main() {
  const errors = [];
  if (!fs.existsSync(TOOL_REGISTRY_PATH)) {
    errors.push(`Missing tool registry: ${TOOL_REGISTRY_PATH}`);
  }
  if (errors.length) {
    for (const error of errors) globalThis.console.error(`- ${error}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(TOOL_REGISTRY_PATH, "utf8");
  const blocks = parseRegistryBlocks(raw);
  if (!blocks.length) {
    globalThis.console.error("Tools content validation failed:");
    globalThis.console.error("- Could not parse toolRegistry entries.");
    process.exit(1);
  }

  const slugSet = new Set();
  const expectedSlugs = [];

  for (const [index, block] of blocks.entries()) {
    const slug = getField(block, "slug");
    const name = getField(block, "name");
    const description = getField(block, "description");
    const category = getField(block, "category");
    const bucket = getField(block, "bucket");
    const processingMode = getField(block, "processingMode");
    const status = getField(block, "status");
    const availability = getField(block, "availability");

    const prefix = `toolRegistry[${index}]`;

    if (!slug) errors.push(`${prefix}: missing slug`);
    if (!name) errors.push(`${prefix}: missing name`);
    if (!description) errors.push(`${prefix}: missing description`);
    if (!category) errors.push(`${prefix}: missing category`);
    if (!bucket) errors.push(`${prefix}: missing bucket`);
    if (!processingMode) errors.push(`${prefix}: missing processingMode`);
    if (!status) errors.push(`${prefix}: missing status`);
    if (!availability) errors.push(`${prefix}: missing availability`);

    if (slug) {
      if (slugSet.has(slug)) {
        errors.push(`${prefix}: duplicate slug "${slug}"`);
      } else {
        slugSet.add(slug);
        expectedSlugs.push(slug);
      }
    }

    if (status && !["ga", "beta", "coming-soon"].includes(status)) {
      errors.push(`${prefix}: invalid status "${status}"`);
    }
    if (
      availability &&
      !["fully-functional", "limited"].includes(availability)
    ) {
      errors.push(`${prefix}: invalid availability "${availability}"`);
    }
    if (status && status !== "ga" && !block.includes("releaseNote")) {
      errors.push(`${prefix}: non-GA tool missing releaseNote`);
    }

    if (description) {
      for (const pattern of PROHIBITED_PATTERNS) {
        if (pattern.test(description)) {
          errors.push(`${prefix}: prohibited misuse phrase in description`);
        }
      }
    }

    const routes = listRoutes(block);
    for (const route of routes) {
      if (!validateRoute(route)) {
        errors.push(`${prefix}: unresolved related route "${route}"`);
      }
    }
  }

  const expectedRouteCount =
    expectedSlugs.length + // /tools/:slug
    expectedSlugs.length + // /tools/:slug/how-to
    expectedSlugs.length + // /tools/:slug/privacy
    expectedSlugs.length + // /tools/:slug/troubleshooting
    expectedSlugs.length * 3 + // use-cases
    expectedSlugs.length * 3 + // faq
    3; // collections
  if (expectedRouteCount < 100) {
    errors.push(`tools route scaffold unexpectedly small (${expectedRouteCount})`);
  }

  if (errors.length) {
    globalThis.console.error("Tools content validation failed:");
    for (const error of errors) globalThis.console.error(`- ${error}`);
    process.exit(1);
  }

  globalThis.console.log(
    `Tools content validation passed (${expectedSlugs.length} tools, ${expectedRouteCount} derived routes).`,
  );
}

main();
