import { describe, it, expect } from "vitest";
import type { OcrPageResult, OcrPdfOutput } from "./ocrPdf";

// Structural tests only — pdfjs-dist and tesseract.js require browser canvas/WASM

describe("ocrPdf types", () => {
  it("validates OcrPageResult shape", () => {
    const result: OcrPageResult = {
      pageIndex: 0,
      text: "Hello world",
      confidence: 92.5,
    };
    expect(result.pageIndex).toBe(0);
    expect(result.text).toBe("Hello world");
    expect(result.confidence).toBe(92.5);
  });

  it("validates full text assembly and average confidence", () => {
    const pages: OcrPageResult[] = [
      { pageIndex: 0, text: "Page one", confidence: 90 },
      { pageIndex: 1, text: "Page two", confidence: 80 },
    ];
    const fullText = pages.map((p) => p.text).join("\n\n--- Page break ---\n\n");
    const averageConfidence =
      pages.reduce((sum, p) => sum + p.confidence, 0) / pages.length;

    const output: OcrPdfOutput = { pages, fullText, averageConfidence };
    expect(output.fullText).toBe("Page one\n\n--- Page break ---\n\nPage two");
    expect(output.averageConfidence).toBe(85);
  });
});
