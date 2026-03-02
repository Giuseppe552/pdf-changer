import { PDFDocument } from "pdf-lib";
import { parsePageRanges } from "../pageRanges";
import type { PdfOperation } from "./types";

export type RemovePagesPdfInput = {
  inputBytes: Uint8Array;
  removeRanges: string;
};

export type RemovePagesPdfOutput = {
  outputBytes: Uint8Array;
  keptPages: number;
  removedPages: number;
};

export const removePagesPdf: PdfOperation<
  RemovePagesPdfInput,
  RemovePagesPdfOutput
> = async ({ inputBytes, removeRanges }) => {
  const src = await PDFDocument.load(inputBytes, { ignoreEncryption: false });
  const pageCount = src.getPageCount();
  const ranges = parsePageRanges(removeRanges, pageCount);
  if (!ranges.length) {
    throw new Error("Enter at least one range to remove.");
  }

  const removeSet = new Set<number>(ranges.flat());
  const keep = src
    .getPageIndices()
    .filter((index) => !removeSet.has(index));
  if (!keep.length) {
    throw new Error("Cannot remove all pages.");
  }

  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, keep);
  for (const page of pages) out.addPage(page);
  const outputBytes = await out.save({ useObjectStreams: true, addDefaultPage: false });
  return {
    outputBytes,
    keptPages: keep.length,
    removedPages: removeSet.size,
  };
};

