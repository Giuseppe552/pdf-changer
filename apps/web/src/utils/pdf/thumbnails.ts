type Thumb = { pageIndex: number; dataUrl: string };

export async function loadPdfThumbnails(
  pdfBytes: Uint8Array,
  opts: { scale: number; maxPages: number },
): Promise<Thumb[]> {
  const { scale, maxPages } = opts;

  // Lazy-load pdf.js only when needed.
  const pdfjsLib = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url"))
    .default;
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerUrl;

  const doc = await (pdfjsLib as any).getDocument({ data: pdfBytes }).promise;
  const count = Math.min(doc.numPages, maxPages);

  const thumbs: Thumb[] = [];
  for (let i = 1; i <= count; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    await page.render({ canvasContext: ctx, viewport }).promise;
    thumbs.push({ pageIndex: i - 1, dataUrl: canvas.toDataURL("image/png") });
  }

  return thumbs;
}
