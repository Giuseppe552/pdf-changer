import { describe, it, expect, beforeEach, vi } from "vitest";
import { patchWebRTC, restoreWebRTC, isWebRTCPatched } from "./patchWebRTC";

// Provide a fake RTCPeerConnection for the test environment
const FakeRTC = class {} as unknown as typeof RTCPeerConnection;

describe("patchWebRTC", () => {
  beforeEach(() => {
    restoreWebRTC();
    vi.stubGlobal("RTCPeerConnection", FakeRTC);
    (globalThis as Record<string, unknown>).webkitRTCPeerConnection = FakeRTC;
  });

  it("patches RTCPeerConnection to undefined", () => {
    patchWebRTC();
    expect(globalThis.RTCPeerConnection).toBeUndefined();
    expect(
      (globalThis as Record<string, unknown>).webkitRTCPeerConnection,
    ).toBeUndefined();
    expect(isWebRTCPatched()).toBe(true);
  });

  it("restores the original after restore", () => {
    patchWebRTC();
    restoreWebRTC();
    expect(globalThis.RTCPeerConnection).toBe(FakeRTC);
    expect(
      (globalThis as Record<string, unknown>).webkitRTCPeerConnection,
    ).toBe(FakeRTC);
    expect(isWebRTCPatched()).toBe(false);
  });

  it("calling patch twice does not lose the original", () => {
    patchWebRTC();
    patchWebRTC(); // second call should be a no-op
    restoreWebRTC();
    expect(globalThis.RTCPeerConnection).toBe(FakeRTC);
  });

  it("restore is a no-op when not patched", () => {
    restoreWebRTC();
    expect(globalThis.RTCPeerConnection).toBe(FakeRTC);
    expect(isWebRTCPatched()).toBe(false);
  });
});
