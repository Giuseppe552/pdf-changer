export type CopyIssueSeverity = "critical" | "bullshit" | "shit" | "fuck-off";

export type CopyIssueType =
  | "unsupported-trust-claim"
  | "feature-availability-mismatch"
  | "future-promise-without-contract"
  | "placeholder-scaffold-copy"
  | "non-actionable-paragraph"
  | "repetition-template-echo"
  | "jargon-without-definition"
  | "weak-cta-utility";

export type CopyFinding = {
  issueType: CopyIssueType;
  severity: CopyIssueSeverity;
  message: string;
  route: string;
  routeType: string;
  file: string | null;
  line: number;
  column: number;
  unitId: string | null;
  text: string | null;
  details: Record<string, unknown>;
};

export type CopyPageScorecard = {
  route: string;
  routeType: string;
  cluster: string;
  unitCount: number;
  claimCount: number;
  evidenceBackedClaimCount: number;
  actionableSentenceRatio: number;
  repetitionSimilarityMax: number;
  repetitionPeerRoute: string | null;
  severityCounts: Record<CopyIssueSeverity, number>;
  score: number;
};

export type CopyAuditReport = {
  generatedAt: string;
  scannedFiles: number;
  unitCount: number;
  summary: {
    findingCount: number;
    pageCount: number;
    severityCounts: Record<CopyIssueSeverity, number>;
    issueCounts: Record<string, number>;
  };
  pages: CopyPageScorecard[];
  findings: CopyFinding[];
};

