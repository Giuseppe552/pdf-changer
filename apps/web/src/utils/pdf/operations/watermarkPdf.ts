import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import type { PdfOperation } from "./types";

export type WatermarkPdfInput = {
  inputBytes: Uint8Array;
  text: string;
  opacity: number;
  fontSize: number;
  angleDegrees: number;
};

export type WatermarkPdfOutput = {
  outputBytes: Uint8Array;
  pageCount: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export const watermarkPdf: PdfOperation<WatermarkPdfInput, WatermarkPdfOutput> = async ({
  inputBytes,
  text,
  opacity,
  fontSize,
  angleDegrees,
}) => {
  const label = text.trim();
  if (!label) throw new Error("Watermark text is required.");

  const doc = await PDFDocument.load(inputBytes, { ignoreEncryption: false });
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (const page of doc.getPages()) {
    const size = clamp(fontSize, 10, 120);
    const width = font.widthOfTextAtSize(label, size);
    const { width: pageWidth, height: pageHeight } = page.getSize();
    page.drawText(label, {
      x: Math.max(12, (pageWidth - width) / 2),
      y: Math.max(12, pageHeight / 2),
      size,
      font,
      rotate: degrees(clamp(angleDegrees, -85, 85)),
      opacity: clamp(opacity, 0.05, 0.95),
      color: rgb(0.2, 0.2, 0.2),
    });
  }

  const outputBytes = await doc.save({ useObjectStreams: true });
  return { outputBytes, pageCount: doc.getPageCount() };
};

