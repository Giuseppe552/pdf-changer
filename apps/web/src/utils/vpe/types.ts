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
