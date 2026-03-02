import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { compressPdf } from "./compressPdf";
import { imageToPdf } from "./imageToPdf";
import { pageNumbersPdf } from "./pageNumbersPdf";
import { protectPdf } from "./protectPdf";
import { removePagesPdf } from "./removePagesPdf";
import { unlockPdf } from "./unlockPdf";
import { watermarkPdf } from "./watermarkPdf";

async function samplePdf(pageCount = 2): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    doc.addPage([250, 250]);
  }
  return new Uint8Array(await doc.save());
}

describe("pdf operations", () => {
  it("compressPdf keeps valid page count", async () => {
    const inputBytes = await samplePdf(2);
    const output = await compressPdf({ inputBytes });
    const outDoc = await PDFDocument.load(output.outputBytes);
    expect(outDoc.getPageCount()).toBe(2);
    expect(output.outputSizeBytes).toBeGreaterThan(0);
  });

  it("imageToPdf converts png image into a single-page pdf", async () => {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7+Wl0AAAAASUVORK5CYII=",
      "base64",
    );
    const output = await imageToPdf({
      images: [
        {
          name: "one.png",
          mimeType: "image/png",
          bytes: new Uint8Array(png),
        },
      ],
    });
    const outDoc = await PDFDocument.load(output.outputBytes);
    expect(outDoc.getPageCount()).toBe(1);
  });

  it("watermark and page number ops keep page count", async () => {
    const inputBytes = await samplePdf(3);
    const watermarked = await watermarkPdf({
      inputBytes,
      text: "INTERNAL",
      opacity: 0.2,
      fontSize: 36,
      angleDegrees: -30,
    });
    const numbered = await pageNumbersPdf({
      inputBytes: watermarked.outputBytes,
      startAt: 1,
      position: "bottom-right",
      fontSize: 12,
    });
    const outDoc = await PDFDocument.load(numbered.outputBytes);
    expect(outDoc.getPageCount()).toBe(3);
  });

  it("removePagesPdf removes selected pages", async () => {
    const inputBytes = await samplePdf(4);
    const output = await removePagesPdf({
      inputBytes,
      removeRanges: "1,4",
    });
    const outDoc = await PDFDocument.load(output.outputBytes);
    expect(output.removedPages).toBe(2);
    expect(output.keptPages).toBe(2);
    expect(outDoc.getPageCount()).toBe(2);
  });

  it("unlockPdf rebuilds output and reports encryption state", async () => {
    const inputBytes = await samplePdf(1);
    const output = await unlockPdf({ inputBytes });
    const outDoc = await PDFDocument.load(output.outputBytes);
    expect(output.wasEncrypted).toBe(false);
    expect(outDoc.getPageCount()).toBe(1);
  });

  it("protectPdf returns unsupported error in local engine", async () => {
    const inputBytes = await samplePdf(1);
    await expect(protectPdf({ inputBytes, password: "secret123" })).rejects.toThrow(
      "not available",
    );
  });
});

