/**
 * Shamir's Secret Sharing over GF(2^8).
 *
 * Splits a secret into n shares with threshold k: any k shares reconstruct
 * the secret, but k-1 shares reveal zero information (information-theoretically).
 *
 * Field: GF(256) with AES irreducible polynomial x^8 + x^4 + x^3 + x + 1
 * (0x11B). Arithmetic uses shift-and-reduce (no lookup tables) to avoid
 * cache-timing side channels (cf. CVE-2023-25000).
 */

// ── GF(256) arithmetic ──────────────────────────────────────────────────────

const GF_MOD = 0x11b; // x^8 + x^4 + x^3 + x + 1

/** Multiply two GF(256) elements via shift-and-reduce. No lookup tables. */
export function gfMul(a: number, b: number): number {
  let result = 0;
  let aa = a;
  let bb = b;
  for (let i = 0; i < 8; i++) {
    if (bb & 1) result ^= aa;
    const hi = aa & 0x80;
    aa = (aa << 1) & 0xff;
    if (hi) aa ^= GF_MOD & 0xff; // reduce mod polynomial
    bb >>= 1;
  }
  return result;
}

/** Multiplicative inverse in GF(256) via exponentiation: a^254 = a^{-1}. */
export function gfInv(a: number): number {
  if (a === 0) throw new Error("GF(256): cannot invert zero");
  // a^{-1} = a^{254} in GF(2^8) since the multiplicative group has order 255.
  let result = a;
  // Square-and-multiply for exponent 254 = 0b11111110
  for (let i = 0; i < 6; i++) {
    result = gfMul(result, result);
    result = gfMul(result, a);
  }
  result = gfMul(result, result); // final square (bit 1 of 254 is 0)
  return result;
}

/** Add/subtract in GF(256) — both are XOR. */
export function gfAdd(a: number, b: number): number {
  return a ^ b;
}

// ── Polynomial evaluation ───────────────────────────────────────────────────

/**
 * Evaluate polynomial at x using Horner's method.
 * coeffs[0] = constant term (secret), coeffs[k-1] = leading coefficient.
 */
function polyEval(coeffs: Uint8Array, x: number): number {
  let result = 0;
  for (let i = coeffs.length - 1; i >= 0; i--) {
    result = gfAdd(gfMul(result, x), coeffs[i]);
  }
  return result;
}

// ── Lagrange interpolation ──────────────────────────────────────────────────

/**
 * Reconstruct the secret (constant term) from k (x, y) points via
 * Lagrange interpolation at x=0.
 */
function lagrangeInterpolateAtZero(
  xs: Uint8Array,
  ys: Uint8Array,
): number {
  const k = xs.length;
  let secret = 0;
  for (let i = 0; i < k; i++) {
    let num = 1;
    let den = 1;
    for (let j = 0; j < k; j++) {
      if (i === j) continue;
      num = gfMul(num, xs[j]); // x_j (since we evaluate at x=0)
      den = gfMul(den, gfAdd(xs[j], xs[i])); // x_j - x_i = x_j ^ x_i
    }
    const lagrangeCoeff = gfMul(num, gfInv(den));
    secret = gfAdd(secret, gfMul(ys[i], lagrangeCoeff));
  }
  return secret;
}

// ── CRC-8 (CCITT) ──────────────────────────────────────────────────────────

const CRC8_POLY = 0x07;

/** CRC-8/CCITT checksum. */
export function crc8(data: Uint8Array): number {
  let crc = 0x00;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let bit = 0; bit < 8; bit++) {
      if (crc & 0x80) {
        crc = ((crc << 1) ^ CRC8_POLY) & 0xff;
      } else {
        crc = (crc << 1) & 0xff;
      }
    }
  }
  return crc;
}

// ── Base32 encoding (RFC 4648, no padding) ──────────────────────────────────

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(data: Uint8Array): string {
  let bits = 0;
  let buffer = 0;
  let result = "";
  for (const byte of data) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += BASE32_ALPHABET[(buffer >> bits) & 0x1f];
    }
  }
  if (bits > 0) {
    result += BASE32_ALPHABET[(buffer << (5 - bits)) & 0x1f];
  }
  return result;
}

