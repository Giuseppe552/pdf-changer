import { describe, expect, it } from "vitest";
import { analyzePageForTrackingDots, buildStegoReport } from "./stegoDetect";

function createImageData(
  width: number,
  height: number,
  fillFn?: (x: number, y: number) => [number, number, number, number],
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const [r, g, b, a] = fillFn?.(x, y) ?? [255, 255, 255, 255];
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
  }
  return { data, width, height } as unknown as ImageData;
}

describe("stegoDetect", () => {
  it("returns 'none' for white page", () => {
    const img = createImageData(100, 200);
    const result = analyzePageForTrackingDots(img);
    expect(result).toBe("none");
  });

  it("detects yellow dots in margins", () => {
    const img = createImageData(100, 200, (x, y) => {
      // Place yellow dots in top margin (first 10 rows = 5% of 200)
      if (y < 10 && x % 5 === 0) {
        return [240, 220, 30, 255]; // Yellow
      }
      return [255, 255, 255, 255]; // White
    });
    const result = analyzePageForTrackingDots(img);
    expect(["low", "medium", "high"]).toContain(result);
  });

  it("buildStegoReport aggregates results", () => {
    const report = buildStegoReport(["none", "medium", "low"]);
    expect(report.confidence).toBe("medium");
    expect(report.pagesScanned).toBe(3);
    expect(report.pagesWithDots).toBe(2);
    expect(report.description).toContain("Yellow dot patterns");
  });

  it("buildStegoReport handles all-none", () => {
    const report = buildStegoReport(["none", "none"]);
    expect(report.confidence).toBe("none");
    expect(report.pagesWithDots).toBe(0);
  });
});
