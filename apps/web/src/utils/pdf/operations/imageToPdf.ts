import { PDFDocument } from "pdf-lib";
import type { PdfOperation } from "./types";

export type ImageToPdfInputImage = {
  name: string;
  mimeType: string;
  bytes: Uint8Array;
};

export type ImageToPdfInput = {
  images: ImageToPdfInputImage[];
};

export type ImageToPdfOutput = {
  outputBytes: Uint8Array;
  pageCount: number;
};

function looksLikePng(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

export const imageToPdf: PdfOperation<ImageToPdfInput, ImageToPdfOutput> = async ({
  images,
}) => {
  if (!images.length) {
    throw new Error("Choose at least one image.");
  }

  const pdfDoc = await PDFDocument.create();
  for (const image of images) {
    const isPng =
      image.mimeType.toLowerCase() === "image/png" || looksLikePng(image.bytes);
    const embedded = isPng
      ? await pdfDoc.embedPng(image.bytes)
      : await pdfDoc.embedJpg(image.bytes);
    const scaled = embedded.scale(1);
    const page = pdfDoc.addPage([scaled.width, scaled.height]);
    page.drawImage(embedded, {
      x: 0,
      y: 0,
      width: scaled.width,
      height: scaled.height,
    });
  }

  const outputBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });
  return { outputBytes, pageCount: images.length };
};

