export const homeIdentity = "On-device PDF privacy tools. No uploads. No trackers.";

export const homeHeroTitle =
  "Private PDF handling for office work that cannot afford mistakes.";

export const homeHeroSummary =
  "PDF Changer runs core processing on your device in v1. Use it for monthly close packs, board decks, client document prep, and high-risk submissions where metadata mistakes can leak information.";

export const homeAudience = [
  "Office workers sharing HR, legal, or finance files.",
  "Whistleblowers submitting sensitive documents.",
  "General users sending applications or personal records.",
  "Journalists and supporter teams handling source material.",
];

export const homeWhyUse = [
  "Local processing for core tools keeps document bytes off upload queues.",
  "Clear run reports show exactly what changed and what did not.",
  "Usage limits are transparent and predictable per month.",
];

export const homeHowItWorks = [
  "Open /scrub and choose a PDF.",
  "Run local scrub and review the report (hashes + removed elements).",
  "Download the rebuilt PDF and verify before sharing.",
];

export const homeProofMetrics = [
  { value: "12", label: "daily tools live", note: "with explicit GA/Labs status" },
  { value: "0", label: "third-party trackers", note: "no analytics pixels or ad scripts" },
  { value: "123", label: "tool help URLs", note: "for searchable how-to and FAQ coverage" },
  { value: "2000-01-01", label: "fixed scrub dates", note: "normalized to avoid “edited now” leaks" },
];

export const homeAccountantOutcomes = [
  {
    title: "Monthly close pack prep",
    detail:
      "Merge and reorder supporting PDFs, then remove metadata before sharing with external reviewers.",
  },
  {
    title: "Board packet hygiene",
    detail:
      "Split large packets by range, apply page numbers, and export clean subsets without desktop installs.",
  },
  {
    title: "Client-ready redacted share",
    detail:
      "Use scrub + remove pages + watermark to create a deliberate, audit-friendly outbound copy.",
  },
];

export const homeLimits = [
  "Names or identifiers already visible in document content.",
  "Legal or jurisdictional exposure from disclosure decisions.",
  "Compromised devices, compromised accounts, or prior leaks.",
];
