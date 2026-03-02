import { describe, expect, it } from "vitest";
import { parseSecurityMarkdown, slugToSecurityTitle } from "./frontmatter";

describe("parseSecurityMarkdown", () => {
  it("parses security frontmatter and strips top heading", () => {
    const raw = `---
title: Example Title
summary: Example summary
audience: [office-workers, whistleblowers]
riskLevel: high
difficulty: advanced
lastReviewed: 2026-02-20
tags: [opsec, pdf]
estimatedMinutes: 9
---
# Example H1

Body paragraph.
`;

    const parsed = parseSecurityMarkdown(raw);
    expect(parsed.frontmatter.title).toBe("Example Title");
    expect(parsed.frontmatter.summary).toBe("Example summary");
    expect(parsed.frontmatter.audience).toEqual([
      "office-workers",
      "whistleblowers",
    ]);
    expect(parsed.frontmatter.riskLevel).toBe("high");
    expect(parsed.frontmatter.difficulty).toBe("advanced");
    expect(parsed.frontmatter.lastReviewed).toBe("2026-02-20");
    expect(parsed.frontmatter.tags).toEqual(["opsec", "pdf"]);
    expect(parsed.frontmatter.estimatedMinutes).toBe(9);
    expect(parsed.titleFromBody).toBe("Example H1");
    expect(parsed.body).toContain("Body paragraph.");
  });
});

describe("slugToSecurityTitle", () => {
  it("preserves common security acronyms", () => {
    expect(slugToSecurityTitle("pdf-opsec-vpn-basics")).toBe(
      "PDF OPSEC VPN Basics",
    );
  });
});

