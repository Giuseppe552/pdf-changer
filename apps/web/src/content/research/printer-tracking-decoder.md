---
title: "MIC Decoder: Browser-Based Printer Tracking Dot Analysis"
summary: "The first browser-based Machine Identification Code decoder. Upload a scanned document and identify the printer model, serial number, and print timestamp encoded in invisible yellow tracking dots."
date: 2026-03-14
status: published
tags: [steganography, mic, printer-tracking, forensics, privacy]
estimatedMinutes: 15
---

# MIC Decoder: Browser-Based Printer Tracking Dot Analysis

## Background

Since the mid-1990s, most color laser printers embed invisible yellow dots on every page they print. These Machine Identification Codes (MICs) encode the printer's serial number and the date and time of printing. The dots are invisible to the naked eye but can be revealed under blue light or by digital analysis.

This tracking technology was developed in cooperation between printer manufacturers and government agencies, originally to trace counterfeit currency. But the same dots appear on every printed page — tax returns, medical records, whistleblower documents, personal letters.

### Existing tools

| Tool | Language | Coverage | Browser? |
|------|----------|----------|----------|
| DEDA (TU Dresden) | Python | 4 patterns | No |
| EFF DocuColor decoder | Python | Xerox DocuColor only | No |
| PDF Changer stegoDetect | TypeScript | Heuristic detection only | Yes |

**No browser-based MIC decoder exists.** The closest is PDF Changer's existing `stegoDetect.ts`, which performs heuristic yellow-pixel scanning to estimate whether tracking dots are present — but it cannot decode the serial number, date, or printer model.

## What we're building

A JavaScript decoder that runs entirely in the browser. Upload a high-resolution scan (300+ DPI) and get:

```
Printer: Xerox DocuColor (pattern match)
Serial: 21052857
Printed: 2026-03-03 14:32
Confidence: high (parity check passed)
Grid location: top-left corner, 15×8, offset (12, 8)
```

### Why browser-based matters

- **No upload required** — the scan never leaves your device
- **Integrated with PDF Changer** — analyze a PDF's pages directly, no separate tool
- **Accessible** — no Python environment, no command line, no dependencies
- **Immediate** — journalists and researchers can check a document in seconds

## Phase 1: Xerox DocuColor decoder

The Xerox DocuColor pattern is the most documented MIC format. The EFF published the grid structure in 2005, and DEDA provides a reference implementation.

### Grid structure

The DocuColor pattern is a 15×8 grid of dots, repeated across the page:

- 15 columns × 8 rows
- Each column encodes a 7-bit value (rows 1-7) + 1 parity bit (row 8)
- Dots are ~0.1mm diameter, spaced ~1mm apart
- Yellow on white: R>200, G>180, B<100

### Column assignments

| Column | Meaning |
|--------|---------|
| 15 | Separator (always 0000001) |
| 14 | Serial number (byte 1, MSB) |
| 13 | Serial number (byte 2) |
| 12 | Serial number (byte 3) |
| 11 | Serial number (byte 4, LSB) |
| 10 | Unknown / reserved |
| 9 | Unknown / reserved |
| 8 | Year (last 2 digits, BCD) |
| 7 | Month (BCD) |
| 6 | Day (BCD) |
| 5 | Hour (BCD) |
| 4 | Unknown / reserved |
| 3 | Unknown / reserved |
| 2 | Minute (BCD) |
| 1 | Row parity |

*Source: EFF Machine Identification Code Technology Project (2005)*

### Decoding pipeline

#### Step 1: High-resolution rendering

Render the PDF page at 600 DPI using PDF.js. The existing flatten/redact tools already render at high DPI, so this capability is available.

```typescript
const scale = 600 / 72; // 72 DPI base × 8.33 = 600 DPI
const viewport = page.getViewport({ scale });
const canvas = document.createElement("canvas");
canvas.width = viewport.width;
canvas.height = viewport.height;
const ctx = canvas.getContext("2d")!;
await page.render({ canvasContext: ctx, viewport }).promise;
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
```

#### Step 2: Yellow channel extraction

Filter pixels to isolate yellow dots on a white background:

```typescript
function extractYellowChannel(imageData: ImageData): Uint8Array {
  const { data, width, height } = imageData;
  const binary = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // Yellow dot on white/light background
    binary[i / 4] = (r > 200 && g > 180 && b < 100) ? 1 : 0;
  }
  return binary;
}
```

#### Step 3: Grid detection

Find the repeating 15×8 grid pattern. Two approaches:

**Approach A: Autocorrelation**
Compute the autocorrelation of yellow pixel positions to find the grid spacing. The strongest correlation peaks at the row spacing and column spacing.

**Approach B: Template matching**
Given known approximate dot spacing (~1mm = ~24px at 600 DPI), search for the grid origin by sliding a 15×8 template across the image and computing match scores.

We'll implement Approach B first (simpler, sufficient for DocuColor):

