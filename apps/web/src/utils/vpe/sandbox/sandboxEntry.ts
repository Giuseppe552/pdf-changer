// This file is bundled separately by esbuild and inlined into sandbox.html.
// It runs inside a sandboxed iframe with opaque origin — no network access.

import { deepScrubPdf } from "../../pdf/deepScrub";
import { paranoidScrubPdf } from "../../pdf/paranoidScrub";
import { compressPdf } from "../../pdf/operations/compressPdf";
import { rotatePdf } from "../../pdf/operations/rotatePdf";
import { cropPdf } from "../../pdf/operations/cropPdf";
import { flattenToImagePdf } from "../../pdf/operations/flattenToImagePdf";
import { watermarkPdf } from "../../pdf/operations/watermarkPdf";
import { pageNumbersPdf } from "../../pdf/operations/pageNumbersPdf";
import { removePagesPdf } from "../../pdf/operations/removePagesPdf";
import { protectPdf } from "../../pdf/operations/protectPdf";
import { unlockPdf } from "../../pdf/operations/unlockPdf";
import { redactPdf } from "../../pdf/operations/redactPdf";
import { signPdf } from "../../pdf/operations/signPdf";
import { fillFormPdf } from "../../pdf/operations/fillFormPdf";
// OCR, imageToPdf, and pdfToImage are excluded from sandbox:
// OCR outputs text (not PDF bytes), pdfToImage outputs image data URLs,
// and imageToPdf takes multiple image inputs. These use direct mode with audit monitors.

type ToolFn = (
  bytes: Uint8Array,
  config?: Record<string, unknown>,
) => Promise<{ outputBytes: Uint8Array; [k: string]: unknown }>;

/* eslint-disable @typescript-eslint/no-explicit-any -- sandbox dispatch needs loose types */
const TOOLS: Record<string, ToolFn> = {
  "deep-scrub": async (bytes) => deepScrubPdf(bytes),
  "paranoid-scrub": async (bytes) => paranoidScrubPdf(bytes),
  compress: async (bytes) =>
    compressPdf({ inputBytes: bytes }),
  rotate: async (bytes, config) =>
    rotatePdf({ inputBytes: bytes, ...(config as any) }),
  crop: async (bytes, config) =>
    cropPdf({ inputBytes: bytes, ...(config as any) }),
  flatten: async (bytes, config) =>
    flattenToImagePdf({ pdfBytes: bytes, ...(config as any) }),
  watermark: async (bytes, config) =>
    watermarkPdf({ inputBytes: bytes, ...(config as any) }),
  "page-numbers": async (bytes, config) =>
    pageNumbersPdf({ inputBytes: bytes, ...(config as any) }),
  "remove-pages": async (bytes, config) =>
    removePagesPdf({ inputBytes: bytes, ...(config as any) }),
  protect: async (bytes, config) =>
    protectPdf({ inputBytes: bytes, ...(config as any) }),
  unlock: async (bytes, config) =>
    unlockPdf({ inputBytes: bytes, ...(config as any) }),
  redact: async (bytes, config) =>
    redactPdf({ pdfBytes: bytes, ...(config as any) }),
  sign: async (bytes, config) =>
    signPdf({ inputBytes: bytes, ...(config as any) }),
  "fill-form": async (bytes, config) =>
    fillFormPdf({ inputBytes: bytes, ...(config as any) }),
};
/* eslint-enable @typescript-eslint/no-explicit-any */

// Signal to the parent that the sandbox is loaded and ready to receive work
if (self.parent) {
  (self.parent as WindowProxy).postMessage({ type: "ready" }, "*");
}

self.addEventListener("message", async (e: MessageEvent) => {
  const { id, toolName, inputBytes, config } = e.data;
  try {
    const fn = TOOLS[toolName];
    if (!fn) throw new Error(`Unknown tool: ${toolName}`);
    const result = await fn(new Uint8Array(inputBytes), config);
    const output = result.outputBytes;
    const report = { ...result, outputBytes: undefined };
    (e.source as WindowProxy).postMessage(
      { id, type: "result", outputBytes: output.buffer, report },
      e.origin === "null" ? "*" : e.origin,
      [output.buffer],
    );
  } catch (err) {
    (e.source as WindowProxy).postMessage(
      {
        id,
        type: "error",
        message: err instanceof Error ? err.message : "Processing failed",
      },
      e.origin === "null" ? "*" : e.origin,
    );
  }
});
