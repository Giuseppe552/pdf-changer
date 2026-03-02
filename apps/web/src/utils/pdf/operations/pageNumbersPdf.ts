import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PdfOperation } from "./types";

export type PageNumbersPosition =
  | "bottom-right"
  | "bottom-center"
  | "bottom-left";

export type PageNumbersPdfInput = {
  inputBytes: Uint8Array;
  startAt: number;
  position: PageNumbersPosition;
  fontSize: number;
};

export type PageNumbersPdfOutput = {
  outputBytes: Uint8Array;
  pageCount: number;
};

function xForPosition(
  position: PageNumbersPosition,
  pageWidth: number,
  textWidth: number,
  margin: number,
): number {
  switch (position) {
    case "bottom-left":
      return margin;
    case "bottom-center":
      return Math.max(margin, (pageWidth - textWidth) / 2);
    case "bottom-right":
      return Math.max(margin, pageWidth - textWidth - margin);
    default:
      return margin;
  }
}

export const pageNumbersPdf: PdfOperation<
  PageNumbersPdfInput,
  PageNumbersPdfOutput
> = async ({ inputBytes, startAt, position, fontSize }) => {
  const doc = await PDFDocument.load(inputBytes, { ignoreEncryption: false });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const size = Math.max(8, Math.min(48, fontSize));
  const margin = 24;

  doc.getPages().forEach((page, index) => {
    const value = String(startAt + index);
    const width = font.widthOfTextAtSize(value, size);
    const { width: pageWidth } = page.getSize();
    page.drawText(value, {
      x: xForPosition(position, pageWidth, width, margin),
      y: margin,
      size,
      font,
      color: rgb(0.1, 0.1, 0.1),
      opacity: 0.85,
    });
  });

  const outputBytes = await doc.save({ useObjectStreams: true });
  return { outputBytes, pageCount: doc.getPageCount() };
};

