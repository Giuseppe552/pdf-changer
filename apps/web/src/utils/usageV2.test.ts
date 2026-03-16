import { describe, expect, it } from "vitest";
import { canUseTool, usageSnapshot, incrementToolUse, usageStatusText } from "./usageV2";

describe("usageV2 (free model)", () => {
  const guest = { authenticated: false as const, plan: "guest" as const, entitlementExpiresAt: null, entitlementToken: null };

  it("canUseTool returns true for enabled tools", () => {
    expect(canUseTool(guest, "scrub")).toBe(true);
    expect(canUseTool(guest, "merge")).toBe(true);
  });

  it("incrementToolUse is a no-op", () => {
    incrementToolUse(guest, "scrub");
  });

  it("usageSnapshot returns no limits", () => {
    const snap = usageSnapshot(guest);
    expect(snap.limits.total).toBeNull();
    expect(snap.limits.heavy).toBeNull();
  });

  it("status text says free", () => {
    expect(usageStatusText(guest)).toContain("free");
  });
});
