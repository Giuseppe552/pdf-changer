const ASCII_EXIF = new TextEncoder().encode("Exif\u0000\u0000");

export function detectLikelyExif(bytes: Uint8Array): boolean {
  // Heuristic: scan for JPEG APP1 + "Exif\0\0" marker.
  // This does not parse PDF structure; it’s a cheap warning signal.
  for (let i = 0; i + ASCII_EXIF.length < bytes.length; i++) {
    // APP1 marker: FF E1
    if (bytes[i] === 0xff && bytes[i + 1] === 0xe1) {
      // Search forward a bit for Exif header
      const end = Math.min(bytes.length, i + 256);
      for (let j = i; j + ASCII_EXIF.length < end; j++) {
        if (matchAt(bytes, ASCII_EXIF, j)) return true;
      }
    }
  }
  return false;
}

function matchAt(hay: Uint8Array, needle: Uint8Array, offset: number): boolean {
  for (let i = 0; i < needle.length; i++) {
    if (hay[offset + i] !== needle[i]) return false;
  }
  return true;
}

