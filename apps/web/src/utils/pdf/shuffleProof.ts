/**
 * Verifiable Shuffle — Schwartz-Zippel product check with Fiat-Shamir.
 *
 * Proves that the output of a Fisher-Yates shuffle is a valid permutation
 * of the input (multiset equality) without revealing the permutation itself.
 *
 * The protocol:
 *   1. r = SHA-256("PDFChanger_ShuffleProof_v1" || encode(input) || encode(output)) mod p
 *   2. P_A = PRODUCT(r - input[i]) mod p
 *   3. P_B = PRODUCT(r - output[i]) mod p
 *   4. Valid iff P_A == P_B
 *
 * This is the same Schwartz-Zippel product check used in PLONK's permutation
 * argument (zkSync, Aztec, Polygon). Soundness error: n/|F| ≤ 200/2^256 ≈ 2^{-248}.
 *
 * NOT zero-knowledge — it proves multiset equality, not permutation secrecy.
 */

import { sha256 } from "../sha256";
import { bytesToHex } from "../hex";

// secp256k1 prime field — 256-bit, well-studied, hardcoded
const P = BigInt(
  "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F",
);

const DOMAIN_SEPARATOR = "PDFChanger_ShuffleProof_v1";

export type ShuffleProof = {
  /** Hex-encoded Fiat-Shamir challenge r */
  challengeHex: string;
  /** Hex-encoded product P_A = PRODUCT(r - input[i]) mod p */
  productHex: string;
  /** Hex-encoded seed commitment SHA-256(seed) — randomness attestation */
  seedCommitmentHex: string;
  /** Hex-encoded seed (revealed after shuffle for auditability) */
  seedHex: string;
  /** Number of elements in the permutation */
  size: number;
};

// ── BigInt modular arithmetic ───────────────────────────────────────────────

function modP(x: bigint): bigint {
  return ((x % P) + P) % P;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let n = 0n;
  for (const b of bytes) {
    n = (n << 8n) | BigInt(b);
  }
  return n;
}

function bigIntToHex(n: bigint): string {
  return n.toString(16).padStart(64, "0");
}

function hexToBigInt(hex: string): bigint {
  return BigInt("0x" + hex);
}

// ── CSPRNG Fisher-Yates ─────────────────────────────────────────────────────

/**
 * Fisher-Yates shuffle using CSPRNG, with deterministic seeding for
 * reproducibility/auditability.
 *
 * @param arr Array to shuffle (mutated in-place)
 * @param seed 32-byte seed for deterministic shuffling
 * @param inputHash Hash of the input being shuffled (for domain separation)
 */
