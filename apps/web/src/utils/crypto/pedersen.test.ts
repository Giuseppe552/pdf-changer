import { describe, expect, it, beforeEach } from "vitest";
import {
  commit,
  verify,
  addCommitments,
  validateGenerators,
  _resetNonceTracking,
  type Commitment,
} from "./pedersen";

beforeEach(() => {
  _resetNonceTracking();
});

// ── Round-trip ──────────────────────────────────────────────────────────────

describe("commit + verify", () => {
  it("round-trip: commit then verify succeeds", () => {
    const value = crypto.getRandomValues(new Uint8Array(32));
    const c = commit(value);
    expect(verify(c)).toBe(true);
  });

  it("works with small values", () => {
    const value = new Uint8Array([42]);
    const c = commit(value);
    expect(verify(c)).toBe(true);
  });

  it("works with zero value", () => {
    const value = new Uint8Array([0]);
    const c = commit(value);
    expect(verify(c)).toBe(true);
  });

  it("works with 32-byte leaf hash", () => {
    const value = new Uint8Array(32).fill(0xab);
    const c = commit(value);
    expect(verify(c)).toBe(true);
  });

  it("different values produce different commitments", () => {
    const v1 = new Uint8Array([1, 2, 3]);
    const v2 = new Uint8Array([4, 5, 6]);
    const c1 = commit(v1);
    const c2 = commit(v2);
    expect(c1.pointHex).not.toBe(c2.pointHex);
  });

  it("same value with different blinding produces different commitments", () => {
    _resetNonceTracking();
    const value = new Uint8Array([42]);
    const c1 = commit(value);
    _resetNonceTracking();
    const c2 = commit(value);
    // Different blinding factors → different points
    expect(c1.pointHex).not.toBe(c2.pointHex);
    // But both verify
    expect(verify(c1)).toBe(true);
    expect(verify(c2)).toBe(true);
  });
});

// ── Wrong value/blinding fails ──────────────────────────────────────────────

describe("verify rejects", () => {
  it("wrong value fails", () => {
    const value = new Uint8Array([42]);
    const c = commit(value);
    const tampered: Commitment = {
      ...c,
      valueHex: "ff".repeat(32),
    };
    expect(verify(tampered)).toBe(false);
  });

  it("wrong blinding factor fails", () => {
    const value = new Uint8Array([42]);
    const c = commit(value);
    const tampered: Commitment = {
      ...c,
      blindingHex: "01".padStart(64, "0"),
    };
    expect(verify(tampered)).toBe(false);
  });

  it("wrong point fails", () => {
    const value = new Uint8Array([42]);
    const c = commit(value);
    // Use a different commitment's point
    _resetNonceTracking();
    const other = commit(new Uint8Array([99]));
    const tampered: Commitment = {
      ...c,
      pointHex: other.pointHex,
    };
    expect(verify(tampered)).toBe(false);
  });

  it("invalid hex returns false (does not throw)", () => {
    const bad: Commitment = {
      pointHex: "not_a_hex",
      blindingHex: "also_bad",
      valueHex: "nope",
    };
    expect(verify(bad)).toBe(false);
  });
});

// ── Homomorphic property ────────────────────────────────────────────────────

describe("homomorphic addition", () => {
  it("C(v1,r1) + C(v2,r2) opens as C(v1+v2, r1+r2)", () => {
    const v1 = new Uint8Array([10]);
    const v2 = new Uint8Array([20]);
    const c1 = commit(v1);
    const c2 = commit(v2);

    const sum = addCommitments(c1, c2);

    // Verify the sum commitment opens correctly
    const sumCommitment: Commitment = {
      pointHex: sum.pointHex,
      blindingHex: sum.combinedBlindingHex,
      valueHex: sum.combinedValueHex,
    };
    _resetNonceTracking(); // Don't track nonces for verification
    expect(verify(sumCommitment)).toBe(true);
  });

  it("homomorphic with larger values", () => {
    const v1 = crypto.getRandomValues(new Uint8Array(16));
    const v2 = crypto.getRandomValues(new Uint8Array(16));
    const c1 = commit(v1);
    const c2 = commit(v2);

    const sum = addCommitments(c1, c2);
    const sumCommitment: Commitment = {
      pointHex: sum.pointHex,
      blindingHex: sum.combinedBlindingHex,
      valueHex: sum.combinedValueHex,
    };
    _resetNonceTracking();
    expect(verify(sumCommitment)).toBe(true);
  });
});

// ── Nonce reuse detection ───────────────────────────────────────────────────

describe("nonce reuse detection", () => {
  it("does not throw normally (unique nonces)", () => {
    // Each commit generates a fresh random nonce
    for (let i = 0; i < 10; i++) {
      const value = new Uint8Array([i]);
      expect(() => commit(value)).not.toThrow();
    }
  });

  // Note: actual nonce reuse would require crypto.getRandomValues to produce
  // a collision, which is astronomically unlikely with 64-byte random input.
  // The tracking mechanism is defense-in-depth.
});

// ── Generator validation ────────────────────────────────────────────────────

describe("generators", () => {
  it("H is not the identity point", () => {
    expect(validateGenerators()).toBe(true);
  });

  it("H is deterministic", () => {
    // validateGenerators uses cached H — calling twice should work
    expect(validateGenerators()).toBe(true);
    expect(validateGenerators()).toBe(true);
  });
});

// ── Output format ───────────────────────────────────────────────────────────

describe("output format", () => {
  it("pointHex is 64 hex chars (32 bytes)", () => {
    const c = commit(new Uint8Array([1, 2, 3]));
    expect(c.pointHex).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(c.pointHex)).toBe(true);
  });

  it("blindingHex is 64 hex chars", () => {
    const c = commit(new Uint8Array([1]));
    expect(c.blindingHex).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(c.blindingHex)).toBe(true);
  });

  it("valueHex matches input bytes", () => {
    const value = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const c = commit(value);
    expect(c.valueHex).toBe("deadbeef");
  });
});
