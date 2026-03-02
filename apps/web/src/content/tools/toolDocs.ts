import {
  categoryLabel,
  getToolDefinition,
  processingModeLabel,
  toolRegistry,
  type ToolDefinition,
  type ToolSlug,
} from "./toolRegistry";
import toolEditorialRaw from "./toolEditorial.json";

export type ToolDocKind =
  | "tool"
  | "how-to"
  | "privacy"
  | "troubleshooting"
  | "use-case"
  | "faq"
  | "collection";

export type ToolDocPage = {
  kind: ToolDocKind;
  route: string;
  slug: string;
  title: string;
  description: string;
  markdown: string;
  tool?: ToolDefinition;
  useCaseSlug?: string;
  faqSlug?: string;
  collectionSlug?: string;
};

export type ToolCollection = {
  slug: string;
  title: string;
  description: string;
  tools: ToolSlug[];
};

export const USE_CASE_SLUGS = ["office-daily", "secure-sharing", "high-volume"] as const;
export const FAQ_SLUGS = ["what-it-does", "data-safety", "limitations"] as const;
type UseCaseSlug = (typeof USE_CASE_SLUGS)[number];
type FaqSlug = (typeof FAQ_SLUGS)[number];

export type ToolEditorial = {
  howToSteps: string[];
  tips: string[];
  limitations: string[];
  useCases: Record<UseCaseSlug, string>;
  faq: Record<FaqSlug, string>;
  troubleshooting: string[];
};

export const toolEditorial = toolEditorialRaw as Record<ToolSlug, ToolEditorial>;

const DEFAULT_EDITORIAL: ToolEditorial = {
  howToSteps: [
    "Open the tool route and provide source files.",
    "Review settings and limits before running.",
    "Run once and inspect the output.",
  ],
  tips: [
    "Keep original files separate from edited exports.",
    "Use clear naming conventions to avoid mixups.",
  ],
  limitations: [
    "This tool does not guarantee legal anonymity.",
    "Device or account compromise risk remains outside tool scope.",
  ],
  useCases: {
    "office-daily": "Use this route for structured daily office document handling.",
    "secure-sharing": "Use this route as part of secure sharing prep with clear review steps.",
    "high-volume": "Use this route with repeatable naming and audit discipline.",
  },
  faq: {
    "what-it-does": "It applies a focused document transformation.",
    "data-safety": "Processing is constrained by the declared tool mode and privacy policy.",
    "limitations": "It reduces specific risks, not all risk classes.",
  },
  troubleshooting: [
    "Retry with a smaller sample to isolate failures.",
    "Verify source integrity and rerun.",
    "Use alternate workflow routes when needed.",
  ],
};

export function getToolEditorial(slug: ToolSlug): ToolEditorial {
  return toolEditorial[slug] ?? DEFAULT_EDITORIAL;
}

export function getRelatedTools(slug: ToolSlug, limit = 4): ToolDefinition[] {
  const tool = getToolDefinition(slug);
  if (!tool) return [];
  return toolRegistry
    .filter((t) => t.slug !== slug && t.category === tool.category && t.enabled)
    .slice(0, limit);
}

export const toolCollections: ToolCollection[] = [
  {
    slug: "office-daily",
    title: "Office Daily PDF Workflow",
    description:
      "A practical set of tools for routine office document handling with clear privacy defaults.",
    tools: [
      "merge",
      "split",
      "editor",
      "compress",
      "remove-pages",
      "page-numbers",
      "watermark",
      "rotate",
      "crop",
      "sign",
      "fill-form",
    ],
  },
  {
    slug: "safe-sharing",
    title: "Safer Document Sharing Workflow",
    description:
      "Tool sequence for preparing documents before external sharing or journalist submission.",
    tools: ["scrub", "flatten", "redact", "remove-pages", "watermark", "compress", "pdf-to-image"],
  },
  {
    slug: "conversion-pack",
    title: "Conversion and Format Workflow",
    description:
      "Convert between common document formats while staying in-browser whenever possible.",
    tools: ["image-to-pdf", "pdf-to-image", "merge", "split", "compress", "ocr"],
  },
];

function getUseCaseLabel(useCaseSlug: UseCaseSlug | string): string {
  switch (useCaseSlug) {
    case "office-daily":
      return "Office daily workflow";
    case "secure-sharing":
      return "Secure sharing workflow";
    case "high-volume":
      return "High-volume workflow";
    default:
      return useCaseSlug;
  }
}

export function faqQuestion(faqSlug: FaqSlug | string, toolName: string): string {
  switch (faqSlug) {
    case "what-it-does":
      return `What does ${toolName} change?`;
    case "data-safety":
      return `Is ${toolName} private by default?`;
    case "limitations":
      return `What does ${toolName} not protect?`;
    default:
      return `${toolName} FAQ`;
  }
}

