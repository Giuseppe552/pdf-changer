// PII detection pipeline for PDFs.
// Extracts positioned text via PDF.js getTextContent(), runs pattern
// matchers, maps detected spans back to fractional page coordinates
// compatible with RedactionRect.

import type { RedactionRect } from "./operations/redactPdf";
import { isNerModelLoaded, runNer } from "./nerDetect";

export type PiiType =
  | "ssn"
  | "phone"
  | "email"
  | "credit-card"
  | "date-of-birth"
  | "ip-address"
  | "passport"
  | "person"
  | "organization"
  | "location";

export type PiiDetection = {
  pageIndex: number;
  type: PiiType;
  value: string; // the matched text
  confidence: number; // 0-1
  rect: RedactionRect;
};

export type PiiScanResult = {
  detections: PiiDetection[];
  pageCount: number;
  textExtracted: boolean; // false if PDF is image-only (no text layer)
};

// --- text extraction with positions ---

type PositionedText = {
  str: string;
  x: number; // PDF points from left
  y: number; // PDF points from bottom (PDF coordinate system)
  width: number; // PDF points
  height: number; // PDF points
};

type PageText = {
  items: PositionedText[];
  fullText: string;
  pageWidth: number;
  pageHeight: number;
};

async function extractPageText(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
): Promise<PageText> {
  const viewport = page.getViewport({ scale: 1 }); // 1:1 = PDF points
  const content = await page.getTextContent();

  const items: PositionedText[] = [];
  for (const item of content.items) {
    if (!item.str || !item.transform) continue;
    // transform is a 6-element matrix [scaleX, skewX, skewY, scaleY, x, y]
    const tx = item.transform[4];
    const ty = item.transform[5];
    const h = Math.abs(item.transform[3]) || item.height || 10;
    const w = item.width || item.str.length * h * 0.5; // fallback estimate
    items.push({ str: item.str, x: tx, y: ty, width: w, height: h });
  }

  const fullText = items.map((it) => it.str).join(" ");

  return {
    items,
    fullText,
    pageWidth: viewport.width,
    pageHeight: viewport.height,
  };
}

// --- pattern matchers ---
// Each returns {start, end} character offsets into the fullText string.

type RawMatch = {
  type: PiiType;
  start: number;
  end: number;
  value: string;
  confidence: number;
};

// SSN: 123-45-6789 or 123 45 6789. Reject 000/666/900-999 area numbers per SSA rules.
const SSN_RE = /\b(?!000|666|9\d\d)(\d{3})[- ](?!00)(\d{2})[- ](?!0000)(\d{4})\b/g;

// Phone: US/UK/international formats. Require at least 10 digits.
const PHONE_RE =
  /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b|\+\d{1,3}[-.\s]?\d{4,14}\b/g;

// Email: standard RFC 5322 simplified
const EMAIL_RE = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;

// Credit card: 13-19 digits with optional separators, Luhn-validated
const CC_RE = /\b(\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{1,7})\b/g;

// Date of birth: common formats near "DOB", "born", "birth", "date of birth"
const DOB_CONTEXT_RE =
  /(?:d\.?o\.?b\.?|born|birth|date of birth)[:\s]*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/gi;

// IP address: v4 only, reject common non-routable
const IPV4_RE = /\b(?!0\.0\.0\.0|255\.255\.255\.255)(\d{1,3}\.){3}\d{1,3}\b/g;

