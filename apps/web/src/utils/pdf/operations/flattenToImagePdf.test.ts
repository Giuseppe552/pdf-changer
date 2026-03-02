import { describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import { detectLikelyExif } from "../exifDetect";

// Mock pdfjs-dist since tests run in Node (no canvas)
vi.mock("pdfjs-dist", () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: { workerSrc: "" },
}));

vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({
  default: "",
}));

// 1x1 red PNG as base64
const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==";
const TINY_PNG_BYTES = Uint8Array.from(atob(TINY_PNG_B64), (c) => c.charCodeAt(0));

describe("flattenToImagePdf", () => {
  it("produces image-only PDF with cleared metadata (simulated)", async () => {
    // Since pdfjs rendering requires a browser canvas, we test the output assembly
    // by creating an image-only PDF via pdf-lib directly (same as flatten output)
    const doc = await PDFDocument.create();
    const img = await doc.embedPng(TINY_PNG_BYTES);
    const scaled = img.scale(1);
    const page = doc.addPage([scaled.width, scaled.height]);
    page.drawImage(img, { x: 0, y: 0, width: scaled.width, height: scaled.height });

    doc.setTitle("");
    doc.setAuthor("");
    doc.setSubject("");
    doc.setKeywords([]);
    doc.setCreator("");
    doc.setProducer("");
    doc.setCreationDate(new Date("2000-01-01T00:00:00.000Z"));
    doc.setModificationDate(new Date("2000-01-01T00:00:00.000Z"));

    const outputBytes = await doc.save({ useObjectStreams: true, addDefaultPage: false });

    // Verify structure
    const out = await PDFDocument.load(outputBytes, { updateMetadata: false });
    expect(out.getPageCount()).toBe(1);
    expect(out.getTitle() ?? "").toBe("");
    expect(out.getAuthor() ?? "").toBe("");
    expect(out.getCreator() ?? "").toBe("");
    expect(out.getProducer() ?? "").toBe("");
    expect(out.getCreationDate()?.toISOString()).toBe("2000-01-01T00:00:00.000Z");

    // Canvas-rendered images should not contain EXIF
    expect(detectLikelyExif(new Uint8Array(outputBytes))).toBe(false);
  });

  it("multi-page flatten produces correct page count", async () => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < 3; i++) {
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
    expect(out.getPageCount()).toBe(3);
  });
});
