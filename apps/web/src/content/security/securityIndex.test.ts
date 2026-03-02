import { describe, expect, it } from "vitest";
import {
  buildSecurityMetaFromRaw,
  loadSecurityEntry,
  loadSecurityPolicyEntry,
  parseSecurityKey,
} from "./securityIndex";

describe("parseSecurityKey", () => {
  it("parses nested section + slug key", () => {
    expect(parseSecurityKey("./technical/threat-modeling-workflow.md")).toEqual({
      section: "technical",
      slug: "threat-modeling-workflow",
    });
    expect(parseSecurityKey("./invalid/key.md")).toBeNull();
  });
});

describe("buildSecurityMetaFromRaw", () => {
  it("builds normalized security metadata", () => {
    const meta = buildSecurityMetaFromRaw(
      {
        section: "technical",
        slug: "network-model-limits",
        route: "/security/technical/network-model-limits",
        key: "./technical/network-model-limits.md",
      },
      `---
title: Network Model Limits
summary: Security summary
audience: [teams, journalists]
riskLevel: high
difficulty: advanced
lastReviewed: 2026-02-20
tags: [network, opsec]
estimatedMinutes: 8
---
# Network Model Limits

## What this does not protect
Text.
`,
    );

    expect(meta.title).toBe("Network Model Limits");
    expect(meta.track).toBe("technical");
    expect(meta.riskLevel).toBe("high");
    expect(meta.difficulty).toBe("advanced");
    expect(meta.audience).toEqual(["teams", "journalists"]);
    expect(meta.lastReviewed).toBe("2026-02-20");
    expect(meta.estimatedMinutes).toBe(8);
  });
});

describe("security content loaders", () => {
  it("loads a known security article by track and slug", async () => {
    const entry = await loadSecurityEntry("non-technical", "safe-pdf-handling-basics");
    expect(entry).not.toBeNull();
    expect(entry?.meta.route).toBe("/security/non-technical/safe-pdf-handling-basics");
  });

  it("returns null for an unknown security slug", async () => {
    const entry = await loadSecurityEntry("technical", "does-not-exist");
    expect(entry).toBeNull();
  });

  it("loads the policy entry", async () => {
    const entry = await loadSecurityPolicyEntry();
    expect(entry).not.toBeNull();
    expect(entry?.meta.section).toBe("policy");
    expect(entry?.meta.route).toBe("/security/policy");
  });
});