// Passport: US format (letter + 8 digits), UK (9 digits), generic
const PASSPORT_RE =
  /(?:passport[:\s#]*)\b([A-Z]\d{8}|\d{9})\b/gi;

function luhnCheck(digits: string): boolean {
  const nums = digits.replace(/\D/g, "");
  if (nums.length < 13 || nums.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = nums.length - 1; i >= 0; i--) {
    let n = parseInt(nums[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function runPatterns(text: string): RawMatch[] {
  const matches: RawMatch[] = [];

  for (const m of text.matchAll(SSN_RE)) {
    matches.push({
      type: "ssn",
      start: m.index!,
      end: m.index! + m[0].length,
      value: m[0],
      confidence: 0.95,
    });
  }

  for (const m of text.matchAll(PHONE_RE)) {
    matches.push({
      type: "phone",
      start: m.index!,
      end: m.index! + m[0].length,
      value: m[0],
      confidence: 0.8,
    });
  }

  for (const m of text.matchAll(EMAIL_RE)) {
    matches.push({
      type: "email",
      start: m.index!,
      end: m.index! + m[0].length,
      value: m[0],
      confidence: 0.95,
    });
  }

  for (const m of text.matchAll(CC_RE)) {
    if (luhnCheck(m[1])) {
      matches.push({
        type: "credit-card",
        start: m.index!,
        end: m.index! + m[0].length,
        value: m[0],
        confidence: 0.9,
      });
    }
  }

  for (const m of text.matchAll(DOB_CONTEXT_RE)) {
    const dateStart = m.index! + m[0].indexOf(m[1]);
    matches.push({
      type: "date-of-birth",
      start: dateStart,
      end: dateStart + m[1].length,
      value: m[1],
      confidence: 0.7,
    });
  }

  for (const m of text.matchAll(IPV4_RE)) {
    const octets = m[0].split(".").map(Number);
    if (octets.every((o) => o >= 0 && o <= 255)) {
      matches.push({
        type: "ip-address",
        start: m.index!,
        end: m.index! + m[0].length,
        value: m[0],
        confidence: 0.75,
      });
    }
  }

  for (const m of text.matchAll(PASSPORT_RE)) {
    matches.push({
      type: "passport",
      start: m.index!,
      end: m.index! + m[0].length,
      value: m[1],
      confidence: 0.6,
    });
  }

  return matches;
}

// --- character offset → PDF coordinate mapping ---
// The fullText is items[].str joined with " ". We track cumulative
// character positions to find which TextItem(s) a match span covers,
// then compute the bounding box from those items' positions.

function mapSpanToRect(
  match: RawMatch,
  items: PositionedText[],
  pageWidth: number,
  pageHeight: number,
  pageIndex: number,
): PiiDetection | null {
  // Build character offset map: for each item, the start offset in fullText
  const offsets: { start: number; end: number; item: PositionedText }[] = [];
  let cursor = 0;
  for (const item of items) {
    const start = cursor;
    const end = cursor + item.str.length;
    offsets.push({ start, end, item });
    cursor = end + 1; // +1 for the joining space
  }

  // Find items that overlap with the match span
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  let found = false;

  for (const { start, end, item } of offsets) {
    if (end <= match.start || start >= match.end) continue;
    found = true;
    // PDF y is bottom-up (origin at bottom-left). item.y is the text baseline.
    // Text renders ABOVE the baseline by approximately item.height.
    // Convert to top-down (origin at top-left) for fractional coords:
    const topY = pageHeight - item.y - item.height; // top of text
    const bottomY = pageHeight - item.y + item.height * 0.3; // baseline + descenders
    minX = Math.min(minX, item.x);
    minY = Math.min(minY, topY);
    maxX = Math.max(maxX, item.x + item.width);
    maxY = Math.max(maxY, bottomY);
  }

  if (!found) return null;

  // Fractional coordinates with small padding
  const pad = 2; // PDF points
  const x = Math.max(0, (minX - pad) / pageWidth);
  const y = Math.max(0, (minY - pad) / pageHeight);
  const w = Math.min(1 - x, (maxX - minX + pad * 2) / pageWidth);
  const h = Math.min(1 - y, (maxY - minY + pad * 2) / pageHeight);

  return {
    pageIndex,
    type: match.type,
    value: match.value,
    confidence: match.confidence,
    rect: { pageIndex, x, y, width: w, height: h },
  };
}

// --- main entry point ---

const MAX_PAGES = 200;

export async function detectPii(
  pdfBytes: Uint8Array,
  onProgress?: (page: number, total: number) => void,
): Promise<PiiScanResult> {
  const pdfjsLib = await import("pdfjs-dist");
  const workerUrl = (
    await import("pdfjs-dist/build/pdf.worker.min.mjs?url")
  ).default;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerUrl;
  // Clone bytes — getDocument transfers the ArrayBuffer to its worker,
  // which would detach the caller's buffer and break downstream consumers.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = await (pdfjsLib as any).getDocument({ data: new Uint8Array(pdfBytes) }).promise;

  const pageCount = Math.min(MAX_PAGES, doc.numPages);
  const detections: PiiDetection[] = [];
  let hasText = false;

  for (let i = 1; i <= pageCount; i++) {
    onProgress?.(i, pageCount);
    const page = await doc.getPage(i);
    const pageText = await extractPageText(page);

    if (pageText.items.length > 0) hasText = true;
    if (!pageText.fullText.trim()) continue;

    // Layer 1: regex patterns (SSN, phone, email, etc.)
    const regexMatches = runPatterns(pageText.fullText);
    for (const match of regexMatches) {
      const detection = mapSpanToRect(
        match,
        pageText.items,
        pageText.pageWidth,
        pageText.pageHeight,
        i - 1,
      );
      if (detection) detections.push(detection);
    }

    // Layer 2: NER model (person names, organizations, locations)
    // Only runs if the model has been loaded via loadNerModel()
    if (isNerModelLoaded()) {
      const NER_TYPE_MAP: Record<string, PiiType> = {
        PER: "person",
        ORG: "organization",
        LOC: "location",
      };

      const entities = await runNer(pageText.fullText);
      for (const ent of entities) {
        const piiType = NER_TYPE_MAP[ent.entity_group];
        if (!piiType) continue; // skip MISC
        const detection = mapSpanToRect(
          {
            type: piiType,
            start: ent.start,
            end: ent.end,
            value: ent.word,
            confidence: ent.score,
          },
          pageText.items,
          pageText.pageWidth,
          pageText.pageHeight,
          i - 1,
        );
        if (detection) detections.push(detection);
      }
    }
  }

  // Release the worker connection so downstream PDF.js consumers (pdfToImage)
  // don't deadlock waiting for a free worker slot.
  doc.destroy();

  return { detections, pageCount, textExtracted: hasText };
}