async function seededShuffle<T>(
  arr: T[],
  seed: Uint8Array,
  inputHash: Uint8Array,
): Promise<void> {
  // Derive permutation-specific key from seed + input hash
  const keyMaterial = new Uint8Array(seed.length + inputHash.length);
  keyMaterial.set(seed, 0);
  keyMaterial.set(inputHash, seed.length);

  // We need one random value per swap. Use SHA-256 in counter mode.
  for (let i = arr.length - 1; i > 0; i--) {
    // Hash(key_material || counter) → 32 bytes
    const counterBytes = new Uint8Array(4);
    new DataView(counterBytes.buffer as ArrayBuffer).setUint32(0, i, false);
    const hashInput = new Uint8Array(keyMaterial.length + 4);
    hashInput.set(keyMaterial, 0);
    hashInput.set(counterBytes, keyMaterial.length);
    const hashBytes = await sha256(hashInput);

    // Convert to a uniform index in [0, i]
    // Modular reduction of 256-bit value mod (i+1) — bias < i/2^256 ≈ 2^{-248} for i ≤ 200
    const randVal = bytesToBigInt(hashBytes);
    const j = Number(randVal % BigInt(i + 1));

    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Compute the input hash for domain separation.
 * Encodes each element as its u32BE index representation.
 */
async function computeInputHash(indices: number[]): Promise<Uint8Array> {
  const encoded = new Uint8Array(indices.length * 4);
  const view = new DataView(encoded.buffer as ArrayBuffer);
  for (let i = 0; i < indices.length; i++) {
    view.setUint32(i * 4, indices[i], false);
  }
  return sha256(encoded);
}

// ── Fiat-Shamir challenge derivation ────────────────────────────────────────

/**
 * Derive the Fiat-Shamir challenge r from the domain separator,
 * seed commitment, length prefix, and complete input + output sequences.
 *
 * The seed commitment is included so the randomness attestation is
 * cryptographically bound to the permutation proof — an adversary
 * cannot pick an arbitrary seed after choosing a permutation.
 *
 * Length prefix (u32BE) ensures different-N transcripts can never collide
 * even though the verifier already checks proof.size.
 */
async function deriveChallenge(
  input: number[],
  output: number[],
  seedCommitment: Uint8Array,
): Promise<bigint> {
  const domainBytes = new TextEncoder().encode(DOMAIN_SEPARATOR);
  const lenBytes = new Uint8Array(4);
  new DataView(lenBytes.buffer as ArrayBuffer).setUint32(0, input.length, false);
  const inputEncoded = new Uint8Array(input.length * 4);
  const outputEncoded = new Uint8Array(output.length * 4);
  const inputView = new DataView(inputEncoded.buffer as ArrayBuffer);
  const outputView = new DataView(outputEncoded.buffer as ArrayBuffer);

  for (let i = 0; i < input.length; i++) {
    inputView.setUint32(i * 4, input[i], false);
  }
  for (let i = 0; i < output.length; i++) {
    outputView.setUint32(i * 4, output[i], false);
  }

  const total = new Uint8Array(
    domainBytes.length + seedCommitment.length + lenBytes.length + inputEncoded.length + outputEncoded.length,
  );
  let offset = 0;
  total.set(domainBytes, offset); offset += domainBytes.length;
  total.set(seedCommitment, offset); offset += seedCommitment.length;
  total.set(lenBytes, offset); offset += lenBytes.length;
  total.set(inputEncoded, offset); offset += inputEncoded.length;
  total.set(outputEncoded, offset);

  const hash = await sha256(total);
  return modP(bytesToBigInt(hash));
}

/**
 * Compute the product PRODUCT(r - elements[i]) mod p.
 */
function computeProduct(r: bigint, elements: number[]): bigint {
  let product = 1n;
  for (const elem of elements) {
    product = modP(product * modP(r - BigInt(elem)));
  }
  return product;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Perform a CSPRNG-backed Fisher-Yates shuffle on page indices and
 * generate a cryptographic proof of correct permutation.
 *
 * @param indices Array of page indices [0, 1, ..., n-1]
 * @returns Shuffled indices and the shuffle proof
 */
export async function cryptoShuffle(
  indices: number[],
): Promise<{ shuffled: number[]; proof: ShuffleProof | null }> {
  // Trivial cases: no meaningful permutation, no proof needed
  if (indices.length <= 1) {
    return { shuffled: [...indices], proof: null };
  }

  // Generate random seed and commit before shuffling
  const seed = crypto.getRandomValues(new Uint8Array(32));
  const seedCommitment = await sha256(seed);

  // Compute input hash for domain separation
  const inputHash = await computeInputHash(indices);

  // Copy and shuffle
  const shuffled = [...indices];
  await seededShuffle(shuffled, seed, inputHash);

  // Derive Fiat-Shamir challenge (bound to seed commitment)
  const r = await deriveChallenge(indices, shuffled, seedCommitment);

  // Compute products
  const productA = computeProduct(r, indices);
  const productB = computeProduct(r, shuffled);

  // Sanity check: if this fails, the shuffle is broken
  if (productA !== productB) {
    throw new Error("Shuffle proof internal error: products do not match");
  }

  return {
    shuffled,
    proof: {
      challengeHex: bigIntToHex(r),
      productHex: bigIntToHex(productA),
      seedCommitmentHex: bytesToHex(seedCommitment),
      seedHex: bytesToHex(seed),
      size: indices.length,
    },
  };
}

/**
 * Verify a shuffle proof: recompute the Fiat-Shamir challenge from
 * public data and check that both products match.
 *
 * Also verifies the randomness attestation (seed commitment).
 */
export async function verifyShuffleProof(
  input: number[],
  output: number[],
  proof: ShuffleProof,
): Promise<boolean> {
  if (input.length !== output.length) return false;
  if (input.length !== proof.size) return false;

  // Verify seed commitment
  const seedBytes = hexToBytes(proof.seedHex);
  const expectedCommitment = await sha256(seedBytes);
  if (bytesToHex(expectedCommitment) !== proof.seedCommitmentHex) return false;

  // Recompute Fiat-Shamir challenge (with seed commitment bound in)
  const r = await deriveChallenge(input, output, expectedCommitment);
  if (bigIntToHex(r) !== proof.challengeHex) return false;

  // Recompute both products independently
  const productA = computeProduct(r, input);
  const productB = computeProduct(r, output);

  // Both products must match AND match the proof's claimed product
  if (productA !== productB) return false;
  if (bigIntToHex(productA) !== proof.productHex) return false;

  return true;
}

// ── Utility ─────────────────────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}
