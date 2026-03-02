import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { rotatePdf } from "./rotatePdf";

async function makeDoc(pageCount: number) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    doc.addPage([250, 400]);
  }
  return new Uint8Array(await doc.save());
}

describe("rotatePdf", () => {
  it("rotates all pages by 90 degrees", async () => {
    const input = await makeDoc(3);
    const result = await rotatePdf({ inputBytes: input, angleDegrees: 90, pageRanges: "" });
    expect(result.rotatedCount).toBe(3);
    expect(result.pageCount).toBe(3);

    const doc = await PDFDocument.load(result.outputBytes);
    for (const page of doc.getPages()) {
      expect(page.getRotation().angle).toBe(90);
    }
  });

  it("rotates only specified range", async () => {
    const input = await makeDoc(5);
    const result = await rotatePdf({ inputBytes: input, angleDegrees: 180, pageRanges: "2-3" });
    expect(result.rotatedCount).toBe(2);

    const doc = await PDFDocument.load(result.outputBytes);
    const pages = doc.getPages();
    expect(pages[0].getRotation().angle).toBe(0);
    expect(pages[1].getRotation().angle).toBe(180);
    expect(pages[2].getRotation().angle).toBe(180);
    expect(pages[3].getRotation().angle).toBe(0);
    expect(pages[4].getRotation().angle).toBe(0);
  });

  it("accumulates rotation (90 + 90 = 180)", async () => {
    const input = await makeDoc(1);
    const first = await rotatePdf({ inputBytes: input, angleDegrees: 90, pageRanges: "" });
    const second = await rotatePdf({ inputBytes: first.outputBytes, angleDegrees: 90, pageRanges: "" });

    const doc = await PDFDocument.load(second.outputBytes);
    expect(doc.getPages()[0].getRotation().angle).toBe(180);
  });

  it("rejects invalid angle", async () => {
    const input = await makeDoc(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(rotatePdf({ inputBytes: input, angleDegrees: 45 as any, pageRanges: "" }))
      .rejects.toThrow("Angle must be 90, 180, or 270 degrees.");
  });

  it("rejects empty selection from non-matching page numbers", async () => {
    const input = await makeDoc(2);
    await expect(rotatePdf({ inputBytes: input, angleDegrees: 90, pageRanges: "10" }))
      .rejects.toThrow("No valid pages selected for rotation.");
  });
});
