import { runAudited } from "./auditRunner";
import { createSandbox } from "./sandbox/sandboxBridge";
import type { AuditReport } from "./types";
import type { ProgressCallback } from "../progress";

export async function processAudited(opts: {
  toolName: string;
  inputBytes: Uint8Array;
  config?: unknown;
  /** Bypass sandbox — run directly with audit monitors only. Default: false */
  directMode?: boolean;
  /** Direct processing function — required if directMode or sandbox fallback */
  processFn?: (
    input: Uint8Array,
  ) => Promise<{ outputBytes: Uint8Array; [k: string]: unknown }>;
  /** Progress callback for UI feedback */
  onProgress?: ProgressCallback;
}): Promise<{
  outputBytes: Uint8Array;
  toolReport: unknown;
  auditReport: AuditReport;
}> {
  const { toolName, inputBytes, config, directMode, processFn } = opts;

  if (!directMode) {
    try {
      const sandbox = createSandbox();
      const { result, report } = await runAudited({
        toolName,
        inputBytes,
        processFn: async (bytes) => {
          const { outputBytes, toolReport } = await sandbox.process(
            toolName,
            bytes,
            config,
          );
          return { outputBytes, toolReport };
        },
      });
      return {
        outputBytes: result.outputBytes,
        toolReport: (result as Record<string, unknown>).toolReport,
        auditReport: report,
      };
    } catch {
      // Sandbox failed — fall through to direct mode
    }
  }

  if (!processFn) throw new Error("processFn required for direct mode");
  const { result, report } = await runAudited({ toolName, inputBytes, processFn });
  return {
    outputBytes: result.outputBytes,
    toolReport: result,
    auditReport: report,
  };
}
