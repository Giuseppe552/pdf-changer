/**
 * Steganography detection: heuristic scanner for Machine Identification Code
 * (MIC) / printer tracking dots.
 *
 * Renders pages at high resolution and analyzes pixel data for repeating
 * yellow dot patterns in margins. Results are heuristic with confidence levels.
 */

export type StegoConfidence = "none" | "low" | "medium" | "high";

export type StegoDetectReport = {
  confidence: StegoConfidence;
  pagesScanned: number;
  pagesWithDots: number;
  description: string;
};

/**
 * Scan rendered page image data for yellow dot patterns.
 *
 * Yellow tracking dots typically:
 * - Appear in the top/bottom margins (first/last ~5% of page)
 * - Are very small (~1mm / 3-4px at 150 DPI)
 * - Have a distinctly yellow hue (high R, high G, low B)
 * - Repeat in a grid pattern
 *
 * This is a heuristic and will not catch all steganographic techniques.
 */
export function analyzePageForTrackingDots(
  imageData: ImageData,
): StegoConfidence {
  const { data, width, height } = imageData;

  // Scan margin areas (top 5%, bottom 5%)
  const marginHeight = Math.max(10, Math.floor(height * 0.05));
  let yellowPixels = 0;
  let totalPixels = 0;

  for (const region of [
    { yStart: 0, yEnd: marginHeight },
    { yStart: height - marginHeight, yEnd: height },
  ]) {
    for (let y = region.yStart; y < region.yEnd; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        totalPixels++;

        // Yellow dot detection: high R + high G + low B on white-ish background
        if (r > 200 && g > 180 && b < 100) {
          yellowPixels++;
        }
      }
    }
  }

  if (totalPixels === 0) return "none";

  const ratio = yellowPixels / totalPixels;

  // Thresholds calibrated for typical tracking dot density
  if (ratio > 0.005) return "high";
  if (ratio > 0.001) return "medium";
  if (ratio > 0.0002) return "low";
  return "none";
}

/**
 * Aggregate per-page results into a report.
 */
export function buildStegoReport(
  pageResults: StegoConfidence[],
): StegoDetectReport {
  const pagesWithDots = pageResults.filter((c) => c !== "none").length;
  const maxConfidence = pageResults.reduce<StegoConfidence>((max, c) => {
    const order: StegoConfidence[] = ["none", "low", "medium", "high"];
    return order.indexOf(c) > order.indexOf(max) ? c : max;
  }, "none");

  const descriptions: Record<StegoConfidence, string> = {
    none: "No tracking dot patterns detected.",
    low: "Possible faint yellow dot patterns detected in margins. This is a low-confidence heuristic result.",
    medium: "Yellow dot patterns consistent with printer tracking dots detected in page margins.",
    high: "Strong yellow dot pattern detected, consistent with Machine Identification Code (MIC) tracking dots.",
  };

  return {
    confidence: maxConfidence,
    pagesScanned: pageResults.length,
    pagesWithDots,
    description: descriptions[maxConfidence],
  };
}
