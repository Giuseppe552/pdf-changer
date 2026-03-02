export type OcrPdfInput = {
  pdfBytes: Uint8Array;
  language: string;
  maxPages: number;
  onProgress?: (page: number, total: number) => void;
};

export type OcrPageResult = {
  pageIndex: number;
  text: string;
  confidence: number;
};

export type OcrPdfOutput = {
  pages: OcrPageResult[];
  fullText: string;
  averageConfidence: number;
};

export async function ocrPdf({
  pdfBytes,
  language,
  maxPages,
  onProgress,
}: OcrPdfInput): Promise<OcrPdfOutput> {
  const pdfjsLib = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerUrl;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const srcDoc = await (pdfjsLib as any).getDocument({ data: pdfBytes }).promise;
  const pageCount = Math.min(maxPages, srcDoc.numPages);

  const Tesseract = await import("tesseract.js");
  const worker = await Tesseract.createWorker(language);

  const pages: OcrPageResult[] = [];

  try {
    for (let i = 1; i <= pageCount; i++) {
      onProgress?.(i, pageCount);
      const page = await srcDoc.getPage(i);
      const scale = 2; // 144 DPI for good OCR quality
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable.");

      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));

      await page.render({ canvasContext: ctx, viewport }).promise;

      const result = await worker.recognize(canvas);

      pages.push({
        pageIndex: i - 1,
        text: result.data.text,
        confidence: result.data.confidence,
      });

      // Release canvas memory
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    await worker.terminate();
  }

  const fullText = pages.map((p) => p.text).join("\n\n--- Page break ---\n\n");
  const averageConfidence =
    pages.length > 0
      ? pages.reduce((sum, p) => sum + p.confidence, 0) / pages.length
      : 0;

  return { pages, fullText, averageConfidence };
}
