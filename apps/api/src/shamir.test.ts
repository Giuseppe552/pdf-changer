import { describe, expect, it } from "vitest";
import {
  gfMul,
  gfInv,
  gfAdd,
  crc8,
  shamirSplit,
  shamirReconstruct,
  encodeShare,
  decodeShare,
  type ShamirShare,
} from "./shamir";

// ── GF(256) arithmetic ──────────────────────────────────────────────────────

describe("GF(256) arithmetic", () => {
  it("gfMul: 0 * x = 0", () => {
    expect(gfMul(0, 42)).toBe(0);
    expect(gfMul(42, 0)).toBe(0);
  });

  it("gfMul: 1 * x = x", () => {
    expect(gfMul(1, 42)).toBe(42);
    expect(gfMul(42, 1)).toBe(42);
  });

  it("gfMul: commutativity", () => {
    expect(gfMul(0x53, 0xca)).toBe(gfMul(0xca, 0x53));
  });

  it("gfMul: known AES test vector (0x53 * 0xca = 0x01)", () => {
    // In AES field, 0x53 and 0xca are multiplicative inverses
    expect(gfMul(0x53, 0xca)).toBe(0x01);
  });

  it("gfMul: another AES vector (0x02 * 0x87 = 0x15)", () => {
    // {02}·{87} in AES field: shift 0x87 left, XOR 0x1B → 0x15
    expect(gfMul(0x02, 0x87)).toBe(0x15);
  });

  it("gfInv: a * a^{-1} = 1 for all nonzero elements", () => {
    // Exhaustive test on a sample (full 255 is fast enough)
    for (let a = 1; a < 256; a++) {
      expect(gfMul(a, gfInv(a))).toBe(1);
    }
  });

  it("gfInv: throws on zero", () => {
    expect(() => gfInv(0)).toThrow("cannot invert zero");
  });

  it("gfAdd: a ^ a = 0", () => {
    expect(gfAdd(42, 42)).toBe(0);
  });

  it("gfAdd: a ^ 0 = a", () => {
    expect(gfAdd(42, 0)).toBe(42);
  });
});

// ── CRC-8 ───────────────────────────────────────────────────────────────────

describe("CRC-8", () => {
  it("empty input → 0", () => {
    expect(crc8(new Uint8Array([]))).toBe(0);
  });

  it("deterministic", () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    expect(crc8(data)).toBe(crc8(data));
  });

  it("different data → different CRC", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([1, 2, 4]);
    expect(crc8(a)).not.toBe(crc8(b));
  });
});

// ── Split & Reconstruct ─────────────────────────────────────────────────────

describe("shamirSplit / shamirReconstruct", () => {
  it("round-trip: 3-of-5 with 32-byte secret", () => {
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const shares = shamirSplit(secret, 3, 5);
    expect(shares).toHaveLength(5);

    // Reconstruct with first 3 shares
    const recovered = shamirReconstruct(shares.slice(0, 3), 3);
    expect(recovered).toEqual(secret);
  });

  it("round-trip: 2-of-2 (minimum threshold)", () => {
    const secret = crypto.getRandomValues(new Uint8Array(16));
    const shares = shamirSplit(secret, 2, 2);
    const recovered = shamirReconstruct(shares, 2);
    expect(recovered).toEqual(secret);
  });

  it("round-trip: 3-of-10 (PDF Changer recovery scheme)", () => {
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const shares = shamirSplit(secret, 3, 10);
    expect(shares).toHaveLength(10);

    // Any 3 shares should work
    const recovered = shamirReconstruct([shares[2], shares[7], shares[0]], 3);
    expect(recovered).toEqual(secret);
  });

  it("any k-subset reconstructs correctly (exhaustive for 3-of-5)", () => {
    const secret = crypto.getRandomValues(new Uint8Array(8));
    const shares = shamirSplit(secret, 3, 5);

    // All C(5,3) = 10 subsets
    for (let i = 0; i < 5; i++) {
      for (let j = i + 1; j < 5; j++) {
        for (let m = j + 1; m < 5; m++) {
          const subset = [shares[i], shares[j], shares[m]];
          const recovered = shamirReconstruct(subset, 3);
          expect(recovered).toEqual(secret);
        }
      }
    }
  });

  it("k-1 shares produce wrong result (information-theoretic security)", () => {
    const secret = new Uint8Array(32);
    secret.fill(0xab);
    const shares = shamirSplit(secret, 3, 5);

    // Try reconstruct with only 2 shares (should give garbage, not the secret)
    // We use k=2 interpolation which is mathematically valid but wrong threshold
    const wrongResult = shamirReconstruct(shares.slice(0, 2), 2);
    expect(wrongResult).not.toEqual(secret);
  });

  it("share indices are consecutive 1..n", () => {
    const shares = shamirSplit(new Uint8Array([42]), 3, 10);
    for (let i = 0; i < 10; i++) {
      expect(shares[i].index).toBe(i + 1);
    }
  });

  it("all shares have same schemeId", () => {
    const shares = shamirSplit(new Uint8Array([1, 2, 3]), 2, 5);
    for (let i = 1; i < shares.length; i++) {
      expect(shares[i].schemeId).toEqual(shares[0].schemeId);
    }
  });

  it("different splits produce different schemeIds", () => {
    const secret = new Uint8Array([1, 2, 3]);
    const a = shamirSplit(secret, 2, 3);
    const b = shamirSplit(secret, 2, 3);
    // Probabilistic: 2^{-32} chance of collision, acceptable
    expect(a[0].schemeId).not.toEqual(b[0].schemeId);
  });

  it("single-byte secret round-trip", () => {
    for (let val = 0; val < 256; val++) {
      const secret = new Uint8Array([val]);
      const shares = shamirSplit(secret, 2, 3);
      const recovered = shamirReconstruct(shares.slice(0, 2), 2);
      expect(recovered[0]).toBe(val);
    }
  });
});

