#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const assetsDir = path.join(root, "dist", "assets");

const budgets = [
  { label: "entry-css", pattern: /^index-.*\.css$/, maxBytes: 80_000 },
  { label: "entry-js", pattern: /^index-.*\.js$/, maxBytes: 300_000 },
  { label: "scrubber-route", pattern: /^ScrubberPage-.*\.js$/, maxBytes: 520_000 },
  { label: "tools-hub-route", pattern: /^ToolsHubPage-.*\.js$/, maxBytes: 120_000 },
  { label: "tool-doc-route", pattern: /^ToolDocPage-.*\.js$/, maxBytes: 90_000 },
  { label: "flatten-route", pattern: /^FlattenToolPage-.*\.js$/, maxBytes: 15_000 },
  { label: "redact-route", pattern: /^RedactToolPage-.*\.js$/, maxBytes: 30_000 },
  { label: "pipeline-route", pattern: /^PipelineToolPage-.*\.js$/, maxBytes: 20_000 },
  { label: "pdfjs-worker", pattern: /^pdf\.worker\.min-.*\.mjs$/, maxBytes: 1_500_000 },
  { label: "rotate-route", pattern: /^RotateToolPage-.*\.js$/, maxBytes: 10_000 },
  { label: "crop-route", pattern: /^CropToolPage-.*\.js$/, maxBytes: 12_000 },
  { label: "sign-route", pattern: /^SignToolPage-.*\.js$/, maxBytes: 18_000 },
  { label: "fill-form-route", pattern: /^FillFormToolPage-.*\.js$/, maxBytes: 20_000 },
  { label: "ocr-route", pattern: /^OcrToolPage-.*\.js$/, maxBytes: 25_000 },
];

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

if (!fs.existsSync(assetsDir)) {
  globalThis.console.error(`Bundle budget check failed: missing ${assetsDir}`);
  process.exit(1);
}

const files = fs.readdirSync(assetsDir);
const errors = [];

for (const budget of budgets) {
  const match = files.find((file) => budget.pattern.test(file));
  if (!match) {
    errors.push(`${budget.label}: missing bundle matching ${budget.pattern}`);
    continue;
  }
  const fullPath = path.join(assetsDir, match);
  const size = fs.statSync(fullPath).size;
  if (size > budget.maxBytes) {
    errors.push(
      `${budget.label}: ${match} is ${formatSize(size)} (max ${formatSize(budget.maxBytes)})`,
    );
    continue;
  }
  globalThis.console.log(
    `✓ ${budget.label}: ${match} ${formatSize(size)} / ${formatSize(budget.maxBytes)}`,
  );
}

if (errors.length) {
  globalThis.console.error("Bundle budget check failed:");
  for (const error of errors) {
    globalThis.console.error(`- ${error}`);
  }
  process.exit(1);
}

globalThis.console.log("Bundle budget check passed.");
