/**
 * RFC 6962 Merkle Tree for tamper-evident audit logs.
 *
 * Provides:
 * - O(log n) inclusion proofs ("event X is in the log")
 * - ECDSA-signed tree heads (session-scoped attestation)
 * - Pedersen commitments per leaf (selective disclosure)
 *
 * Domain separation (W3C Merkle Disclosure 2021):
 *   leafHash(d)     = SHA-256(0x00 || d)
 *   nodeHash(L, R)  = SHA-256(0x01 || L || R)
 *
 * Odd-count splitting: largest power of 2 less than n (RFC 6962),
 * NOT Bitcoin's duplicate-last-leaf (which creates root collisions).
 *
 * Note on signed tree heads: the signing key is ephemeral (generated
 * per export). This proves internal consistency — the same entity that
 * created the data signed it. It does NOT provide third-party attestation.
 * A forger can generate a new key and re-sign. This is documented
 * intentionally: the Merkle structure + inclusion proofs are the real
 * integrity mechanism. The signature binds the root to a timestamp.
 */

import { sha256 } from "../sha256";
import { bytesToHex } from "../hex";
import type {
  MerkleAuditData,
  MerkleAuditDataWithCommitments,
  InclusionProof,
  SignedTreeHead,
  PedersenCommitmentWithOpening,
  AuditEvent,
} from "./types";
import { commit as pedersenCommit } from "../crypto/pedersen";

// ── Shared hex utility ──────────────────────────────────────────────────

export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

// ── Domain-separated hashing ────────────────────────────────────────────

const LEAF_PREFIX = new Uint8Array([0x00]);
const NODE_PREFIX = new Uint8Array([0x01]);

export async function leafHash(data: Uint8Array): Promise<Uint8Array> {
  const input = new Uint8Array(1 + data.length);
  input.set(LEAF_PREFIX, 0);
  input.set(data, 1);
  return sha256(input);
}

export async function nodeHash(
  left: Uint8Array,
  right: Uint8Array,
): Promise<Uint8Array> {
  const input = new Uint8Array(1 + left.length + right.length);
  input.set(NODE_PREFIX, 0);
  input.set(left, 1);
  input.set(right, 1 + left.length);
  return sha256(input);
}

// ── Leaf serialization ──────────────────────────────────────────────────

const LEAF_VERSION = 1;

const EVENT_TYPE_MAP: Record<string, number> = {
  "network-request": 1,
  "csp-violation": 2,
  "dom-injection": 3,
};

/**
 * Canonically serialize an audit event to a deterministic byte string.
 * Avoids JSON.stringify which is non-portable across JS engines
 * (property order, Unicode escaping, number formatting can vary).
 *
 * Format: type_str(NUL-terminated) + field pairs (key NUL value NUL)
 * sorted alphabetically by key. All values coerced to strings.
 */
function canonicalEventBytes(event: AuditEvent): Uint8Array {
  const parts: string[] = [event.type, "\0"];
  const keys = Object.keys(event).filter((k) => k !== "type").sort();
  for (const key of keys) {
    const val = (event as Record<string, unknown>)[key];
    parts.push(key, "\0", String(val ?? ""), "\0");
  }
  return new TextEncoder().encode(parts.join(""));
}

/**
 * Serialize an audit event into a fixed-structure leaf.
 * Format: version(u8) + timestamp(u64BE) + event_type(u16BE) + event_hash(32B)
 * = 43 bytes fixed.
 *
 * Ordering is guaranteed by the Merkle tree leaf indices — no prev_root
 * chain needed (which would make inclusion proofs O(n) instead of O(log n)).
 */
export async function serializeLeaf(event: AuditEvent): Promise<Uint8Array> {
  const eventBytes = canonicalEventBytes(event);
  const eventHash = await sha256(eventBytes);
  const eventType = EVENT_TYPE_MAP[event.type] ?? 0;

  const buf = new Uint8Array(43);
  buf[0] = LEAF_VERSION;

  const ts = BigInt(event.timestamp);
  const view = new DataView(buf.buffer as ArrayBuffer, buf.byteOffset, buf.byteLength);
  view.setBigUint64(1, ts, false);
  view.setUint16(9, eventType, false);
  buf.set(eventHash, 11);

  return buf;
}

// ── Tree building (RFC 6962 largest-power-of-2 split) ───────────────────

/** Largest power of 2 strictly less than n. */
function largestPow2LessThan(n: number): number {
  if (n <= 1) return 0;
  let k = 1;
  while (k * 2 < n) k *= 2;
  return k;
}

type MerkleNode = {
  hash: Uint8Array;
  left?: MerkleNode;
  right?: MerkleNode;
  leafIndex?: number;
};

async function buildSubtree(
  leafHashes: Uint8Array[],
  startIndex: number,
): Promise<MerkleNode> {
  const n = leafHashes.length;
  if (n === 1) {
    return { hash: leafHashes[0], leafIndex: startIndex };
  }

  const split = largestPow2LessThan(n);
  const left = await buildSubtree(leafHashes.slice(0, split), startIndex);
  const right = await buildSubtree(leafHashes.slice(split), startIndex + split);
  const hash = await nodeHash(left.hash, right.hash);

  return { hash, left, right };
}

// ── Inclusion proof ─────────────────────────────────────────────────────

