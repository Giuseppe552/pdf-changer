#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { runCopyQualityAudit } from "./audit-copy-quality.mjs";
import { formatSeverityCounts } from "./copy-quality/rules.mjs";
import { isConcreteRoute } from "./copy-quality/route-map.mjs";

const CORE_ROUTES = new Set([
  "/",
  "/tools",
  "/scrub",
  "/pricing",
  "/security",
  "/donate",
  "/account",
]);

function parseArgs(argv) {
  const args = { reportPath: null };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--report" && argv[index + 1]) {
      args.reportPath = argv[index + 1];
      index += 1;
    }
  }
  return args;
}

function loadReportFromPath(cwd, reportPath) {
  const full = path.resolve(cwd, reportPath);
  if (!fs.existsSync(full)) {
    throw new Error(`Report file not found: ${full}`);
  }
  return JSON.parse(fs.readFileSync(full, "utf8"));
}

export function validateCopyQualityReport(report) {
  const errors = [];

  const criticalFindings = report.findings.filter((finding) => finding.severity === "critical");
  if (criticalFindings.length > 0) {
    errors.push(`CRITICAL findings present (${criticalFindings.length}).`);
  }

  for (const page of report.pages) {
    if (isConcreteRoute(page.route) && page.claimCount >= 4) {
      const ratio =
        page.claimCount > 0 ? page.evidenceBackedClaimCount / page.claimCount : 1;
      if (ratio < 0.85) {
        errors.push(
          `${page.route}: evidence-backed claim ratio ${ratio.toFixed(2)} below 0.85.`,
        );
      }
    }

    if (page.routeType === "transactional" && page.actionableSentenceRatio < 0.45) {
      errors.push(
        `${page.route}: actionable sentence ratio ${page.actionableSentenceRatio.toFixed(2)} below 0.45.`,
      );
    }

    if (isConcreteRoute(page.route) && page.repetitionSimilarityMax > 0.78) {
      errors.push(
        `${page.route}: repetition similarity ${page.repetitionSimilarityMax.toFixed(2)} above 0.78 (peer ${page.repetitionPeerRoute ?? "unknown"}).`,
      );
    }

    if (CORE_ROUTES.has(page.route) && page.score < 78) {
      errors.push(`${page.route}: page score ${page.score.toFixed(1)} below 78.`);
    }
  }

  return errors;
}

export function main() {
  const args = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const report = args.reportPath
    ? loadReportFromPath(cwd, args.reportPath)
    : runCopyQualityAudit({ root: cwd, writeFiles: false }).report;

  const errors = validateCopyQualityReport(report);
  if (errors.length > 0) {
    globalThis.console.error("Copy quality validation failed:");
    for (const error of errors) {
      globalThis.console.error(`- ${error}`);
    }
    process.exit(1);
  }

  globalThis.console.log(
    `Copy quality validation passed (${report.summary.findingCount} findings; ${formatSeverityCounts(report.summary.severityCounts)}).`,
  );
}

const scriptPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const modulePath = fileURLToPath(import.meta.url);
if (scriptPath && modulePath && scriptPath === modulePath) {
  main();
}
