import { describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";

// Mock pdfjs-dist for flatten step
vi.mock("pdfjs-dist", () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: { workerSrc: "" },
}));
vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({
  default: "",
}));

// We can test scrub, exif-strip, and compress steps without pdfjs
import { executePipeline, PIPELINE_PRESETS, stepLabel } from "./pipeline";

async function samplePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([200, 200]);
  doc.setTitle("TestTitle");
  doc.setAuthor("TestAuthor");
  return new Uint8Array(await doc.save());
}

describe("pipeline", () => {
  it("executes scrub step and clears metadata", async () => {
    const input = await samplePdf();
    const result = await executePipeline(input, [{ type: "scrub" }]);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].type).toBe("scrub");
    expect(result.steps[0].outputSize).toBeGreaterThan(0);
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);

    // Verify metadata cleared
    const doc = await PDFDocument.load(result.outputBytes, { updateMetadata: false });
    expect(doc.getTitle() ?? "").toBe("");
    expect(doc.getAuthor() ?? "").toBe("");
  });

  it("chains scrub then compress", async () => {
    const input = await samplePdf();
    const result = await executePipeline(input, [
      { type: "scrub" },
      { type: "compress" },
    ]);
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].type).toBe("scrub");
    expect(result.steps[1].type).toBe("compress");
    // Output of step 1 feeds into step 2
    expect(result.steps[1].inputSize).toBe(result.steps[0].outputSize);
  });

  it("exif-strip step produces output", async () => {
    const input = await samplePdf();
    const result = await executePipeline(input, [{ type: "exif-strip" }]);
    expect(result.steps).toHaveLength(1);
    expect(result.outputBytes.length).toBeGreaterThan(0);
  });

  it("presets are defined", () => {
    expect(PIPELINE_PRESETS.length).toBeGreaterThanOrEqual(3);
    for (const preset of PIPELINE_PRESETS) {
      expect(preset.steps.length).toBeGreaterThan(0);
    }
  });

  it("stepLabel returns human names", () => {
    expect(stepLabel("scrub")).toBe("Deep Scrub");
    expect(stepLabel("paranoid-scrub")).toBe("Paranoid Scrub");
    expect(stepLabel("flatten")).toBe("Flatten to Image");
  });
});
