export type ToolSlug =
  | "scrub"
  | "merge"
  | "split"
  | "editor"
  | "compress"
  | "image-to-pdf"
  | "pdf-to-image"
  | "watermark"
  | "page-numbers"
  | "protect"
  | "unlock"
  | "remove-pages"
  | "flatten"
  | "redact"
  | "pipeline"
  | "rotate"
  | "crop"
  | "sign"
  | "fill-form"
  | "ocr"
  | "analyze"
  | "pii-detect";

export type ToolTier = "guest" | "free" | "paid";
export type ToolBucket = "core" | "heavy";
export type ProcessingMode = "local" | "hybrid";
export type ToolStatus = "ga" | "beta" | "coming-soon";
export type ToolAvailability = "fully-functional" | "limited";
export type ToolCategory =
  | "organize"
  | "convert"
  | "protect"
  | "edit"
  | "privacy";

export type ToolDefinition = {
  slug: ToolSlug;
  name: string;
  description: string;
  category: ToolCategory;
  minTier: ToolTier;
  bucket: ToolBucket;
  processingMode: ProcessingMode;
  status: ToolStatus;
  availability: ToolAvailability;
  releaseNote?: string;
  featured: boolean;
  enabled: boolean;
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
  related: {
    faq: string[];
    blog: string[];
    security: string[];
    guides: string[];
  };
};

const SHARED_RELATED = {
  faq: [
    "/faq/tool-usage/how-do-i-scrub-a-pdf-safely",
    "/faq/tool-usage/can-i-use-pdf-changer-offline",
  ],
  blog: [
    "/blog/basics/using-pdf-changer-offline",
    "/blog/documents/what-metadata-is-and-why-it-matters",
  ],
  security: ["/security", "/security/non-technical", "/security/policy"],
  guides: ["/guides/safely-sharing-pdfs"],
};

const PRIVACY_RELATED = {
  faq: [
    "/faq/tool-usage/how-do-i-scrub-a-pdf-safely",
    "/faq/anonymity-basics/what-is-a-threat-model",
  ],
  blog: [
    "/blog/documents/what-metadata-is-and-why-it-matters",
    "/blog/opsec/printer-tracking-dots",
  ],
  security: [
    "/security/technical/metadata-forensic-traces",
    "/security/technical/csp-exfiltration-analysis",
    "/security/non-technical/safe-pdf-handling-basics",
  ],
  guides: ["/guides/safely-sharing-pdfs", "/guides/anonymization-checklist"],
};

const ANALYZE_RELATED = {
  faq: [
    "/faq/tool-usage/how-do-i-scrub-a-pdf-safely",
    "/faq/metadata/what-metadata-can-a-pdf-contain",
  ],
  blog: [
    "/blog/documents/what-metadata-is-and-why-it-matters",
    "/blog/opsec/printer-tracking-dots",
  ],
  security: [
    "/security/technical/metadata-forensic-traces",
    "/security/technical/endpoint-and-browser-leakage-model",
    "/security/technical/verified-processing-environment",
  ],
  guides: ["/guides/pdf-metadata-explained", "/guides/anonymization-checklist"],
};

