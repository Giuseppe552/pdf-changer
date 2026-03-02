import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateCopyQualityReport } from "../validate-copy-quality.mjs";

function makePage(overrides = {}) {
  return {
    route: "/",
    routeType: "hub",
    cluster: "core",
    unitCount: 5,
    claimCount: 0,
    evidenceBackedClaimCount: 0,
    actionableSentenceRatio: 1,
    repetitionSimilarityMax: 0,
    repetitionPeerRoute: null,
    severityCounts: {
      critical: 0,
      bullshit: 0,
      shit: 0,
      "fuck-off": 0,
    },
    score: 100,
    ...overrides,
  };
}

function makeReport(overrides = {}) {
  return {
    generatedAt: "2026-02-20T00:00:00Z",
    scannedFiles: 1,
    unitCount: 1,
    summary: {
      findingCount: 0,
      pageCount: 1,
      severityCounts: {
        critical: 0,
        bullshit: 0,
        shit: 0,
        "fuck-off": 0,
      },
      issueCounts: {},
    },
    pages: [makePage()],
    findings: [],
    ...overrides,
  };
}

describe("validateCopyQualityReport", () => {
  it("fails when critical findings exist", () => {
    const report = makeReport({
      findings: [
        {
          issueType: "unsupported-trust-claim",
          severity: "critical",
          route: "/",
        },
      ],
    });
    const errors = validateCopyQualityReport(report);
    expect(errors.some((item) => item.includes("CRITICAL findings"))).toBe(true);
  });

  it("fails claim evidence ratio threshold", () => {
    const report = makeReport({
      pages: [
        makePage({
          route: "/blog/basics/anonymity-101",
          routeType: "article",
          cluster: "blog",
          claimCount: 4,
          evidenceBackedClaimCount: 2,
        }),
      ],
    });
    const errors = validateCopyQualityReport(report);
    expect(errors.some((item) => item.includes("evidence-backed claim ratio"))).toBe(true);
  });

  it("fails transactional actionable ratio threshold", () => {
    const report = makeReport({
      pages: [
        makePage({
          route: "/scrub",
          routeType: "transactional",
          cluster: "core",
          actionableSentenceRatio: 0.2,
        }),
      ],
    });
    const errors = validateCopyQualityReport(report);
    expect(errors.some((item) => item.includes("actionable sentence ratio"))).toBe(true);
  });

  it("fails repetition threshold", () => {
    const report = makeReport({
      pages: [
        makePage({
          route: "/faq/topic/question",
          routeType: "article",
          cluster: "faq",
          repetitionSimilarityMax: 0.81,
          repetitionPeerRoute: "/faq/topic/question-2",
        }),
      ],
    });
    const errors = validateCopyQualityReport(report);
    expect(errors.some((item) => item.includes("repetition similarity"))).toBe(true);
  });

  it("fails core route score threshold", () => {
    const report = makeReport({
      pages: [
        makePage({
          route: "/tools",
          routeType: "transactional",
          cluster: "tools-app",
          score: 70,
        }),
      ],
    });
    const errors = validateCopyQualityReport(report);
    expect(errors.some((item) => item.includes("page score"))).toBe(true);
  });

  it("passes healthy report", () => {
    const report = makeReport({
      pages: [
        makePage({
          route: "/",
          routeType: "hub",
          cluster: "core",
          claimCount: 3,
          evidenceBackedClaimCount: 3,
          actionableSentenceRatio: 0.8,
          score: 95,
        }),
      ],
    });
    const errors = validateCopyQualityReport(report);
    expect(errors).toEqual([]);
  });
});

describe("validate-copy-quality CLI", () => {
  it("fails validation for intentionally bad fixture report", () => {
    const filePath = fileURLToPath(import.meta.url);
    const dir = path.dirname(filePath);
    const fixturePath = path.join(dir, "__fixtures__", "bad-report.json");
    const report = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    const errors = validateCopyQualityReport(report);
    expect(errors.some((item) => item.includes("CRITICAL findings"))).toBe(true);
  });
});
