import { PDFDocument, PDFName, PDFDict, PDFRef } from "pdf-lib";
import { detectLikelyExif } from "./exifDetect";
import { detectFontFingerprints } from "./fontDetect";
import { parseExifFromPdfBytes, type ImageExifData } from "./exifParse";

export type FindingSeverity = "info" | "warning" | "critical";
export type FindingCategory = "identity" | "tracking" | "security";

export type Finding = {
  severity: FindingSeverity;
  category: FindingCategory;
  title: string;
  detail: string;
  remediation: string;
};

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type ForensicReport = {
  fileSize: number;
  pageCount: number;
  metadata: Record<string, string | null>;
  fontFingerprints: string[];
  imageExif: ImageExifData[];
  outboundUrls: string[];
  revisionCount: number;
  hasJavaScript: boolean;
  hasEmbeddedFiles: boolean;
  hasAcroForm: boolean;
  formFieldCount: number;
  hasDocumentId: boolean;
  exifWarning: boolean;
  findings: Finding[];
  riskLevel: RiskLevel;
};

const USE_SCRUBBER = "Run the scrubber or paranoid scrub to strip this data.";

function safeStr(fn: () => string | undefined): string | null {
  try {
    const v = fn();
    return v ? String(v) : null;
  } catch {
    return null;
  }
}

function safeDate(fn: () => Date | undefined): string | null {
  try {
    const d = fn();
    return d ? d.toISOString() : null;
  } catch {
    return null;
  }
}

// scan raw bytes for outbound URI patterns
function scanOutboundUrls(bytes: Uint8Array): string[] {
  const text = new TextDecoder("latin1").decode(bytes);
  const urls: string[] = [];

  // match /URI (url) patterns — pdf spec
  const uriRe = /\/URI\s*\(\s*(https?:\/\/[^)]+)\s*\)/gi;
  let m: RegExpExecArray | null;
  while ((m = uriRe.exec(text)) !== null) {
    const url = m[1].trim();
    if (url && !urls.includes(url)) urls.push(url);
  }
  return urls;
}

function countPattern(bytes: Uint8Array, pat: string): number {
  const text = new TextDecoder("latin1").decode(bytes);
  let count = 0;
  let idx = 0;
  while ((idx = text.indexOf(pat, idx)) !== -1) {
    count++;
    idx += pat.length;
  }
  return count;
}

function hasPattern(bytes: Uint8Array, pat: string): boolean {
  return countPattern(bytes, pat) > 0;
}

