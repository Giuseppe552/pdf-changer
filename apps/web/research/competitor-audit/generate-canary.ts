/**
 * Canary PDF Generator
 *
 * Creates PDF files with unique, trackable metadata for each target service.
 * Each canary has distinct identifiers so we can verify what the service
 * transmits, retains, and strips.
 *
 * Usage:
 *   npx tsx generate-canary.ts
 *
 * Output:
 *   canary-{service}-{timestamp}.pdf — one per target service
 */

import { PDFDocument, StandardFonts } from "pdf-lib";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const SERVICES = [
  "ilovepdf",
  "smallpdf",
  "pdf24",
  "adobe-acrobat-online",
  "sejda",
  "pdf2go",
  "freepdfconvert",
] as const;

type Service = (typeof SERVICES)[number];

// Fake GPS coordinates — each service gets a unique location
const GPS_COORDS: Record<Service, { lat: number; lon: number; name: string }> = {
  ilovepdf: { lat: 41.3851, lon: 2.1734, name: "Barcelona" },
  smallpdf: { lat: 47.3769, lon: 8.5417, name: "Zurich" },
  pdf24: { lat: 52.52, lon: 13.405, name: "Berlin" },
  "adobe-acrobat-online": { lat: 37.3861, lon: -122.0839, name: "Mountain View" },
  sejda: { lat: 52.3676, lon: 4.9041, name: "Amsterdam" },
  pdf2go: { lat: 48.8566, lon: 2.3522, name: "Paris" },
  freepdfconvert: { lat: 51.5074, lon: -0.1278, name: "London" },
};

async function generateCanary(service: Service): Promise<Uint8Array> {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  const docId = randomUUID();

  const pdf = await PDFDocument.create();

  // Set document metadata — unique per service
  pdf.setTitle(`Canary Document — ${service} — ${timestamp}`);
  pdf.setAuthor(`canary-${service}-${timestamp}`);
  pdf.setSubject(`PDFChanger Research Canary for ${service}`);
  pdf.setCreator("PDFChanger-Research-v1");
  pdf.setProducer("PDFChanger-CanaryGenerator-v1");
  pdf.setCreationDate(now);
  pdf.setModificationDate(now);
  pdf.setKeywords([
    `canary-${service}`,
    `docid-${docId}`,
    "pdfchanger-research",
    timestamp,
  ]);

  // Add a page with visible content
  const page = pdf.addPage([612, 792]); // US Letter
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  const { height } = page.getSize();

  page.drawText("CANARY DOCUMENT", {
    x: 50,
    y: height - 80,
    size: 24,
    font: boldFont,
  });

  page.drawText("PDF Changer Research Programme", {
    x: 50,
    y: height - 110,
    size: 14,
    font,
  });

  const lines = [
    `Service: ${service}`,
    `Generated: ${now.toISOString()}`,
    `Document ID: ${docId}`,
    `Author field: canary-${service}-${timestamp}`,
    `GPS embedded: ${GPS_COORDS[service].name} (${GPS_COORDS[service].lat}, ${GPS_COORDS[service].lon})`,
    "",
    "This document contains unique metadata markers to track",
    "what happens to document metadata during online processing.",
    "",
    "Metadata markers present:",
    "  - PDF Info Dictionary (Author, Title, Subject, Creator, Producer)",
    "  - Keywords array with unique identifiers",
    "  - Creation and Modification dates",
    "  - Unique document ID in keywords",
    "",
    "This is a synthetic document created for research purposes.",
    "It does not contain any real personal or sensitive information.",
  ];

  let y = height - 160;
  for (const line of lines) {
    page.drawText(line, { x: 50, y, size: 11, font });
    y -= 18;
  }

  // Add a hidden form field with canary data
  // (AcroForm to test if services strip form data)
  // Note: pdf-lib form support is limited, but we can add basic fields

  const form = pdf.getForm();
  const hiddenField = form.createTextField("canary_field");
  hiddenField.setText(`canary-${service}-${docId}`);
  hiddenField.addToPage(page, {
    x: 50,
    y: 50,
    width: 200,
    height: 20,
  });

  return pdf.save();
}

async function main() {
  const outDir = join(import.meta.dirname ?? __dirname, "canaries");
  mkdirSync(outDir, { recursive: true });

  const timestamp = new Date().toISOString().slice(0, 10);

  console.log("Generating canary PDFs...\n");

  for (const service of SERVICES) {
    const bytes = await generateCanary(service);
    const filename = `canary-${service}-${timestamp}.pdf`;
    const filepath = join(outDir, filename);
    writeFileSync(filepath, bytes);
    console.log(`  ${filename} (${bytes.length} bytes)`);
  }

  console.log(`\n${SERVICES.length} canary PDFs generated in ${outDir}`);
  console.log("\nNext steps:");
  console.log("  1. Start mitmproxy: mitmproxy --save-stream-file flows/{service}.flow");
  console.log("  2. Configure browser proxy to 127.0.0.1:8080");
  console.log("  3. Upload each canary to the corresponding service");
  console.log("  4. Download the processed result");
  console.log("  5. Run analyze-output.ts on the downloaded files");
}

main().catch(console.error);
