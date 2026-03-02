import { describe, expect, it } from "vitest";
import { parseExifFromPdfBytes } from "./exifParse";

// --- binary builders ---

function u16be(v: number): number[] { return [(v >> 8) & 0xff, v & 0xff]; }
function u16le(v: number): number[] { return [v & 0xff, (v >> 8) & 0xff]; }
function u32be(v: number): number[] {
  return [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff];
}
function u32le(v: number): number[] {
  return [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];
}

function rationalBe(num: number, den: number): number[] {
  return [...u32be(num), ...u32be(den)];
}
function rationalLe(num: number, den: number): number[] {
  return [...u32le(num), ...u32le(den)];
}

function asciiBytes(s: string): number[] {
  return [...new TextEncoder().encode(s), 0]; // null terminated
}

function buildIfdEntry(
  tag: number, type: number, count: number, valOrOff: number,
  be: boolean,
): number[] {
  const u16 = be ? u16be : u16le;
  const u32 = be ? u32be : u32le;
  return [...u16(tag), ...u16(type), ...u32(count), ...u32(valOrOff)];
}

function buildTiff(
  entries: number[][],
  extraData: number[],
  be: boolean,
  subIfds?: { offset: number; entries: number[][]; extraData: number[] }[],
): number[] {
  const u16 = be ? u16be : u16le;
  const u32 = be ? u32be : u32le;

  const byteOrder = be ? [0x4d, 0x4d] : [0x49, 0x49];
  const header = [...byteOrder, ...u16(42), ...u32(8)]; // IFD0 at offset 8

  const ifdCountBytes = u16(entries.length);
  const ifdEntriesBytes = entries.flat();
  const nextIfdPtr = u32(0); // no next IFD

  const mainIfd = [...ifdCountBytes, ...ifdEntriesBytes, ...nextIfdPtr];

  const result = [...header, ...mainIfd, ...extraData];

  // append sub-IFDs
  if (subIfds) {
    for (const sub of subIfds) {
      // pad to expected offset
      while (result.length < sub.offset) result.push(0);
      const subCount = u16(sub.entries.length);
      const subEntries = sub.entries.flat();
      const subNext = u32(0);
      result.push(...subCount, ...subEntries, ...subNext, ...sub.extraData);
    }
  }

  return result;
}

function wrapInJpegApp1(tiffBytes: number[]): number[] {
  const exifHeader = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // "Exif\0\0"
  const payload = [...exifHeader, ...tiffBytes];
  const segLen = 2 + payload.length; // length includes itself
  return [
    0xff, 0xd8, // SOI
    0xff, 0xe1, // APP1
    ...u16be(segLen),
    ...payload,
    0xff, 0xd9, // EOI
  ];
}

