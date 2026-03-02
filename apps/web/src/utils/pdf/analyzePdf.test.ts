import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { analyzePdf, type ForensicReport } from "./analyzePdf";

async function makePdf(opts?: {
  title?: string;
  author?: string;
  creator?: string;
  subject?: string;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([200, 200]);
  if (opts?.title) doc.setTitle(opts.title);
  if (opts?.author) doc.setAuthor(opts.author);
  if (opts?.creator) doc.setCreator(opts.creator);
  if (opts?.subject) doc.setSubject(opts.subject);
  return new Uint8Array(await doc.save());
}

describe("analyzePdf", () => {
  it("analyzes a minimal pdf without crashing", async () => {
    const bytes = await makePdf();
    const report = await analyzePdf(bytes);

    expect(report.pageCount).toBe(1);
    expect(report.fileSize).toBeGreaterThan(0);
    // pdf-lib always sets dates + doc ID, so at best "medium"
    expect(["low", "medium"]).toContain(report.riskLevel);
    expect(report.imageExif).toHaveLength(0);
    expect(report.outboundUrls).toHaveLength(0);
    expect(report.hasJavaScript).toBe(false);
  });

  it("detects metadata and generates correct findings", async () => {
    const bytes = await makePdf({
      title: "Secret Plans",
      author: "John Doe",
      creator: "Microsoft Word",
    });
    const report = await analyzePdf(bytes);

    expect(report.metadata.Author).toBe("John Doe");
    expect(report.metadata.Creator).toBe("Microsoft Word");
    expect(report.metadata.Title).toBe("Secret Plans");

    // should have author + creator warnings and title info
    const authorFinding = report.findings.find((f) => f.title === "Author identity exposed");
    expect(authorFinding).toBeDefined();
    expect(authorFinding!.severity).toBe("warning");
    expect(authorFinding!.detail).toContain("John Doe");

    const creatorFinding = report.findings.find((f) => f.title === "Creation software revealed");
    expect(creatorFinding).toBeDefined();
    expect(creatorFinding!.detail).toContain("Microsoft Word");

    // author + timestamps → should be at least high risk
    expect(["high", "critical"]).toContain(report.riskLevel);
  });

  it("returns empty metadata for a blank pdf", async () => {
    const doc = await PDFDocument.create();
    doc.addPage([100, 100]);
    doc.setTitle("");
    doc.setAuthor("");
    doc.setCreator("");
    doc.setProducer("");
    const bytes = new Uint8Array(await doc.save());

    const report = await analyzePdf(bytes);
    expect(report.metadata.Author).toBeNull();
    expect(report.metadata.Creator).toBeNull();
  });

  it("findings have correct structure", async () => {
    const bytes = await makePdf({ author: "test" });
    const report = await analyzePdf(bytes);

    for (const f of report.findings) {
      expect(typeof f.severity).toBe("string");
      expect(["info", "warning", "critical"]).toContain(f.severity);
      expect(typeof f.category).toBe("string");
      expect(["identity", "tracking", "security"]).toContain(f.category);
      expect(f.title.length).toBeGreaterThan(0);
      expect(f.detail.length).toBeGreaterThan(0);
      expect(f.remediation.length).toBeGreaterThan(0);
    }
  });

  it("never throws on garbage input", async () => {
    const garbage = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF, 0x00, 0xFF, 0x42]);
    const report = await analyzePdf(garbage);
    expect(report).toBeDefined();
    expect(report.fileSize).toBe(7);
    expect(report.findings).toBeDefined();
  });

  it("never throws on empty input", async () => {
    const report = await analyzePdf(new Uint8Array(0));
    expect(report).toBeDefined();
    expect(report.fileSize).toBe(0);
  });
});
