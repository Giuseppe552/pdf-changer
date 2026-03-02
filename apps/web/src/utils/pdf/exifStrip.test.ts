import { describe, expect, it } from "vitest";
import { stripExifFromPdfBytes } from "./exifStrip";
import { detectLikelyExif } from "./exifDetect";

function buildJpegWithApp1(): Uint8Array {
  // Minimal JPEG with APP1 (EXIF) segment:
  // FF D8 (SOI) + FF E1 (APP1) + 00 08 (length=8, includes 2 length bytes) + "Exif\0\0" + FF D9 (EOI)
  const exifHeader = new TextEncoder().encode("Exif\0\0");
  const buf = new Uint8Array(2 + 2 + 2 + exifHeader.length + 2);
  let i = 0;
  buf[i++] = 0xff; buf[i++] = 0xd8; // SOI
  buf[i++] = 0xff; buf[i++] = 0xe1; // APP1
  const segLen = 2 + exifHeader.length; // length field includes itself
  buf[i++] = (segLen >> 8) & 0xff;
  buf[i++] = segLen & 0xff;
  buf.set(exifHeader, i); i += exifHeader.length;
  buf[i++] = 0xff; buf[i++] = 0xd9; // EOI
  return buf;
}

function buildJpegWithApp13(): Uint8Array {
  // JPEG with APP13 (IPTC) segment
  const iptcData = new Uint8Array([0x50, 0x68, 0x6f, 0x74]); // "Phot"
  const buf = new Uint8Array(2 + 2 + 2 + iptcData.length + 2);
  let i = 0;
  buf[i++] = 0xff; buf[i++] = 0xd8; // SOI
  buf[i++] = 0xff; buf[i++] = 0xed; // APP13
  const segLen = 2 + iptcData.length;
  buf[i++] = (segLen >> 8) & 0xff;
  buf[i++] = segLen & 0xff;
  buf.set(iptcData, i); i += iptcData.length;
  buf[i++] = 0xff; buf[i++] = 0xd9; // EOI
  return buf;
}

function buildPngWithText(): Uint8Array {
  // Minimal PNG with tEXt chunk
  const magic = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  // IHDR chunk (13 bytes data): required first chunk
  const ihdrType = new TextEncoder().encode("IHDR");
  const ihdrData = new Uint8Array(13); // 1x1 px, 8-bit RGB
  ihdrData[0] = 0; ihdrData[1] = 0; ihdrData[2] = 0; ihdrData[3] = 1; // width=1
  ihdrData[4] = 0; ihdrData[5] = 0; ihdrData[6] = 0; ihdrData[7] = 1; // height=1
  ihdrData[8] = 8; ihdrData[9] = 2; // 8-bit RGB
  const ihdrChunk = buildPngChunk(ihdrType, ihdrData);

  // tEXt chunk with "Comment\0test"
  const textType = new TextEncoder().encode("tEXt");
  const textData = new TextEncoder().encode("Comment\0test data here");
  const textChunk = buildPngChunk(textType, textData);

  // IEND chunk
  const iendType = new TextEncoder().encode("IEND");
  const iendChunk = buildPngChunk(iendType, new Uint8Array(0));

  const total = magic.length + ihdrChunk.length + textChunk.length + iendChunk.length;
  const buf = new Uint8Array(total);
  let pos = 0;
  buf.set(magic, pos); pos += magic.length;
  buf.set(ihdrChunk, pos); pos += ihdrChunk.length;
  buf.set(textChunk, pos); pos += textChunk.length;
  buf.set(iendChunk, pos);
  return buf;
}

function buildPngChunk(type: Uint8Array, data: Uint8Array): Uint8Array {
  // 4 (length) + 4 (type) + data + 4 (CRC placeholder)
  const chunk = new Uint8Array(12 + data.length);
  const len = data.length;
  chunk[0] = (len >> 24) & 0xff;
  chunk[1] = (len >> 16) & 0xff;
  chunk[2] = (len >> 8) & 0xff;
  chunk[3] = len & 0xff;
  chunk.set(type, 4);
  chunk.set(data, 8);
  // CRC placeholder (not validated in our strip logic)
  chunk[8 + len] = 0;
  chunk[9 + len] = 0;
  chunk[10 + len] = 0;
  chunk[11 + len] = 0;
  return chunk;
}

describe("exifStrip", () => {
  it("strips JPEG APP1 (EXIF) segments", () => {
    const jpeg = buildJpegWithApp1();
    expect(detectLikelyExif(jpeg)).toBe(true);

    const { outputBytes, report } = stripExifFromPdfBytes(jpeg);
    expect(report.jpegSegmentsStripped).toBeGreaterThan(0);
    expect(report.bytesRemoved).toBeGreaterThan(0);
    expect(detectLikelyExif(outputBytes)).toBe(false);

    // JPEG SOI and EOI should still be present
    expect(outputBytes[0]).toBe(0xff);
    expect(outputBytes[1]).toBe(0xd8);
    expect(outputBytes[outputBytes.length - 2]).toBe(0xff);
    expect(outputBytes[outputBytes.length - 1]).toBe(0xd9);
  });

  it("strips JPEG APP13 (IPTC) segments", () => {
    const jpeg = buildJpegWithApp13();
    const { outputBytes, report } = stripExifFromPdfBytes(jpeg);
    expect(report.jpegSegmentsStripped).toBeGreaterThan(0);

    // SOI + EOI preserved
    expect(outputBytes[0]).toBe(0xff);
    expect(outputBytes[1]).toBe(0xd8);
    expect(outputBytes[outputBytes.length - 2]).toBe(0xff);
    expect(outputBytes[outputBytes.length - 1]).toBe(0xd9);
  });

  it("strips PNG tEXt chunks", () => {
    const png = buildPngWithText();
    const { outputBytes, report } = stripExifFromPdfBytes(png);
    expect(report.pngChunksStripped).toBeGreaterThan(0);
    expect(report.bytesRemoved).toBeGreaterThan(0);

    // PNG magic preserved
    expect(outputBytes[0]).toBe(0x89);
    expect(outputBytes[1]).toBe(0x50);
    expect(outputBytes[2]).toBe(0x4e);
    expect(outputBytes[3]).toBe(0x47);
  });

  it("returns unchanged output when no EXIF/metadata present", () => {
    const clean = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF
    const { outputBytes, report } = stripExifFromPdfBytes(clean);
    expect(report.jpegSegmentsStripped).toBe(0);
    expect(report.pngChunksStripped).toBe(0);
    expect(report.bytesRemoved).toBe(0);
    expect(outputBytes).toEqual(clean);
  });
});
