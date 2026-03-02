import { describe, expect, it } from "vitest";
import { PDFDocument, PDFName, PDFDict } from "pdf-lib";
import { detectFontFingerprints } from "./fontDetect";

describe("detectFontFingerprints", () => {
  it("detects subset font prefix pattern", async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([200, 200]);

    // Manually inject a font reference with subset prefix
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdf-lib internals
      const node = (page as any).node;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdf-lib internals
      const context = (doc as any).context;

      // Create a font dict with subset prefix
      const fontDict = context.obj({
        Type: "Font",
        Subtype: "Type1",
        BaseFont: "ABCDEF+TimesNewRoman",
      });
      const fontRef = context.register(fontDict);

      // Create Resources > Font dict
      const fontsDict = context.obj({});
      fontsDict.set(PDFName.of("F1"), fontRef);

      const resources = node.get(PDFName.of("Resources"));
      if (resources instanceof PDFDict) {
        resources.set(PDFName.of("Font"), fontsDict);
      }
    } catch {
      // If internal manipulation fails, skip this test
      return;
    }

    const pdfBytes = new Uint8Array(await doc.save());
    const report = await detectFontFingerprints(pdfBytes);
    expect(report.fontWarning).toBe(true);
    expect(report.customFontNames.length).toBeGreaterThan(0);
    expect(report.customFontNames[0]).toMatch(/^[A-Z]{6}\+/);
  });

  it("returns no warning for clean PDF", async () => {
    const doc = await PDFDocument.create();
    doc.addPage([200, 200]);
    const pdfBytes = new Uint8Array(await doc.save());

    const report = await detectFontFingerprints(pdfBytes);
    expect(report.fontWarning).toBe(false);
    expect(report.customFontNames).toEqual([]);
  });
});
