import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { paranoidScrubPdf } from "./paranoidScrub";

describe("paranoidScrubPdf", () => {
  it("clears metadata and applies paranoid removals", async () => {
    const doc = await PDFDocument.create();
    doc.addPage([200, 200]);
    doc.setTitle("Secret Title");
    doc.setAuthor("Secret Author");
    doc.setProducer("LibreOffice 7.5");
    const inputBytes = new Uint8Array(await doc.save());

    const { outputBytes, report } = await paranoidScrubPdf(inputBytes);

    expect(report.pageCount).toBe(1);
    expect(report.paranoid.producerNormalized).toBe(true);
    expect(report.paranoid.javascriptRemoved).toBe(true);
    expect(report.paranoid.embeddedFilesRemoved).toBe(true);

    // Verify output producer is "PDF"
    const out = await PDFDocument.load(outputBytes, { updateMetadata: false });
    expect(out.getProducer()).toBe("PDF");
    expect(out.getTitle() ?? "").toBe("");
    expect(out.getAuthor() ?? "").toBe("");
  });

  it("includes EXIF strip report", async () => {
    const doc = await PDFDocument.create();
    doc.addPage([200, 200]);
    const inputBytes = new Uint8Array(await doc.save());

    const { report } = await paranoidScrubPdf(inputBytes);
    // exifStripReport should exist (even if nothing was stripped)
    expect(report.exifStripReport).toBeDefined();
  });
});