function base32Decode(str: string): Uint8Array {
  const cleanStr = str.replace(/=+$/, "").toUpperCase();
  const out: number[] = [];
  let bits = 0;
  let buffer = 0;
  for (const ch of cleanStr) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx < 0) throw new Error(`Invalid Base32 character: ${ch}`);
    buffer = (buffer << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

// ── Share encoding ──────────────────────────────────────────────────────────

/**
 * Encode a share as a human-readable string.
 * Format: "PDC-{index(1B)}-{shareData(nB)}-{crc8(1B)}" all Base32-encoded.
 */
export function encodeShare(
  index: number,
  shareData: Uint8Array,
  schemeId: Uint8Array,
): string {
  // Payload: schemeId(4B) + index(1B) + shareData(nB)
  const payload = new Uint8Array(schemeId.length + 1 + shareData.length);
  payload.set(schemeId, 0);
  payload[schemeId.length] = index;
  payload.set(shareData, schemeId.length + 1);
  const checksum = crc8(payload);
  const withCheck = new Uint8Array(payload.length + 1);
  withCheck.set(payload, 0);
  withCheck[payload.length] = checksum;
  const encoded = base32Encode(withCheck);
  // Group in blocks of 4 for readability
  const groups: string[] = [];
  for (let i = 0; i < encoded.length; i += 4) {
    groups.push(encoded.slice(i, i + 4));
  }
  return `PDC-${groups.join("-")}`;
}

/**
 * Decode a share string back to index + data.
 * Validates CRC-8 checksum. Returns null on invalid input.
 */
export function decodeShare(
  encoded: string,
  schemeIdLength: number,
): { index: number; data: Uint8Array; schemeId: Uint8Array } | null {
  if (!encoded.startsWith("PDC-")) return null;
  const b32 = encoded.slice(4).replace(/-/g, "");
  let raw: Uint8Array;
  try {
    raw = base32Decode(b32);
  } catch {
    return null;
  }
  if (raw.length < schemeIdLength + 1 + 1 + 1) return null; // schemeId + index + 1 byte data + crc
  const payload = raw.slice(0, raw.length - 1);
  const storedCrc = raw[raw.length - 1];
  if (crc8(payload) !== storedCrc) return null;
  const schemeId = payload.slice(0, schemeIdLength);
  const index = payload[schemeIdLength];
  const data = payload.slice(schemeIdLength + 1);
  return { index, data, schemeId };
}

// ── Split & Reconstruct ─────────────────────────────────────────────────────

export type ShamirShare = {
  index: number; // x-coordinate, 1..n
  data: Uint8Array; // y-values for each byte of the secret
  schemeId: Uint8Array; // 4-byte random identifier for this split
};

/**
 * Split a secret into n shares with threshold k.
 *
 * @param secret - The secret bytes to split
 * @param k - Threshold: minimum shares needed to reconstruct (2 ≤ k ≤ n)
 * @param n - Total shares to generate (k ≤ n ≤ 255)
 * @returns Array of n shares
 */
export function shamirSplit(
  secret: Uint8Array,
  k: number,
  n: number,
): ShamirShare[] {
  if (k < 2) throw new Error("Threshold k must be ≥ 2");
  if (n < k) throw new Error("n must be ≥ k");
  if (n > 255) throw new Error("n must be ≤ 255");
  if (secret.length === 0) throw new Error("Secret must not be empty");

  // 4-byte scheme identifier for grouping shares
  const schemeId = crypto.getRandomValues(new Uint8Array(4));

  const shares: ShamirShare[] = [];
  for (let i = 0; i < n; i++) {
    shares.push({
      index: i + 1, // consecutive {1..n}, never x=0
      data: new Uint8Array(secret.length),
      schemeId: new Uint8Array(schemeId),
    });
  }

  // For each byte of the secret, generate a random polynomial of degree k-1
  // with the secret byte as the constant term
  for (let byteIdx = 0; byteIdx < secret.length; byteIdx++) {
    const coeffs = new Uint8Array(k);
    coeffs[0] = secret[byteIdx]; // constant term = secret byte

    // Random coefficients for degrees 1..k-1
    const randomCoeffs = crypto.getRandomValues(new Uint8Array(k - 1));
    for (let c = 0; c < k - 1; c++) {
      coeffs[c + 1] = randomCoeffs[c];
    }

    // Enforce nonzero leading coefficient to prevent threshold reduction
    while (coeffs[k - 1] === 0) {
      coeffs[k - 1] = crypto.getRandomValues(new Uint8Array(1))[0];
    }

    // Evaluate polynomial at each share's x-coordinate
    for (let i = 0; i < n; i++) {
      shares[i].data[byteIdx] = polyEval(coeffs, shares[i].index);
    }
  }

  return shares;
}

/**
 * Reconstruct a secret from k or more shares.
 *
 * @param shares - At least k shares (with distinct indices)
 * @param k - The threshold used during splitting
 * @returns The reconstructed secret
 */
export function shamirReconstruct(
  shares: ShamirShare[],
  k: number,
): Uint8Array {
  if (shares.length < k) {
    throw new Error(`Need at least ${k} shares, got ${shares.length}`);
  }
  // Use exactly k shares (first k provided)
  const used = shares.slice(0, k);
  const secretLen = used[0].data.length;

  // Validate all shares have same length
  for (const share of used) {
    if (share.data.length !== secretLen) {
      throw new Error("All shares must have the same data length");
    }
  }

  // Check for duplicate indices
  const indices = new Set(used.map((s) => s.index));
  if (indices.size !== used.length) {
    throw new Error("Duplicate share indices detected");
  }

  const xs = new Uint8Array(used.map((s) => s.index));
  const secret = new Uint8Array(secretLen);

  for (let byteIdx = 0; byteIdx < secretLen; byteIdx++) {
    const ys = new Uint8Array(used.map((s) => s.data[byteIdx]));
    secret[byteIdx] = lagrangeInterpolateAtZero(xs, ys);
  }

  return secret;
}
