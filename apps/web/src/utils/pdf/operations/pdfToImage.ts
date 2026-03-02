import type { PdfOperation } from "./types";

export type PdfToImageInput = {
  pdfBytes: Uint8Array;
  format: "png" | "jpeg";
  scale: number;
  maxPages: number;
  jpegQuality?: number;
};

export type PdfToImageOutput = {
  images: Array<{
    pageIndex: number;
    dataUrl: string;
  }>;
};

export const pdfToImage: PdfOperation<PdfToImageInput, PdfToImageOutput> = async ({
  pdfBytes,
  format,
  scale,
  maxPages,
  jpegQuality = 0.92,
}) => {
  const pdfjsLib = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url"))
    .default;
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerUrl;

  const doc = await (pdfjsLib as any).getDocument({ data: pdfBytes }).promise;
  const pageCount = Math.min(maxPages, doc.numPages);

  const images: Array<{ pageIndex: number; dataUrl: string }> = [];
  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas context unavailable.");
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    await page.render({ canvasContext: context, viewport }).promise;

    const mime = format === "jpeg" ? "image/jpeg" : "image/png";
    const dataUrl =
      format === "jpeg"
        ? canvas.toDataURL(mime, jpegQuality)
        : canvas.toDataURL(mime);
    images.push({ pageIndex: i - 1, dataUrl });
  }

  return { images };
};

