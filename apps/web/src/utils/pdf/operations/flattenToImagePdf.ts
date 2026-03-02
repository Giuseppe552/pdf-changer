import { PDFDocument } from "pdf-lib";
import type { PdfOperation } from "./types";
import { randomizeStructure } from "../structureRandomize";

export type FlattenToImageInput = {
  pdfBytes: Uint8Array;
  dpi: number;
  format: "png" | "jpeg";
  jpegQuality?: number;
};

export type FlattenToImageOutput = {
  outputBytes: Uint8Array;
  pageCount: number;
  format: "png" | "jpeg";
  dpi: number;
};

const MAX_PAGES = 200;
const FIXED_DATE = new Date("2000-01-01T00:00:00.000Z");

export const flattenToImagePdf: PdfOperation<FlattenToImageInput, FlattenToImageOutput> = async ({
  pdfBytes,
  dpi,
  format,
  jpegQuality = 0.92,
}) => {
  const scale = dpi / 72;
  const pdfjsLib = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdfjs-dist lacks full type exports
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerUrl;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const srcDoc = await (pdfjsLib as any).getDocument({ data: pdfBytes }).promise;
  const pageCount = Math.min(MAX_PAGES, srcDoc.numPages);

  const outDoc = await PDFDocument.create();
  const mime = format === "jpeg" ? "image/jpeg" : "image/png";

  for (let i = 1; i <= pageCount; i++) {
    const page = await srcDoc.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable.");

    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));

    await page.render({ canvasContext: ctx, viewport }).promise;

    const dataUrl =
      format === "jpeg"
        ? canvas.toDataURL(mime, jpegQuality)
        : canvas.toDataURL(mime);

    const imgBytes = dataUrlToBytes(dataUrl);
    const embedded =
      format === "png"
        ? await outDoc.embedPng(imgBytes)
        : await outDoc.embedJpg(imgBytes);

    const scaled = embedded.scale(1);
    const pdfPage = outDoc.addPage([scaled.width, scaled.height]);
    pdfPage.drawImage(embedded, {
      x: 0,
      y: 0,
      width: scaled.width,
      height: scaled.height,
    });

    // Release canvas memory between pages
    canvas.width = 0;
    canvas.height = 0;
  }

  // Clear all metadata
  outDoc.setTitle("");
  outDoc.setAuthor("");
  outDoc.setSubject("");
  outDoc.setKeywords([]);
  outDoc.setCreator("");
  outDoc.setProducer("");
  outDoc.setCreationDate(FIXED_DATE);
  outDoc.setModificationDate(FIXED_DATE);

  let outputBytes = new Uint8Array(
    await outDoc.save({ useObjectStreams: true, addDefaultPage: false }),
  );

  // Randomize internal object structure to prevent tool fingerprinting
  try {
    outputBytes = new Uint8Array(await randomizeStructure(outputBytes));
  } catch {
    // Best-effort: if randomization fails, continue with original output
  }

  return { outputBytes, pageCount, format, dpi };
};

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
