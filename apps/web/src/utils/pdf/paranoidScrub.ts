/**
 * Paranoid Scrub: extended scrub that goes beyond deepScrub.
 *
 * Runs deepScrubPdf first, then additionally removes:
 * - /JavaScript and /JS entries from the object tree
 * - /EmbeddedFiles name tree
 * - ICC profiles (/ICCBased color spaces)
 * - /ID array from trailer (document fingerprint)
 * - Normalizes Producer to "PDF" (empty string is itself a fingerprint)
 * - Applies EXIF strip from Phase 2
 *
 * Uses pdf-lib internals (fragile but necessary). All internal access
 * is wrapped in try-catch.
 */

import { PDFDocument, PDFName } from "pdf-lib";
import { deepScrubPdf } from "./deepScrub";
import { stripExifFromPdfBytes, type ExifStripReport } from "./exifStrip";
import { randomizeStructure } from "./structureRandomize";
import { type ProgressCallback, noopProgress, progress } from "../progress";

export type ParanoidScrubReport = {
  pageCount: number;
  metadataBefore: Record<string, string | null>;
  inputSha256: Uint8Array;
  outputSha256: Uint8Array;
  exifWarning: boolean;
  exifStripReport: ExifStripReport | null;
  paranoid: {
    javascriptRemoved: boolean;
    embeddedFilesRemoved: boolean;
    iccProfilesRemoved: boolean;
    idArrayRemoved: boolean;
    producerNormalized: boolean;
  };
};

export async function paranoidScrubPdf(
  inputBytes: Uint8Array,
  onProgress: ProgressCallback = noopProgress,
): Promise<{
  outputBytes: Uint8Array;
  report: ParanoidScrubReport;
}> {
  // Step 1: Run base deep scrub (includes EXIF strip)
  // Deep scrub gets 0–0.5 of the total progress
  const { outputBytes: scrubbed, report: baseReport } = await deepScrubPdf(
    inputBytes,
    (u) => onProgress({ ...u, fraction: u.fraction !== null ? u.fraction * 0.5 : null }),
  );

  // Step 2: Load scrubbed output for additional paranoid removals
  onProgress(progress("paranoid-cleanup", 0.55));
  const doc = await PDFDocument.load(scrubbed, { updateMetadata: false });

  const paranoid = {
    javascriptRemoved: false,
    embeddedFilesRemoved: false,
    iccProfilesRemoved: false,
    idArrayRemoved: false,
    producerNormalized: false,
  };

  // Remove /JavaScript and /JS entries from catalog Names tree
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdf-lib internals
    const catalog = (doc as any).catalog;
    if (catalog) {
      catalog.delete?.(PDFName.of("JavaScript"));
      catalog.delete?.(PDFName.of("JS"));
      paranoid.javascriptRemoved = true;
    }
  } catch {
    // ignore
  }

  // Remove /EmbeddedFiles from catalog
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdf-lib internals
    const catalog = (doc as any).catalog;
    if (catalog) {
      catalog.delete?.(PDFName.of("EmbeddedFiles"));
      paranoid.embeddedFilesRemoved = true;
    }
  } catch {
    // ignore
  }

  // Remove ICC profiles: scan context for /ICCBased color space references
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdf-lib internals
    const context = (doc as any).context;
    if (context && context.enumerateIndirectObjects) {
      for (const [ref, obj] of context.enumerateIndirectObjects()) {
        try {
          const dict = obj?.dict ?? obj;
          if (dict?.get?.(PDFName.of("Subtype"))?.toString?.() === "/ICCBased") {
            context.delete(ref);
            paranoid.iccProfilesRemoved = true;
          }
        } catch {
          // skip individual objects
        }
      }
    }
  } catch {
    // ignore
  }

  // Remove /ID array from trailer (document fingerprint)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdf-lib internals
    const context = (doc as any).context;
    if (context?.trailerInfo) {
      delete context.trailerInfo.ID;
      paranoid.idArrayRemoved = true;
    }
  } catch {
    // ignore
  }

  // Normalize producer to "PDF" (empty string is itself a fingerprint)
  doc.setProducer("PDF");
  paranoid.producerNormalized = true;

  onProgress(progress("saving", 0.7));
  let finalBytes = new Uint8Array(await doc.save());

  onProgress(progress("stripping-exif", 0.75));
  // Step 3: Additional EXIF strip pass on final output
  let exifStripReport = baseReport.exifStripReport;
  try {
    const stripResult = stripExifFromPdfBytes(finalBytes);
    finalBytes = new Uint8Array(stripResult.outputBytes);
    if (
      stripResult.report.jpegSegmentsStripped > 0 ||
      stripResult.report.pngChunksStripped > 0
    ) {
      exifStripReport = stripResult.report;
    }
  } catch {
    // best effort
  }

  onProgress(progress("randomizing", 0.85));
  // Randomize internal object structure to prevent tool fingerprinting
  try {
    const result = await randomizeStructure(finalBytes);
    finalBytes = new Uint8Array(result.bytes);
  } catch {
    // best effort
  }

  onProgress(progress("verifying", 1));
  return {
    outputBytes: finalBytes,
    report: {
      ...baseReport,
      exifStripReport,
      paranoid,
    },
  };
}
