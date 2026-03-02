/**
 * Font fingerprint detection.
 *
 * Scans PDF bytes for /Font resources with subset prefix patterns like
 * "ABCDEF+FontName". These prefixes uniquely identify font subsets
 * created by specific software, potentially fingerprinting the source.
 */

import { PDFDocument, PDFName, PDFDict, PDFRef } from "pdf-lib";

export type FontDetectReport = {
  fontWarning: boolean;
  customFontNames: string[];
};

// Subset font prefix pattern: 6 uppercase letters + "+"
const SUBSET_PREFIX_RE = /^[A-Z]{6}\+/;

export async function detectFontFingerprints(
  pdfBytes: Uint8Array,
): Promise<FontDetectReport> {
  const customFontNames: string[] = [];

  try {
    const doc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true,
      updateMetadata: false,
    });

    const pages = doc.getPages();
    for (const page of pages) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdf-lib internals
        const node = (page as any).node;
        const resources = node?.get?.(PDFName.of("Resources"));
        if (!resources) continue;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdf-lib internals
        const fonts = resolveMaybe(resources, "Font", (doc as any).context);
        if (!fonts) continue;

        const fontDict = fonts instanceof PDFDict ? fonts : null;
        if (!fontDict) continue;

        const entries = fontDict.entries();
        for (const [, value] of entries) {
          try {
            const fontObj = value instanceof PDFRef
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdf-lib internals
              ? (doc as any).context.lookup(value)
              : value;
            if (!fontObj) continue;

            const baseFont = fontObj instanceof PDFDict
              ? fontObj.get?.(PDFName.of("BaseFont"))
              : null;
            if (!baseFont) continue;

            const name = baseFont.toString?.()?.replace(/^\//, "") ?? "";
            if (name && SUBSET_PREFIX_RE.test(name)) {
              if (!customFontNames.includes(name)) {
                customFontNames.push(name);
              }
            }
          } catch {
            // skip individual font
          }
        }
      } catch {
        // skip page
      }
    }
  } catch {
    // If PDF can't be parsed, return empty report
  }

  return {
    fontWarning: customFontNames.length > 0,
    customFontNames,
  };
}

function resolveMaybe(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdf-lib internal dict types
  dict: any,
  key: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any,
): PDFDict | null {
  try {
    const val = dict instanceof PDFDict
      ? dict.get?.(PDFName.of(key))
      : dict?.get?.(PDFName.of(key));
    if (!val) return null;
    if (val instanceof PDFRef) {
      return context?.lookup?.(val) ?? null;
    }
    return val instanceof PDFDict ? val : null;
  } catch {
    return null;
  }
}
