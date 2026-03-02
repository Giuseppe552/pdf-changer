import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { canUseTool, incrementToolUse, usageSnapshot } from "./usageV2";

function monthKey(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function mockStorage() {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => {
      data.clear();
    },
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    get length() {
      return data.size;
    },
  };
  vi.stubGlobal("localStorage", storage);
  return data;
}

const guestMe = {
  authenticated: false as const,
  plan: "guest" as const,
  entitlementExpiresAt: null,
  entitlementToken: null,
};

const freeMe = {
  authenticated: true as const,
  plan: "free" as const,
  entitlementExpiresAt: null,
  entitlementToken: null,
};

describe("usageV2", () => {
  beforeEach(() => {
    mockStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("applies guest monthly total cap", () => {
    for (let i = 0; i < 40; i++) {
      expect(canUseTool(guestMe, "merge")).toBe(true);
      incrementToolUse(guestMe, "merge");
    }
    expect(canUseTool(guestMe, "merge")).toBe(false);
    const snapshot = usageSnapshot(guestMe, "merge");
    expect(snapshot.used.total).toBe(40);
    expect(snapshot.remaining.total).toBe(0);
  });

  it("applies free heavy bucket cap", () => {
    for (let i = 0; i < 150; i++) {
      expect(canUseTool(freeMe, "compress")).toBe(true);
      incrementToolUse(freeMe, "compress");
    }
    expect(canUseTool(freeMe, "compress")).toBe(false);
    expect(canUseTool(freeMe, "merge")).toBe(true);
  });

  it("migrates legacy scrub counters once", () => {
    const currentMonth = monthKey();
    localStorage.setItem("pdfchanger.usage.guestScrubsUsed.v1", "7");
    localStorage.setItem(`pdfchanger.usage.freeScrubsUsed.v1.${currentMonth}`, "9");
    const snapshot = usageSnapshot(guestMe, "scrub");
    expect(snapshot.used.tool).toBe(9);
    expect(snapshot.used.total).toBe(9);

    // second call should not duplicate migration
    const next = usageSnapshot(guestMe, "scrub");
    expect(next.used.tool).toBe(9);
    expect(next.used.total).toBe(9);
  });
});

