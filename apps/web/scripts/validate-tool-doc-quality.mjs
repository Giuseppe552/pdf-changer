#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const TOOL_REGISTRY_PATH = path.join(ROOT, "src", "content", "tools", "toolRegistry.ts");
const TOOL_EDITORIAL_PATH = path.join(ROOT, "src", "content", "tools", "toolEditorial.json");

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

function normalizeTokens(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function jaccardSimilarity(aText, bText) {
  const a = new Set(normalizeTokens(aText));
  const b = new Set(normalizeTokens(bText));
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function main() {
  const errors = [];

  if (!fs.existsSync(TOOL_REGISTRY_PATH)) {
    errors.push(`Missing tool registry: ${TOOL_REGISTRY_PATH}`);
  }
  if (!fs.existsSync(TOOL_EDITORIAL_PATH)) {
    errors.push(`Missing tool editorial data: ${TOOL_EDITORIAL_PATH}`);
  }
  if (errors.length) {
    globalThis.console.error("Tool doc quality validation failed:");
    for (const error of errors) globalThis.console.error(`- ${error}`);
    process.exit(1);
  }

  const registryRaw = fs.readFileSync(TOOL_REGISTRY_PATH, "utf8");
  const blocks = parseRegistryBlocks(registryRaw);
  const slugs = blocks
    .map((block) => getField(block, "slug"))
    .filter(Boolean);

  const editorial = JSON.parse(fs.readFileSync(TOOL_EDITORIAL_PATH, "utf8"));

  for (const slug of slugs) {
    const entry = editorial[slug];
    if (!entry) {
      errors.push(`${slug}: missing editorial block`);
      continue;
    }

    const stepCount = Array.isArray(entry.howToSteps) ? entry.howToSteps.length : 0;
    const tipCount = Array.isArray(entry.tips) ? entry.tips.length : 0;
    const limitCount = Array.isArray(entry.limitations) ? entry.limitations.length : 0;
    const troubleCount = Array.isArray(entry.troubleshooting)
      ? entry.troubleshooting.length
      : 0;

    if (stepCount < 3) errors.push(`${slug}: need at least 3 how-to steps`);
    if (tipCount < 2) errors.push(`${slug}: need at least 2 tips`);
    if (limitCount < 2) errors.push(`${slug}: need at least 2 limitations`);
    if (troubleCount < 2) errors.push(`${slug}: need at least 2 troubleshooting notes`);

    for (const useCase of ["office-daily", "secure-sharing", "high-volume"]) {
      if (!entry.useCases?.[useCase]) {
        errors.push(`${slug}: missing use case copy for ${useCase}`);
      }
    }
    for (const faq of ["what-it-does", "data-safety", "limitations"]) {
      if (!entry.faq?.[faq]) {
        errors.push(`${slug}: missing faq copy for ${faq}`);
      }
    }

    const combined = [
      ...(entry.howToSteps ?? []),
      ...(entry.tips ?? []),
      ...(entry.limitations ?? []),
      ...(entry.troubleshooting ?? []),
      ...Object.values(entry.useCases ?? {}),
      ...Object.values(entry.faq ?? {}),
    ].join(" ");
    if (combined.trim().split(/\s+/).length < 90) {
      errors.push(`${slug}: editorial copy too thin (< 90 words)`);
    }
  }

  const combinedBySlug = Object.fromEntries(
    slugs.map((slug) => {
      const entry = editorial[slug] ?? {};
      const text = [
        ...(entry.howToSteps ?? []),
        ...(entry.tips ?? []),
        ...(entry.limitations ?? []),
        ...(entry.troubleshooting ?? []),
        ...Object.values(entry.useCases ?? {}),
        ...Object.values(entry.faq ?? {}),
      ].join(" ");
      return [slug, text];
    }),
  );

  for (let i = 0; i < slugs.length; i++) {
    for (let j = i + 1; j < slugs.length; j++) {
      const a = slugs[i];
      const b = slugs[j];
      const similarity = jaccardSimilarity(combinedBySlug[a], combinedBySlug[b]);
      if (similarity > 0.74) {
        errors.push(`${a}/${b}: editorial similarity too high (${similarity.toFixed(2)})`);
      }
    }
  }

  if (errors.length) {
    globalThis.console.error("Tool doc quality validation failed:");
    for (const error of errors) globalThis.console.error(`- ${error}`);
    process.exit(1);
  }

  globalThis.console.log(`Tool doc quality validation passed (${slugs.length} tools).`);
}

main();
