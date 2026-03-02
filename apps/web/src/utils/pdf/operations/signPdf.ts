import { PDFDocument } from "pdf-lib";
import type { PdfOperation } from "./types";

export type SignaturePlacement = {
  pageIndex: number;
  x: number; // fraction 0-1 (left edge)
  y: number; // fraction 0-1 (from top)
  widthFraction: number; // fraction of page width
};

export type SignPdfInput = {
  inputBytes: Uint8Array;
  signaturePngDataUrl: string;
  placement: SignaturePlacement;
};

export type SignPdfOutput = {
  outputBytes: Uint8Array;
  pageCount: number;
};

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1];
  if (!base64) throw new Error("Invalid data URL format.");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export const signPdf: PdfOperation<SignPdfInput, SignPdfOutput> = async ({
  inputBytes,
  signaturePngDataUrl,
  placement,
}) => {
  if (!signaturePngDataUrl) {
    throw new Error("Signature image is required.");
  }

  const doc = await PDFDocument.load(inputBytes, { ignoreEncryption: false });
  const pageCount = doc.getPageCount();

  if (placement.pageIndex < 0 || placement.pageIndex >= pageCount) {
    throw new Error(
      `Invalid page index ${placement.pageIndex + 1}. Document has ${pageCount} page(s).`,
    );
  }

  const pngBytes = dataUrlToBytes(signaturePngDataUrl);
  const sigImage = await doc.embedPng(pngBytes);
  const aspect = sigImage.width / sigImage.height;

  const page = doc.getPages()[placement.pageIndex];
  const { width: pageWidth, height: pageHeight } = page.getSize();

  const drawWidth = placement.widthFraction * pageWidth;
  const drawHeight = drawWidth / aspect;
  const drawX = placement.x * pageWidth;
  const drawY = pageHeight - placement.y * pageHeight - drawHeight;

  page.drawImage(sigImage, {
    x: drawX,
    y: drawY,
    width: drawWidth,
    height: drawHeight,
  });

  const outputBytes = await doc.save({ useObjectStreams: true });
  return { outputBytes, pageCount };
};
