/**
 * Document structure randomization for flattened PDFs.
 *
 * Post-processes flattened (image-only) PDFs by shuffling image object
 * insertion order before final save. Since flattened PDFs are simple
 * (just image objects per page), this is tractable.
 *
 * Prevents fingerprinting the tool by its output structure: two identical
 * inputs should produce structurally different (but visually identical) outputs.
 */

import { PDFDocument } from "pdf-lib";

/**
 * Randomize object insertion order in a flattened PDF.
 *
 * Strategy: load the PDF, extract page images, create a new PDF
 * and re-insert pages in randomized internal order (but same visual order).
 * This changes the internal object numbering/ordering.
 */
export async function randomizeStructure(
  pdfBytes: Uint8Array,
): Promise<Uint8Array> {
  const src = await PDFDocument.load(pdfBytes, { updateMetadata: false });
  const pageCount = src.getPageCount();

  if (pageCount === 0) return pdfBytes;

  // Create new document and copy pages in a shuffled internal order,
  // then re-arrange to correct visual order
  const out = await PDFDocument.create();

  // Generate a random permutation for copy order
  const indices = Array.from({ length: pageCount }, (_, i) => i);
  shuffleArray(indices);

  // Copy pages in shuffled order (affects internal object numbering)
  const copiedPages = await out.copyPages(src, indices);

  // Build a mapping from shuffled position back to original index
  const pageSlots: Array<{ originalIndex: number; page: typeof copiedPages[0] }> = [];
  for (let i = 0; i < indices.length; i++) {
    pageSlots.push({ originalIndex: indices[i], page: copiedPages[i] });
  }

  // Sort back to original order for correct visual sequence
  pageSlots.sort((a, b) => a.originalIndex - b.originalIndex);

  for (const slot of pageSlots) {
    out.addPage(slot.page);
  }

  // Preserve metadata from source (should already be cleared by flatten/scrub)
  const fixedDate = new Date("2000-01-01T00:00:00.000Z");
  out.setTitle(src.getTitle() ?? "");
  out.setAuthor(src.getAuthor() ?? "");
  out.setSubject(src.getSubject() ?? "");
  out.setKeywords([]);
  out.setCreator(src.getCreator() ?? "");
  out.setProducer(src.getProducer() ?? "");
  out.setCreationDate(fixedDate);
  out.setModificationDate(fixedDate);

  return new Uint8Array(await out.save({ useObjectStreams: true, addDefaultPage: false }));
}

/**
 * Fisher-Yates shuffle (in-place).
 */
function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
