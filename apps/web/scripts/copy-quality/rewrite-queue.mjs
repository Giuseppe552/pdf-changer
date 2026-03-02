#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { runCopyQualityAudit } from "../audit-copy-quality.mjs";

const REPORT_ROOT = path.join("reports", "copy-quality");

const SEVERITY_RANK = {
  critical: 4,
  bullshit: 3,
  shit: 2,
  "fuck-off": 1,
};

const ISSUE_RECOMMENDATIONS = {
  "unsupported-trust-claim":
    "Replace claim with mechanism-backed statement and add explicit limits.",
  "feature-availability-mismatch":
    "Align wording with tool status; remove GA language for beta/coming-soon routes.",
  "future-promise-without-contract":
    "Attach date/status/milestone or remove promise language.",
  "placeholder-scaffold-copy":
    "Replace placeholder values with real data or remove block until data exists.",
  "non-actionable-paragraph":
    "Split paragraph into concise actions and concrete outcomes.",
  "repetition-template-echo":
    "Rewrite this route with route-specific examples and constraints.",
  "jargon-without-definition":
    "Define the term in plain language on first mention.",
  "weak-cta-utility":
    "Rewrite CTA to include user outcome (what changes after click).",
};

const CORE_ROUTE_PRIORITY = new Set([
  "/",
  "/tools",
  "/scrub",
  "/pricing",
  "/security",
  "/donate",
  "/account",
]);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readLatestReport(root) {
  const reportPath = path.join(root, REPORT_ROOT, "latest.json");
  if (fs.existsSync(reportPath)) {
    return JSON.parse(fs.readFileSync(reportPath, "utf8"));
  }
  return runCopyQualityAudit({ root, writeFiles: true }).report;
}

function compareFindings(a, b) {
  const severityDiff = (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0);
  if (severityDiff !== 0) return severityDiff;
  const coreDiff = Number(CORE_ROUTE_PRIORITY.has(b.route)) - Number(CORE_ROUTE_PRIORITY.has(a.route));
  if (coreDiff !== 0) return coreDiff;
  const routeDiff = String(a.route).localeCompare(String(b.route));
  if (routeDiff !== 0) return routeDiff;
  return String(a.issueType).localeCompare(String(b.issueType));
}

function buildQueue(report) {
  return report.findings
    .map((finding, index) => ({
      id: `rq-${index + 1}`,
      severity: finding.severity,
      issueType: finding.issueType,
      route: finding.route,
      routeType: finding.routeType,
      file: finding.file,
      line: finding.line,
      message: finding.message,
      recommendation:
        ISSUE_RECOMMENDATIONS[finding.issueType] ??
        "Rewrite for concrete behavior, boundaries, and clear next action.",
    }))
    .sort(compareFindings);
}

function renderMarkdown(queue) {
  const lines = [
    "# Copy Rewrite Queue",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "| Priority | Severity | Route | Issue | Recommendation |",
    "| --- | --- | --- | --- | --- |",
  ];
  queue.forEach((item, index) => {
    lines.push(
      `| ${index + 1} | ${item.severity} | ${item.route} | ${item.issueType} | ${item.recommendation} |`,
    );
  });
  lines.push("");
  return lines.join("\n");
}

function main() {
  const root = process.cwd();
  const report = readLatestReport(root);
  const queue = buildQueue(report);
  const outputRoot = path.join(root, REPORT_ROOT);
  ensureDir(outputRoot);

  const jsonPath = path.join(outputRoot, "rewrite-queue.json");
  const markdownPath = path.join(outputRoot, "rewrite-queue.md");

  fs.writeFileSync(jsonPath, `${JSON.stringify(queue, null, 2)}\n`, "utf8");
  fs.writeFileSync(markdownPath, renderMarkdown(queue), "utf8");

  globalThis.console.log(
    `Rewrite queue generated (${queue.length} items): ${jsonPath}, ${markdownPath}`,
  );
}

main();

