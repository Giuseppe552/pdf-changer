import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { deepScrubPdf } from "./deepScrub";

describe("deepScrubPdf", () => {
  it("clears metadata and normalizes dates", async () => {
    const doc = await PDFDocument.create();
    doc.addPage([200, 200]);
    doc.setTitle("Title");
    doc.setAuthor("Author");
    doc.setSubject("Subject");
    doc.setKeywords(["one", "two"]);
    doc.setCreator("Creator");
    doc.setProducer("Producer");
    doc.setCreationDate(new Date("2025-01-01T12:34:56.000Z"));
    doc.setModificationDate(new Date("2025-01-02T12:34:56.000Z"));
    const inputBytes = new Uint8Array(await doc.save());

    const { outputBytes, report } = await deepScrubPdf(inputBytes);
    expect(report.pageCount).toBe(1);
    expect(report.inputSha256.byteLength).toBe(32);
    expect(report.outputSha256.byteLength).toBe(32);

    const out = await PDFDocument.load(outputBytes, { updateMetadata: false });
    expect(out.getPageCount()).toBe(1);
    expect(out.getTitle() ?? "").toBe("");
    expect(out.getAuthor() ?? "").toBe("");
    expect(out.getSubject() ?? "").toBe("");
    const keywords = out.getKeywords();
    if (Array.isArray(keywords)) {
      expect(keywords).toEqual([]);
    } else {
      expect(keywords ?? "").toBe("");
    }
    expect(out.getCreator() ?? "").toBe("");
    expect(out.getProducer() ?? "").toBe("");
    expect(out.getCreationDate()?.toISOString()).toBe(
      "2000-01-01T00:00:00.000Z",
    );
    expect(out.getModificationDate()?.toISOString()).toBe(
      "2000-01-01T00:00:00.000Z",
    );
  });
});
