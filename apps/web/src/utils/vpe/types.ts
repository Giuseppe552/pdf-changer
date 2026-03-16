export type AuditEventNetwork = {
  type: "network-request";
  url: string;
  initiatorType: string;
  timestamp: number;
};

export type AuditEventCsp = {
  type: "csp-violation";
  blockedURI: string;
  violatedDirective: string;
  originalPolicy: string;
  timestamp: number;
};

export type AuditEventDom = {
  type: "dom-injection";
  tagName: string;
  src: string | null;
  timestamp: number;
};

export type AuditEvent = AuditEventNetwork | AuditEventCsp | AuditEventDom;

export type AuditVerdict = "clean" | "suspicious" | "failed";

export type AuditReport = {
  verdict: AuditVerdict;
  events: AuditEvent[];
  durationMs: number;
  toolName: string;
  inputSizeBytes: number;
  outputSizeBytes: number;
  inputSha256Hex: string;
  outputSha256Hex: string;
  timestamp: number;
  webrtcPatched: boolean;
  monitors: string[];
  cspPolicyActive: string | null;
};

// ── Merkle Tree types ─────────────────────────────────────────────────────

export type InclusionProof = {
  leafIndex: number;
  leafHashHex: string;
  treeSize: number;
  path: { hash: Uint8Array; direction: "left" | "right" }[];
};

export type SignedTreeHead = {
  rootHex: string;
  treeSize: number;
  timestamp: number;
  signatureHex: string;
  publicKeyJwk: JsonWebKey;
};

export type MerkleAuditData = {
  rootHex: string;
  signedHead: SignedTreeHead;
  leafHashes: string[];
  inclusionProofs: InclusionProof[];
};

// ── Pedersen Commitment types ─────────────────────────────────────────────

/** Commitment WITHOUT opening info — safe to include in public exports. */
export type PedersenCommitment = {
  commitmentHex: string;
  leafHashHex: string;
};

/** Commitment WITH opening info — needed for selective disclosure.
 *  The blindingHex MUST be kept private until disclosure. */
export type PedersenCommitmentWithOpening = PedersenCommitment & {
  blindingHex: string;
};

export type MerkleAuditDataWithCommitments = MerkleAuditData & {
  commitments: PedersenCommitmentWithOpening[];
};
