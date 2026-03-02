import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { signPdf } from "./signPdf";

// Minimal 1x1 white PNG as data URL
const TINY_PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

async function makeDoc(pageCount: number) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    doc.addPage([612, 792]);
  }
  return new Uint8Array(await doc.save());
}

describe("signPdf", () => {
  it("embeds signature on specified page", async () => {
    const input = await makeDoc(3);
    const result = await signPdf({
      inputBytes: input,
      signaturePngDataUrl: TINY_PNG_DATA_URL,
      placement: { pageIndex: 1, x: 0.5, y: 0.8, widthFraction: 0.3 },
    });
    expect(result.pageCount).toBe(3);
    expect(result.outputBytes.length).toBeGreaterThan(0);
  });

  it("rejects empty signature data URL", async () => {
    const input = await makeDoc(1);
    await expect(
      signPdf({
        inputBytes: input,
        signaturePngDataUrl: "",
        placement: { pageIndex: 0, x: 0.5, y: 0.8, widthFraction: 0.3 },
      }),
    ).rejects.toThrow("Signature image is required.");
  });

  it("rejects invalid page index", async () => {
    const input = await makeDoc(2);
    await expect(
      signPdf({
        inputBytes: input,
        signaturePngDataUrl: TINY_PNG_DATA_URL,
        placement: { pageIndex: 5, x: 0.5, y: 0.8, widthFraction: 0.3 },
      }),
    ).rejects.toThrow("Invalid page index");
  });
});
