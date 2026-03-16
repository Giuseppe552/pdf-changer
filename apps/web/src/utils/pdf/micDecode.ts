/**
 * Machine Identification Code (MIC) Decoder
 *
 * Decodes invisible printer tracking dots embedded in printed documents.
 * Phase 1: Xerox DocuColor pattern (15×8 grid, 14 seven-bit values).
 *
 * Reference: EFF Machine Identification Code Technology Project (2005)
 * Reference: DEDA — Tracking Dots Extraction, Decoding and Anonymisation (TU Dresden)
 */

export type MicDecodeResult = {
  detected: boolean;
  printer: string | null;
  serial: string | null;
  year: number | null;
  month: number | null;
  day: number | null;
  hour: number | null;
  minute: number | null;
  parityValid: boolean;
  confidence: "none" | "low" | "medium" | "high";
  gridLocation: { x: number; y: number } | null;
  dotSpacing: number | null;
  description: string;
};

/**
 * Extract yellow channel from image data.
 * Yellow dots: high R, high G, low B on white-ish background.
 */
export function extractYellowChannel(
  imageData: ImageData,
): Uint8Array {
  const { data, width, height } = imageData;
  const binary = new Uint8Array(width * height);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Yellow dot on white/light background
    // Relaxed threshold for scanned documents (noise, color shift)
    if (r > 180 && g > 160 && b < 120) {
      binary[i / 4] = 1;
    }
  }

  return binary;
}

/**
 * Check if a dot is present at a given position.
 * Checks a small area (radius) around the center point.
 * Returns the number of yellow pixels found.
 */
function checkDotPresence(
  binary: Uint8Array,
  width: number,
  centerX: number,
  centerY: number,
  radius: number,
): number {
  let count = 0;
  const height = binary.length / width;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = centerX + dx;
      const y = centerY + dy;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (binary[y * width + x] === 1) count++;
    }
  }

  return count;
}

/**
 * Find the DocuColor 15×8 grid in the image.
 *
 * Searches for the grid origin by sliding a template across the image.
 * At 600 DPI, dots are spaced approximately 24px apart (~1mm).
 */
export function findDocuColorGrid(
  binary: Uint8Array,
  width: number,
  height: number,
): { x: number; y: number; spacing: number; score: number } | null {
  const COLS = 15;
  const ROWS = 8;

  // Try multiple dot spacings (DPI may vary)
  // 600 DPI: ~24px, 300 DPI: ~12px, 1200 DPI: ~48px
  const spacings = [12, 18, 24, 30, 36, 42, 48];
  const DOT_RADIUS = 3;
  const MIN_SCORE_RATIO = 0.25; // At least 25% of expected dots present

  let bestResult: { x: number; y: number; spacing: number; score: number } | null = null;

  for (const spacing of spacings) {
    const gridWidth = COLS * spacing;
    const gridHeight = ROWS * spacing;

    if (gridWidth > width || gridHeight > height) continue;

    // Search window: one grid period from the edges
    const searchX = Math.min(gridWidth, width - gridWidth);
    const searchY = Math.min(gridHeight, height - gridHeight);
    const step = Math.max(1, Math.floor(spacing / 4));

    for (let gy = 0; gy < searchY; gy += step) {
      for (let gx = 0; gx < searchX; gx += step) {
        let score = 0;

        for (let col = 0; col < COLS; col++) {
          for (let row = 0; row < ROWS; row++) {
            const px = gx + col * spacing;
            const py = gy + row * spacing;
            if (px >= width || py >= height) continue;

            const dots = checkDotPresence(binary, width, px, py, DOT_RADIUS);
            if (dots > 0) score++;
          }
        }

        const maxScore = COLS * ROWS;
        if (score > maxScore * MIN_SCORE_RATIO) {
          if (!bestResult || score > bestResult.score) {
            bestResult = { x: gx, y: gy, spacing, score };
          }
        }
      }
    }
  }

  return bestResult;
}

/**
 * Read the dot grid values (1 = dot present, 0 = no dot).
 * Returns a 2D array indexed as grid[col][row].
 */
export function readGrid(
  binary: Uint8Array,
  width: number,
  gridX: number,
  gridY: number,
  spacing: number,
): number[][] {
  const COLS = 15;
  const ROWS = 8;
  const grid: number[][] = [];
  const DOT_RADIUS = 3;

  for (let col = 0; col < COLS; col++) {
    const column: number[] = [];
    for (let row = 0; row < ROWS; row++) {
      const px = gridX + col * spacing;
      const py = gridY + row * spacing;
      const present = checkDotPresence(binary, width, px, py, DOT_RADIUS) > 0 ? 1 : 0;
      column.push(present);
    }
    grid.push(column);
  }

  return grid;
}

/**
 * Read 7-bit value from a column (bits 0-6, MSB first).
 * Bit 7 (row index 7) is parity.
 */
function readColumnValue(column: number[]): number {
  let value = 0;
  for (let bit = 0; bit < 7; bit++) {
    value = (value << 1) | (column[bit] ?? 0);
  }
  return value;
}

/**
 * Decode BCD (Binary-Coded Decimal) value.
 */
function bcdDecode(value: number): number {
  const high = (value >> 4) & 0x0f;
  const low = value & 0x0f;
  return high * 10 + low;
}

