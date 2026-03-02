export type ImageExifData = {
  index: number;
  make?: string;
  model?: string;
  software?: string;
  dateTime?: string;
  gps?: { lat: number; lon: number };
};

// bounds-checked reader for untrusted binary data
class BufReader {
  constructor(
    private buf: Uint8Array,
    private le: boolean,
  ) {}

  u16(off: number): number | null {
    if (off + 2 > this.buf.length) return null;
    const a = this.buf[off], b = this.buf[off + 1];
    return this.le ? (b << 8) | a : (a << 8) | b;
  }

  u32(off: number): number | null {
    if (off + 4 > this.buf.length) return null;
    const b = this.buf;
    if (this.le) {
      return (b[off + 3] << 24 | b[off + 2] << 16 | b[off + 1] << 8 | b[off]) >>> 0;
    }
    return (b[off] << 24 | b[off + 1] << 16 | b[off + 2] << 8 | b[off + 3]) >>> 0;
  }

  ascii(off: number, len: number): string | null {
    if (off + len > this.buf.length) return null;
    let s = "";
    for (let i = 0; i < len; i++) {
      const c = this.buf[off + i];
      if (c === 0) break;
      s += String.fromCharCode(c);
    }
    return s;
  }

  rational(off: number): number | null {
    const num = this.u32(off);
    const den = this.u32(off + 4);
    if (num == null || den == null || den === 0) return null;
    return num / den;
  }
}

// EXIF type sizes (bytes per value)
const TYPE_SIZE: Record<number, number> = {
  1: 1,  // BYTE
  2: 1,  // ASCII
  3: 2,  // SHORT
  4: 4,  // LONG
  5: 8,  // RATIONAL
  7: 1,  // UNDEFINED
};

// IFD0 tags
const TAG_MAKE = 0x010f;
const TAG_MODEL = 0x0110;
const TAG_SOFTWARE = 0x0131;
const TAG_DATETIME = 0x0132;
const TAG_EXIF_IFD = 0x8769;
const TAG_GPS_IFD = 0x8825;

// GPS tags
const TAG_GPS_LAT_REF = 0x0001;
const TAG_GPS_LAT = 0x0002;
const TAG_GPS_LON_REF = 0x0003;
const TAG_GPS_LON = 0x0004;

const EXIF_HEADER = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // "Exif\0\0"

function readTagValue(
  r: BufReader,
  type: number,
  count: number,
  valFieldOff: number, // buffer position of the 4-byte value/offset field
  tiffStart: number,
): string | number | number[] | null {
  const sz = TYPE_SIZE[type];
  if (!sz) return null;
  const totalBytes = sz * count;

  // inline if ≤ 4 bytes (read directly from entry), else field holds offset from tiffStart
  let dataOff: number;
  if (totalBytes <= 4) {
    dataOff = valFieldOff;
  } else {
    const off = r.u32(valFieldOff);
    if (off == null) return null;
    dataOff = tiffStart + off;
  }

  if (type === 2) {
    // ASCII
    return r.ascii(dataOff, totalBytes);
  }
  if (type === 3 && count === 1) {
    return r.u16(dataOff);
  }
  if (type === 4 && count === 1) {
    return r.u32(dataOff);
  }
  if (type === 5) {
    // RATIONAL — return array for GPS DMS
    const rats: number[] = [];
    for (let i = 0; i < count; i++) {
      const v = r.rational(dataOff + i * 8);
      if (v == null) return null;
      rats.push(v);
    }
    return rats;
  }
  return null;
}

function walkIfd(
  r: BufReader,
  ifdOff: number,
  tiffStart: number,
  tags: Set<number>,
): Map<number, string | number | number[]> {
  const out = new Map<number, string | number | number[]>();
  const count = r.u16(ifdOff);
  if (count == null || count > 200) return out;

  for (let i = 0; i < count; i++) {
    const entryOff = ifdOff + 2 + i * 12;
    const tag = r.u16(entryOff);
    const type = r.u16(entryOff + 2);
    const cnt = r.u32(entryOff + 4);
    const raw = r.u32(entryOff + 8);
    if (tag == null || type == null || cnt == null || raw == null) continue;
    if (!tags.has(tag)) continue;

    const val = readTagValue(r, type, cnt, entryOff + 8, tiffStart);
    if (val != null) out.set(tag, val);
  }
  return out;
}

function dmsToDec(dms: number[], ref: string): number | null {
  if (dms.length < 3) return null;
  let dec = dms[0] + dms[1] / 60 + dms[2] / 3600;
  if (ref === "S" || ref === "W") dec = -dec;
  return dec;
}

