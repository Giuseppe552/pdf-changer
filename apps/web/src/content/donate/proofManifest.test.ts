import { describe, expect, it } from "vitest";
import { parseDonateProofArchive, parseDonateProofManifestV1 } from "./proofManifest";

describe("parseDonateProofManifestV1", () => {
  it("accepts a valid v1 manifest", () => {
    const parsed = parseDonateProofManifestV1({
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
      revoked: false,
    });

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.key.fingerprint).toBe("9A6E8E58D9D5F39E3FAE6F53A4C71C62C5B5E941");
    }
  });

  it("rejects revoked manifest without reason", () => {
    const parsed = parseDonateProofManifestV1({
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
      revoked: true,
    });

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.issues.join(" ")).toContain("revocationReason");
    }
  });

  it("rejects invalid fingerprint format", () => {
    const parsed = parseDonateProofManifestV1({
      version: "v1",
      proofId: "2026-03-01-main",
      publishedAt: "2026-03-01T00:00:00Z",
      validFrom: "2026-03-01T00:00:00Z",
      key: {
        fingerprint: "badfingerprint",
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
    });

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.issues.join(" ")).toContain("fingerprint");
    }
  });
});

describe("parseDonateProofArchive", () => {
  it("accepts valid archive index", () => {
    const parsed = parseDonateProofArchive({
      version: "v1",
      updatedAt: "2026-03-01T00:00:00Z",
      proofs: [
        {
          proofId: "2026-03-01-main",
          manifestPath: "/donate-proof/v1/manifest.v1.json",
          publishedAt: "2026-03-01T00:00:00Z",
          revoked: false,
        },
      ],
      keys: [
        {
          fingerprint: "9A6E8E58D9D5F39E3FAE6F53A4C71C62C5B5E941",
          keyId: "A4C71C62C5B5E941",
          path: "/donate-proof/v1/signing-key.asc",
          firstSeenAt: "2026-02-20T00:00:00Z",
          status: "active",
        },
      ],
    });

    expect(parsed.ok).toBe(true);
  });
});
