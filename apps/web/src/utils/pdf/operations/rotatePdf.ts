import { PDFDocument, degrees } from "pdf-lib";
import { parsePageRanges } from "../pageRanges";
import type { PdfOperation } from "./types";

export type RotatePdfInput = {
  inputBytes: Uint8Array;
  angleDegrees: 90 | 180 | 270;
  pageRanges: string; // "" = all pages
};

export type RotatePdfOutput = {
  outputBytes: Uint8Array;
  pageCount: number;
  rotatedCount: number;
};

const VALID_ANGLES = new Set([90, 180, 270]);

export const rotatePdf: PdfOperation<RotatePdfInput, RotatePdfOutput> = async ({
  inputBytes,
  angleDegrees,
  pageRanges,
}) => {
  if (!VALID_ANGLES.has(angleDegrees)) {
    throw new Error("Angle must be 90, 180, or 270 degrees.");
  }

  const doc = await PDFDocument.load(inputBytes, { ignoreEncryption: false });
  const pageCount = doc.getPageCount();
  const pages = doc.getPages();

  let targetIndices: Set<number>;
  if (pageRanges.trim() === "") {
    targetIndices = new Set(pages.map((_, i) => i));
  } else {
    const ranges = parsePageRanges(pageRanges, pageCount);
    targetIndices = new Set(ranges.flat());
    if (targetIndices.size === 0) {
      throw new Error("No valid pages selected for rotation.");
    }
  }

  for (const idx of targetIndices) {
    const page = pages[idx];
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + angleDegrees) % 360));
  }

  const outputBytes = await doc.save({ useObjectStreams: true });
  return { outputBytes, pageCount, rotatedCount: targetIndices.size };
};