export async function analyzePdf(inputBytes: Uint8Array): Promise<ForensicReport> {
  const findings: Finding[] = [];
  const report: ForensicReport = {
    fileSize: inputBytes.length,
    pageCount: 0,
    metadata: {},
    fontFingerprints: [],
    imageExif: [],
    outboundUrls: [],
    revisionCount: 0,
    hasJavaScript: false,
    hasEmbeddedFiles: false,
    hasAcroForm: false,
    formFieldCount: 0,
    hasDocumentId: false,
    exifWarning: false,
    findings,
    riskLevel: "low",
  };

  // --- byte-level analysis (works even if pdf-lib fails) ---

  // EXIF
  try {
    report.imageExif = parseExifFromPdfBytes(inputBytes);
  } catch { /* best effort */ }
  report.exifWarning = detectLikelyExif(inputBytes);

  // outbound URLs
  report.outboundUrls = scanOutboundUrls(inputBytes);

  // revision count (startxref markers)
  report.revisionCount = countPattern(inputBytes, "startxref");

  // JS markers (byte-level fallback)
  const hasJsBytes = hasPattern(inputBytes, "/JavaScript") || hasPattern(inputBytes, "/JS ");

  // --- pdf-lib structural analysis ---
  try {
    const doc = await PDFDocument.load(inputBytes, {
      ignoreEncryption: true,
      updateMetadata: false,
    });
    report.pageCount = doc.getPageCount();

    // metadata
    report.metadata = {
      Title: safeStr(() => doc.getTitle()),
      Author: safeStr(() => doc.getAuthor()),
      Subject: safeStr(() => doc.getSubject()),
      Keywords: safeStr(() => doc.getKeywords()),
      Creator: safeStr(() => doc.getCreator()),
      Producer: safeStr(() => doc.getProducer()),
      CreationDate: safeDate(() => doc.getCreationDate()),
      ModDate: safeDate(() => doc.getModificationDate()),
    };

    // catalog inspection
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdf-lib internals
      const catalog = (doc as any).catalog;
      if (catalog) {
        report.hasJavaScript = !!(
          catalog.get?.(PDFName.of("JavaScript")) ||
          catalog.get?.(PDFName.of("JS"))
        );

        const names = catalog.get?.(PDFName.of("Names"));
        if (names) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdf-lib internals
          const ctx = (doc as any).context;
          const resolved = names instanceof PDFRef ? ctx?.lookup?.(names) : names;
          if (resolved instanceof PDFDict) {
            report.hasEmbeddedFiles = !!resolved.get?.(PDFName.of("EmbeddedFiles"));
          }
        }

        const acro = catalog.get?.(PDFName.of("AcroForm"));
        if (acro) {
          report.hasAcroForm = true;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdf-lib internals
          const ctx = (doc as any).context;
          const resolved = acro instanceof PDFRef ? ctx?.lookup?.(acro) : acro;
          if (resolved instanceof PDFDict) {
            const fields = resolved.get?.(PDFName.of("Fields"));
            if (fields instanceof PDFRef) {
              const arr = ctx?.lookup?.(fields);
              report.formFieldCount = arr?.size?.() ?? 0;
            }
          }
        }
      }
    } catch { /* ignore catalog errors */ }

    // document ID
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdf-lib internals
      const ctx = (doc as any).context;
      if (ctx?.trailerInfo?.ID) {
        report.hasDocumentId = true;
      }
    } catch { /* ignore */ }

    // font fingerprints
    try {
      const fontReport = await detectFontFingerprints(inputBytes);
      report.fontFingerprints = fontReport.customFontNames;
    } catch { /* ignore */ }
  } catch {
    // pdf-lib couldn't load — stick with byte-level results
    findings.push({
      severity: "info",
      category: "security",
      title: "PDF structure unreadable",
      detail: "Could not parse PDF structure — file may be encrypted, corrupted, or malformed. Byte-level analysis only.",
      remediation: "Try opening in a PDF reader first to verify the file is valid.",
    });
  }

  // override JS detection if byte-level found it but catalog didn't
  if (hasJsBytes && !report.hasJavaScript) report.hasJavaScript = true;

  // --- generate findings ---

  const meta = report.metadata;
  if (meta.Author) {
    findings.push({
      severity: "warning",
      category: "identity",
      title: "Author identity exposed",
      detail: `Document author '${meta.Author}' — can be correlated with other documents or accounts.`,
      remediation: USE_SCRUBBER,
    });
  }
  if (meta.Creator) {
    findings.push({
      severity: "warning",
      category: "identity",
      title: "Creation software revealed",
      detail: `Created with ${meta.Creator} — narrows source OS and application version.`,
      remediation: USE_SCRUBBER,
    });
  }
  if (meta.Producer) {
    findings.push({
      severity: "info",
      category: "identity",
      title: "PDF producer identified",
      detail: `Generated by ${meta.Producer}.`,
      remediation: USE_SCRUBBER,
    });
  }
  if (meta.CreationDate || meta.ModDate) {
    findings.push({
      severity: "warning",
      category: "identity",
      title: "Document timeline leaked",
      detail: `Created ${meta.CreationDate ?? "unknown"}, modified ${meta.ModDate ?? "unknown"} — reveals editing timeline.`,
      remediation: USE_SCRUBBER,
    });
  }
  const descriptive = [meta.Title, meta.Subject, meta.Keywords].filter(Boolean);
  if (descriptive.length > 0) {
    findings.push({
      severity: "info",
      category: "identity",
      title: "Descriptive metadata present",
      detail: `Contains: ${descriptive.join(", ")}.`,
      remediation: USE_SCRUBBER,
    });
  }

  // image EXIF findings
  for (const img of report.imageExif) {
    if (img.gps) {
      findings.push({
        severity: "critical",
        category: "tracking",
        title: "GPS coordinates in embedded image",
        detail: `Image ${img.index}: ${img.gps.lat.toFixed(4)}°, ${img.gps.lon.toFixed(4)}° — reveals physical location where photo was taken.`,
        remediation: USE_SCRUBBER,
      });
    }
    const parts = [img.make, img.model].filter(Boolean);
    if (parts.length > 0) {
      findings.push({
        severity: "warning",
        category: "identity",
        title: "Camera/device fingerprint",
        detail: `Image ${img.index}: ${parts.join(" ")} — identifies the specific device used.`,
        remediation: USE_SCRUBBER,
      });
    }
    if (img.software) {
      findings.push({
        severity: "info",
        category: "identity",
        title: "Image editing software",
        detail: `Image ${img.index}: processed with ${img.software}.`,
        remediation: USE_SCRUBBER,
      });
    }
  }

  if (report.fontFingerprints.length > 0) {
    findings.push({
      severity: "warning",
      category: "identity",
      title: "Font subset fingerprints",
      detail: `${report.fontFingerprints.length} fonts with unique prefixes — can trace document to source application session.`,
      remediation: "Use Flatten to Image to destroy all font data.",
    });
  }

  // security vectors
  if (report.hasJavaScript) {
    findings.push({
      severity: "critical",
      category: "security",
      title: "Executable code",
      detail: "Document contains JavaScript — can execute actions, exfiltrate data, or track document opens.",
      remediation: "Use paranoid scrub to remove all JavaScript entries.",
    });
  }
  if (report.outboundUrls.length > 0) {
    findings.push({
      severity: "critical",
      category: "tracking",
      title: "Outbound connections",
      detail: `${report.outboundUrls.length} external URL${report.outboundUrls.length > 1 ? "s" : ""} detected — document may phone home or track opens.`,
      remediation: USE_SCRUBBER,
    });
  }
  if (report.hasEmbeddedFiles) {
    findings.push({
      severity: "warning",
      category: "security",
      title: "Hidden file attachments",
      detail: "Document contains embedded files — may include unintended data.",
      remediation: "Use paranoid scrub to remove embedded files.",
    });
  }
  if (report.hasAcroForm) {
    findings.push({
      severity: "info",
      category: "security",
      title: "Interactive form fields",
      detail: `Document contains ${report.formFieldCount || "unknown number of"} form fields.`,
      remediation: USE_SCRUBBER,
    });
  }
  if (report.hasDocumentId) {
    findings.push({
      severity: "warning",
      category: "tracking",
      title: "Document fingerprint",
      detail: "Unique document ID present — can track this specific file across copies.",
      remediation: "Use paranoid scrub to remove the document ID.",
    });
  }
  if (report.revisionCount > 1) {
    findings.push({
      severity: "warning",
      category: "security",
      title: "Edit history embedded",
      detail: `${report.revisionCount} revisions detected — previous content including 'deleted' data may be recoverable.`,
      remediation: USE_SCRUBBER,
    });
  }
  if (report.exifWarning && report.imageExif.length === 0) {
    findings.push({
      severity: "info",
      category: "identity",
      title: "Unreadable EXIF data",
      detail: "EXIF markers detected but couldn't be fully parsed — some image metadata may remain.",
      remediation: USE_SCRUBBER,
    });
  }

  // --- risk assessment ---
  const hasCritical = findings.some((f) => f.severity === "critical");
  const hasWarning = findings.some((f) => f.severity === "warning");
  const hasGps = report.imageExif.some((i) => i.gps);
  const jsAndUrls = report.hasJavaScript && report.outboundUrls.length > 0;

  if (hasGps || jsAndUrls || findings.filter((f) => f.severity === "critical").length > 1) {
    report.riskLevel = "critical";
  } else if (
    (meta.Author && (meta.CreationDate || meta.ModDate)) ||
    (report.fontFingerprints.length > 0 && Object.values(meta).some(Boolean)) ||
    hasCritical
  ) {
    report.riskLevel = "high";
  } else if (hasWarning) {
    report.riskLevel = "medium";
  } else {
    report.riskLevel = "low";
  }

  return report;
}
