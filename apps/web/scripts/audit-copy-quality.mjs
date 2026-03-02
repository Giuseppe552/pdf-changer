#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { extractCopy } from "./copy-quality/extract-copy.mjs";
import { analyzeCopyQuality, formatSeverityCounts } from "./copy-quality/rules.mjs";

const REPORT_DIR = ["reports", "copy-quality"];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function csvEscape(value) {
  const str = String(value ?? "");
  if (!/[,"\n]/.test(str)) return str;
  return `"${str.replace(/"/g, '""')}"`;
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function writeText(filePath, data) {
  fs.writeFileSync(filePath, data, "utf8");
}

function renderMarkdown(report) {
  const lines = [
    "# Copy Quality Audit",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Files scanned: ${report.scannedFiles}`,
    `- Text units: ${report.unitCount}`,
    `- Pages scored: ${report.summary.pageCount}`,
    `- Findings: ${report.summary.findingCount}`,
    `- Severity counts: ${formatSeverityCounts(report.summary.severityCounts)}`,
    "",
    "## Top Findings",
    "",
    "| Severity | Issue | Route | Location | Message |",
    "| --- | --- | --- | --- | --- |",
  ];

  const topFindings = report.findings.slice(0, 40);
  for (const finding of topFindings) {
    const location = finding.file
      ? `${finding.file}:${finding.line ?? 0}`
      : "route-level";
    lines.push(
      `| ${finding.severity} | ${finding.issueType} | ${finding.route} | ${location} | ${finding.message.replace(/\|/g, "\\|")} |`,
    );
  }

  lines.push("", "## Page Scorecards", "", "| Route | Type | Score | Claims | Evidence Ratio | Actionable Ratio | Repetition Max |");
  lines.push("| --- | --- | ---: | ---: | ---: | ---: | ---: |");
  for (const page of report.pages) {
    const evidenceRatio =
      page.claimCount > 0 ? page.evidenceBackedClaimCount / page.claimCount : 1;
    lines.push(
      `| ${page.route} | ${page.routeType} | ${page.score.toFixed(1)} | ${page.claimCount} | ${formatPercent(evidenceRatio)} | ${formatPercent(page.actionableSentenceRatio)} | ${page.repetitionSimilarityMax.toFixed(2)} |`,
    );
  }

  lines.push("");
  return lines.join("\n");
}

function renderCsv(report) {
  const rows = [
    [
      "route",
      "routeType",
      "cluster",
      "score",
      "claimCount",
      "evidenceBackedClaimCount",
      "evidenceRatio",
      "actionableSentenceRatio",
      "repetitionSimilarityMax",
      "repetitionPeerRoute",
      "criticalCount",
      "bullshitCount",
      "shitCount",
      "fuckOffCount",
    ],
  ];

  for (const page of report.pages) {
    const evidenceRatio =
      page.claimCount > 0 ? page.evidenceBackedClaimCount / page.claimCount : 1;
    rows.push([
      page.route,
      page.routeType,
      page.cluster,
      page.score.toFixed(2),
      page.claimCount,
      page.evidenceBackedClaimCount,
      evidenceRatio.toFixed(4),
      page.actionableSentenceRatio.toFixed(4),
      page.repetitionSimilarityMax.toFixed(4),
      page.repetitionPeerRoute ?? "",
      page.severityCounts.critical,
      page.severityCounts.bullshit,
      page.severityCounts.shit,
      page.severityCounts["fuck-off"],
    ]);
  }

  return `${rows.map((row) => row.map(csvEscape).join(",")).join("\n")}\n`;
}

export function runCopyQualityAudit({ root = process.cwd(), writeFiles = true } = {}) {
  const extraction = extractCopy({ root });
  const report = analyzeCopyQuality(extraction);
  const reportRoot = path.join(root, ...REPORT_DIR);
  const files = {
    json: path.join(reportRoot, "latest.json"),
    markdown: path.join(reportRoot, "latest.md"),
    csv: path.join(reportRoot, "summary.csv"),
  };

  if (writeFiles) {
    ensureDir(reportRoot);
    writeJson(files.json, report);
    writeText(files.markdown, renderMarkdown(report));
    writeText(files.csv, renderCsv(report));
  }

  return { report, files };
}

function main() {
  const root = process.cwd();
  const { report, files } = runCopyQualityAudit({ root, writeFiles: true });
  globalThis.console.log(
    `Copy quality audit complete: ${report.summary.findingCount} findings across ${report.summary.pageCount} pages.`,
  );
  globalThis.console.log(`Severity: ${formatSeverityCounts(report.summary.severityCounts)}`);
  globalThis.console.log(`Report files: ${files.json}, ${files.markdown}, ${files.csv}`);
}

const scriptPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const modulePath = fileURLToPath(import.meta.url);
if (scriptPath && modulePath && scriptPath === modulePath) {
  main();
}
