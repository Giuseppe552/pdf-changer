import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { cropPdf } from "./cropPdf";

async function makeDoc(pageCount: number) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    doc.addPage([612, 792]);
  }
  return new Uint8Array(await doc.save());
}

describe("cropPdf", () => {
  it("crops all pages by percentage", async () => {
    const input = await makeDoc(2);
    const result = await cropPdf({
      inputBytes: input,
      margins: { top: 10, bottom: 10, left: 10, right: 10 },
      unit: "percent",
      pageRanges: "",
    });
    expect(result.croppedCount).toBe(2);
    expect(result.pageCount).toBe(2);

    const doc = await PDFDocument.load(result.outputBytes);
    const page = doc.getPages()[0];
    const cropBox = page.getCropBox();
    expect(cropBox.x).toBeGreaterThan(0);
    expect(cropBox.y).toBeGreaterThan(0);
  });

  it("crops specific range by points", async () => {
    const input = await makeDoc(4);
    const result = await cropPdf({
      inputBytes: input,
      margins: { top: 50, bottom: 50, left: 30, right: 30 },
      unit: "points",
      pageRanges: "2-3",
    });
    expect(result.croppedCount).toBe(2);
  });

  it("rejects margins that produce sub-10pt crop area", async () => {
    const input = await makeDoc(1);
    // Points mode: 612pt page, left=300 + right=310 = 610, leaving 2pt width
    await expect(
      cropPdf({
        inputBytes: input,
        margins: { top: 0, bottom: 0, left: 300, right: 310 },
        unit: "points",
        pageRanges: "",
      }),
    ).rejects.toThrow("Crop area too small");
  });
});
