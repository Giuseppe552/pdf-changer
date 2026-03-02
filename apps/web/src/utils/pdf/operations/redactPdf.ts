import { PDFDocument } from "pdf-lib";
import type { PdfOperation } from "./types";

export type RedactionRect = {
  pageIndex: number; // 0-based
  x: number; // fraction of page width (0-1)
  y: number; // fraction of page height (0-1)
  width: number; // fraction of page width (0-1)
  height: number; // fraction of page height (0-1)
};

export type RedactPdfInput = {
  pdfBytes: Uint8Array;
  redactions: RedactionRect[];
  dpi?: number;
  flattenAll?: boolean;
};

export type RedactPdfOutput = {
  outputBytes: Uint8Array;
  pageCount: number;
  redactedPageCount: number;
};

const MAX_PAGES = 200;
const FIXED_DATE = new Date("2000-01-01T00:00:00.000Z");

export const redactPdf: PdfOperation<RedactPdfInput, RedactPdfOutput> = async ({
  pdfBytes,
  redactions,
  dpi = 200,
  flattenAll = true,
}) => {
  const scale = dpi / 72;
  const pdfjsLib = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdfjs-dist lacks full type exports
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerUrl;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const srcDoc = await (pdfjsLib as any).getDocument({ data: pdfBytes }).promise;
  const pageCount = Math.min(MAX_PAGES, srcDoc.numPages);

  // Group redactions by page
  const redactionsByPage = new Map<number, RedactionRect[]>();
  for (const r of redactions) {
    const list = redactionsByPage.get(r.pageIndex) ?? [];
    list.push(r);
    redactionsByPage.set(r.pageIndex, list);
  }

  const redactedPageCount = redactionsByPage.size;
  const outDoc = await PDFDocument.create();

  for (let i = 1; i <= pageCount; i++) {
    const pageIdx = i - 1;
    const pageRedactions = redactionsByPage.get(pageIdx);
    const needsRasterize = flattenAll || (pageRedactions && pageRedactions.length > 0);

    if (!needsRasterize) {
      // Copy page as-is (non-flatten mode only)
      const srcPdfLib = await PDFDocument.load(pdfBytes);
      const [copied] = await outDoc.copyPages(srcPdfLib, [pageIdx]);
      outDoc.addPage(copied);
      continue;
    }

    const page = await srcDoc.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable.");

    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));

    // Render original page
    await page.render({ canvasContext: ctx, viewport }).promise;

    // Draw black redaction rectangles on the canvas pixels
    if (pageRedactions) {
      ctx.fillStyle = "#000000";
      for (const r of pageRedactions) {
        const rx = r.x * canvas.width;
        const ry = r.y * canvas.height;
        const rw = r.width * canvas.width;
        const rh = r.height * canvas.height;
        ctx.fillRect(rx, ry, rw, rh);
      }
    }

    // Export as PNG (lossless) for redaction accuracy
    const dataUrl = canvas.toDataURL("image/png");
    const imgBytes = dataUrlToBytes(dataUrl);
    const embedded = await outDoc.embedPng(imgBytes);
    const scaled = embedded.scale(1);
    const pdfPage = outDoc.addPage([scaled.width, scaled.height]);
    pdfPage.drawImage(embedded, {
      x: 0,
      y: 0,
      width: scaled.width,
      height: scaled.height,
    });

    // Release canvas memory
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

  const outputBytes = await outDoc.save({ useObjectStreams: true, addDefaultPage: false });
  return { outputBytes, pageCount, redactedPageCount };
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