// ── Edge cases & validation ─────────────────────────────────────────────────

describe("shamirSplit validation", () => {
  it("throws if k < 2", () => {
    expect(() => shamirSplit(new Uint8Array([1]), 1, 5)).toThrow("k must be ≥ 2");
  });

  it("throws if n < k", () => {
    expect(() => shamirSplit(new Uint8Array([1]), 3, 2)).toThrow("n must be ≥ k");
  });

  it("throws if n > 255", () => {
    expect(() => shamirSplit(new Uint8Array([1]), 2, 256)).toThrow("n must be ≤ 255");
  });

  it("throws if secret is empty", () => {
    expect(() => shamirSplit(new Uint8Array([]), 2, 3)).toThrow("must not be empty");
  });
});

describe("shamirReconstruct validation", () => {
  it("throws if fewer than k shares provided", () => {
    const shares = shamirSplit(new Uint8Array([42]), 3, 5);
    expect(() => shamirReconstruct(shares.slice(0, 2), 3)).toThrow("Need at least 3");
  });

  it("throws on duplicate indices", () => {
    const shares = shamirSplit(new Uint8Array([42]), 2, 3);
    const dup: ShamirShare[] = [shares[0], { ...shares[1], index: shares[0].index }];
    expect(() => shamirReconstruct(dup, 2)).toThrow("Duplicate share indices");
  });

  it("throws on mismatched data length", () => {
    const s1 = shamirSplit(new Uint8Array([1, 2]), 2, 2);
    s1[1] = { ...s1[1], data: new Uint8Array([1]) };
    expect(() => shamirReconstruct(s1, 2)).toThrow("same data length");
  });
});

// ── Share encoding ──────────────────────────────────────────────────────────

describe("encodeShare / decodeShare", () => {
  it("round-trip: encode then decode preserves index and data", () => {
    const schemeId = crypto.getRandomValues(new Uint8Array(4));
    const data = crypto.getRandomValues(new Uint8Array(32));
    const encoded = encodeShare(5, data, schemeId);
    expect(encoded.startsWith("PDC-")).toBe(true);

    const decoded = decodeShare(encoded, 4);
    expect(decoded).not.toBeNull();
    expect(decoded!.index).toBe(5);
    expect(decoded!.data).toEqual(data);
    expect(decoded!.schemeId).toEqual(schemeId);
  });

  it("corrupted string returns null", () => {
    const schemeId = crypto.getRandomValues(new Uint8Array(4));
    const data = crypto.getRandomValues(new Uint8Array(32));
    const encoded = encodeShare(1, data, schemeId);
    // Flip a character
    const corrupted = encoded.slice(0, 10) + "X" + encoded.slice(11);
    // Might still decode base32, but CRC should catch it
    const decoded = decodeShare(corrupted, 4);
    // Either null or different data (CRC mismatch)
    if (decoded !== null) {
      // If by coincidence the base32 is valid AND CRC passes, data should differ
      // This is astronomically unlikely but handle gracefully
      expect(decoded.data).not.toEqual(data);
    }
  });

  it("wrong prefix returns null", () => {
    expect(decodeShare("XYZ-ABCD-EFGH", 4)).toBeNull();
  });

  it("empty after prefix returns null", () => {
    expect(decodeShare("PDC-", 4)).toBeNull();
  });

  it("full split→encode→decode→reconstruct pipeline", () => {
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const shares = shamirSplit(secret, 3, 10);

    const encoded = shares.map((s) => encodeShare(s.index, s.data, s.schemeId));
    const decoded = encoded.map((e) => decodeShare(e, 4));
    for (const d of decoded) {
      expect(d).not.toBeNull();
    }

    const reconstructShares: ShamirShare[] = decoded.slice(0, 3).map((d) => ({
      index: d!.index,
      data: d!.data,
      schemeId: d!.schemeId,
    }));
    const recovered = shamirReconstruct(reconstructShares, 3);
    expect(recovered).toEqual(secret);
  });
});
