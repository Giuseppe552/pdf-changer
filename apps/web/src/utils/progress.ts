/**
 * Progress reporting for long-running PDF operations.
 *
 * Processing functions accept an optional onProgress callback.
 * Each call reports the current stage and optionally a page-level
 * fraction (0–1). The UI uses this to show what's happening instead
 * of a generic spinner.
 */

export type ProgressStage =
  | "loading"
  | "reading-metadata"
  | "copying-pages"
  | "stripping-exif"
  | "hashing"
  | "saving"
  | "paranoid-cleanup"
  | "randomizing"
  | "rendering-page"
  | "embedding-image"
  | "merging"
  | "compressing"
  | "auditing"
  | "verifying";

export type ProgressUpdate = {
  /** Current stage of processing */
  stage: ProgressStage;
  /** Human-readable label for the current step */
  label: string;
  /** 0–1 fraction of overall progress. null = indeterminate. */
  fraction: number | null;
  /** Total pages in the document (if known) */
  pageCount?: number;
  /** Current page being processed (1-indexed) */
  currentPage?: number;
};

export type ProgressCallback = (update: ProgressUpdate) => void;

/** No-op callback for when callers don't need progress */
export const noopProgress: ProgressCallback = () => {};

/** Label map — short human descriptions for each stage */
const STAGE_LABELS: Record<ProgressStage, string> = {
  loading: "Loading PDF",
  "reading-metadata": "Reading metadata",
  "copying-pages": "Copying pages",
  "stripping-exif": "Stripping image metadata",
  hashing: "Computing file hash",
  saving: "Saving output",
  "paranoid-cleanup": "Paranoid cleanup",
  randomizing: "Randomizing structure",
  "rendering-page": "Rendering page",
  "embedding-image": "Embedding image",
  merging: "Merging documents",
  compressing: "Compressing",
  auditing: "Running audit monitors",
  verifying: "Verifying integrity",
};

/** Helper to build a ProgressUpdate with sensible defaults */
export function progress(
  stage: ProgressStage,
  fraction: number | null = null,
  extra?: { pageCount?: number; currentPage?: number; label?: string },
): ProgressUpdate {
  return {
    stage,
    label: extra?.label ?? STAGE_LABELS[stage],
    fraction,
    pageCount: extra?.pageCount,
    currentPage: extra?.currentPage,
  };
}