function collectInclusionProof(
  node: MerkleNode,
  targetLeafIndex: number,
  totalLeaves: number,
): { hash: Uint8Array; direction: "left" | "right" }[] {
  if (totalLeaves === 1) return [];

  const split = largestPow2LessThan(totalLeaves);
  if (targetLeafIndex < split) {
    const proof = collectInclusionProof(node.left!, targetLeafIndex, split);
    proof.push({ hash: node.right!.hash, direction: "right" });
    return proof;
  } else {
    const proof = collectInclusionProof(
      node.right!,
      targetLeafIndex - split,
      totalLeaves - split,
    );
    proof.push({ hash: node.left!.hash, direction: "left" });
    return proof;
  }
}

/** Verify an inclusion proof for a given leaf hash against a known root. */
export async function verifyInclusionProof(
  leafHashValue: Uint8Array,
  proof: InclusionProof,
  expectedRoot: Uint8Array,
): Promise<boolean> {
  let current = leafHashValue;
  for (const step of proof.path) {
    if (step.direction === "right") {
      current = await nodeHash(current, step.hash);
    } else {
      current = await nodeHash(step.hash, current);
    }
  }
  return arraysEqual(current, expectedRoot);
}

// ── Signed tree head ────────────────────────────────────────────────────

/**
 * Sign a tree head with an ephemeral ECDSA P-256 key.
 *
 * IMPORTANT: This is self-attestation, not third-party verification.
 * The ephemeral key is generated per export. Anyone with the export data
 * could forge a new valid signature. The value is binding the root hash
 * to a specific timestamp — not proving who created it.
 */
async function signTreeHead(
  root: Uint8Array,
  treeSize: number,
  timestamp: number,
): Promise<SignedTreeHead> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign", "verify"],
  );

  const payload = new Uint8Array(4 + 8 + 32);
  const view = new DataView(payload.buffer as ArrayBuffer);
  view.setUint32(0, treeSize, false);
  view.setBigUint64(4, BigInt(timestamp), false);
  payload.set(root, 12);

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    keyPair.privateKey,
    payload.buffer as ArrayBuffer,
  );

  const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);

  return {
    rootHex: bytesToHex(root),
    treeSize,
    timestamp,
    signatureHex: bytesToHex(new Uint8Array(signature)),
    publicKeyJwk,
  };
}

/** Verify a signed tree head (self-attestation check). */
export async function verifySignedTreeHead(
  head: SignedTreeHead,
): Promise<boolean> {
  const publicKey = await crypto.subtle.importKey(
    "jwk",
    head.publicKeyJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );

  const root = hexToBytes(head.rootHex);
  const payload = new Uint8Array(4 + 8 + 32);
  const view = new DataView(payload.buffer as ArrayBuffer);
  view.setUint32(0, head.treeSize, false);
  view.setBigUint64(4, BigInt(head.timestamp), false);
  payload.set(root, 12);

  const signature = hexToBytes(head.signatureHex);

  return crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    publicKey,
    signature.buffer as ArrayBuffer,
    payload.buffer as ArrayBuffer,
  );
}

// ── Main entry point ────────────────────────────────────────────────────

/**
 * Build a Merkle tree from audit events. O(n log n) construction,
 * O(log n) inclusion proof verification.
 */
export async function buildMerkleTree(
  events: AuditEvent[],
): Promise<MerkleAuditData> {
  if (events.length === 0) {
    const emptyRoot = new Uint8Array(32);
    const timestamp = Date.now();
    const signedHead = await signTreeHead(emptyRoot, 0, timestamp);
    return {
      rootHex: bytesToHex(emptyRoot),
      signedHead,
      leafHashes: [],
      inclusionProofs: [],
    };
  }

  // Build leaf hashes — O(n), no prev_root chain
  const leafHashes: Uint8Array[] = [];
  for (const event of events) {
    const leafData = await serializeLeaf(event);
    const lh: Uint8Array = await leafHash(leafData);
    leafHashes.push(lh);
  }

  const tree = await buildSubtree(leafHashes, 0);
  const timestamp = Date.now();
  const signedHead = await signTreeHead(tree.hash, events.length, timestamp);

  const inclusionProofs: InclusionProof[] = [];
  for (let i = 0; i < events.length; i++) {
    const path = collectInclusionProof(tree, i, events.length);
    inclusionProofs.push({
      leafIndex: i,
      leafHashHex: bytesToHex(leafHashes[i]),
      treeSize: events.length,
      path,
    });
  }

  return {
    rootHex: bytesToHex(tree.hash),
    signedHead,
    leafHashes: leafHashes.map(bytesToHex),
    inclusionProofs,
  };
}

/**
 * Build a Merkle tree with Pedersen commitments for each leaf.
 *
 * Returns blinding factors alongside commitments so selective disclosure
 * is actually possible: open a specific commitment by revealing its
 * blinding factor + leaf hash.
 */
export async function buildMerkleTreeWithCommitments(
  events: AuditEvent[],
): Promise<MerkleAuditDataWithCommitments> {
  const base = await buildMerkleTree(events);

  const commitments: PedersenCommitmentWithOpening[] = [];
  for (const leafHashHex of base.leafHashes) {
    const leafBytes = hexToBytes(leafHashHex);
    const c = pedersenCommit(leafBytes);
    commitments.push({
      commitmentHex: c.pointHex,
      leafHashHex,
      blindingHex: c.blindingHex,
    });
  }

  return { ...base, commitments };
}

// ── Utilities ───────────────────────────────────────────────────────────

function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
