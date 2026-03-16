import { describe, expect, it } from "vitest";
import {
  extractYellowChannel,
  findDocuColorGrid,
  readGrid,
  decodeDocuColor,
  decodeMic,
} from "./micDecode";

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

/**
 * Place a synthetic DocuColor grid at position (gridX, gridY) with given spacing.
 * The grid encodes a known serial and date for testing.
 */
function createDocuColorImage(
  gridX: number,
  gridY: number,
  spacing: number,
  grid: number[][],
): ImageData {
  const width = gridX + 15 * spacing + 20;
  const height = gridY + 8 * spacing + 20;

  return createImageData(width, height, (x, y) => {
    // Check if this pixel is at a grid dot position
    for (let col = 0; col < 15; col++) {
      for (let row = 0; row < 8; row++) {
        if (grid[col]?.[row] !== 1) continue;
        const dotX = gridX + col * spacing;
        const dotY = gridY + row * spacing;
        const dx = x - dotX;
        const dy = y - dotY;
        if (dx * dx + dy * dy <= 9) {
          // Yellow dot (R=220, G=200, B=50)
          return [220, 200, 50, 255];
        }
      }
    }
    return [255, 255, 255, 255]; // White background
  });
}

/**
 * Build a synthetic grid for testing.
 * Encodes: serial=12345678, date=2026-03-03 14:32
 */
function buildTestGrid(): number[][] {
  const grid: number[][] = Array.from({ length: 15 }, () => Array(8).fill(0));

  // Column 15 (index 0): separator = 0000001
  grid[0][6] = 1;

  // Serial number: 12345678 = 0x00BC614E
  // Byte 1 (col 14, index 1): 0x00 = 0b0000000
  // Byte 2 (col 13, index 2): 0xBC = 0b1011100
  grid[2][0] = 1; grid[2][2] = 1; grid[2][3] = 1; grid[2][4] = 1;
  // Byte 3 (col 12, index 3): 0x61 = 0b1100001
  grid[3][0] = 1; grid[3][1] = 1; grid[3][6] = 1;
  // Byte 4 (col 11, index 4): 0x4E = 0b1001110
  grid[4][0] = 1; grid[4][3] = 1; grid[4][4] = 1; grid[4][5] = 1;

  // Year = 26 → BCD 0x26 = 0b0100110 (col 8, index 7)
  grid[7][1] = 1; grid[7][4] = 1; grid[7][5] = 1;

  // Month = 03 → BCD 0x03 = 0b0000011 (col 7, index 8)
  grid[8][5] = 1; grid[8][6] = 1;

  // Day = 03 → BCD 0x03 = 0b0000011 (col 6, index 9)
  grid[9][5] = 1; grid[9][6] = 1;

  // Hour = 14 → BCD 0x14 = 0b0010100 (col 5, index 10)
  grid[10][2] = 1; grid[10][4] = 1;

  // Minute = 32 → BCD 0x32 = 0b0110010 (col 2, index 13)
  grid[13][1] = 1; grid[13][2] = 1; grid[13][5] = 1;

  // Parity: each row and column must have odd dot count
  // Step 1: For columns 0-13, set row 7 (parity bit) so each column is odd
  for (let col = 0; col < 14; col++) {
    let sum = 0;
    for (let row = 0; row < 7; row++) sum += grid[col][row];
    grid[col][7] = sum % 2 === 0 ? 1 : 0;
  }
  // Step 2: For column 14 (row parity), set rows 0-7 so each row is odd
  for (let row = 0; row < 8; row++) {
    let sum = 0;
    for (let col = 0; col < 14; col++) sum += grid[col][row];
    grid[14][row] = sum % 2 === 0 ? 1 : 0;
  }

  return grid;
}

describe("micDecode", () => {
  describe("extractYellowChannel", () => {
    it("returns all zeros for white image", () => {
      const img = createImageData(10, 10);
      const binary = extractYellowChannel(img);
      expect(binary.every((v) => v === 0)).toBe(true);
    });

    it("detects yellow pixels", () => {
      const img = createImageData(10, 10, (x) => {
        return x === 5 ? [220, 200, 50, 255] : [255, 255, 255, 255];
      });
      const binary = extractYellowChannel(img);
      const yellowCount = binary.filter((v) => v === 1).length;
      expect(yellowCount).toBe(10); // One column of yellow
    });

    it("ignores blue and red pixels", () => {
      const img = createImageData(10, 10, () => [50, 50, 220, 255]);
      const binary = extractYellowChannel(img);
      expect(binary.every((v) => v === 0)).toBe(true);
    });
  });

  describe("readGrid", () => {
    it("reads grid values correctly", () => {
      const testGrid = buildTestGrid();
      const img = createDocuColorImage(10, 10, 24, testGrid);
      const binary = extractYellowChannel(img);
      const grid = readGrid(binary, img.width, 10, 10, 24);

      // Separator column (index 0) should have bit 6 set
      expect(grid[0][6]).toBe(1);
    });
  });

  describe("decodeDocuColor", () => {
    it("decodes a synthetic grid", () => {
      const grid = buildTestGrid();
      const result = decodeDocuColor(grid);

      expect(result.detected).toBe(true);
      expect(result.printer).toBe("Xerox DocuColor");
      // Serial bytes [0, 92, 97, 78] → 0*256³ + 92*256² + 97*256 + 78 = 6054222
      expect(result.serial).toBe("6054222");
      expect(result.year).toBe(2026);
      expect(result.month).toBe(3);
      expect(result.day).toBe(3);
      expect(result.hour).toBe(14);
      expect(result.minute).toBe(32);
      expect(result.parityValid).toBe(true);
      expect(result.confidence).toBe("high");
    });

    it("returns none for empty grid", () => {
      const grid: number[][] = Array.from({ length: 15 }, () => Array(8).fill(0));
      const result = decodeDocuColor(grid);
      expect(result.confidence).toBe("none");
    });

    it("returns none for grid with too few columns", () => {
      const grid: number[][] = Array.from({ length: 5 }, () => Array(8).fill(0));
      const result = decodeDocuColor(grid);
      expect(result.detected).toBe(false);
      expect(result.confidence).toBe("none");
    });
  });

  describe("decodeMic (full pipeline)", () => {
    it("returns none for blank image", () => {
      const img = createImageData(200, 200);
      const result = decodeMic(img);
      expect(result.detected).toBe(false);
      expect(result.confidence).toBe("none");
    });

    it("decodes a synthetic DocuColor image", () => {
      const testGrid = buildTestGrid();
      const img = createDocuColorImage(10, 10, 24, testGrid);
      const result = decodeMic(img);

      expect(result.detected).toBe(true);
      expect(result.printer).toBe("Xerox DocuColor");
      expect(result.gridLocation).not.toBeNull();
      expect(result.dotSpacing).toBe(24);
    });
  });
});
