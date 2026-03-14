import { startCspListener } from "../cspViolationListener";
import type { AuditEventCsp } from "../types";

export function createCspMonitor(): {
  start: () => void;
  stop: () => AuditEventCsp[];
} {
  let listener: ReturnType<typeof startCspListener> | null = null;
  return {
    start() {
      listener = startCspListener();
    },
    stop(): AuditEventCsp[] {
      if (!listener) return [];
      const violations = listener.getViolations();
      listener.stop();
      listener = null;
      return violations.map((v) => ({
        type: "csp-violation" as const,
        blockedURI: v.blockedURI,
        violatedDirective: v.violatedDirective,
        originalPolicy: v.originalPolicy,
        timestamp: v.timestamp,
      }));
    },
  };
}
