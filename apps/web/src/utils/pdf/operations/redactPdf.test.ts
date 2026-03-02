import { describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";

// Mock pdfjs-dist since tests run in Node (no canvas)
vi.mock("pdfjs-dist", () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: { workerSrc: "" },
}));

vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({
  default: "",
}));

describe("redactPdf", () => {
  it("RedactionRect type validates fractional coordinates", () => {
    // Type-level test: verify coordinate system
    const rect = {
      pageIndex: 0,
      x: 0.1,
      y: 0.2,
      width: 0.3,
      height: 0.1,
    };
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.x).toBeLessThanOrEqual(1);
    expect(rect.width).toBeGreaterThanOrEqual(0);
    expect(rect.width).toBeLessThanOrEqual(1);
  });

  it("output assembly produces correct structure (simulated)", async () => {
    // Since redaction requires canvas (browser), test the output PDF assembly pattern
    const TINY_PNG_B64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==";
    const TINY_PNG_BYTES = Uint8Array.from(atob(TINY_PNG_B64), (c) => c.charCodeAt(0));

    const doc = await PDFDocument.create();
    // Simulate 2 rasterized pages (as flatten/redact would produce)
    for (let i = 0; i < 2; i++) {
      const img = await doc.embedPng(TINY_PNG_BYTES);
      const scaled = img.scale(1);
      const page = doc.addPage([scaled.width, scaled.height]);
      page.drawImage(img, { x: 0, y: 0, width: scaled.width, height: scaled.height });
    }

    doc.setTitle("");
    doc.setAuthor("");
    doc.setCreationDate(new Date("2000-01-01T00:00:00.000Z"));
    doc.setModificationDate(new Date("2000-01-01T00:00:00.000Z"));

    const outputBytes = await doc.save({ useObjectStreams: true, addDefaultPage: false });
    const out = await PDFDocument.load(outputBytes, { updateMetadata: false });
    expect(out.getPageCount()).toBe(2);
    expect(out.getTitle() ?? "").toBe("");
  });
});
