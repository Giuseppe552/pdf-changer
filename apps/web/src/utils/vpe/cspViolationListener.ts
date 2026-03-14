export type CspViolation = {
  blockedURI: string;
  violatedDirective: string;
  originalPolicy: string;
  timestamp: number;
};

export function startCspListener(): {
  stop: () => void;
  getViolations: () => readonly CspViolation[];
} {
  const violations: CspViolation[] = [];
  const handler = (e: SecurityPolicyViolationEvent) => {
    if (violations.length >= 100) return;
    violations.push({
      blockedURI: e.blockedURI,
      violatedDirective: e.violatedDirective,
      originalPolicy: e.originalPolicy,
      timestamp: Date.now(),
    });
  };
  document.addEventListener("securitypolicyviolation", handler);
  return {
    stop: () => document.removeEventListener("securitypolicyviolation", handler),
    getViolations: () => violations,
  };
}
