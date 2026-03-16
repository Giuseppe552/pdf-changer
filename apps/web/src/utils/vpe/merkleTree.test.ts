import { describe, expect, it } from "vitest";
import {
  leafHash,
  nodeHash,
  buildMerkleTree,
  buildMerkleTreeWithCommitments,
  verifyInclusionProof,
  verifySignedTreeHead,
  serializeLeaf,
  hexToBytes,
} from "./merkleTree";
import { bytesToHex } from "../hex";
import { verify as pedersenVerify } from "../crypto/pedersen";
import type { AuditEvent } from "./types";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeEvent(type: AuditEvent["type"], ts: number): AuditEvent {
  switch (type) {
    case "network-request":
      return { type, url: `https://example.com/${ts}`, initiatorType: "fetch", timestamp: ts };
    case "csp-violation":
      return { type, blockedURI: "https://evil.com", violatedDirective: "script-src", originalPolicy: "default-src 'self'", timestamp: ts };
    case "dom-injection":
      return { type, tagName: "script", src: "https://evil.com/inject.js", timestamp: ts };
  }
}

function makeEvents(count: number): AuditEvent[] {
  return Array.from({ length: count }, (_, i) =>
    makeEvent("network-request", 1000 + i),
  );
}

// ── Domain separation ───────────────────────────────────────────────────────

describe("domain separation", () => {
  it("leafHash and nodeHash produce different outputs for same input", async () => {
    const data = new Uint8Array([1, 2, 3, 4]);
    const lh = await leafHash(data);
    const nh = await nodeHash(data, data);
    expect(bytesToHex(lh)).not.toBe(bytesToHex(nh));
  });

  it("leafHash: 0x00 prefix is applied", async () => {
    const data = new Uint8Array([0x42]);
    const result = await leafHash(data);
    expect(result).toHaveLength(32);
    const raw = new Uint8Array(
      await crypto.subtle.digest("SHA-256", new Uint8Array([0x42])),
    );
    expect(bytesToHex(result)).not.toBe(bytesToHex(raw));
  });

  it("nodeHash: 0x01 prefix prevents second-preimage on tree structure", async () => {
    const left = new Uint8Array(32).fill(0xaa);
    const right = new Uint8Array(32).fill(0xbb);
    const nh = await nodeHash(left, right);

    const fakeLeafData = new Uint8Array(1 + 32 + 32);
    fakeLeafData[0] = 0x01;
    fakeLeafData.set(left, 1);
    fakeLeafData.set(right, 33);
    const fakeLh = await leafHash(fakeLeafData);

    expect(bytesToHex(nh)).not.toBe(bytesToHex(fakeLh));
  });
});

// ── Leaf serialization ──────────────────────────────────────────────────────

describe("serializeLeaf", () => {
  it("produces 43-byte fixed-size output", async () => {
    const event = makeEvent("network-request", 1234567890);
    const leaf = await serializeLeaf(event);
    expect(leaf).toHaveLength(43);
  });

  it("version byte is 1", async () => {
    const event = makeEvent("csp-violation", 1000);
    const leaf = await serializeLeaf(event);
    expect(leaf[0]).toBe(1);
  });

  it("deterministic: same event produces same leaf", async () => {
    const event = makeEvent("dom-injection", 42);
    const a = await serializeLeaf(event);
    const b = await serializeLeaf(event);
    expect(bytesToHex(a)).toBe(bytesToHex(b));
  });
});

// ── Tree building ───────────────────────────────────────────────────────────

describe("buildMerkleTree", () => {
  it("empty events → zero root, 0-size head", async () => {
    const result = await buildMerkleTree([]);
    expect(result.rootHex).toBe("0".repeat(64));
    expect(result.signedHead.treeSize).toBe(0);
    expect(result.leafHashes).toHaveLength(0);
    expect(result.inclusionProofs).toHaveLength(0);
  });

  it("single event → root equals leaf hash", async () => {
    const events = makeEvents(1);
    const result = await buildMerkleTree(events);
    expect(result.leafHashes).toHaveLength(1);
    expect(result.rootHex).toBe(result.leafHashes[0]);
    expect(result.inclusionProofs).toHaveLength(1);
    expect(result.inclusionProofs[0].path).toHaveLength(0);
  });

  it("two events → root is nodeHash(leaf0, leaf1)", async () => {
    const events = makeEvents(2);
    const result = await buildMerkleTree(events);
    const expected = await nodeHash(
      hexToBytes(result.leafHashes[0]),
      hexToBytes(result.leafHashes[1]),
    );
    expect(result.rootHex).toBe(bytesToHex(expected));
  });

  it("deterministic: same events produce same root", async () => {
    const events = makeEvents(5);
    const r1 = await buildMerkleTree(events);
    const r2 = await buildMerkleTree(events);
    expect(r1.rootHex).toBe(r2.rootHex);
    expect(r1.leafHashes).toEqual(r2.leafHashes);
  });

  it("different events produce different roots", async () => {
    const a = await buildMerkleTree(makeEvents(3));
    const b = await buildMerkleTree([
      ...makeEvents(2),
      makeEvent("csp-violation", 9999),
    ]);
    expect(a.rootHex).not.toBe(b.rootHex);
  });

  for (const count of [1, 2, 3, 4, 5, 7, 8, 15, 16, 17, 31, 32]) {
    it(`handles ${count} events correctly`, async () => {
      const events = makeEvents(count);
      const result = await buildMerkleTree(events);
      expect(result.leafHashes).toHaveLength(count);
      expect(result.inclusionProofs).toHaveLength(count);
      expect(result.signedHead.treeSize).toBe(count);
      expect(result.rootHex).toHaveLength(64);
    });
  }
});