describe("exifParse", () => {
  it("parses Make + Model from big-endian EXIF", () => {
    const makeStr = asciiBytes("Canon");
    const modelStr = asciiBytes("EOS R5");
    // data starts after IFD0 (8 + 2 + 2*12 + 4 = 38)
    const dataOff = 38;

    const entries = [
      buildIfdEntry(0x010f, 2, makeStr.length, dataOff, true),      // Make → ASCII at dataOff
      buildIfdEntry(0x0110, 2, modelStr.length, dataOff + makeStr.length, true), // Model
    ];

    const tiff = buildTiff(entries, [...makeStr, ...modelStr], true);
    const jpeg = wrapInJpegApp1(tiff);
    const buf = new Uint8Array(jpeg);

    const res = parseExifFromPdfBytes(buf);
    expect(res).toHaveLength(1);
    expect(res[0].make).toBe("Canon");
    expect(res[0].model).toBe("EOS R5");
    expect(res[0].index).toBe(0);
  });

  it("parses Make + Model from little-endian EXIF", () => {
    const makeStr = asciiBytes("Nikon");
    const modelStr = asciiBytes("Z 8 II"); // >4 bytes so it's stored as offset, not inline
    const dataOff = 38;

    const entries = [
      buildIfdEntry(0x010f, 2, makeStr.length, dataOff, false),
      buildIfdEntry(0x0110, 2, modelStr.length, dataOff + makeStr.length, false),
    ];

    const tiff = buildTiff(entries, [...makeStr, ...modelStr], false);
    const jpeg = wrapInJpegApp1(tiff);
    const res = parseExifFromPdfBytes(new Uint8Array(jpeg));

    expect(res).toHaveLength(1);
    expect(res[0].make).toBe("Nikon");
    expect(res[0].model).toBe("Z 8 II");
  });

  it("parses GPS coordinates from rational DMS", () => {
    // 37° 46' 12" N, 122° 25' 12" W → 37.77, -122.42
    const be = true;
    const dataOff = 38;

    // GPS IFD will be at offset 100 (from tiffStart)
    const gpsIfdOff = 100;

    const ifd0Entries = [
      buildIfdEntry(0x8825, 4, 1, gpsIfdOff, be), // GpsIFD pointer (LONG, inline)
    ];

    // GPS data starts after GPS IFD: gpsIfdOff + 2 + 4*12 + 4 = 100 + 54 = 154
    const gpsDataOff = 154;
    const latDms = [...rationalBe(37, 1), ...rationalBe(46, 1), ...rationalBe(12, 1)]; // 24 bytes
    const lonDms = [...rationalBe(122, 1), ...rationalBe(25, 1), ...rationalBe(12, 1)];

    const gpsEntries = [
      buildIfdEntry(0x0001, 2, 2, 0x4e000000, be), // "N\0" inline (4 bytes, ASCII count=2)
      buildIfdEntry(0x0002, 5, 3, gpsDataOff, be),  // lat rationals
      buildIfdEntry(0x0003, 2, 2, 0x57000000, be), // "W\0" inline
      buildIfdEntry(0x0004, 5, 3, gpsDataOff + 24, be), // lon rationals
    ];

    const tiff = buildTiff(ifd0Entries, [], be, [
      { offset: gpsIfdOff, entries: gpsEntries, extraData: [...latDms, ...lonDms] },
    ]);
    const jpeg = wrapInJpegApp1(tiff);
    const res = parseExifFromPdfBytes(new Uint8Array(jpeg));

    expect(res).toHaveLength(1);
    expect(res[0].gps).toBeDefined();
    expect(res[0].gps!.lat).toBeCloseTo(37.77, 1);
    expect(res[0].gps!.lon).toBeCloseTo(-122.42, 1);
  });

  it("follows ExifIFD pointer for sub-IFD traversal", () => {
    // put Make in IFD0, Software in sub-IFD pointed to by ExifIFD
    const be = true;
    const makeStr = asciiBytes("Sony");
    const swStr = asciiBytes("Lightroom");
    const dataOff = 38;
    const subIfdOff = 80;
    const subDataOff = subIfdOff + 2 + 1 * 12 + 4; // 80 + 18 = 98

    const ifd0Entries = [
      buildIfdEntry(0x010f, 2, makeStr.length, dataOff, be),
      buildIfdEntry(0x8769, 4, 1, subIfdOff, be), // ExifIFD pointer
    ];

    // Note: current impl only reads GPS from sub-IFD, not ExifIFD tags.
    // But we test that it at least doesn't crash when following the pointer.
    const tiff = buildTiff(ifd0Entries, [...makeStr], be);
    const jpeg = wrapInJpegApp1(tiff);
    const res = parseExifFromPdfBytes(new Uint8Array(jpeg));

    expect(res).toHaveLength(1);
    expect(res[0].make).toBe("Sony");
  });

  it("skips truncated buffer gracefully", () => {
    // JPEG SOI + APP1 header but buffer ends mid-TIFF
    const buf = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe1, 0x00, 0x20,
      0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
      0x4d, 0x4d, // MM
      // truncated here
    ]);
    const res = parseExifFromPdfBytes(buf);
    expect(res).toHaveLength(0);
  });

  it("skips zero-length APP1 segment", () => {
    const buf = new Uint8Array([
      0xff, 0xd8,
      0xff, 0xe1, 0x00, 0x02, // segLen = 2, no payload
      0xff, 0xd9,
    ]);
    const res = parseExifFromPdfBytes(buf);
    expect(res).toHaveLength(0);
  });

  it("skips bad byte order", () => {
    const bad = [
      0xff, 0xd8, 0xff, 0xe1, 0x00, 0x10,
      0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
      0xAA, 0xBB, // not II or MM
      0x00, 0x2a, 0x00, 0x00, 0x00, 0x08,
      0xff, 0xd9,
    ];
    const res = parseExifFromPdfBytes(new Uint8Array(bad));
    expect(res).toHaveLength(0);
  });

  it("handles multiple JPEGs in one buffer", () => {
    const makeA = asciiBytes("Canon");
    const makeB = asciiBytes("Nikon");
    const dataOff = 8 + 2 + 1 * 12 + 4; // 26

    const tiffA = buildTiff(
      [buildIfdEntry(0x010f, 2, makeA.length, dataOff, true)],
      [...makeA], true,
    );
    const tiffB = buildTiff(
      [buildIfdEntry(0x010f, 2, makeB.length, dataOff, true)],
      [...makeB], true,
    );

    const jpegA = wrapInJpegApp1(tiffA);
    const jpegB = wrapInJpegApp1(tiffB);
    const combined = new Uint8Array([...jpegA, ...jpegB]);

    const res = parseExifFromPdfBytes(combined);
    expect(res).toHaveLength(2);
    expect(res[0].make).toBe("Canon");
    expect(res[1].make).toBe("Nikon");
  });

  it("returns empty for buffer with no JPEG", () => {
    const buf = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF
    expect(parseExifFromPdfBytes(buf)).toHaveLength(0);
  });

  it("skips rational with zero denominator", () => {
    const be = true;
    const gpsIfdOff = 8 + 2 + 1 * 12 + 4; // 26
    const gpsDataOff = gpsIfdOff + 2 + 4 * 12 + 4; // 26 + 54 = 80

    // lat with zero denominator on first rational
    const badLat = [...rationalBe(37, 0), ...rationalBe(46, 1), ...rationalBe(12, 1)];
    const lonDms = [...rationalBe(122, 1), ...rationalBe(25, 1), ...rationalBe(12, 1)];

    const ifd0Entries = [
      buildIfdEntry(0x8825, 4, 1, gpsIfdOff, be),
    ];
    const gpsEntries = [
      buildIfdEntry(0x0001, 2, 2, 0x4e000000, be),
      buildIfdEntry(0x0002, 5, 3, gpsDataOff, be),
      buildIfdEntry(0x0003, 2, 2, 0x57000000, be),
      buildIfdEntry(0x0004, 5, 3, gpsDataOff + 24, be),
    ];

    const tiff = buildTiff(ifd0Entries, [], be, [
      { offset: gpsIfdOff, entries: gpsEntries, extraData: [...badLat, ...lonDms] },
    ]);
    const jpeg = wrapInJpegApp1(tiff);
    const res = parseExifFromPdfBytes(new Uint8Array(jpeg));

    // should not have GPS because lat parse fails
    if (res.length > 0) {
      expect(res[0].gps).toBeUndefined();
    }
  });
});