export const toolRegistry: ToolDefinition[] = [
  {
    slug: "scrub",
    name: "Remove Metadata from PDF",
    description: "Strip metadata, forms, annotations, and risky interactive PDF elements. No upload required.",
    category: "privacy",
    minTier: "guest",
    bucket: "core",
    processingMode: "local",
    status: "ga",
    availability: "fully-functional",
    featured: true,
    enabled: true,
    seo: {
      title: "Remove Metadata from PDF — Free, No Upload",
      description: "Remove hidden metadata, EXIF data, forms, and annotations from PDFs for free. Runs entirely in your browser — files never leave your device.",
      keywords: ["remove metadata from pdf", "pdf metadata remover", "pdf scrubber", "strip pdf metadata", "pdf privacy tool"],
    },
    related: PRIVACY_RELATED,
  },
  {
    slug: "merge",
    name: "Merge PDFs",
    description: "Combine multiple PDF files in your selected order with no uploads.",
    category: "organize",
    minTier: "guest",
    bucket: "core",
    processingMode: "local",
    status: "ga",
    availability: "fully-functional",
    featured: true,
    enabled: true,
    seo: {
      title: "Merge PDFs Locally",
      description: "Merge and combine multiple PDF files online for free. No upload required — reorder and join documents entirely in your browser.",
      keywords: ["merge pdf", "combine pdf", "local pdf merge"],
    },
    related: SHARED_RELATED,
  },
  {
    slug: "split",
    name: "Split PDF",
    description: "Split by ranges or one file per page for fast document extraction.",
    category: "organize",
    minTier: "guest",
    bucket: "core",
    processingMode: "local",
    status: "ga",
    availability: "fully-functional",
    featured: true,
    enabled: true,
    seo: {
      title: "Split PDF by Range or Page",
      description: "Split PDF files by page ranges or extract one page per file online for free. No upload — fast on-device processing in your browser.",
      keywords: ["split pdf", "extract pages pdf", "pdf page splitter"],
    },
    related: SHARED_RELATED,
  },
  {
    slug: "editor",
    name: "Page Editor",
    description: "Reorder, rotate, delete, and extract pages with local thumbnail previews.",
    category: "edit",
    minTier: "guest",
    bucket: "core",
    processingMode: "local",
    status: "ga",
    availability: "fully-functional",
    featured: true,
    enabled: true,
    seo: {
      title: "PDF Page Editor",
      description: "Reorder, rotate, delete, and extract PDF pages online for free. No upload — edit with live thumbnail previews in your browser.",
      keywords: ["pdf page editor", "reorder pdf pages", "rotate pdf pages"],
    },
    related: SHARED_RELATED,
  },
  {
    slug: "compress",
    name: "Compress PDF",
    description: "Reduce file size with local structural optimization and rebuild.",
    category: "convert",
    minTier: "guest",
    bucket: "heavy",
    processingMode: "local",
    status: "ga",
    availability: "fully-functional",
    featured: true,
    enabled: true,
    seo: {
      title: "Compress PDF File Size",
      description: "Compress and reduce PDF file size online for free. No upload — structural optimization runs entirely in your browser.",
      keywords: ["compress pdf", "reduce pdf size", "optimize pdf"],
    },
    related: SHARED_RELATED,
  },
  {
    slug: "image-to-pdf",
    name: "JPG/PNG to PDF",
    description: "Convert image files to one PDF, preserving order and quality.",
    category: "convert",
    minTier: "guest",
    bucket: "core",
    processingMode: "local",
    status: "ga",
    availability: "fully-functional",
    featured: true,
    enabled: true,
    seo: {
      title: "Convert JPG/PNG to PDF",
      description: "Convert JPG and PNG images to a single PDF online for free. No upload — preserves order and quality entirely in your browser.",
      keywords: ["jpg to pdf", "png to pdf", "images to pdf"],
    },
    related: SHARED_RELATED,
  },
  {
    slug: "pdf-to-image",
    name: "PDF to JPG/PNG",
    description: "Export PDF pages as image files for presentations, docs, and sharing.",
    category: "convert",
    minTier: "guest",
    bucket: "heavy",
    processingMode: "local",
    status: "ga",
    availability: "fully-functional",
    featured: false,
    enabled: true,
    seo: {
      title: "Convert PDF to Images",
      description: "Convert PDF pages to JPG or PNG images online for free. No upload — export every page as an image directly in your browser.",
      keywords: ["pdf to jpg", "pdf to png", "export pdf pages"],
    },
    related: SHARED_RELATED,
  },
  {
    slug: "watermark",
    name: "Add Watermark",
    description: "Stamp each page with custom text watermark for internal or draft sharing.",
    category: "edit",
    minTier: "guest",
    bucket: "core",
    processingMode: "local",
    status: "ga",
    availability: "fully-functional",
    featured: false,
    enabled: true,
    seo: {
      title: "Add Watermark to PDF",
      description: "Add custom text watermarks to PDF pages online for free. No upload — stamp every page with draft or confidential labels in your browser.",
      keywords: ["watermark pdf", "draft watermark pdf", "stamp pdf text"],
    },
    related: SHARED_RELATED,
  },
  {
    slug: "page-numbers",
    name: "Add Page Numbers",
    description: "Insert page numbers consistently across the document.",
    category: "edit",
    minTier: "guest",
    bucket: "core",
    processingMode: "local",
    status: "ga",
    availability: "fully-functional",
    featured: false,
    enabled: true,
    seo: {
      title: "Add Page Numbers to PDF",
      description: "Add page numbers to PDF documents online for free. No upload — insert consistent numbering across all pages in your browser.",
      keywords: ["page numbers pdf", "paginate pdf", "number pdf pages"],
    },
    related: SHARED_RELATED,
  },
  {
    slug: "protect",
    name: "Protect PDF",
    description: "Password-based protection workflow (hybrid beta path).",
    category: "protect",
    minTier: "guest",
    bucket: "heavy",
    processingMode: "hybrid",
    status: "coming-soon",
    availability: "limited",
    releaseNote:
      "Password-protected writing is in progress and not available in local production mode yet.",
    featured: false,
    enabled: false,
    seo: {
      title: "Protect PDF with Password",
      description: "Password-protect PDF files online for free. Hybrid processing with explicit boundaries — coming soon to your browser.",
      keywords: ["protect pdf", "password pdf", "secure pdf"],
    },
    related: SHARED_RELATED,
  },
  {
    slug: "unlock",
    name: "Unlock PDF",
    description: "Attempt local unlock/rebuild when you already have authorized access.",
    category: "protect",
    minTier: "guest",
    bucket: "heavy",
    processingMode: "hybrid",
    status: "beta",
    availability: "limited",
    releaseNote:
      "Unlock runs as authorized local rebuild for compatible files. Advanced encrypted modes may fail.",
    featured: false,
    enabled: true,
    seo: {
      title: "Unlock PDF",
      description: "Unlock and rebuild password-protected PDFs you own online for free. Authorized local rebuild for compatible files in your browser.",
      keywords: ["unlock pdf", "open protected pdf", "pdf authorized access"],
    },
    related: SHARED_RELATED,
  },
  {
    slug: "remove-pages",
    name: "Remove Pages by Range",
    description: "Delete selected ranges quickly and export a clean reduced PDF.",
    category: "organize",
    minTier: "guest",
    bucket: "core",
    processingMode: "local",
    status: "ga",
    availability: "fully-functional",
    featured: false,
    enabled: true,
    seo: {
      title: "Remove Pages from PDF",
      description: "Delete selected page ranges from PDFs online for free. No upload — quickly remove pages and export a clean file in your browser.",
      keywords: ["remove pages pdf", "delete pages pdf", "trim pdf pages"],
    },
    related: SHARED_RELATED,
  },
  {
    slug: "flatten",
    name: "Flatten to Image PDF",
    description: "Rasterize every page to destroy all hidden structure: fonts, layers, metadata, EXIF, scripts, forms.",
    category: "privacy",
    minTier: "guest",
    bucket: "heavy",
    processingMode: "local",
    status: "ga",
    availability: "fully-functional",
    featured: false,
    enabled: true,
    seo: {
      title: "Flatten PDF to Image",
      description: "Flatten PDFs to image-only pages online for free. No upload — rasterize every page to destroy fonts, layers, metadata, and scripts.",
      keywords: ["flatten pdf", "rasterize pdf", "image only pdf", "privacy pdf"],
    },
    related: PRIVACY_RELATED,
  },
  {
    slug: "redact",
    name: "Visual Redaction",
    description: "Draw redaction boxes on pages and burn them irreversibly by rasterizing.",
    category: "privacy",
    minTier: "guest",
    bucket: "heavy",
    processingMode: "local",
    status: "beta",
    availability: "fully-functional",
    releaseNote: "Visual redaction burns black rectangles into rasterized pages. All pages are flattened for uniformity.",
    featured: false,
    enabled: true,
    seo: {
      title: "Redact PDF Content",
      description: "Redact sensitive content from PDFs online for free. No upload — draw and burn black boxes with irreversible rasterization in your browser.",
      keywords: ["redact pdf", "black out pdf", "pdf redaction tool", "pdf privacy redaction"],
    },
    related: PRIVACY_RELATED,
  },
  {
    slug: "pipeline",
    name: "Privacy Pipeline",
    description: "Chain multiple privacy operations in sequence with preset workflows for maximum protection.",
    category: "privacy",
    minTier: "guest",
    bucket: "heavy",
    processingMode: "local",
    status: "beta",
    availability: "fully-functional",
    releaseNote: "Pipeline chains scrub, flatten, EXIF strip, and other operations sequentially.",
    featured: false,
    enabled: true,
    seo: {
      title: "PDF Privacy Pipeline",
      description: "Chain multiple PDF privacy operations in sequence online for free. No upload — scrub, flatten, and strip in one pass in your browser.",
      keywords: ["pdf privacy pipeline", "chain pdf tools", "maximum privacy pdf"],
    },
    related: PRIVACY_RELATED,
  },
  {
    slug: "rotate",
    name: "Rotate PDF",
    description: "Rotate all or selected pages by 90, 180, or 270 degrees for correct orientation.",
    category: "organize",
    minTier: "guest",
    bucket: "core",
    processingMode: "local",
    status: "ga",
    availability: "fully-functional",
    featured: false,
    enabled: true,
    seo: {
      title: "Rotate PDF Pages",
      description: "Rotate PDF pages 90, 180, or 270 degrees online for free. No upload — fix orientation for all or selected pages in your browser.",
      keywords: ["rotate pdf", "rotate pdf pages", "pdf orientation"],
    },
    related: SHARED_RELATED,
  },
  {
    slug: "crop",
    name: "Crop PDF",
    description: "Trim margins from all or selected pages by percentage or absolute points.",
    category: "edit",
    minTier: "guest",
    bucket: "core",
    processingMode: "local",
    status: "ga",
    availability: "fully-functional",
    featured: false,
    enabled: true,
    seo: {
      title: "Crop PDF Pages",
      description: "Crop PDF margins by percentage or points online for free. No upload — trim whitespace from all or selected pages in your browser.",
      keywords: ["crop pdf", "trim pdf margins", "pdf crop tool"],
    },
    related: SHARED_RELATED,
  },
  {
    slug: "sign",
    name: "Sign PDF",
    description: "Draw a freehand signature and place it on any page as a visual image overlay.",
    category: "edit",
    minTier: "guest",
    bucket: "core",
    processingMode: "local",
    status: "beta",
    availability: "fully-functional",
    releaseNote: "Visual signature overlay. Not a cryptographic digital signature.",
    featured: false,
    enabled: true,
    seo: {
      title: "Sign PDF with Handwritten Signature",
      description: "Add a handwritten signature to any PDF page online for free. Draw, place, and download — no upload, no account needed.",
      keywords: ["sign pdf", "e-signature pdf", "add signature to pdf"],
    },
    related: SHARED_RELATED,
  },
  {
    slug: "fill-form",
    name: "Fill PDF Forms",
    description: "Detect and fill interactive PDF form fields locally, then optionally flatten.",
    category: "edit",
    minTier: "guest",
    bucket: "core",
    processingMode: "local",
    status: "beta",
    availability: "fully-functional",
    releaseNote: "Supports text, checkbox, dropdown, radio fields. XFA forms may not be detected.",
    featured: false,
    enabled: true,
    seo: {
      title: "Fill PDF Forms Online Locally",
      description: "Fill interactive PDF form fields online for free. No upload — detect and complete text, checkbox, and dropdown fields in your browser.",
      keywords: ["fill pdf form", "pdf form filler", "edit pdf form"],
    },
    related: SHARED_RELATED,
  },
  {
    slug: "ocr",
    name: "OCR Text Recognition",
    description: "Extract text from scanned or image-based PDF pages using in-browser Tesseract OCR.",
    category: "convert",
    minTier: "guest",
    bucket: "heavy",
    processingMode: "local",
    status: "beta",
    availability: "fully-functional",
    releaseNote: "OCR quality depends on scan quality. First run downloads language data.",
    featured: false,
    enabled: true,
    seo: {
      title: "OCR PDF — Extract Text",
      description: "Extract text from scanned PDF pages online for free. No upload — in-browser Tesseract OCR recognizes text from image-based pages.",
      keywords: ["ocr pdf", "extract text from pdf", "scanned pdf to text"],
    },
    related: SHARED_RELATED,
  },
  {
    slug: "analyze",
    name: "Forensic Analyzer",
    description: "Scan a PDF for identity leaks, tracking vectors, and security risks.",
    category: "privacy",
    minTier: "guest",
    bucket: "core",
    processingMode: "local",
    status: "ga",
    availability: "fully-functional",
    featured: true,
    enabled: true,
    seo: {
      title: "PDF Forensic Analyzer",
      description: "Analyze PDFs for hidden metadata, GPS coordinates, tracking beacons, and identity leaks. No upload — forensic scanning runs in your browser.",
      keywords: ["pdf analyzer", "pdf forensic", "pdf metadata scanner", "pdf privacy check"],
    },
    related: ANALYZE_RELATED,
  },
  {
    slug: "pii-detect",
    name: "PII Detection",
    description: "Auto-detect SSNs, phone numbers, emails, and credit cards in a PDF. Review and redact.",
    category: "privacy",
    minTier: "guest",
    bucket: "core",
    processingMode: "local",
    status: "beta",
    availability: "fully-functional",
    featured: true,
    enabled: true,
    seo: {
      title: "PDF PII Detection — Auto-Find Sensitive Data",
      description: "Automatically detect Social Security numbers, phone numbers, email addresses, and credit card numbers in PDFs. Review detections and redact with one click. Everything runs in your browser.",
      keywords: ["pdf pii detection", "pdf redact ssn", "auto redact pdf", "sensitive data scanner", "pdf privacy"],
    },
    related: SHARED_RELATED,
  },
];

