/**
 * Sequential step executor for chaining PDF privacy operations.
 * Pipes outputBytes from step N to step N+1.
 */

import { deepScrubPdf } from "./deepScrub";
import { paranoidScrubPdf } from "./paranoidScrub";
import { stripExifFromPdfBytes } from "./exifStrip";
import { flattenToImagePdf } from "./operations/flattenToImagePdf";
import { compressPdf } from "./operations/compressPdf";

export type PipelineStepType =
  | "scrub"
  | "paranoid-scrub"
  | "exif-strip"
  | "flatten"
  | "compress";

export type PipelineStep = {
  type: PipelineStepType;
  config?: {
    dpi?: number;
    format?: "png" | "jpeg";
    jpegQuality?: number;
  };
};

export type PipelineStepResult = {
  type: PipelineStepType;
  inputSize: number;
  outputSize: number;
  durationMs: number;
};

export type PipelineResult = {
  outputBytes: Uint8Array;
  steps: PipelineStepResult[];
  totalDurationMs: number;
};

export type PipelinePreset = {
  name: string;
  description: string;
  steps: PipelineStep[];
};

export const PIPELINE_PRESETS: PipelinePreset[] = [
  {
    name: "Maximum Privacy",
    description: "Paranoid scrub then flatten at 150 DPI PNG. Destroys all hidden structure.",
    steps: [
      { type: "paranoid-scrub" },
      { type: "flatten", config: { dpi: 150, format: "png" } },
    ],
  },
  {
    name: "Safe Sharing",
    description: "Scrub metadata, strip EXIF, then compress for smaller file size.",
    steps: [
      { type: "scrub" },
      { type: "exif-strip" },
      { type: "compress" },
    ],
  },
  {
    name: "Flatten Only",
    description: "Rasterize all pages at 200 DPI PNG. Nuclear option for font/structure removal.",
    steps: [
      { type: "flatten", config: { dpi: 200, format: "png" } },
    ],
  },
];

export async function executePipeline(
  inputBytes: Uint8Array,
  steps: PipelineStep[],
  onProgress?: (stepIndex: number, stepType: PipelineStepType) => void,
): Promise<PipelineResult> {
  let currentBytes = inputBytes;
  const results: PipelineStepResult[] = [];
  const totalStart = performance.now();

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    onProgress?.(i, step.type);

    const inputSize = currentBytes.length;
    const stepStart = performance.now();

    currentBytes = await executeStep(currentBytes, step);

    const durationMs = Math.round(performance.now() - stepStart);
    results.push({
      type: step.type,
      inputSize,
      outputSize: currentBytes.length,
      durationMs,
    });
  }

  return {
    outputBytes: currentBytes,
    steps: results,
    totalDurationMs: Math.round(performance.now() - totalStart),
  };
}

async function executeStep(
  bytes: Uint8Array,
  step: PipelineStep,
): Promise<Uint8Array> {
  switch (step.type) {
    case "scrub": {
      const { outputBytes } = await deepScrubPdf(bytes);
      return outputBytes;
    }
    case "paranoid-scrub": {
      const { outputBytes } = await paranoidScrubPdf(bytes);
      return outputBytes;
    }
    case "exif-strip": {
      const { outputBytes } = stripExifFromPdfBytes(bytes);
      return outputBytes;
    }
    case "flatten": {
      const { outputBytes } = await flattenToImagePdf({
        pdfBytes: bytes,
        dpi: step.config?.dpi ?? 150,
        format: step.config?.format ?? "png",
        jpegQuality: step.config?.jpegQuality ?? 0.92,
      });
      return outputBytes;
    }
    case "compress": {
      const { outputBytes } = await compressPdf({ inputBytes: bytes });
      return outputBytes;
    }
    default:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exhaustive check
      throw new Error(`Unknown pipeline step: ${(step as any).type}`);
  }
}

export function stepLabel(type: PipelineStepType): string {
  switch (type) {
    case "scrub": return "Deep Scrub";
    case "paranoid-scrub": return "Paranoid Scrub";
    case "exif-strip": return "EXIF Strip";
    case "flatten": return "Flatten to Image";
    case "compress": return "Compress";
    default: return type;
  }
}
