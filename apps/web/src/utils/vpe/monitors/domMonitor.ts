import type { AuditEventDom } from "../types";

const SUSPICIOUS_TAGS = new Set([
  "SCRIPT",
  "LINK",
  "IMG",
  "IFRAME",
  "OBJECT",
  "EMBED",
  "VIDEO",
  "AUDIO",
]);

export function createDomMonitor(): {
  start: () => void;
  stop: () => AuditEventDom[];
} {
  const events: AuditEventDom[] = [];
  let observer: MutationObserver | null = null;

  return {
    start() {
      observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (
              node instanceof HTMLElement &&
              SUSPICIOUS_TAGS.has(node.tagName)
            ) {
              events.push({
                type: "dom-injection" as const,
                tagName: node.tagName,
                src:
                  node.getAttribute("src") ??
                  node.getAttribute("href") ??
                  null,
                timestamp: Date.now(),
              });
            }
          }
        }
      });
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    },
    stop(): AuditEventDom[] {
      observer?.disconnect();
      observer = null;
      return [...events];
    },
  };
}