// ── Inclusion proofs ────────────────────────────────────────────────────────

describe("inclusion proofs", () => {
  it("verify all inclusion proofs for 10-event tree", async () => {
    const events = makeEvents(10);
    const result = await buildMerkleTree(events);
    const root = hexToBytes(result.rootHex);

    for (let i = 0; i < events.length; i++) {
      const proof = result.inclusionProofs[i];
      const leafHashBytes = hexToBytes(proof.leafHashHex);
      const valid = await verifyInclusionProof(leafHashBytes, proof, root);
      expect(valid).toBe(true);
    }
  });

  it("proof fails with wrong leaf hash", async () => {
    const events = makeEvents(5);
    const result = await buildMerkleTree(events);
    const root = hexToBytes(result.rootHex);

    const proof = result.inclusionProofs[0];
    const wrongLeaf = new Uint8Array(32).fill(0xde);
    const valid = await verifyInclusionProof(wrongLeaf, proof, root);
    expect(valid).toBe(false);
  });

  it("proof fails with wrong root", async () => {
    const events = makeEvents(5);
    const result = await buildMerkleTree(events);

    const proof = result.inclusionProofs[0];
    const leafHash = hexToBytes(proof.leafHashHex);
    const wrongRoot = new Uint8Array(32).fill(0xbe);
    const valid = await verifyInclusionProof(leafHash, proof, wrongRoot);
    expect(valid).toBe(false);
  });

  it("proof path length is O(log n)", async () => {
    const events = makeEvents(64);
    const result = await buildMerkleTree(events);
    for (const proof of result.inclusionProofs) {
      expect(proof.path.length).toBeLessThanOrEqual(6);
    }
  });
});

// ── Signed tree heads ───────────────────────────────────────────────────────

describe("signed tree head", () => {
  it("signature verifies", async () => {
    const events = makeEvents(5);
    const result = await buildMerkleTree(events);
    const valid = await verifySignedTreeHead(result.signedHead);
    expect(valid).toBe(true);
  });

  it("tampered root fails verification", async () => {
    const events = makeEvents(5);
    const result = await buildMerkleTree(events);
    const tampered = { ...result.signedHead, rootHex: "ff".repeat(32) };
    const valid = await verifySignedTreeHead(tampered);
    expect(valid).toBe(false);
  });

  it("tampered tree size fails verification", async () => {
    const events = makeEvents(5);
    const result = await buildMerkleTree(events);
    const tampered = { ...result.signedHead, treeSize: 999 };
    const valid = await verifySignedTreeHead(tampered);
    expect(valid).toBe(false);
  });
});

// ── Pedersen commitments integration ────────────────────────────────────────

describe("buildMerkleTreeWithCommitments", () => {
  it("generates one commitment per leaf with opening info", async () => {
    const events = makeEvents(5);
    const result = await buildMerkleTreeWithCommitments(events);
    expect(result.commitments).toHaveLength(5);
    for (const c of result.commitments) {
      expect(c.commitmentHex).toBeTruthy();
      expect(c.leafHashHex).toBeTruthy();
      expect(c.blindingHex).toBeTruthy();
      expect(c.blindingHex).toHaveLength(64);
    }
  });

  it("commitment leafHashHex matches tree leafHashes", async () => {
    const events = makeEvents(3);
    const result = await buildMerkleTreeWithCommitments(events);
    for (let i = 0; i < events.length; i++) {
      expect(result.commitments[i].leafHashHex).toBe(result.leafHashes[i]);
    }
  });

  it("commitments can be opened for selective disclosure", async () => {
    const events = makeEvents(3);
    const result = await buildMerkleTreeWithCommitments(events);
    for (const c of result.commitments) {
      const valid = pedersenVerify({
        pointHex: c.commitmentHex,
        blindingHex: c.blindingHex,
        valueHex: c.leafHashHex,
      });
      expect(valid).toBe(true);
    }
  });
});