function toolHeaderMarkdown(tool: ToolDefinition): string {
  return [
    `# ${tool.name}`,
    "",
    tool.description,
    "",
    `- Category: ${categoryLabel(tool.category)}`,
    `- Processing mode: ${processingModeLabel(tool.processingMode)}`,
    `- Quota bucket: ${tool.bucket === "heavy" ? "Heavy" : "Core"}`,
    `- Delivery status: ${tool.status}`,
    `- Availability: ${tool.availability}`,
    tool.releaseNote ? `- Release note: ${tool.releaseNote}` : "",
    "",
  ].join("\n");
}

function toolPrivacyMarkdown(tool: ToolDefinition): string {
  const editorial = toolEditorial[tool.slug] ?? DEFAULT_EDITORIAL;
  return [
    `# ${tool.name} privacy model`,
    "",
    `This tool is classified as **${tool.bucket}** workload and runs in **${processingModeLabel(tool.processingMode)}** mode.`,
    `Current status: **${tool.status}** (${tool.availability}).`,
    tool.releaseNote ? `Release note: ${tool.releaseNote}` : "",
    "",
    "## What this does",
    "- Applies the selected transformation to the document or exported output.",
    "- Keeps processing local in browser when marked On-device.",
    "- Uses monthly local counters for usage quotas.",
    "",
    "## What this does not protect",
    "- It does not remove names or sensitive content visible in document text or images.",
    "- It does not guarantee legal anonymity or endpoint compromise protection.",
    "- For hybrid tools, privacy depends on explicit cloud opt-in when enabled.",
    ...editorial.limitations.map((item) => `- ${item}`),
    "",
    "## Safe workflow defaults",
    "- Verify output manually before sharing.",
    "- Use security guidance at `/security` for higher-risk scenarios.",
    "- Keep original and transformed files separated to avoid accidental leaks.",
  ].join("\n");
}

function toolHowToMarkdown(tool: ToolDefinition): string {
  const editorial = toolEditorial[tool.slug] ?? DEFAULT_EDITORIAL;
  return [
    `# How to use ${tool.name}`,
    "",
    ...editorial.howToSteps.map((step, index) => `${index + 1}. ${step}`),
    "",
    "## Tips",
    ...editorial.tips.map((item) => `- ${item}`),
    "- If quota is reached, wait for month reset or upgrade for unlimited usage.",
    "",
    "## What this does not protect",
    ...editorial.limitations.map((item) => `- ${item}`),
    "- It does not replace legal, compliance, or incident-response workflows.",
  ].join("\n");
}

function toolTroubleshootingMarkdown(tool: ToolDefinition): string {
  const editorial = toolEditorial[tool.slug] ?? DEFAULT_EDITORIAL;
  return [
    `# ${tool.name} troubleshooting`,
    "",
    "## Common issues",
    ...editorial.troubleshooting.map((item) => `- ${item}`),
    "",
    "## Recovery steps",
    "1. Retry with a smaller sample file.",
    "2. Refresh and run the tool again.",
    "3. Use an alternative workflow from `/tools` if needed.",
    "4. Check `/status` for current incidents.",
    "",
    "## What this does not protect",
    "- Troubleshooting guidance does not guarantee recovery for damaged files.",
    "- It does not bypass document owner restrictions when cryptography is enforced.",
  ].join("\n");
}

function toolUseCaseMarkdown(tool: ToolDefinition, useCaseSlug: UseCaseSlug): string {
  const editorial = toolEditorial[tool.slug] ?? DEFAULT_EDITORIAL;
  const useCase = getUseCaseLabel(useCaseSlug);
  return [
    `# ${tool.name}: ${useCase}`,
    "",
    editorial.useCases[useCaseSlug],
    "",
    "## Suggested flow",
    "1. Prepare source file(s) and confirm intended recipients.",
    "2. Run this tool with minimal settings first.",
    "3. Review output quality and file size.",
    "4. Combine with scrub flow for external sharing when needed.",
    "",
    "## What this does not protect",
    "- Scenario guidance reduces risk but does not eliminate it.",
    "- Operational identity leaks can still occur outside this tool.",
  ].join("\n");
}

function toolFaqMarkdown(tool: ToolDefinition, faqSlug: FaqSlug): string {
  const editorial = toolEditorial[tool.slug] ?? DEFAULT_EDITORIAL;
  return [
    `# ${faqQuestion(faqSlug, tool.name)}`,
    "",
    editorial.faq[faqSlug],
    "",
    "## What this does not protect",
    ...editorial.limitations.map((item) => `- ${item}`),
    "- It cannot fix compromised devices, accounts, or unsafe sharing channels.",
  ].join("\n");
}