export const toolMap = new Map<ToolSlug, ToolDefinition>(
  toolRegistry.map((tool) => [tool.slug, tool]),
);

export const toolCategories: ToolCategory[] = [
  "privacy",
  "organize",
  "edit",
  "convert",
  "protect",
];

export function getToolDefinition(slug: string): ToolDefinition | null {
  return toolMap.get(slug as ToolSlug) ?? null;
}

export function toolsByCategory(category: ToolCategory): ToolDefinition[] {
  return toolRegistry.filter((tool) => tool.category === category);
}

export function isGaTool(tool: ToolDefinition): boolean {
  return tool.status === "ga";
}

export function gaTools(): ToolDefinition[] {
  return toolRegistry.filter((tool) => isGaTool(tool));
}

export function labTools(): ToolDefinition[] {
  return toolRegistry.filter((tool) => !isGaTool(tool));
}

export function processingModeLabel(mode: ProcessingMode): string {
  return mode === "local" ? "On-device" : "Cloud Optional";
}

export function categoryLabel(category: ToolCategory): string {
  switch (category) {
    case "privacy":
      return "Privacy";
    case "organize":
      return "Organize";
    case "edit":
      return "Edit";
    case "convert":
      return "Convert";
    case "protect":
      return "Protect";
    default:
      return category;
  }
}
