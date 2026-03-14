import { patchWebRTC, restoreWebRTC } from "./patchWebRTC";
import { createPerformanceMonitor } from "./monitors/performanceMonitor";
import { createCspMonitor } from "./monitors/cspMonitor";
import { createDomMonitor } from "./monitors/domMonitor";
import { sha256 } from "../sha256";
import { bytesToHex } from "../hex";
import type { AuditEvent, AuditReport, AuditVerdict } from "./types";

export async function runAudited<R>(opts: {
  toolName: string;
  inputBytes: Uint8Array;
  processFn: (input: Uint8Array) => Promise<{ outputBytes: Uint8Array } & R>;
}): Promise<{ result: { outputBytes: Uint8Array } & R; report: AuditReport }> {
  const t0 = performance.now();

  patchWebRTC();

  const perfMon = createPerformanceMonitor();
  const cspMon = createCspMonitor();
  const domMon = createDomMonitor();
  perfMon.start();
  cspMon.start();
  domMon.start();

  const inputSha = await sha256(opts.inputBytes);

  let result: { outputBytes: Uint8Array } & R;
  try {
    result = await opts.processFn(opts.inputBytes);
  } catch (err) {
    perfMon.stop();
    cspMon.stop();
    domMon.stop();
    restoreWebRTC();
    throw err;
  }

  // Wait for any late async network events to flush
  await new Promise((r) => setTimeout(r, 300));

  const perfEvents = perfMon.stop();
  const cspEvents = cspMon.stop();
  const domEvents = domMon.stop();
  const allEvents: AuditEvent[] = [...perfEvents, ...cspEvents, ...domEvents];

  restoreWebRTC();

  const outputSha = await sha256(result.outputBytes);

  let verdict: AuditVerdict = "clean";
  if (allEvents.length > 0) verdict = "suspicious";

  let cspPolicyActive: string | null = null;
  try {
    const meta = document.querySelector(
      'meta[http-equiv="Content-Security-Policy"]',
    );
    cspPolicyActive = meta?.getAttribute("content") ?? null;
  } catch {
    /* ignore in non-browser environments */
  }

  const report: AuditReport = {
    verdict,
    events: allEvents,
    durationMs: Math.round(performance.now() - t0),
    toolName: opts.toolName,
    inputSizeBytes: opts.inputBytes.byteLength,
    outputSizeBytes: result.outputBytes.byteLength,
    inputSha256Hex: bytesToHex(inputSha),
    outputSha256Hex: bytesToHex(outputSha),
    timestamp: Date.now(),
    webrtcPatched: true,
    monitors: ["performance", "csp", "dom"],
    cspPolicyActive,
  };

  return { result, report };
}
