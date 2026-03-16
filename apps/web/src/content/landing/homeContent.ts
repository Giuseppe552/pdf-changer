export const homeIdentity = "Browser-only PDF tools. Nothing uploaded. Nothing tracked. Cryptographic proof.";

export const homeHeroTitle = "Your PDFs never leave your device.";

export const homeHeroSummary =
  "21 tools that run entirely in your browser. No uploads, no accounts required, no tracking. The Verified Processing Environment produces cryptographic proof that nothing leaked during processing.";

export const homeAudience = [
  "Security researchers who don't trust upload-based PDF tools.",
  "Journalists handling sensitive documents.",
  "Lawyers and accountants with confidentiality obligations.",
  "Anyone who's tired of paying Adobe for basic operations.",
];

export const homeWhyUse = [
  "Everything runs in your browser — no file uploads, no server processing.",
  "19 tools that cover what you'd normally need Adobe or a dozen browser tabs for.",
  "Every operation produces a clear report showing exactly what changed.",
];

export const homeHowItWorks = [
  "Pick a tool and drop in your PDF.",
  "Processing happens instantly in your browser tab.",
  "Download the result. Your original file was never uploaded anywhere.",
];

export const homeProofMetrics = [
  { value: "0", label: "bytes uploaded", note: "everything processes locally" },
  { value: "0", label: "trackers", note: "no analytics, no pixels, no third-party scripts" },
  { value: "283", label: "tests passing", note: "automated test suite, CI on every commit" },
  { value: "21", label: "tools", note: "merge, split, scrub, compress, redact, and more" },
];

export const homeAccountantOutcomes = [
  {
    title: "Merge and organise",
    detail:
      "Combine supporting documents into one PDF, reorder pages, add page numbers — all without desktop software.",
  },
  {
    title: "Clean before sharing",
    detail:
      "Strip metadata, remove hidden data, and flatten fonts before sending files to clients or reviewers.",
  },
  {
    title: "Redact and protect",
    detail:
      "Black out sensitive information properly (not just covering it with a box), then watermark or password-protect the result.",
  },
];

export const homeLimits = [
  "Text and images already visible in the document — we remove hidden data, not visible content.",
  "Compromised devices or browsers — if your machine is compromised, no website can help.",
  "Legal decisions about what to share — that's on you, not a tool.",
];
