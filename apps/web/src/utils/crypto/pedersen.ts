/**
 * Pedersen Commitments over ristretto255.
 *
 * Provides information-theoretically hiding, computationally binding
 * commitments to values. Used alongside the Merkle tree to enable
 * selective disclosure of audit log entries.
 *
 * C(v, r) = vG + rH where:
 *   G = ristretto255 basepoint
 *   H = hashToRistretto255("PDFChanger_Pedersen_H_v1") — nothing-up-my-sleeve
 *
 * Properties:
 *   - Hiding: C reveals nothing about v (information-theoretic)
 *   - Binding: cannot find v' != v with same C (computational, DLP)
 *   - Homomorphic: C(v1,r1) + C(v2,r2) = C(v1+v2, r1+r2)
 *
 * Uses ristretto255 (RFC 9496) which eliminates Curve25519's cofactor-8
 * torsion by construction. This is MANDATORY — raw Curve25519 breaks
 * the homomorphic property (demonstrated by CjS77).
 */

import { ristretto255, ristretto255_hasher } from "@noble/curves/ed25519.js";
import { bytesToHex as nobleToHex } from "@noble/hashes/utils.js";

const RistrettoPoint = ristretto255.Point;

// The ristretto255 group order
const ORDER = BigInt(
  "7237005577332262213973186563042994240857116359379907606001950938285454250989",
);

// Domain string for H generator — MUST be published
const H_DOMAIN = "PDFChanger_Pedersen_H_v1";

/**
 * Derive the second generator H via hash-to-ristretto255.
 * Nobody knows k where H = kG, so binding is guaranteed.
 */
type RistrettoPointType = InstanceType<typeof RistrettoPoint>;

function deriveH(): RistrettoPointType {
  const domainBytes = new TextEncoder().encode(H_DOMAIN);
  return ristretto255_hasher.hashToCurve(domainBytes) as RistrettoPointType;
}

/** Cached H generator (computed once). */
let cachedH: RistrettoPointType | null = null;

function getH(): RistrettoPointType {
  if (!cachedH) {
    cachedH = deriveH();
  }
  return cachedH;
}

/**
 * Generate a uniform nonzero scalar mod q.
 * Using 64 bytes (not 32) ensures uniform distribution after reduction
 * (bias < 2^{-252}). Retries if result is 0 (probability 2^{-252}).
 */
function randomScalar(): bigint {
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(64));
    let n = 0n;
    for (const b of bytes) {
      n = (n << 8n) | BigInt(b);
    }
    const r = ((n % ORDER) + ORDER) % ORDER;
    if (r !== 0n) return r;
    // r === 0 would destroy hiding (C = vG + 0·H = vG) and crash noble.
    // Probability ≈ 2^{-252}. Retry.
  }
}

/**
 * Convert a Uint8Array value to a scalar (mod ORDER).
 * The value is interpreted as a big-endian unsigned integer.
 */
function valueToScalar(value: Uint8Array): bigint {
  let n = 0n;
  for (const b of value) {
    n = (n << 8n) | BigInt(b);
  }
  return ((n % ORDER) + ORDER) % ORDER;
}

// ── Nonce tracking (per-session, bounded) ───────────────────────────────────

const MAX_TRACKED_NONCES = 10_000;
const usedNonces = new Set<string>();

function checkAndTrackNonce(r: bigint): void {
  const key = r.toString(16);
  if (usedNonces.has(key)) {
    throw new Error(
      "Pedersen: blinding factor reuse detected — same r for two values leaks the difference",
    );
  }
  // Evict oldest entries if at capacity (defence-in-depth, not primary security)
  if (usedNonces.size >= MAX_TRACKED_NONCES) {
    const first = usedNonces.values().next().value;
    if (first !== undefined) usedNonces.delete(first);
  }
  usedNonces.add(key);
}

/** Reset nonce tracking (for testing only). */
export function _resetNonceTracking(): void {
  usedNonces.clear();
}

// ── Public API ──────────────────────────────────────────────────────────────

export type Commitment = {
  /** Hex-encoded ristretto255 point (32 bytes compressed) */
  pointHex: string;
  /** The blinding factor r (hex-encoded scalar) — needed to open */
  blindingHex: string;
  /** The committed value (hex-encoded) */
  valueHex: string;
};

/**
 * Create a Pedersen commitment to a value.
 *
 * C(v, r) = vG + rH
 *
 * @param value The value to commit to (arbitrary bytes, e.g. a leaf hash)
 * @returns The commitment and opening information
 */
export function commit(value: Uint8Array): Commitment {
  const v = valueToScalar(value);
  const r = randomScalar();
  checkAndTrackNonce(r);

  const G = RistrettoPoint.BASE;
  const H = getH();

  // C = vG + rH
  // noble-curves requires scalar >= 1 for multiply; handle v=0 as special case
  const vG = v === 0n ? RistrettoPoint.ZERO : G.multiply(v);
  const C = vG.add(H.multiply(r));

  return {
    pointHex: nobleToHex(C.toBytes()),
    blindingHex: r.toString(16).padStart(64, "0"),
    valueHex: nobleToHex(value),
  };
}

/**
 * Verify a Pedersen commitment opening.
 *
 * Checks that C == vG + rH.
 *
 * @param commitment The commitment to verify
 * @returns true if the opening is valid
 */
export function verify(commitment: Commitment): boolean {
  try {
    const v = hexToBigInt(commitment.valueHex);
    const vScalar = ((v % ORDER) + ORDER) % ORDER;
    const r = hexToBigInt(commitment.blindingHex);

    const G = RistrettoPoint.BASE;
    const H = getH();

    const vG = vScalar === 0n ? RistrettoPoint.ZERO : G.multiply(vScalar);
    const expected = vG.add(H.multiply(r));
    const actual = RistrettoPoint.fromHex(commitment.pointHex);

    return nobleToHex(expected.toBytes()) === nobleToHex(actual.toBytes());
  } catch {
    return false;
  }
}

/**
 * Homomorphic addition of two commitments.
 *
 * C(v1,r1) + C(v2,r2) = C(v1+v2, r1+r2)
 *
 * @returns A new commitment to the sum, with combined blinding factor
 */
export function addCommitments(
  c1: Commitment,
  c2: Commitment,
): { pointHex: string; combinedBlindingHex: string; combinedValueHex: string } {
  const point1 = RistrettoPoint.fromHex(c1.pointHex);
  const point2 = RistrettoPoint.fromHex(c2.pointHex);
  const sum = point1.add(point2);

  const r1 = hexToBigInt(c1.blindingHex);
  const r2 = hexToBigInt(c2.blindingHex);
  const rSum = (r1 + r2) % ORDER;

  const v1 = hexToBigInt(c1.valueHex);
  const v2 = hexToBigInt(c2.valueHex);
  const vSum = (v1 + v2) % ORDER;

  return {
    pointHex: nobleToHex(sum.toBytes()),
    combinedBlindingHex: rSum.toString(16).padStart(64, "0"),
    combinedValueHex: vSum.toString(16).padStart(64, "0"),
  };
}

/**
 * Check that H is not the identity point.
 * If H were identity, all commitments would be to G only (no hiding).
 */
export function validateGenerators(): boolean {
  const H = getH();
  const identity = RistrettoPoint.ZERO;
  return nobleToHex(H.toBytes()) !== nobleToHex(identity.toBytes());
}

// ── Utility ─────────────────────────────────────────────────────────────────

function hexToBigInt(hex: string): bigint {
  if (hex.length === 0) return 0n;
  return BigInt("0x" + hex);
}
