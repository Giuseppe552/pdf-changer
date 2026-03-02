/**
 * Byte-level EXIF/metadata stripping for JPEG and PNG streams embedded in PDF bytes.
 *
 * Operates on raw Uint8Array (not pdf-lib objects) since pdf-lib doesn't expose
 * image stream bytes directly. Scans for JPEG SOI and PNG magic bytes, then
 * excises metadata segments while preserving image structural integrity.
 */

export type ExifStripReport = {
  jpegSegmentsStripped: number;
  pngChunksStripped: number;
  bytesRemoved: number;
};

/**
 * Strip EXIF/IPTC/ICC metadata from all embedded JPEG and PNG streams in raw PDF bytes.
 */
export function stripExifFromPdfBytes(bytes: Uint8Array): {
  outputBytes: Uint8Array;
  report: ExifStripReport;
} {
  let jpegSegmentsStripped = 0;
  let pngChunksStripped = 0;
  let totalBytesRemoved = 0;

  // Work on a mutable copy
  let buf = new Uint8Array(bytes);

  // Strip JPEG APP segments
  const jpegResult = stripJpegAppSegments(buf);
  buf = new Uint8Array(jpegResult.output);
  jpegSegmentsStripped = jpegResult.segmentsStripped;
  totalBytesRemoved += jpegResult.bytesRemoved;

  // Strip PNG metadata chunks
  const pngResult = stripPngMetadataChunks(buf);
  buf = new Uint8Array(pngResult.output);
  pngChunksStripped = pngResult.chunksStripped;
  totalBytesRemoved += pngResult.bytesRemoved;

  return {
    outputBytes: buf,
    report: {
      jpegSegmentsStripped,
      pngChunksStripped,
      bytesRemoved: totalBytesRemoved,
    },
  };
}

// JPEG APP marker types to strip: APP1 (EXIF/XMP), APP2 (ICC), APP13 (IPTC), APP14 (Adobe)
const JPEG_STRIP_MARKERS = new Set([0xe1, 0xe2, 0xed, 0xee]);

function stripJpegAppSegments(bytes: Uint8Array): {
  output: Uint8Array;
  segmentsStripped: number;
  bytesRemoved: number;
} {
  const segments: Array<{ start: number; length: number }> = [];

  for (let i = 0; i < bytes.length - 3; i++) {
    // Look for FF marker
    if (bytes[i] !== 0xff) continue;

    const marker = bytes[i + 1];
    if (!JPEG_STRIP_MARKERS.has(marker)) continue;

    // Verify we're inside a JPEG stream by searching backwards for SOI (FF D8)
    let foundSoi = false;
    for (let j = i - 1; j >= Math.max(0, i - 4096); j--) {
      if (bytes[j] === 0xff && bytes[j + 1] === 0xd8) {
        foundSoi = true;
        break;
      }
    }
    if (!foundSoi) continue;

    // APP segment length: 2 bytes big-endian (includes the 2 length bytes, excludes FF+marker)
    const segLen = (bytes[i + 2] << 8) | bytes[i + 3];
    if (segLen < 2 || i + 2 + segLen > bytes.length) continue;

    // Total segment: FF + marker + length bytes + data = 2 + segLen
    segments.push({ start: i, length: 2 + segLen });
  }

  if (segments.length === 0) {
    return { output: bytes, segmentsStripped: 0, bytesRemoved: 0 };
  }

  return exciseRegions(bytes, segments);
}

// PNG chunk types to strip
const PNG_STRIP_TYPES = new Set(["tEXt", "iTXt", "zTXt", "eXIf", "iCCP"]);
const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function stripPngMetadataChunks(bytes: Uint8Array): {
  output: Uint8Array;
  chunksStripped: number;
  bytesRemoved: number;
} {
  const regions: Array<{ start: number; length: number }> = [];

  // Find PNG magic bytes
  for (let i = 0; i < bytes.length - 12; i++) {
    if (!matchBytes(bytes, PNG_MAGIC, i)) continue;

    // Walk PNG chunks starting after 8-byte magic
    let pos = i + 8;
    while (pos + 12 <= bytes.length) {
      const chunkLen =
        (bytes[pos] << 24) |
        (bytes[pos + 1] << 16) |
        (bytes[pos + 2] << 8) |
        bytes[pos + 3];
      if (chunkLen < 0 || pos + 12 + chunkLen > bytes.length) break;

      const typeStr = String.fromCharCode(
        bytes[pos + 4],
        bytes[pos + 5],
        bytes[pos + 6],
        bytes[pos + 7],
      );

      // Total chunk size: 4 (length) + 4 (type) + chunkLen (data) + 4 (CRC)
      const totalChunkSize = 12 + chunkLen;

      if (PNG_STRIP_TYPES.has(typeStr)) {
        regions.push({ start: pos, length: totalChunkSize });
      }

      // Stop at IEND
      if (typeStr === "IEND") break;

      pos += totalChunkSize;
    }
  }

  if (regions.length === 0) {
    return { output: bytes, chunksStripped: 0, bytesRemoved: 0 };
  }

  const result = exciseRegions(bytes, regions);
  return {
    output: result.output,
    chunksStripped: result.segmentsStripped,
    bytesRemoved: result.bytesRemoved,
  };
}

function exciseRegions(
  bytes: Uint8Array,
  regions: Array<{ start: number; length: number }>,
): { output: Uint8Array; segmentsStripped: number; bytesRemoved: number } {
  // Sort by start position, deduplicate overlaps
  const sorted = [...regions].sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; length: number }> = [];
  for (const r of sorted) {
    const prev = merged[merged.length - 1];
    if (prev && r.start < prev.start + prev.length) {
      // Overlap: extend previous
      const end = Math.max(prev.start + prev.length, r.start + r.length);
      prev.length = end - prev.start;
    } else {
      merged.push({ ...r });
    }
  }

  const totalRemoved = merged.reduce((sum, r) => sum + r.length, 0);
  const output = new Uint8Array(bytes.length - totalRemoved);

  let readPos = 0;
  let writePos = 0;
  for (const region of merged) {
    // Copy bytes before this region
    const before = region.start - readPos;
    if (before > 0) {
      output.set(bytes.subarray(readPos, region.start), writePos);
      writePos += before;
    }
    readPos = region.start + region.length;
  }
  // Copy remaining bytes
  if (readPos < bytes.length) {
    output.set(bytes.subarray(readPos), writePos);
  }

  return {
    output,
    segmentsStripped: merged.length,
    bytesRemoved: totalRemoved,
  };
}

function matchBytes(hay: Uint8Array, needle: Uint8Array, offset: number): boolean {
  if (offset + needle.length > hay.length) return false;
  for (let i = 0; i < needle.length; i++) {
    if (hay[offset + i] !== needle[i]) return false;
  }
  return true;
}