/**
 * Verify column parity.
 *
 * Each of the 15 columns has 7 data bits (rows 0-6) and 1 parity bit (row 7).
 * The parity bit is set so each column has an odd number of dots.
 *
 * Note: a 15×8 grid cannot simultaneously have all rows AND all columns with
 * odd parity (15 odd sums = odd total, but 8 odd sums = even total — contradiction).
 * DocuColor uses per-column parity with column 14 as row parity. We verify
 * columns 0-13 individually.
 */
function verifyParity(grid: number[][]): boolean {
  // Verify columns 0-13 have odd parity (7 data bits + 1 parity bit)
  for (let col = 0; col < 14; col++) {
    if (!grid[col]) return false;
    let sum = 0;
    for (let row = 0; row < 8; row++) {
      sum += grid[col][row] ?? 0;
    }
    if (sum % 2 === 0) return false;
  }

  return true;
}

/**
 * Decode a DocuColor grid into human-readable information.
 *
 * Column assignments (reading right-to-left, so grid[0] = column 15):
 *   Column 15 (grid[0]):  Separator (always 0000001)
 *   Column 14 (grid[1]):  Serial byte 1 (MSB)
 *   Column 13 (grid[2]):  Serial byte 2
 *   Column 12 (grid[3]):  Serial byte 3
 *   Column 11 (grid[4]):  Serial byte 4 (LSB)
 *   Column 10 (grid[5]):  Unknown / reserved
 *   Column 9  (grid[6]):  Unknown / reserved
 *   Column 8  (grid[7]):  Year (last 2 digits, BCD)
 *   Column 7  (grid[8]):  Month (BCD)
 *   Column 6  (grid[9]):  Day (BCD)
 *   Column 5  (grid[10]): Hour (BCD)
 *   Column 4  (grid[11]): Unknown / reserved
 *   Column 3  (grid[12]): Unknown / reserved
 *   Column 2  (grid[13]): Minute (BCD)
 *   Column 1  (grid[14]): Row parity
 */
export function decodeDocuColor(grid: number[][]): MicDecodeResult {
  if (grid.length < 15) {
    return {
      detected: false,
      printer: null,
      serial: null,
      year: null,
      month: null,
      day: null,
      hour: null,
      minute: null,
      parityValid: false,
      confidence: "none",
      gridLocation: null,
      dotSpacing: null,
      description: "Grid too small for DocuColor pattern.",
    };
  }

  // Read serial number bytes (columns 14-11 → grid indices 1-4)
  const serialBytes = [
    readColumnValue(grid[1]),
    readColumnValue(grid[2]),
    readColumnValue(grid[3]),
    readColumnValue(grid[4]),
  ];
  const serial = serialBytes.reduce((acc, b) => acc * 256 + b, 0);

  // Read date/time (BCD encoded)
  const year = bcdDecode(readColumnValue(grid[7]));
  const month = bcdDecode(readColumnValue(grid[8]));
  const day = bcdDecode(readColumnValue(grid[9]));
  const hour = bcdDecode(readColumnValue(grid[10]));
  const minute = bcdDecode(readColumnValue(grid[13]));

  const parityValid = verifyParity(grid);

  // Validate decoded values
  const dateValid =
    month >= 1 && month <= 12 &&
    day >= 1 && day <= 31 &&
    hour >= 0 && hour <= 23 &&
    minute >= 0 && minute <= 59;

  const confidence: MicDecodeResult["confidence"] =
    parityValid && dateValid && serial > 0 ? "high" :
    (parityValid || dateValid) && serial > 0 ? "medium" :
    serial > 0 ? "low" : "none";

  const fullYear = year < 90 ? 2000 + year : 1900 + year;

  const description = confidence === "none"
    ? "Could not decode a valid DocuColor pattern."
    : `Xerox DocuColor printer, serial ${serial}, printed ${fullYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}. Parity ${parityValid ? "valid" : "invalid"}.`;

  return {
    detected: confidence !== "none",
    printer: confidence !== "none" ? "Xerox DocuColor" : null,
    serial: confidence !== "none" ? String(serial) : null,
    year: confidence !== "none" ? fullYear : null,
    month: confidence !== "none" ? month : null,
    day: confidence !== "none" ? day : null,
    hour: confidence !== "none" ? hour : null,
    minute: confidence !== "none" ? minute : null,
    parityValid,
    confidence,
    gridLocation: null,
    dotSpacing: null,
    description,
  };
}

/**
 * Full MIC decode pipeline: extract yellow → find grid → decode.
 *
 * Input: ImageData from a high-resolution page rendering (600+ DPI recommended).
 * Output: Decoded tracking information, or confidence: "none" if not found.
 */
export function decodeMic(imageData: ImageData): MicDecodeResult {
  const { width, height } = imageData;
  const binary = extractYellowChannel(imageData);

  const gridResult = findDocuColorGrid(binary, width, height);

  if (!gridResult) {
    return {
      detected: false,
      printer: null,
      serial: null,
      year: null,
      month: null,
      day: null,
      hour: null,
      minute: null,
      parityValid: false,
      confidence: "none",
      gridLocation: null,
      dotSpacing: null,
      description: "No tracking dot grid pattern detected.",
    };
  }

  const grid = readGrid(binary, width, gridResult.x, gridResult.y, gridResult.spacing);
  const result = decodeDocuColor(grid);

  return {
    ...result,
    gridLocation: { x: gridResult.x, y: gridResult.y },
    dotSpacing: gridResult.spacing,
  };
}
