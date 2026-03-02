import { PDFDocument, PDFName } from "pdf-lib";
import { sha256 } from "../sha256";
import { detectLikelyExif } from "./exifDetect";
import { stripExifFromPdfBytes, type ExifStripReport } from "./exifStrip";
import { detectFontFingerprints } from "./fontDetect";

const FIXED_DATE = new Date("2000-01-01T00:00:00.000Z");

export async function deepScrubPdf(inputBytes: Uint8Array): Promise<{
  outputBytes: Uint8Array;
  report: {
    pageCount: number;
    metadataBefore: Record<string, string | null>;
    inputSha256: Uint8Array;
    outputSha256: Uint8Array;
    exifWarning: boolean;
    exifStripReport: ExifStripReport | null;
    fontWarning: boolean;
    customFontNames: string[];
  };
}> {
  const inputSha = await sha256(inputBytes);
  const exifWarning = detectLikelyExif(inputBytes);
  const fontReport = await detectFontFingerprints(inputBytes);

  const src = await PDFDocument.load(inputBytes, { ignoreEncryption: false });
  const pageCount = src.getPageCount();

  const metadataBefore: Record<string, string | null> = {
    Title: safeString(() => src.getTitle()),
    Author: safeString(() => src.getAuthor()),
    Subject: safeString(() => src.getSubject()),
    Keywords: safeString(() => src.getKeywords()),
    Creator: safeString(() => src.getCreator()),
    Producer: safeString(() => src.getProducer()),
    CreationDate: safeDate(() => src.getCreationDate()),
    ModDate: safeDate(() => src.getModificationDate()),
  };

  const out = await PDFDocument.create();
  const annotsKey = PDFName.of("Annots");
  const aaKey = PDFName.of("AA");

  const copied = await out.copyPages(src, src.getPageIndices());
  for (const page of copied) {
    // Best-effort removal of page-level annotations/actions.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdf-lib internals
      const node = (page as any).node;
      node?.delete?.(annotsKey);
      node?.delete?.(aaKey);
    } catch {
      // ignore
    }
    out.addPage(page);
  }

  // Best-effort removal of catalog-level action/name trees.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdf-lib internals
    const catalog = (out as any).catalog;
    catalog?.delete?.(PDFName.of("OpenAction"));
    catalog?.delete?.(PDFName.of("AA"));
    catalog?.delete?.(PDFName.of("Names"));
    catalog?.delete?.(PDFName.of("Metadata"));
    catalog?.delete?.(PDFName.of("AcroForm"));
  } catch {
    // ignore
  }

  // Clear Info fields and normalize dates (no signature).
  out.setTitle("");
  out.setAuthor("");
  out.setSubject("");
  out.setKeywords([]);
  out.setCreator("");
  out.setProducer("");
  out.setCreationDate(FIXED_DATE);
  out.setModificationDate(FIXED_DATE);

  let finalBytes = new Uint8Array(await out.save());

  // Strip EXIF/IPTC/ICC from embedded JPEG/PNG streams
  let exifStripReport: ExifStripReport | null = null;
  try {
    const stripResult = stripExifFromPdfBytes(finalBytes);
    finalBytes = new Uint8Array(stripResult.outputBytes);
    exifStripReport = stripResult.report;
  } catch {
    // Best-effort: if strip fails, continue with unstripped output
  }

  const outputSha = await sha256(finalBytes);

  return {
    outputBytes: finalBytes,
    report: {
      pageCount,
      metadataBefore,
      inputSha256: inputSha,
      outputSha256: outputSha,
      exifWarning,
      exifStripReport,
      fontWarning: fontReport.fontWarning,
      customFontNames: fontReport.customFontNames,
    },
  };
}

function safeString(fn: () => string | undefined): string | null {
  try {
    const v = fn();
    if (!v) return null;
    return String(v);
  } catch {
    return null;
  }
}

function safeDate(fn: () => Date | undefined): string | null {
  try {
    const d = fn();
    if (!d) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}
