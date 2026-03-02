import { PDFDocument } from "pdf-lib";
import { parsePageRanges } from "../pageRanges";
import type { PdfOperation } from "./types";

export type CropUnit = "percent" | "points";
export type CropMargins = { top: number; bottom: number; left: number; right: number };

export type CropPdfInput = {
  inputBytes: Uint8Array;
  margins: CropMargins;
  unit: CropUnit;
  pageRanges: string;
};

export type CropPdfOutput = {
  outputBytes: Uint8Array;
  pageCount: number;
  croppedCount: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export const cropPdf: PdfOperation<CropPdfInput, CropPdfOutput> = async ({
  inputBytes,
  margins,
  unit,
  pageRanges,
}) => {
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
      throw new Error("No valid pages selected for cropping.");
    }
  }

  for (const idx of targetIndices) {
    const page = pages[idx];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    let topPts: number;
    let bottomPts: number;
    let leftPts: number;
    let rightPts: number;

    if (unit === "percent") {
      topPts = clamp(margins.top, 0, 49) / 100 * pageHeight;
      bottomPts = clamp(margins.bottom, 0, 49) / 100 * pageHeight;
      leftPts = clamp(margins.left, 0, 49) / 100 * pageWidth;
      rightPts = clamp(margins.right, 0, 49) / 100 * pageWidth;
    } else {
      topPts = clamp(margins.top, 0, pageHeight / 2 - 1);
      bottomPts = clamp(margins.bottom, 0, pageHeight / 2 - 1);
      leftPts = clamp(margins.left, 0, pageWidth / 2 - 1);
      rightPts = clamp(margins.right, 0, pageWidth / 2 - 1);
    }

    const cropWidth = pageWidth - leftPts - rightPts;
    const cropHeight = pageHeight - topPts - bottomPts;

    if (cropWidth < 10 || cropHeight < 10) {
      throw new Error(
        `Crop area too small on page ${idx + 1}: ${cropWidth.toFixed(1)} × ${cropHeight.toFixed(1)} pts.`,
      );
    }

    page.setCropBox(leftPts, bottomPts, cropWidth, cropHeight);
  }

  const outputBytes = await doc.save({ useObjectStreams: true });
  return { outputBytes, pageCount, croppedCount: targetIndices.size };
};