```typescript
function findGrid(
  binary: Uint8Array,
  width: number,
  height: number,
  dotSpacing: number,
): { x: number; y: number; score: number } | null {
  const cols = 15;
  const rows = 8;
  let best = { x: 0, y: 0, score: 0 };

  // Search within one grid period from each edge
  for (let gy = 0; gy < dotSpacing * rows; gy++) {
    for (let gx = 0; gx < dotSpacing * cols; gx++) {
      let score = 0;
      for (let col = 0; col < cols; col++) {
        for (let row = 0; row < rows; row++) {
          const px = gx + col * dotSpacing;
          const py = gy + row * dotSpacing;
          if (px >= width || py >= height) continue;
          // Check a small area around the expected dot position
          score += checkDotPresence(binary, width, px, py, 3);
        }
      }
      if (score > best.score) {
        best = { x: gx, y: gy, score };
      }
    }
  }

  return best.score > cols * rows * 0.3 ? best : null;
}
```

#### Step 4: Grid reading

Once the grid origin is found, read each cell:

```typescript
function readGrid(
  binary: Uint8Array,
  width: number,
  gridX: number,
  gridY: number,
  dotSpacing: number,
): number[][] {
  const cols = 15;
  const rows = 8;
  const grid: number[][] = [];

  for (let col = 0; col < cols; col++) {
    const column: number[] = [];
    for (let row = 0; row < rows; row++) {
      const px = gridX + col * dotSpacing;
      const py = gridY + row * dotSpacing;
      column.push(checkDotPresence(binary, width, px, py, 3) > 0 ? 1 : 0);
    }
    grid.push(column);
  }

  return grid;
}
```

#### Step 5: Decode values

```typescript
function decodeDocuColor(grid: number[][]): MicDecodeResult {
  // Columns are read right-to-left (column 15 = index 0 in our array)
  // Each column's bits 0-6 are data, bit 7 is parity

  const serialBytes = [
    readColumnValue(grid[1]),  // Column 14
    readColumnValue(grid[2]),  // Column 13
    readColumnValue(grid[3]),  // Column 12
    readColumnValue(grid[4]),  // Column 11
  ];
  const serial = serialBytes.reduce((acc, b) => acc * 256 + b, 0);

  const year = bcdDecode(readColumnValue(grid[7]));   // Column 8
  const month = bcdDecode(readColumnValue(grid[8]));   // Column 7
  const day = bcdDecode(readColumnValue(grid[9]));     // Column 6
  const hour = bcdDecode(readColumnValue(grid[10]));   // Column 5
  const minute = bcdDecode(readColumnValue(grid[13])); // Column 2

  const parityOk = verifyParity(grid);

  return {
    printer: "Xerox DocuColor",
    serial: serial.toString(),
    year: 2000 + year,
    month,
    day,
    hour,
    minute,
    parityValid: parityOk,
    confidence: parityOk ? "high" : "medium",
  };
}
```

### Bundle impact

The decoder adds approximately 5-10KB of JavaScript (unminified). No external dependencies — the Hough transform / template matching is pure arithmetic.

## Phase 2: Additional printer patterns (future)

Phase 2 requires physical samples from other printer models. Each manufacturer uses a different encoding:

| Manufacturer | Pattern type | Documentation |
|-------------|-------------|---------------|
| HP LaserJet | Dot matrix, unknown encoding | Undocumented |
| Ricoh/Savin | Similar to DocuColor | Partially documented by DEDA |
| Canon | Different grid layout | Partially documented by DEDA |
| Brother | May not embed tracking dots | Needs verification |
| Konica Minolta | Unknown | Undocumented |

## Integration with PDF Changer

The decoder will integrate at two points:

1. **Analyze tool** — when analyzing a PDF, the decoder runs automatically and reports any detected tracking codes
2. **Scrub report** — the VPE audit report will include MIC detection results alongside metadata findings

## Status

Phase 1 (DocuColor decoder) is **published**. The decoder is implemented in `src/utils/pdf/micDecode.ts` with 9 passing tests covering synthetic grid generation, yellow channel extraction, template matching, BCD decoding, and parity verification.

**What works now:**
- Yellow channel extraction from rendered page ImageData
- Grid detection via template matching at 6 DPI scales (12-48px spacing)
- 15×8 DocuColor grid reading with dot presence checking
- Serial number, date, and time decoding (BCD)
- Column parity verification

**What's next:**
- Integration into the Analyze tool UI (automatic MIC detection on page scan)
- Integration into the VPE audit report
- Real-world validation against physical printed samples
- Phase 2: additional printer patterns

## Related

- [Printer Tracking Dots](/blog/opsec/printer-tracking-dots) — blog post explaining the technology
- [Steganography Detection](/security/technical/metadata-forensic-traces) — current heuristic approach
- [DEDA](https://github.com/dfd-tud/deda) — reference Python implementation (TU Dresden)
- [EFF MIC Project](https://www.eff.org/issues/printers) — original DocuColor documentation
