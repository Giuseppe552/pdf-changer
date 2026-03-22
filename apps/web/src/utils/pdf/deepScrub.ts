import { PDFDocument, PDFName } from "pdf-lib";
import { sha256 } from "../sha256";
import { detectLikelyExif } from "./exifDetect";
import { stripExifFromPdfBytes, type ExifStripReport } from "./exifStrip";
import { detectFontFingerprints } from "./fontDetect";
import { type ProgressCallback, noopProgress, progress } from "../progress";

const FIXED_DATE = new Date("2000-01-01T00:00:00.000Z");

export async function deepScrubPdf(
  inputBytes: Uint8Array,
  onProgress: ProgressCallback = noopProgress,
): Promise<{
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
  onProgress(progress("hashing", 0.05));
  const inputSha = await sha256(inputBytes);

  onProgress(progress("loading", 0.1));
  const exifWarning = detectLikelyExif(inputBytes);
  const fontReport = await detectFontFingerprints(inputBytes);

  const src = await PDFDocument.load(inputBytes, { ignoreEncryption: false });
  const pageCount = src.getPageCount();
  onProgress(progress("reading-metadata", 0.15, { pageCount }));

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

  onProgress(progress("copying-pages", 0.2, { pageCount }));
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

  onProgress(progress("saving", 0.6, { pageCount }));
  let finalBytes = new Uint8Array(await out.save());

  onProgress(progress("stripping-exif", 0.7, { pageCount }));
  // Strip EXIF/IPTC/ICC from embedded JPEG/PNG streams
  let exifStripReport: ExifStripReport | null = null;
  try {
    const stripResult = stripExifFromPdfBytes(finalBytes);
    finalBytes = new Uint8Array(stripResult.outputBytes);
    exifStripReport = stripResult.report;
  } catch {
    // Best-effort: if strip fails, continue with unstripped output
  }

  onProgress(progress("hashing", 0.9, { pageCount }));
  const outputSha = await sha256(finalBytes);

  onProgress(progress("verifying", 1, { pageCount }));
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
