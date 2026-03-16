/**
 * Canary Output Analyzer
 *
 * Compares the original canary PDF with the processed output from each service.
 * Reports what metadata was preserved, stripped, or injected.
 *
 * Usage:
 *   npx tsx analyze-output.ts canaries/canary-ilovepdf-2026-03-14.pdf output/ilovepdf-result.pdf
 */

import { PDFDocument } from "pdf-lib";
import { readFileSync } from "node:fs";

type MetadataComparison = {
  field: string;
  original: string | null;
  processed: string | null;
  status: "preserved" | "stripped" | "modified" | "injected";
};

type AnalysisReport = {
  service: string;
  originalFile: string;
  processedFile: string;
  originalSize: number;
  processedSize: number;
  metadata: MetadataComparison[];
  formFieldsPreserved: boolean;
  pageCount: { original: number; processed: number };
  summary: {
    preserved: number;
    stripped: number;
    modified: number;
    injected: number;
  };
};

function extractServiceName(filename: string): string {
  const match = filename.match(/canary-([a-z0-9-]+)-/);
  return match ? match[1] : "unknown";
}

async function analyzePdf(
  bytes: Uint8Array,
): Promise<{
  title: string | null;
  author: string | null;
  subject: string | null;
  creator: string | null;
  producer: string | null;
  creationDate: string | null;
  modDate: string | null;
  keywords: string | null;
  pageCount: number;
  hasForm: boolean;
  formFieldValue: string | null;
}> {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });

  let formFieldValue: string | null = null;
  let hasForm = false;
  try {
    const form = pdf.getForm();
    const fields = form.getFields();
    hasForm = fields.length > 0;
    const canaryField = fields.find((f) => f.getName() === "canary_field");
    if (canaryField) {
      const tf = form.getTextField("canary_field");
      formFieldValue = tf.getText() ?? null;
    }
  } catch {
    // No form
  }

  const keywords = pdf.getKeywords();

  return {
    title: pdf.getTitle() ?? null,
    author: pdf.getAuthor() ?? null,
    subject: pdf.getSubject() ?? null,
    creator: pdf.getCreator() ?? null,
    producer: pdf.getProducer() ?? null,
    creationDate: pdf.getCreationDate()?.toISOString() ?? null,
    modDate: pdf.getModificationDate()?.toISOString() ?? null,
    keywords: keywords ? (Array.isArray(keywords) ? keywords.join(", ") : keywords) : null,
    pageCount: pdf.getPageCount(),
    hasForm,
    formFieldValue,
  };
}

function compareField(
  field: string,
  original: string | null,
  processed: string | null,
): MetadataComparison {
  if (original === null && processed === null) {
    return { field, original, processed, status: "stripped" };
  }
  if (original === null && processed !== null) {
    return { field, original, processed, status: "injected" };
  }
  if (original !== null && processed === null) {
    return { field, original, processed, status: "stripped" };
  }
  if (original === processed) {
    return { field, original, processed, status: "preserved" };
  }
  return { field, original, processed, status: "modified" };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log("Usage: npx tsx analyze-output.ts <original.pdf> <processed.pdf>");
    process.exit(1);
  }

  const [originalPath, processedPath] = args;
  const originalBytes = new Uint8Array(readFileSync(originalPath));
  const processedBytes = new Uint8Array(readFileSync(processedPath));

  const original = await analyzePdf(originalBytes);
  const processed = await analyzePdf(processedBytes);

  const service = extractServiceName(originalPath);

  const comparisons: MetadataComparison[] = [
    compareField("Title", original.title, processed.title),
    compareField("Author", original.author, processed.author),
    compareField("Subject", original.subject, processed.subject),
    compareField("Creator", original.creator, processed.creator),
    compareField("Producer", original.producer, processed.producer),
    compareField("CreationDate", original.creationDate, processed.creationDate),
    compareField("ModDate", original.modDate, processed.modDate),
    compareField("Keywords", original.keywords, processed.keywords),
  ];

  const summary = {
    preserved: comparisons.filter((c) => c.status === "preserved").length,
    stripped: comparisons.filter((c) => c.status === "stripped").length,
    modified: comparisons.filter((c) => c.status === "modified").length,
    injected: comparisons.filter((c) => c.status === "injected").length,
  };

  const report: AnalysisReport = {
    service,
    originalFile: originalPath,
    processedFile: processedPath,
    originalSize: originalBytes.length,
    processedSize: processedBytes.length,
    metadata: comparisons,
    formFieldsPreserved: processed.formFieldValue === original.formFieldValue,
    pageCount: { original: original.pageCount, processed: processed.pageCount },
    summary,
  };

  // Print report
  console.log(`\nAnalysis: ${service}`);
  console.log("=".repeat(60));
  console.log(`Original: ${originalPath} (${originalBytes.length} bytes)`);
  console.log(`Processed: ${processedPath} (${processedBytes.length} bytes)`);
  console.log(`Pages: ${original.pageCount} → ${processed.pageCount}`);
  console.log(`Form fields preserved: ${report.formFieldsPreserved}`);
  console.log("");

  console.log("Metadata comparison:");
  console.log("-".repeat(60));
  for (const comp of comparisons) {
    const icon =
      comp.status === "preserved" ? "[PRESERVED]" :
      comp.status === "stripped" ? "[STRIPPED] " :
      comp.status === "modified" ? "[MODIFIED] " :
      "[INJECTED] ";
    console.log(`  ${icon} ${comp.field}`);
    if (comp.status !== "preserved") {
      console.log(`           Original:  ${comp.original ?? "(none)"}`);
      console.log(`           Processed: ${comp.processed ?? "(none)"}`);
    }
  }

  console.log("");
  console.log(
    `Summary: ${summary.preserved} preserved, ${summary.stripped} stripped, ` +
    `${summary.modified} modified, ${summary.injected} injected`,
  );

  // Write JSON
  const jsonPath = processedPath.replace(/\.pdf$/, "-analysis.json");
  const fs = await import("node:fs");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`\nJSON report: ${jsonPath}`);
}

main().catch(console.error);