function parseOneExif(buf: Uint8Array, tiffStart: number): Omit<ImageExifData, "index"> | null {
  // read byte order
  if (tiffStart + 8 > buf.length) return null;
  const bo = (buf[tiffStart] << 8) | buf[tiffStart + 1];
  let le: boolean;
  if (bo === 0x4949) le = true;       // "II" little-endian
  else if (bo === 0x4d4d) le = false;  // "MM" big-endian
  else return null;

  const r = new BufReader(buf, le);

  // validate magic 42
  const magic = r.u16(tiffStart + 2);
  if (magic !== 42) return null;

  // IFD0 offset
  const ifd0Off = r.u32(tiffStart + 4);
  if (ifd0Off == null) return null;
  const absIfd0 = tiffStart + ifd0Off;

  const ifd0Tags = new Set([
    TAG_MAKE, TAG_MODEL, TAG_SOFTWARE, TAG_DATETIME, TAG_EXIF_IFD, TAG_GPS_IFD,
  ]);
  const ifd0 = walkIfd(r, absIfd0, tiffStart, ifd0Tags);

  const result: Omit<ImageExifData, "index"> = {};

  const make = ifd0.get(TAG_MAKE);
  if (typeof make === "string") result.make = make;
  const model = ifd0.get(TAG_MODEL);
  if (typeof model === "string") result.model = model;
  const sw = ifd0.get(TAG_SOFTWARE);
  if (typeof sw === "string") result.software = sw;
  const dt = ifd0.get(TAG_DATETIME);
  if (typeof dt === "string") result.dateTime = dt;

  // GPS sub-IFD
  const gpsPtr = ifd0.get(TAG_GPS_IFD);
  if (typeof gpsPtr === "number") {
    const gpsTags = new Set([TAG_GPS_LAT_REF, TAG_GPS_LAT, TAG_GPS_LON_REF, TAG_GPS_LON]);
    const gps = walkIfd(r, tiffStart + gpsPtr, tiffStart, gpsTags);

    const latRef = gps.get(TAG_GPS_LAT_REF);
    const latDms = gps.get(TAG_GPS_LAT);
    const lonRef = gps.get(TAG_GPS_LON_REF);
    const lonDms = gps.get(TAG_GPS_LON);

    if (
      typeof latRef === "string" && Array.isArray(latDms) &&
      typeof lonRef === "string" && Array.isArray(lonDms)
    ) {
      const lat = dmsToDec(latDms, latRef);
      const lon = dmsToDec(lonDms, lonRef);
      if (lat != null && lon != null) {
        result.gps = { lat, lon };
      }
    }
  }

  // only return if we found something
  if (Object.keys(result).length === 0) return null;
  return result;
}

export function parseExifFromPdfBytes(bytes: Uint8Array): ImageExifData[] {
  const results: ImageExifData[] = [];
  let imgIdx = 0;

  // scan for JPEG SOI (FF D8) + APP1 (FF E1)
  for (let i = 0; i < bytes.length - 10; i++) {
    if (bytes[i] !== 0xff || bytes[i + 1] !== 0xd8) continue;

    // found JPEG SOI — look for APP1 right after
    let pos = i + 2;
    // walk markers to find APP1
    while (pos + 4 < bytes.length) {
      if (bytes[pos] !== 0xff) break;
      const marker = bytes[pos + 1];
      // APP1 = 0xE1
      if (marker === 0xe1) {
        const segLen = (bytes[pos + 2] << 8) | bytes[pos + 3];
        if (segLen < 8 || pos + 2 + segLen > bytes.length) break;

        // check for "Exif\0\0" at pos+4
        let isExif = true;
        for (let k = 0; k < 6; k++) {
          if (bytes[pos + 4 + k] !== EXIF_HEADER[k]) { isExif = false; break; }
        }
        if (isExif) {
          const tiffStart = pos + 10; // after FF E1 + len(2) + "Exif\0\0"(6)
          const parsed = parseOneExif(bytes, tiffStart);
          if (parsed) {
            results.push({ index: imgIdx, ...parsed });
          }
        }
        break;
      }
      // skip other markers
      if (marker >= 0xd0 && marker <= 0xd9) {
        // standalone markers (RST, SOI, EOI)
        pos += 2;
      } else {
        const mLen = (bytes[pos + 2] << 8) | bytes[pos + 3];
        if (mLen < 2) break;
        pos += 2 + mLen;
      }
    }
    imgIdx++;
  }

  return results;
}
