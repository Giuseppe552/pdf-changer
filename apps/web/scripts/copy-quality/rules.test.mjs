import { describe, expect, it } from "vitest";
import { analyzeCopyQuality } from "./rules.mjs";

function makeUnit(overrides = {}) {
  return {
    id: "u1",
    file: "src/ui/pages/LandingPage.tsx",
    sourceType: "ui-page",
    route: "/",
    routeType: "hub",
    cluster: "core",
    text: "Default copy block.",
    line: 1,
    column: 1,
    section: "test",
    ...overrides,
  };
}

function analyze(units, toolStatusBySlug = {}) {
  return analyzeCopyQuality({
    generatedAt: "2026-02-20T00:00:00Z",
    root: "/repo/apps/web",
    scannedFiles: 1,
    units,
    toolStatusBySlug,
  });
}

describe("copy-quality rules", () => {
  it("flags unsupported trust claim when mechanism is missing", () => {
    const report = analyze([
      makeUnit({
        route: "/tools",
        routeType: "transactional",
        cluster: "tools-app",
        text: "This tool is secure and private for everyone.",
      }),
    ]);
    expect(
      report.findings.some(
        (finding) => finding.issueType === "unsupported-trust-claim",
      ),
    ).toBe(true);
  });

  it("does not flag supported trust claim when mechanism is present", () => {
    const report = analyze([
      makeUnit({
        route: "/tools",
        routeType: "transactional",
        cluster: "tools-app",
        text: "This tool is private because processing stays on-device with hash verification.",
      }),
    ]);
    expect(
      report.findings.some(
        (finding) => finding.issueType === "unsupported-trust-claim",
      ),
    ).toBe(false);
  });

  it("flags future promise without contract details", () => {
    const report = analyze([
      makeUnit({
        route: "/tools",
        routeType: "transactional",
        cluster: "tools-app",
        text: "Batch workflow support is planned for the future.",
      }),
    ]);
    expect(
      report.findings.some(
        (finding) => finding.issueType === "future-promise-without-contract",
      ),
    ).toBe(true);
  });

  it("flags placeholder scaffold copy", () => {
    const report = analyze([
      makeUnit({
        route: "/donate/transparency",
        routeType: "support",
        cluster: "donate",
        text: "Latest sample report (placeholder).",
      }),
    ]);
    expect(
      report.findings.some(
        (finding) => finding.issueType === "placeholder-scaffold-copy",
      ),
    ).toBe(true);
  });

  it("flags feature availability mismatch for non-GA tool copy", () => {
    const report = analyze(
      [
        makeUnit({
          route: "/tools/protect",
          routeType: "transactional",
          cluster: "tools-app",
          text: "This route is fully functional and available now.",
        }),
      ],
      { protect: "coming-soon" },
    );
    expect(
      report.findings.some(
        (finding) => finding.issueType === "feature-availability-mismatch",
      ),
    ).toBe(true);
  });

  it("flags jargon without plain definition in non-technical contexts", () => {
    const report = analyze([
      makeUnit({
        route: "/security/non-technical/safe-pdf-handling-basics",
        routeType: "article",
        cluster: "security",
        text: "Use OPSEC every time before document sharing.",
      }),
    ]);
    expect(
      report.findings.some(
        (finding) => finding.issueType === "jargon-without-definition",
      ),
    ).toBe(true);
  });

  it("flags repetition/template echo for highly similar route copy", () => {
    const shared =
      "This route provides local processing, clear boundaries, and practical steps for document sharing workflows with repeated language that should trigger similarity detection over time.";
    const report = analyze([
      makeUnit({
        id: "u-a",
        route: "/blog/basics/a",
        routeType: "article",
        cluster: "blog",
        text: `${shared} Additional sentence with the same wording to force high similarity and keep the token set nearly identical across both route copies.`,
      }),
      makeUnit({
        id: "u-b",
        route: "/blog/basics/b",
        routeType: "article",
        cluster: "blog",
        text: `${shared} Additional sentence with the same wording to force high similarity and keep the token set nearly identical across both route copies.`,
      }),
    ]);
    expect(
      report.findings.some(
        (finding) => finding.issueType === "repetition-template-echo",
      ),
    ).toBe(true);
  });
});