function collectionMarkdown(collection: ToolCollection): string {
  const tools = collection.tools
    .map((slug) => getToolDefinition(slug))
    .filter((tool): tool is ToolDefinition => !!tool);
  return [
    `# ${collection.title}`,
    "",
    collection.description,
    "",
    "## Included tools",
    ...tools.map((tool) => `- [${tool.name}](/tools/${tool.slug})`),
    "",
    "## What this does not protect",
    "- Workflows reduce avoidable mistakes but do not remove all risk.",
    "- Review `/security` for broader threat-model guidance.",
  ].join("\n");
}

function toolDocPage(tool: ToolDefinition): ToolDocPage {
  return {
    kind: "tool",
    route: `/tools/${tool.slug}`,
    slug: tool.slug,
    title: tool.name,
    description: tool.description,
    markdown: toolHeaderMarkdown(tool),
    tool,
  };
}

function buildToolDocPages(tool: ToolDefinition): ToolDocPage[] {
  const pages: ToolDocPage[] = [
    {
      kind: "how-to",
      route: `/tools/${tool.slug}/how-to`,
      slug: "how-to",
      title: `${tool.name} — How to`,
      description: `Step-by-step guide for ${tool.name}.`,
      markdown: toolHowToMarkdown(tool),
      tool,
    },
    {
      kind: "privacy",
      route: `/tools/${tool.slug}/privacy`,
      slug: "privacy",
      title: `${tool.name} — Privacy`,
      description: `Privacy model, limits, and safety notes for ${tool.name}.`,
      markdown: toolPrivacyMarkdown(tool),
      tool,
    },
    {
      kind: "troubleshooting",
      route: `/tools/${tool.slug}/troubleshooting`,
      slug: "troubleshooting",
      title: `${tool.name} — Troubleshooting`,
      description: `Troubleshooting and recovery steps for ${tool.name}.`,
      markdown: toolTroubleshootingMarkdown(tool),
      tool,
    },
  ];

  for (const useCaseSlug of USE_CASE_SLUGS) {
    pages.push({
      kind: "use-case",
      route: `/tools/${tool.slug}/use-cases/${useCaseSlug}`,
      slug: useCaseSlug,
      title: `${tool.name} — ${getUseCaseLabel(useCaseSlug)}`,
      description: `${getUseCaseLabel(useCaseSlug)} for ${tool.name}.`,
      markdown: toolUseCaseMarkdown(tool, useCaseSlug),
      tool,
      useCaseSlug,
    });
  }

  for (const faqSlug of FAQ_SLUGS) {
    pages.push({
      kind: "faq",
      route: `/tools/${tool.slug}/faq/${faqSlug}`,
      slug: faqSlug,
      title: faqQuestion(faqSlug, tool.name),
      description: `Frequently asked question for ${tool.name}.`,
      markdown: toolFaqMarkdown(tool, faqSlug),
      tool,
      faqSlug,
    });
  }

  return pages;
}

export const toolDocPages: ToolDocPage[] = [
  ...toolRegistry.map((tool) => toolDocPage(tool)),
  ...toolRegistry.flatMap((tool) => buildToolDocPages(tool)),
  ...toolCollections.map((collection) => ({
    kind: "collection" as const,
    route: `/tools/collections/${collection.slug}`,
    slug: collection.slug,
    collectionSlug: collection.slug,
    title: collection.title,
    description: collection.description,
    markdown: collectionMarkdown(collection),
  })),
];

export const toolDocRouteSet = new Set(toolDocPages.map((page) => page.route));

export function getToolDocPage(route: string): ToolDocPage | null {
  return toolDocPages.find((page) => page.route === route) ?? null;
}

export function getToolPage(slug: string): ToolDocPage | null {
  return getToolDocPage(`/tools/${slug}`);
}

export function getToolHowToPage(slug: string): ToolDocPage | null {
  return getToolDocPage(`/tools/${slug}/how-to`);
}

export function getToolPrivacyPage(slug: string): ToolDocPage | null {
  return getToolDocPage(`/tools/${slug}/privacy`);
}

export function getToolTroubleshootingPage(slug: string): ToolDocPage | null {
  return getToolDocPage(`/tools/${slug}/troubleshooting`);
}

export function getToolUseCasePage(slug: string, useCaseSlug: string): ToolDocPage | null {
  return getToolDocPage(`/tools/${slug}/use-cases/${useCaseSlug}`);
}

export function getToolFaqPage(slug: string, faqSlug: string): ToolDocPage | null {
  return getToolDocPage(`/tools/${slug}/faq/${faqSlug}`);
}

export function getToolCollectionPage(collectionSlug: string): ToolDocPage | null {
  return getToolDocPage(`/tools/collections/${collectionSlug}`);
}
