import { describe, expect, it } from "vitest";
import { detectLikelyExif } from "./exifDetect";

describe("detectLikelyExif", () => {
  it("detects JPEG APP1 Exif header", () => {
    const bytes = new Uint8Array([
      0xff,
      0xe1,
      0x00,
      0x10,
      // "Exif\0\0"
      0x45,
      0x78,
      0x69,
      0x66,
      0x00,
      0x00,
      0x00,
      0x00,
    ]);
    expect(detectLikelyExif(bytes)).toBe(true);
  });
});

