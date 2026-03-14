import type { AuditEventNetwork } from "../types";

export function createPerformanceMonitor(): {
  start: () => void;
  stop: () => AuditEventNetwork[];
} {
  const entries: PerformanceResourceTiming[] = [];
  let observer: PerformanceObserver | null = null;

  return {
    start() {
      performance.clearResourceTimings();
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          entries.push(entry as PerformanceResourceTiming);
        }
      });
      observer.observe({ entryTypes: ["resource"] });
    },
    stop(): AuditEventNetwork[] {
      observer?.disconnect();
      observer = null;
      return entries.map((e) => ({
        type: "network-request" as const,
        url: e.name,
        initiatorType: e.initiatorType,
        timestamp: Math.round(e.startTime),
      }));
    },
  };
}
