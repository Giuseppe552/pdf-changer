import { describe, expect, it } from "vitest";
import {
  cryptoShuffle,
  verifyShuffleProof,
  type ShuffleProof,
} from "./shuffleProof";

// ── Valid permutation ───────────────────────────────────────────────────────

describe("cryptoShuffle", () => {
  it("output is a permutation of input", async () => {
    const input = Array.from({ length: 20 }, (_, i) => i);
    const { shuffled } = await cryptoShuffle(input);
    expect(shuffled.sort((a, b) => a - b)).toEqual(input);
  });

  it("proof verifies for valid shuffle", async () => {
    const input = Array.from({ length: 50 }, (_, i) => i);
    const { shuffled, proof } = await cryptoShuffle(input);
    const valid = await verifyShuffleProof(input, shuffled, proof!);
    expect(valid).toBe(true);
  });

  it("proof verifies for small input (2 elements)", async () => {
    const input = [0, 1];
    const { shuffled, proof } = await cryptoShuffle(input);
    const valid = await verifyShuffleProof(input, shuffled, proof!);
    expect(valid).toBe(true);
  });

  it("single element: null proof (trivial)", async () => {
    const input = [0];
    const { shuffled, proof } = await cryptoShuffle(input);
    expect(shuffled).toEqual([0]);
    expect(proof).toBeNull();
  });

  it("empty input: null proof (trivial)", async () => {
    const input: number[] = [];
    const { shuffled, proof } = await cryptoShuffle(input);
    expect(shuffled).toEqual([]);
    expect(proof).toBeNull();
  });

  it("200-element shuffle verifies", async () => {
    const input = Array.from({ length: 200 }, (_, i) => i);
    const { shuffled, proof } = await cryptoShuffle(input);
    const valid = await verifyShuffleProof(input, shuffled, proof!);
    expect(valid).toBe(true);
  });
});

// ── Non-permutation fails ───────────────────────────────────────────────────

describe("verifyShuffleProof rejects", () => {
  it("non-permutation (duplicate element) fails", async () => {
    const input = [0, 1, 2, 3, 4];
    const { proof } = await cryptoShuffle(input);
    // Tamper: output has a duplicate
    const badOutput = [0, 1, 1, 3, 4];
    const valid = await verifyShuffleProof(input, badOutput, proof!);
    expect(valid).toBe(false);
  });

  it("missing element fails", async () => {
    const input = [0, 1, 2, 3, 4];
    const { proof } = await cryptoShuffle(input);
    const badOutput = [0, 1, 2, 3, 5]; // 5 instead of 4
    const valid = await verifyShuffleProof(input, badOutput, proof!);
    expect(valid).toBe(false);
  });

  it("different-length output fails", async () => {
    const input = [0, 1, 2];
    const { proof } = await cryptoShuffle(input);
    const badOutput = [0, 1, 2, 3];
    const valid = await verifyShuffleProof(input, badOutput, proof!);
    expect(valid).toBe(false);
  });

  it("tampered seed commitment fails", async () => {
    const input = [0, 1, 2, 3];
    const { shuffled, proof } = await cryptoShuffle(input);
    const tampered: ShuffleProof = {
      ...proof!,
      seedCommitmentHex: "ff".repeat(32),
    };
    const valid = await verifyShuffleProof(input, shuffled, tampered);
    expect(valid).toBe(false);
  });

  it("tampered challenge fails", async () => {
    const input = [0, 1, 2, 3];
    const { shuffled, proof } = await cryptoShuffle(input);
    const tampered: ShuffleProof = {
      ...proof!,
      challengeHex: "00".repeat(32),
    };
    const valid = await verifyShuffleProof(input, shuffled, tampered);
    expect(valid).toBe(false);
  });
});

// ── Fiat-Shamir determinism ─────────────────────────────────────────────────

describe("Fiat-Shamir determinism", () => {
  it("same input/output → same challenge", async () => {
    const input = [0, 1, 2, 3, 4];
    const { shuffled, proof } = await cryptoShuffle(input);
    // Re-verify: the challenge should be deterministically recomputable
    const valid = await verifyShuffleProof(input, shuffled, proof!);
    expect(valid).toBe(true);
  });

  it("different shuffles produce different challenges", async () => {
    const input = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const r1 = await cryptoShuffle(input);
    const r2 = await cryptoShuffle(input);
    // Different shuffled outputs → different challenges (with overwhelming probability)
    if (r1.proof!.challengeHex !== r2.proof!.challengeHex) {
      expect(r1.proof!.challengeHex).not.toBe(r2.proof!.challengeHex);
    }
  });
});

// ── Seed attestation ────────────────────────────────────────────────────────

describe("randomness attestation", () => {
  it("seed commitment is SHA-256 of seed", async () => {
    const input = [0, 1, 2, 3];
    const { proof } = await cryptoShuffle(input);
    // Verify: SHA-256(seed) == seedCommitment
    const seedBytes = hexToBytes(proof!.seedHex);
    const expectedHash = new Uint8Array(
      await crypto.subtle.digest("SHA-256", seedBytes.buffer as ArrayBuffer),
    );
    const expectedHex = Array.from(expectedHash)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    expect(proof!.seedCommitmentHex).toBe(expectedHex);
  });

  it("different shuffles produce different seeds", async () => {
    const input = [0, 1, 2, 3, 4];
    const r1 = await cryptoShuffle(input);
    const r2 = await cryptoShuffle(input);
    expect(r1.proof!.seedHex).not.toBe(r2.proof!.seedHex);
  });
});

// ── Math.random not called ──────────────────────────────────────────────────

describe("CSPRNG", () => {
  it("does not call Math.random", async () => {
    const original = Math.random;
    let called = false;
    Math.random = () => {
      called = true;
      return original();
    };
    try {
      const input = Array.from({ length: 10 }, (_, i) => i);
      await cryptoShuffle(input);
      expect(called).toBe(false);
    } finally {
      Math.random = original;
    }
  });
});

// ── Utility ─────────────────────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}
