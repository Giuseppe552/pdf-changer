import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadDonateProofArchive,
  loadDonateProofManifest,
  outcomeFromFileChecks,
  sha256Hex,
  type ProofFileVerification,
} from "./proofLoader";

function mockFetch(response: {
  ok: boolean;
  status: number;
  json?: unknown;
}) {
  const fn = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status,
    json: vi.fn().mockResolvedValue(response.json),
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadDonateProofManifest", () => {
  it("returns missing for 404", async () => {
    mockFetch({ ok: false, status: 404 });
    const result = await loadDonateProofManifest("/donate-proof/v1/manifest.v1.json");
    expect(result.status).toBe("missing");
  });

  it("returns invalid for malformed manifest", async () => {
    mockFetch({
      ok: true,
      status: 200,
      json: { version: "v1", proofId: "bad" },
    });
    const result = await loadDonateProofManifest("/donate-proof/v1/manifest.v1.json");
    expect(result.status).toBe("invalid");
  });

  it("returns invalid when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const result = await loadDonateProofManifest("/donate-proof/v1/manifest.v1.json");
    expect(result.status).toBe("invalid");
  });

  it("returns ok for valid manifest", async () => {
    mockFetch({
      ok: true,
      status: 200,
      json: {
        version: "v1",
        proofId: "2026-03-01-main",
        publishedAt: "2026-03-01T00:00:00Z",
        validFrom: "2026-03-01T00:00:00Z",
        key: {
          fingerprint: "9A6E8E58D9D5F39E3FAE6F53A4C71C62C5B5E941",
          keyId: "A4C71C62C5B5E941",
          algorithm: "RSA-4096",
          firstSeenAt: "2026-02-20T00:00:00Z",
        },
        files: [
          {
            path: "/donate-proof/v1/addresses.txt",
            sha256: "e53a0a753807fc5fea896b0525d70fca05ca04b7a24634f89c57c8037c2ea0fc",
            sizeBytes: 736,
          },
        ],
        addresses: [
          {
            network: "Bitcoin",
            symbol: "BTC",
            address: "bc1qpdfchangerexample8h4x4n7qk0r6xw2f6f0p7m3q9a",
          },
        ],
      },
    });
    const result = await loadDonateProofManifest("/donate-proof/v1/manifest.v1.json");
    expect(result.status).toBe("ok");
  });
});

describe("loadDonateProofArchive", () => {
  it("returns invalid when archive shape is wrong", async () => {
    mockFetch({
      ok: true,
      status: 200,
      json: {
        version: "v1",
        updatedAt: "2026-03-01T00:00:00Z",
        proofs: [],
      },
    });
    const result = await loadDonateProofArchive("/donate-proof/archive/index.json");
    expect(result.status).toBe("invalid");
  });
});

describe("outcomeFromFileChecks", () => {
  it("returns pass only when all file checks pass", () => {
    const checks: ProofFileVerification[] = [
      {
        path: "/one",
        expectedSha256: "a",
        actualSha256: "a",
        expectedSizeBytes: 1,
        actualSizeBytes: 1,
        status: "pass",
      },
    ];
    expect(outcomeFromFileChecks(checks)).toBe("pass");
  });

  it("returns fail when any file check fails", () => {
    const checks: ProofFileVerification[] = [
      {
        path: "/one",
        expectedSha256: "a",
        actualSha256: null,
        expectedSizeBytes: 1,
        actualSizeBytes: null,
        status: "missing",
      },
    ];
    expect(outcomeFromFileChecks(checks)).toBe("fail");
  });
});

describe("sha256Hex", () => {
  it("computes deterministic hash", async () => {
    const text = new TextEncoder().encode("pdf-changer");
    const digest = await sha256Hex(text);
    expect(digest).toBe("2dc119adc423311870bbdf5ae17b20c3550f936ce2991e365a6dab862e873128");
  });
});
