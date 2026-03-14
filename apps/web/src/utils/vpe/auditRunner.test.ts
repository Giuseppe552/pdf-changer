import { describe, it, expect, vi, beforeEach } from "vitest";
import { runAudited } from "./auditRunner";
import * as webrtcModule from "./patchWebRTC";

// Mock browser APIs for node test environment
const perfEntries: PerformanceResourceTiming[] = [];

vi.stubGlobal("performance", {
  now: () => Date.now(),
  clearResourceTimings: () => {
    perfEntries.length = 0;
  },
  getEntriesByType: () => perfEntries,
});

vi.stubGlobal(
  "PerformanceObserver",
  class {
    observe() {}
    disconnect() {}
  },
);

vi.stubGlobal(
  "MutationObserver",
  class {
    observe() {}
    disconnect() {}
  },
);

// Mock document for CSP listener and meta tag query
vi.stubGlobal("document", {
  addEventListener: () => {},
  removeEventListener: () => {},
  querySelector: () => null,
  documentElement: {},
});

// Mock crypto.subtle for sha256
vi.stubGlobal("crypto", {
  subtle: {
    async digest(_algo: string, data: ArrayBuffer) {
      // Simple deterministic hash mock — just return first 32 bytes padded
      const input = new Uint8Array(data);
      const out = new Uint8Array(32);
      for (let i = 0; i < Math.min(input.length, 32); i++) {
        out[i] = input[i];
      }
      return out.buffer;
    },
  },
});

describe("auditRunner", () => {
  beforeEach(() => {
    webrtcModule.restoreWebRTC();
  });

  it("returns clean verdict with zero events for a no-op processFn", async () => {
    const inputBytes = new Uint8Array([1, 2, 3]);
    const { result, report } = await runAudited({
      toolName: "test-tool",
      inputBytes,
      processFn: async (bytes) => ({ outputBytes: new Uint8Array(bytes) }),
    });

    expect(result.outputBytes).toEqual(inputBytes);
    expect(report.verdict).toBe("clean");
    expect(report.events).toHaveLength(0);
    expect(report.toolName).toBe("test-tool");
    expect(report.inputSizeBytes).toBe(3);
    expect(report.outputSizeBytes).toBe(3);
    expect(report.inputSha256Hex).toHaveLength(64);
    expect(report.outputSha256Hex).toHaveLength(64);
    expect(report.durationMs).toBeGreaterThanOrEqual(0);
    expect(report.webrtcPatched).toBe(true);
    expect(report.monitors).toEqual(["performance", "csp", "dom"]);
  });

  it("reports correct output size", async () => {
    const inputBytes = new Uint8Array([1, 2, 3]);
    const { report } = await runAudited({
      toolName: "test",
      inputBytes,
      processFn: async () => ({ outputBytes: new Uint8Array(10) }),
    });

    expect(report.inputSizeBytes).toBe(3);
    expect(report.outputSizeBytes).toBe(10);
  });

  it("restores WebRTC after processing", async () => {
    const patchSpy = vi.spyOn(webrtcModule, "patchWebRTC");
    const restoreSpy = vi.spyOn(webrtcModule, "restoreWebRTC");

    await runAudited({
      toolName: "test",
      inputBytes: new Uint8Array([1]),
      processFn: async (bytes) => ({ outputBytes: bytes }),
    });

    expect(patchSpy).toHaveBeenCalled();
    expect(restoreSpy).toHaveBeenCalled();
  });

  it("cleans up and re-throws on processFn error", async () => {
    const restoreSpy = vi.spyOn(webrtcModule, "restoreWebRTC");

    await expect(
      runAudited({
        toolName: "test",
        inputBytes: new Uint8Array([1]),
        processFn: async () => {
          throw new Error("processing failed");
        },
      }),
    ).rejects.toThrow("processing failed");

    expect(restoreSpy).toHaveBeenCalled();
  });
});
